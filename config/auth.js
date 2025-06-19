import { 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { auth, db } from './firebase-init.js';
import { doc, getDoc, getDocs, setDoc, serverTimestamp, query, collection, where } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

let currentUser = null;
let authStateResolved = false;
let authStateCallbacks = [];

onAuthStateChanged(auth, async (user) => {
    const signedInElements = document.querySelectorAll('.when-signed-in');
    const signedOutElements = document.querySelectorAll('.when-signed-out');
    
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        currentUser = userDocSnap.exists() ? { uid: user.uid, email: user.email, ...userDocSnap.data() } : null;
        
        signedInElements.forEach(el => el.style.display = 'flex');
        signedOutElements.forEach(el => el.style.display = 'none');

        document.querySelectorAll('.user-avatar').forEach(el => el.src = currentUser.avatarUrl);
        document.querySelectorAll('.user-username').forEach(el => el.textContent = currentUser.username);
        
        const profileLink = document.getElementById('nav-profile-link');
        if (profileLink) profileLink.href = `/profile.html?username=${currentUser.username}`;
        
    } else {
        currentUser = null;
        signedInElements.forEach(el => el.style.display = 'none');
        signedOutElements.forEach(el => el.style.display = 'flex');
    }
    
    authStateResolved = true;
    authStateCallbacks.forEach(cb => cb(currentUser));
    authStateCallbacks = [];
});

export const getCurrentUser = () => {
    return new Promise((resolve) => {
        if (authStateResolved) {
            resolve(currentUser);
        } else {
            authStateCallbacks.push(resolve);
        }
    });
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

    await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username: username,
        username_lowercase: username.toLowerCase(),
        email: email,
        avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=${username}&backgroundColor=1a1a2e,ffc300`,
        about: "Hello, I'm a new Vioo-Code user!",
        createdAt: serverTimestamp()
    });
    return user;
};

export const handleSignIn = async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password);
};

export const handleSignOut = async () => {
    await signOut(auth);
    window.location.href = '/index.html';
};