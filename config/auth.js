import {
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth, db } from './firebase-init.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { createUserProfile, checkUsernameExists } from './api.js';

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    const signedInElements = document.querySelectorAll('.when-signed-in');
    const signedOutElements = document.querySelectorAll('.when-signed-out');
    const profileLink = document.getElementById('nav-profile-link');
    const dashboardLink = document.getElementById('nav-dashboard-link');
    const fab = document.getElementById('fab-create-paste');

    if (user) {
        currentUser = user;
        const userProfileRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userProfileRef);
        if (snapshot.exists()) {
            const userData = snapshot.val();
            if (profileLink) {
                profileLink.href = `/profile.html?username=${userData.username}`;
            }
        }
        
        signedInElements.forEach(el => el.style.display = 'block');
        signedOutElements.forEach(el => el.style.display = 'none');
        if (fab) fab.style.display = 'flex';

    } else {
        currentUser = null;
        signedInElements.forEach(el => el.style.display = 'none');
        signedOutElements.forEach(el => el.style.display = 'block');
        if (fab) fab.style.display = 'none';
    }
});

export const handleSignUp = async (username, email, password) => {
    try {
        const usernameExists = await checkUsernameExists(username);
        if (usernameExists) {
            throw new Error("Username is already taken.");
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await createUserProfile(user.uid, username, email);
        window.location.href = '/';
    } catch (error) {
        console.error("Sign up failed:", error);
        alert(error.message);
    }
};

export const handleSignIn = async (email, password) => {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = '/';
    } catch (error) {
        console.error("Sign in failed:", error);
        alert(error.message);
    }
};

export const handleSignOut = async () => {
    try {
        await signOut(auth);
        window.location.href = '/sign-in.html';
    } catch (error) {
        console.error("Sign out failed:", error);
        alert(error.message);
    }
};

export const getCurrentUser = () => {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            unsubscribe();
            resolve(user);
        });
    });
};