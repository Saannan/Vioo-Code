import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut as firebaseSignOut,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp, query, collection, where, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { auth, db } from './firebase-init.js';

let currentUser = null;

const fetchUserProfile = async (uid) => {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    return userDocSnap.exists() ? userDocSnap.data() : null;
};

onAuthStateChanged(auth, async (user) => {
    const signedInElements = document.querySelectorAll('.when-signed-in');
    const signedOutElements = document.querySelectorAll('.when-signed-out');
    
    if (user) {
        if (!currentUser || currentUser.uid !== user.uid) {
            currentUser = await fetchUserProfile(user.uid);
        }
        signedInElements.forEach(el => el.style.display = 'flex');
        signedOutElements.forEach(el => el.style.display = 'none');

        const profileLink = document.getElementById('nav-profile-link');
        const userAvatar = document.getElementById('nav-user-avatar');
        if (profileLink && currentUser) {
            profileLink.href = `/profile.html?username=${currentUser.username}`;
        }
        if (userAvatar && currentUser) {
            userAvatar.src = currentUser.avatarUrl;
            userAvatar.alt = currentUser.username;
        }

    } else {
        currentUser = null;
        signedInElements.forEach(el => el.style.display = 'none');
        signedOutElements.forEach(el => el.style.display = 'flex');
    }
});

export const getCurrentUser = () => {
    return currentUser;
};

export const isUserLoggedIn = () => {
    return new Promise(resolve => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            unsubscribe();
            resolve(user);
        });
    });
};

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