import { db, supabase, supabaseConfig, TIMESTAMP } from './firebase-init.js';
import { 
    ref, 
    push, 
    set, 
    get, 
    query, 
    orderByChild, 
    limitToLast, 
    equalTo, 
    remove,
    onValue,
    update
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { getCurrentUser } from './auth.js';

export const createPaste = async (pasteData) => {
    const user = getCurrentUser();
    if (!user) throw new Error("User not authenticated.");

    const userProfileRef = ref(db, `users/${user.uid}`);
    const userSnapshot = await get(userProfileRef);
    const userData = userSnapshot.val();

    const pasteId = push(ref(db, 'pastes')).key;
    const rawFileName = `${user.uid}-${pasteId}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from(supabaseConfig.bucket)
        .upload(rawFileName, pasteData.content);

    if (uploadError) {
        throw new Error('Supabase upload failed: ' + uploadError.message);
    }
    
    const { data: urlData } = supabase.storage
        .from(supabaseConfig.bucket)
        .getPublicUrl(rawFileName);

    const fullPasteData = {
        ...pasteData,
        pasteId: pasteId,
        authorUid: user.uid,
        authorUsername: userData.username,
        authorAvatarUrl: userData.avatarUrl,
        storagePath: urlData.publicUrl,
        rawFileName: rawFileName,
        stats: { views: 0, comments: 0 },
        createdAt: TIMESTAMP
    };

    await set(ref(db, 'pastes/' + pasteId), fullPasteData);
    return pasteId;
};

export const getPaste = async (pasteId) => {
    const pasteRef = ref(db, `pastes/${pasteId}`);
    const snapshot = await get(pasteRef);
    if (snapshot.exists()) {
        const pasteData = snapshot.val();
        update(pasteRef, { 'stats/views': (pasteData.stats.views || 0) + 1 });
        return pasteData;
    }
    return null;
};

export const getRawContent = async (storagePath) => {
    const response = await fetch(storagePath);
    if (!response.ok) throw new Error('Failed to fetch raw content.');
    return await response.text();
};


export const getLatestPublicPastes = (limit = 10) => {
    const pastesRef = ref(db, 'pastes');
    const publicPastesQuery = query(pastesRef, orderByChild('visibility'), equalTo('public'), limitToLast(limit));
    return get(publicPastesQuery);
};

export const getUserPublicPastes = (uid) => {
    const pastesRef = ref(db, 'pastes');
    const userPastesQuery = query(pastesRef, orderByChild('authorUid'), equalTo(uid));
    return get(userPastesQuery);
};


export const deletePaste = async (pasteId) => {
    const user = getCurrentUser();
    if (!user) throw new Error("Authentication required.");

    const pasteRef = ref(db, `pastes/${pasteId}`);
    const snapshot = await get(pasteRef);

    if (snapshot.exists()) {
        const pasteData = snapshot.val();
        if (pasteData.authorUid !== user.uid) {
            throw new Error("You are not authorized to delete this paste.");
        }
        await remove(pasteRef);
        
        const { error: deleteError } = await supabase.storage
            .from(supabaseConfig.bucket)
            .remove([pasteData.rawFileName]);
            
        if(deleteError) {
            console.error("Supabase delete error:", deleteError.message);
        }
    }
};

export const postComment = async (pasteId, text) => {
    const user = getCurrentUser();
    if (!user) throw new Error("User not authenticated.");

    const userProfileRef = ref(db, `users/${user.uid}`);
    const userSnapshot = await get(userProfileRef);
    const userData = userSnapshot.val();
    
    const pasteRef = ref(db, `pastes/${pasteId}`);
    const pasteSnapshot = await get(pasteRef);
    const pasteData = pasteSnapshot.val();

    const commentRef = ref(db, `comments/${pasteId}`);
    const newCommentRef = push(commentRef);
    await set(newCommentRef, {
        text: text,
        authorUid: user.uid,
        authorUsername: userData.username,
        authorAvatarUrl: userData.avatarUrl,
        timestamp: TIMESTAMP
    });

    const currentCommentCount = pasteData.stats.comments || 0;
    await update(pasteRef, { 'stats/comments': currentCommentCount + 1 });
};

export const listenForComments = (pasteId, callback) => {
    const commentsRef = ref(db, `comments/${pasteId}`);
    const commentsQuery = query(commentsRef, orderByChild('timestamp'));
    return onValue(commentsQuery, callback);
};

export const getUserProfile = async (username) => {
    const usersRef = ref(db, 'users');
    const userQuery = query(usersRef, orderByChild('username_lowercase'), equalTo(username.toLowerCase()));
    const snapshot = await get(userQuery);
    if (snapshot.exists()) {
        return Object.values(snapshot.val())[0];
    }
    return null;
}