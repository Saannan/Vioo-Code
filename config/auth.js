import { supabase } from './supabase-init.js';
import { checkUsernameExists, getUserProfileByAuthId } from './api.js';

const signedInElements = document.querySelectorAll('.when-signed-in');
const signedOutElements = document.querySelectorAll('.when-signed-out');
const profileLink = document.getElementById('profile-link');
const userProfileNav = document.getElementById('user-profile-nav');

async function handleAuthStateChange(event, session) {
    if (session && session.user) {
        const profile = await getUserProfileByAuthId(session.user.id);
        signedInElements.forEach(el => el.style.display = 'block');
        signedOutElements.forEach(el => el.style.display = 'none');
        if (profileLink && profile) {
            profileLink.href = `/profile.html?user=${profile.username}`;
        }
        if (userProfileNav && profile) {
            userProfileNav.innerHTML = `
                <img src="${profile.avatar_url}" alt="${profile.username}" class="nav-avatar">
                <span>${profile.username}</span>
            `;
        }
    } else {
        signedInElements.forEach(el => el.style.display = 'none');
        signedOutElements.forEach(el => el.style.display = 'block');
    }
}

supabase.auth.onAuthStateChange(handleAuthStateChange);

export async function signUp(username, email, password) {
    const usernameLower = username.toLowerCase();
    const exists = await checkUsernameExists(usernameLower);
    if (exists) {
        throw new Error('Username already taken.');
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username: username
            }
        }
    });

    if (error) throw error;
    return data;
}

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    if (error) throw error;
    return data;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    window.location.href = '/index.html';
}

export function getCurrentUser() {
    return supabase.auth.getUser();
}

handleAuthStateChange();