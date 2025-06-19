import { 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { auth, db } from './firebase-init.js';
import { doc, getDoc, getDocs, setDoc, serverTimestamp, query, collection, where } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

let currentUserCache = null;

const updateUserUI = (user, userData) => {
    document.body.classList.add('auth-state-known');
    if (user) {
        document.body.classList.add('signed-in');
        document.body.classList.remove('signed-out');
        
        const avatarElements = document.querySelectorAll('.user-avatar-img');
        const usernameElements = document.querySelectorAll('.user-username-text');
        
        avatarElements.forEach(el => el.src = userData.avatarUrl);
        usernameElements.forEach(el => el.textContent = userData.username);

    } else {
        document.body.classList.add('signed-out');
        document.body.classList.remove('signed-in');
    }
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (currentUserCache && currentUserCache.uid === user.uid) {
            updateUserUI(user, currentUserCache);
        } else {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                currentUserCache = { uid: user.uid, email: user.email, ...userDocSnap.data() };
                updateUserUI(user, currentUserCache);
            }
        }
    } else {
        currentUserCache = null;
        updateUserUI(null, null);
    }
});

export const getCurrentUser = () => {
    return currentUserCache;
};

export const handleSignUp = async (username, email, password) => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username_lowercase", "==", username.toLowerCase()));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error("Username already exists.");
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: username });

    const newUserProfile = {
        uid: user.uid,
        username: username,
        username_lowercase: username.toLowerCase(),
        email: email,
        avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(username)}`,
        about: "Hello, I'm a new Vioo-Code user!",
        createdAt: serverTimestamp()
    };
    
    await setDoc(doc(db, "users", user.uid), newUserProfile);
    currentUserCache = newUserProfile;
    return user;
};

export const handleSignIn = async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password);
};

export const handleSignOut = async () => {
    await signOut(auth);
    window.location.href = '/index.html';
};