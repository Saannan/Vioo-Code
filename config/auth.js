import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut as firebaseSignOut,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, getDocs, setDoc, serverTimestamp, query, collection, where } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { auth, db } from './firebase-init.js';

let currentUser = null;

let authReadyResolver;
const authReadyPromise = new Promise(resolve => {
    authReadyResolver = resolve;
});

const fetchUserProfile = async (uid) => {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    return userDocSnap.exists() ? userDocSnap.data() : null;
};

onAuthStateChanged(auth, async (user) => {
    const signedInElements = document.querySelectorAll('.when-signed-in');
    const signedOutElements = document.querySelectorAll('.when-signed-out');
    
    if (user) {
        currentUser = await fetchUserProfile(user.uid);
        signedInElements.forEach(el => {
            el.style.display = 'flex';
            el.classList.remove('hidden');
        });
        signedOutElements.forEach(el => {
            el.style.display = 'none';
            el.classList.add('hidden');
        });
        
        const profileLinks = document.querySelectorAll('.nav-profile-link');
        const userAvatars = document.querySelectorAll('.nav-user-avatar');
        
        if (currentUser) {
            profileLinks.forEach(link => link.href = `/profile.html?username=${currentUser.username}`);
            userAvatars.forEach(avatar => {
                avatar.src = currentUser.avatarUrl;
                avatar.alt = currentUser.username;
            });
        }
    } else {
        currentUser = null;
        signedInElements.forEach(el => {
            el.style.display = 'none';
            el.classList.add('hidden');
        });
        signedOutElements.forEach(el => {
            el.style.display = 'flex';
            el.classList.remove('hidden');
        });
    }
    authReadyResolver(currentUser);
});

export const onAuthReady = () => authReadyPromise;
export const getCurrentUser = () => currentUser;

export const signUp = async (username, email, password) => {
    const lowerCaseUsername = username.toLowerCase();
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where("username_lowercase", "==", lowerCaseUsername));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        throw new Error("Username already exists.");
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username: username,
        username_lowercase: lowerCaseUsername,
        email: email,
        avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=${username}`,
        about: "Hello, I'm a new Vioo-Code user!",
        createdAt: serverTimestamp()
    });
    return user;
};

export const signIn = async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password);
};

export const signOut = async () => {
    await firebaseSignOut(auth);
    window.location.href = '/';
};