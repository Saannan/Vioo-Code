import { db, supabase, rtdb, auth } from './firebase-init.js';
import { 
    collection, 
    addDoc, 
    doc, 
    getDoc, 
    getDocs,
    query, 
    where, 
    orderBy, 
    limit, 
    serverTimestamp,
    deleteDoc,
    updateDoc,
    increment
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { ref as dbRef, push, set, onValue, serverTimestamp as rtdbServerTimestamp, query as rtdbQuery, orderByChild } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { supabaseConfig } from './config.js';

export const createPaste = async (pasteData, rawContent) => {
    if (!auth.currentUser) throw new Error("User not authenticated.");

    const user = auth.currentUser;
    const token = await user.getIdToken();
    const filePath = `${user.uid}/${Date.now()}_${Math.random().toString(36).substring(2)}.txt`;

    const { error: uploadError } = await supabase.storage
        .from(supabaseConfig.bucket)
        .upload(filePath, rawContent, {
            cacheControl: '3600',
            upsert: false,
            headers: { Authorization: `Bearer ${token}` }
        });

    if (uploadError) {
        throw new Error(`Supabase upload error: ${uploadError.message}`);
    }

    const userProfileDoc = await getDoc(doc(db, "users", user.uid));
    if (!userProfileDoc.exists()) throw new Error("User profile not found.");
    const userProfile = userProfileDoc.data();

    const newPaste = {
        title: pasteData.title,
        description: pasteData.description,
        language: pasteData.language,
        visibility: pasteData.visibility,
        authorUid: user.uid,
        authorUsername: userProfile.username,
        authorAvatarUrl: userProfile.avatarUrl,
        storagePath: filePath,
        stats: { views: 0, comments: 0 },
        createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "pastes"), newPaste);
    await updateDoc(docRef, { pasteId: docRef.id });

    return docRef.id;
};

export const getPasteById = async (pasteId) => {
    const pasteRef = doc(db, 'pastes', pasteId);
    const pasteSnap = await getDoc(pasteRef);

    if (!pasteSnap.exists()) {
        return null;
    }
    
    await updateDoc(pasteRef, { "stats.views": increment(1) });
    return pasteSnap.data();
};

export const getRawPasteContent = async (storagePath) => {
    const { data, error } = await supabase.storage
        .from(supabaseConfig.bucket)
        .download(storagePath);
    
    if (error) throw new Error(error.message);
    return await data.text();
};

export const getLatestPublicPastes = async (count = 12) => {
    const q = query(
        collection(db, "pastes"), 
        where("visibility", "==", "public"), 
        orderBy("createdAt", "desc"), 
        limit(count)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
};

export const getUserProfileByUsername = async (username) => {
    const q = query(collection(db, "users"), where("username_lowercase", "==", username.toLowerCase()), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    return querySnapshot.docs[0].data();
};

export const getPastesByAuthor = async (uid) => {
    const q = query(
        collection(db, "pastes"),
        where("authorUid", "==", uid),
        where("visibility", "==", "public"),
        orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
};

export const deletePaste = async (pasteId, storagePath) => {
    if (!auth.currentUser) throw new Error("User not authenticated.");
    const token = await auth.currentUser.getIdToken();
    
    await deleteDoc(doc(db, "pastes", pasteId));
    await supabase.storage
        .from(supabaseConfig.bucket)
        .remove([storagePath], {
            headers: { Authorization: `Bearer ${token}` }
        });
};

export const addComment = async (pasteId, text, author) => {
    const commentsRef = dbRef(rtdb, `comments/${pasteId}`);
    const newCommentRef = push(commentsRef);
    await set(newCommentRef, {
        text: text,
        authorUid: author.uid,
        authorUsername: author.username,
        authorAvatarUrl: author.avatarUrl,
        timestamp: rtdbServerTimestamp()
    });
    const pasteDocRef = doc(db, 'pastes', pasteId);
    await updateDoc(pasteDocRef, { "stats.comments": increment(1) });
};

export const listenForComments = (pasteId, callback) => {
    const commentsQuery = rtdbQuery(dbRef(rtdb, `comments/${pasteId}`), orderByChild('timestamp'));
    return onValue(commentsQuery, (snapshot) => {
        const comments = [];
        snapshot.forEach((childSnapshot) => {
            comments.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });
        callback(comments.reverse());
    });
};