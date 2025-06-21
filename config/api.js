import { db, supabase } from './firebase-init.js';
import { supabaseConfig } from './config.js';
import {
    ref,
    set,
    get,
    query,
    orderByChild,
    equalTo,
    push,
    serverTimestamp,
    remove,
    onValue,
    limitToLast,
    update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

export const checkUsernameExists = async (username) => {
    const usernameLower = username.toLowerCase();
    const usersRef = query(ref(db, 'users'), orderByChild('username_lowercase'), equalTo(usernameLower));
    const snapshot = await get(usersRef);
    return snapshot.exists();
};

export const createUserProfile = async (uid, username, email) => {
    const userProfile = {
        uid: uid,
        username: username,
        username_lowercase: username.toLowerCase(),
        email: email,
        avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=${username}`,
        about: "Hello, I'm a new Vioo-Code user!",
        createdAt: serverTimestamp()
    };
    await set(ref(db, `users/${uid}`), userProfile);
};

export const createPaste = async (pasteData) => {
    const pasteContent = pasteData.content;
    const newPasteRef = push(ref(db, 'pastes'));
    const pasteId = newPasteRef.key;
    const storagePath = `${pasteData.authorUid}/${pasteId}.txt`;

    const { error: uploadError } = await supabase.storage
        .from(supabaseConfig.bucket)
        .upload(storagePath, pasteContent);

    if (uploadError) {
        throw new Error('Failed to upload paste content to storage.');
    }

    const { data: publicUrlData } = supabase.storage
        .from(supabaseConfig.bucket)
        .getPublicUrl(storagePath);

    const metadata = {
        pasteId: pasteId,
        title: pasteData.title,
        language: pasteData.language,
        visibility: pasteData.visibility,
        authorUid: pasteData.authorUid,
        authorUsername: pasteData.authorUsername,
        authorAvatarUrl: pasteData.authorAvatarUrl,
        storagePath: publicUrlData.publicUrl,
        stats: { views: 0, comments: 0 },
        createdAt: serverTimestamp()
    };

    await set(newPasteRef, metadata);
    return pasteId;
};

export const getPasteById = async (pasteId) => {
    const pasteRef = ref(db, `pastes/${pasteId}`);
    const snapshot = await get(pasteRef);
    if (snapshot.exists()) {
        const pasteData = snapshot.val();
        const viewsRef = ref(db, `pastes/${pasteId}/stats/views`);
        const currentViews = (await get(viewsRef)).val() || 0;
        await set(viewsRef, currentViews + 1);
        pasteData.stats.views = currentViews + 1;
        return pasteData;
    }
    return null;
};

export const updatePaste = async (pasteId, updateData) => {
    const pasteRef = ref(db, `pastes/${pasteId}`);
    await update(pasteRef, updateData);
};


export const deletePaste = async (pasteId, authorUid) => {
    const storagePath = `${authorUid}/${pasteId}.txt`;

    const { error: storageError } = await supabase.storage
        .from(supabaseConfig.bucket)
        .remove([storagePath]);

    if (storageError) {
        console.error("Error deleting from storage:", storageError.message);
    }
    
    await remove(ref(db, `pastes/${pasteId}`));
    await remove(ref(db, `comments/${pasteId}`));
};

export const getLatestPublicPastes = async (limit = 10) => {
    const pastesRef = query(ref(db, 'pastes'), orderByChild('visibility'), equalTo('public'));
    const snapshot = await get(query(pastesRef, limitToLast(limit)));
    const pastes = [];
    if (snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
            pastes.push(childSnapshot.val());
        });
    }
    return pastes.reverse();
};

export const getUserPublicPastes = async (uid) => {
    const pastesRef = query(ref(db, 'pastes'), orderByChild('authorUid'), equalTo(uid));
    const snapshot = await get(pastesRef);
    const pastes = [];
    if(snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
            const paste = childSnapshot.val();
            if(paste.visibility === 'public') {
                pastes.push(paste);
            }
        });
    }
    return pastes.reverse();
};

export const getUserAllPastes = async (uid) => {
    const pastesRef = query(ref(db, 'pastes'), orderByChild('authorUid'), equalTo(uid));
    const snapshot = await get(pastesRef);
    const pastes = [];
    if(snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
            pastes.push(childSnapshot.val());
        });
    }
    return pastes.reverse();
}

export const getUserProfileByUsername = async (username) => {
    const usersRef = query(ref(db, 'users'), orderByChild('username_lowercase'), equalTo(username.toLowerCase()));
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
        const userData = Object.values(snapshot.val())[0];
        return userData;
    }
    return null;
};

export const addComment = async (pasteId, commentData) => {
    const commentsRef = ref(db, `comments/${pasteId}`);
    const newCommentRef = push(commentsRef);
    await set(newCommentRef, { ...commentData, timestamp: serverTimestamp() });

    const commentsCountRef = ref(db, `pastes/${pasteId}/stats/comments`);
    const currentCount = (await get(commentsCountRef)).val() || 0;
    await set(commentsCountRef, currentCount + 1);
};

export const listenForComments = (pasteId, callback) => {
    const commentsRef = query(ref(db, `comments/${pasteId}`), orderByChild('timestamp'));
    return onValue(commentsRef, (snapshot) => {
        const comments = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                comments.push(childSnapshot.val());
            });
        }
        callback(comments);
    });
};