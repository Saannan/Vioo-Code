import { handleSignIn } from '../config/auth.js';

const signInForm = document.getElementById('sign-in-form');
const errorMessage = document.getElementById('error-message');
const submitBtn = signInForm.querySelector('button[type="submit"]');

signInForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing In...';
    
    const email = signInForm.email.value;
    const password = signInForm.password.value;

    try {
        await handleSignIn(email, password);
        window.location.href = '/index.html';
    } catch (error) {
        errorMessage.textContent = 'Invalid email or password.';
        errorMessage.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
    }
});
