import { db, rtdb, supabase, auth } from './firebase-init.js';
import {
    collection,
    addDoc,
    getDoc,
    getDocs,
    doc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    deleteDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { ref as dbRef, push, set, onValue, serverTimestamp as rtdbServerTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { supabaseConfig } from './config.js';
import { getCurrentUser } from './auth.js';

export const createPaste = async (pasteData) => {
    const user = getCurrentUser();
    if (!user) {
        throw new Error("Authentication error. Please sign in again.");
    }
    
    const pasteId = doc(collection(db, 'pastes')).id;
    const storagePath = `${user.uid}/${pasteId}.txt`;

    const { data, error: uploadError } = await supabase.storage
        .from(supabaseConfig.bucket)
        .upload(storagePath, pasteData.content);

    if (uploadError) {
        throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }

    const newPaste = {
        pasteId: pasteId,
        title: pasteData.title,
        language: pasteData.language,
        visibility: pasteData.visibility,
        authorUid: user.uid,
        authorUsername: user.username,
        authorAvatarUrl: user.avatarUrl,
        storagePath: storagePath,
        stats: { views: 0, comments: 0 },
        createdAt: serverTimestamp()
    };

    await setDoc(doc(db, "pastes", pasteId), newPaste);
    return newPaste;
};

export const getPasteById = async (pasteId) => {
    const pasteRef = doc(db, "pastes", pasteId);
    const pasteSnap = await getDoc(pasteRef);
    if (!pasteSnap.exists()) {
        return null;
    }
    return pasteSnap.data();
};

export const getRawPasteContent = async (storagePath) => {
    const { data, error } = await supabase.storage
        .from(supabaseConfig.bucket)
        .download(storagePath);
    
    if (error) {
        throw new Error(`Failed to fetch raw content: ${error.message}`);
    }
    return await data.text();
};

export const getPublicPastes = async (count = 10) => {
    const q = query(
        collection(db, "pastes"), 
        where("visibility", "==", "public"), 
        orderBy("createdAt", "desc"), 
        limit(count)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
};

export const getAllPublicPastes = async () => {
    const q = query(
        collection(db, "pastes"),
        where("visibility", "==", "public"),
        orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
};

export const getPastesByUsername = async (username) => {
    const userQuery = query(collection(db, "users"), where("username_lowercase", "==", username.toLowerCase()), limit(1));
    const userSnapshot = await getDocs(userQuery);

    if (userSnapshot.empty) {
        return { user: null, pastes: [] };
    }
    
    const user = userSnapshot.docs[0].data();

    const pastesQuery = query(
        collection(db, "pastes"),
        where("authorUid", "==", user.uid),
        where("visibility", "==", "public"),
        orderBy("createdAt", "desc")
    );

    const pastesSnapshot = await getDocs(pastesQuery);
    const pastes = pastesSnapshot.docs.map(doc => doc.data());

    return { user, pastes };
};


export const postComment = async (pasteId, text) => {
    const author = getCurrentUser();
    if (!author) throw new Error("Authentication required to comment.");
    
    const commentRef = dbRef(rtdb, `comments/${pasteId}`);
    const newCommentRef = push(commentRef);
    await set(newCommentRef, {
        text: text,
        authorUid: author.uid,
        authorUsername: author.username,
        authorAvatarUrl: author.avatarUrl,
        timestamp: rtdbServerTimestamp()
    });
};

export const listenForComments = (pasteId, callback) => {
    const commentsRef = dbRef(rtdb, `comments/${pasteId}`);
    onValue(commentsRef, (snapshot) => {
        const data = snapshot.val();
        const commentsArray = data ? Object.values(data).sort((a, b) => b.timestamp - a.timestamp) : [];
        callback(commentsArray);
    });
};