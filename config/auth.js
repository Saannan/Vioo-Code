import { 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut as firebaseSignOut 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { auth, db } from './firebase-init.js';
import { ref, set, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { showPopup } from "../js/ui.js";

const signedInElements = document.querySelectorAll('.when-signed-in');
const signedOutElements = document.querySelectorAll('.when-signed-out');
const userDetailsElements = document.querySelectorAll('.user-details');
const authStateReady = new Promise(resolve => {
    onAuthStateChanged(auth, async user => {
        if (user) {
            const userProfileRef = ref(db, 'users/' + user.uid);
            const snapshot = await get(userProfileRef);
            if (snapshot.exists()) {
                const userData = snapshot.val();
                userDetailsElements.forEach(el => {
                    const avatar = el.querySelector('.user-avatar');
                    const username = el.querySelector('.user-username');
                    if (avatar) avatar.src = userData.avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${userData.username}`;
                    if (username) username.textContent = userData.username;
                });
            }
            signedInElements.forEach(el => el.style.display = 'block');
            signedOutElements.forEach(el => el.style.display = 'none');
        } else {
            signedInElements.forEach(el => el.style.display = 'none');
            signedOutElements.forEach(el => el.style.display = 'block');
        }
        resolve(user);
    });
});

export const requireAuth = async (isAuthPage = false) => {
    const user = await authStateReady;
    const isProtectedPage = !isAuthPage && !['/sign-in.html', '/sign-up.html'].includes(window.location.pathname);

    if (isProtectedPage && !user) {
        window.location.href = '/sign-in.html';
        return null;
    }
    if (isAuthPage && user) {
        window.location.href = '/profile.html';
        return null;
    }
    return user;
};

export const checkUsernameExists = async (username) => {
    const usernameLower = username.toLowerCase();
    const usersRef = ref(db, 'users');
    const usernameQuery = query(usersRef, orderByChild('username_lowercase'), equalTo(usernameLower));
    const snapshot = await get(usernameQuery);
    return snapshot.exists();
};

export const signUp = async (username, email, password) => {
    try {
        const usernameExists = await checkUsernameExists(username);
        if (usernameExists) {
            showPopup('Error', 'Username is already taken. Please choose another one.');
            return null;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userProfile = {
            uid: user.uid,
            username: username,
            username_lowercase: username.toLowerCase(),
            email: user.email,
            avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=${username}`,
            about: "Hello, I'm a new user on Vioo-Code!",
            createdAt: new Date().toISOString()
        };
        await set(ref(db, 'users/' + user.uid), userProfile);
        return user;
    } catch (error) {
        showPopup('Sign-up Failed', error.message);
        return null;
    }
};

export const signIn = async (email, password) => {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = '/profile.html';
    } catch (error) {
        showPopup('Sign-in Failed', error.message);
    }
};

export const signOut = async () => {
    try {
        await firebaseSignOut(auth);
        window.location.href = '/sign-in.html';
    } catch (error) {
        showPopup('Logout Failed', error.message);
    }
};

export const getCurrentUser = () => {
    return auth.currentUser;
};