import { supabase } from './supabase-init.js';

const signedInElements = document.querySelectorAll('.when-signed-in');
const signedOutElements = document.querySelectorAll('.when-signed-out');
const userProfileLink = document.getElementById('user-profile-link');
const userAvatarNav = document.getElementById('user-avatar-nav');

const setupUI = (user) => {
    if (user) {
        signedInElements.forEach(el => el.style.display = 'block');
        signedOutElements.forEach(el => el.style.display = 'none');
        if (userProfileLink) {
            userProfileLink.href = `/profile.html?user=${user.user_metadata.username}`;
        }
        if (userAvatarNav && user.user_metadata.avatar_url) {
            userAvatarNav.src = user.user_metadata.avatar_url;
        }
    } else {
        signedInElements.forEach(el => el.style.display = 'none');
        signedOutElements.forEach(el => el.style.display = 'block');
    }
};

supabase.auth.onAuthStateChange((event, session) => {
    setupUI(session?.user);
});

const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

const signUp = async (username, email, password) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username: username,
                avatar_url: `https://fllyfxfiwajcmkqpvabz.supabase.co/storage/v1/object/public/vioo-code/defaults/default_avatar.png`
            }
        }
    });
    return { data, error };
};

const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    return { data, error };
};

const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
        window.location.href = '/';
    } else {
        console.error('Sign out error:', error);
    }
};

export { getCurrentUser, signUp, signIn, signOut, setupUI };