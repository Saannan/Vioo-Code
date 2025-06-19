import {
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { auth, db } from './firebase-init.js';
import { doc, getDoc, getDocs, setDoc, serverTimestamp, query, collection, where } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    const signedInElements = document.querySelectorAll('.when-signed-in');
    const signedOutElements = document.querySelectorAll('.when-signed-out');
    
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        currentUser = { uid: user.uid, email: user.email, ...userDocSnap.data() };

        signedInElements.forEach(el => el.style.display = 'block');
        signedOutElements.forEach(el => el.style.display = 'none');
        
        document.querySelectorAll('.user-avatar').forEach(el => el.src = currentUser.avatarUrl);
        document.querySelectorAll('.user-username').forEach(el => el.textContent = currentUser.username);
        document.querySelectorAll('.user-email').forEach(el => el.textContent = currentUser.email);
        
        const profileLink = document.getElementById('dropdown-profile-link');
        if(profileLink) {
            profileLink.href = `/profile.html?username=${currentUser.username}`;
        }
    } else {
        currentUser = null;
        signedInElements.forEach(el => el.style.display = 'none');
        signedOutElements.forEach(el => el.style.display = 'block');
    }
});

export function initializeAuthUI() {
    const profileToggle = document.querySelector('.profile-section-toggle');
    const profileDropdown = document.querySelector('.profile-dropdown');
    
    if(profileToggle && profileDropdown) {
        profileToggle.addEventListener('click', () => {
            profileDropdown.classList.toggle('active');
        });
        
        document.addEventListener('click', (e) => {
            if (!profileToggle.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('active');
            }
        });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleSignOut);
    }

    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const sidebar = document.querySelector('.sidebar');
    if(hamburgerBtn && sidebar) {
        hamburgerBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
}

export const getCurrentUser = () => {
    return currentUser;
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
        avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=${username}`,
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