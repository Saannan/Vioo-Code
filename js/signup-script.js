import { handleSignUp } from '../config/auth.js';

const signUpForm = document.getElementById('sign-up-form');
const errorMessage = document.getElementById('error-message');
const submitBtn = signUpForm.querySelector('button[type="submit"]');

signUpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';
    
    const username = signUpForm.username.value.trim();
    const email = signUpForm.email.value.trim();
    const password = signUpForm.password.value;

    try {
        await handleSignUp(username, email, password);
        window.location.href = '/index.html';
    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
});