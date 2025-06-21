import { db, dbRef, ref, get, set, child, update, query, orderByChild, equalTo, push, serverTimestamp } from './config.js';

let notifTimeout;
function showNotif(msg, type = 'info') {
    const notifEl = document.getElementById('notif');
    if (!notifEl) return;
    
    notifEl.textContent = msg;
    notifEl.className = `fixed top-5 right-5 px-4 py-2 rounded-md text-white font-medium shadow-md z-50 transition-opacity duration-500 ease-in-out opacity-0`;
    notifEl.classList.add('show', type);

    if (notifTimeout) clearTimeout(notifTimeout);
    notifTimeout = setTimeout(() => {
        notifEl.classList.remove('show');
        notifEl.classList.add('hide');
        setTimeout(() => {
            if (notifEl.classList.contains('hide')) {
                notifEl.style.display = 'none';
                notifEl.className = `fixed top-5 right-5 px-4 py-2 rounded-md text-white font-medium shadow-md z-50 hidden transition-opacity duration-500 ease-in-out opacity-0 ${type}`;
            }
        }, 500);
    }, 3000);
}

function getUserId() {
    return localStorage.getItem('vcode_id');
}

function getUsername() {
    return localStorage.getItem('vcode_username');
}

function generateRandomId(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

async function getUsernameByUserId(userId) {
    const usersSnapshot = await get(child(dbRef, 'users'));
    let username = null;
    usersSnapshot.forEach(userSnapshot => {
        if (userSnapshot.child('id').val() === userId) {
            username = userSnapshot.key;
            return true;
        }
    });
    return username;
}

async function getUserData(username) {
    const snapshot = await get(child(dbRef, `users/${username}`));
    return snapshot.exists() ? snapshot.val() : null;
}

document.addEventListener('DOMContentLoaded', () => {
    const loggedInUserId = getUserId();

    function checkAuthRedirect() {
      if (!getUserId()) {
        window.location.href = 'sign-in.html';
        return false;
      }
      return true;
    }
    
    if (document.querySelector('body.bg-neutral-900')) {
        const usernameInput = document.getElementById('username');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        if (usernameInput) { 
            window.register = async function () {
                const username = usernameInput.value.trim();
                const email = emailInput.value.trim();
                const password = passwordInput.value;
                const notif = document.getElementById('notif');

                if (!username || !email || !password) {
                    showNotif('All fields are required', 'error');
                    return;
                }

                try {
                    const snapshot = await get(child(dbRef, 'users'));
                    let isDuplicate = false;
                    snapshot.forEach(childSnap => {
                        const userData = childSnap.val();
                        if (userData.username === username || userData.email === email) {
                            isDuplicate = true;
                        }
                    });

                    if (isDuplicate) {
                        showNotif('Username or email already in use', 'error');
                        return;
                    }

                    const userId = generateRandomId(8);
                    const defaultAvatarUrl = 'https://files.catbox.moe/nwvkbt.png';
                    const usernamePath = username.replace(/\s+/g, '_');

                    await set(ref(db, 'users/' + usernamePath), {
                        username, email, password, avatarUrl: defaultAvatarUrl, about: 'Available', id: userId
                    });

                    showNotif('Successful registration! Redirecting...', 'success');
                    setTimeout(() => { window.location.href = 'sign-in.html'; }, 1500);
                } catch (err) {
                    showNotif('There is an error: ' + err, 'error');
                }
            }
        } else { 
             window.login = async () => {
                const email = emailInput.value.trim().toLowerCase();
                const password = passwordInput.value;
                const notif = document.getElementById('notif');

                if (!email || !password) return showNotif('Email and password cannot be empty', 'error');

                try {
                    const snapshot = await get(child(dbRef, 'users'));
                    if (!snapshot.exists()) return showNotif('Account data not found', 'error');

                    let found = false;
                    snapshot.forEach(user => {
                        const data = user.val();
                        if (data.email === email && data.password === password) {
                            found = true;
                            localStorage.setItem('vcode_username', data.username);
                            localStorage.setItem('vcode_email', data.email);
                            localStorage.setItem('vcode_id', data.id);
                            showNotif('Login successful! Redirecting...', 'success');
                            setTimeout(() => { window.location.href = 'index.html'; }, 1500);
                        }
                    });

                    if (!found) showNotif('Incorrect email or password', 'error');
                } catch (err) {
                    showNotif('An error occurred while logging in', 'error');
                }
            };
        }
    }
    
    if (document.getElementById('pasteContent') && (window.location.pathname.includes('index.html') || window.location.pathname.includes('code.html') || window.location.pathname === '/')) {
        async function loadPaste() {
            const urlParams = new URLSearchParams(window.location.search);
            const pasteId = urlParams.get('id');

            const titleEl = document.getElementById('pasteTitleDisplay');
            const contentEl = document.getElementById('pasteContent');
            const descriptionEl = document.getElementById('pasteDescriptionDisplay');
            const tagsEl = document.getElementById('pasteTagsDisplay');
            const languageEl = document.getElementById('pasteLanguageDisplay');
            const pasteOwnerAvatar = document.getElementById('pasteOwnerAvatar');
            const pasteOwnerUsername = document.getElementById('pasteOwnerUsername');
            const pasteOwnerAbout = document.getElementById('pasteOwnerAbout');
            const ownerInfoLoading = document.getElementById('ownerInfoLoading');
            const pasteActionsContainer = document.querySelector('.paste-actions');
            
            if (!pasteId) {
                titleEl.textContent = "Error: No Paste ID provided";
                contentEl.textContent = "Please provide a paste ID in the URL (e.g., code?id=your_paste_id).";
                showNotif('No Paste ID specified in URL.', 'error');
                return;
            }

            try {
                const queryRef = query(ref(db, 'pastes'), orderByChild('id'), equalTo(pasteId));
                const snapshot = await get(queryRef);

                if (snapshot.exists()) {
                    let pasteData;
                    snapshot.forEach((childSnapshot) => { pasteData = childSnapshot.val(); });

                    if (pasteData) {
                        titleEl.textContent = pasteData.title || 'Untitled Paste';
                        descriptionEl.innerHTML = `<strong>Description:</strong> ${pasteData.description || 'No description.'}`;
                        languageEl.innerHTML = `<strong>Language:</strong> <span>${pasteData.language || 'plaintext'}</span>`;
                        tagsEl.innerHTML = `<strong>Tags:</strong> <span>${pasteData.tag ? pasteData.tag.split(',').map(tag => `<span>${tag.trim()}</span>`).join('') : 'No tags.'}</span>`;
                        contentEl.textContent = pasteData.content || 'Empty paste.';
                        contentEl.className = `language-${(pasteData.language || 'plaintext').toLowerCase()}`;

                        const ownerUsernameValue = await getUsernameByUserId(pasteData.author);
                        if (ownerUsernameValue) {
                            const ownerData = await getUserData(ownerUsernameValue);
                            if (ownerData) {
                                pasteOwnerAvatar.src = ownerData.avatarUrl || '';
                                pasteOwnerAvatar.style.display = ownerData.avatarUrl ? 'block' : 'none';
                                pasteOwnerAbout.textContent = ownerData.about || '';
                            }
                            pasteOwnerUsername.textContent = ownerUsernameValue;
                            pasteOwnerUsername.style.display = 'block';
                            ownerInfoLoading.style.display = 'none';

                            if (loggedInUserId === pasteData.author) {
                                const manageButton = document.createElement('button');
                                manageButton.innerHTML = '<i class="fas fa-cog"></i>&nbsp;&nbsp;Manage';
                                manageButton.className = 'bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-2 rounded-md text-sm';
                                manageButton.style.backgroundColor = '#404040';
                                manageButton.onclick = () => { window.location.href = `edit.html?id=${pasteId}`; };
                                pasteActionsContainer.prepend(manageButton);
                            }
                        } else {
                            ownerInfoLoading.textContent = "Creator info not found.";
                        }
                    } else {
                         showNotif('Paste not found.', 'error');
                    }
                } else {
                     showNotif('Paste not found.', 'error');
                }
            } catch (error) {
                showNotif('Error loading paste: ' + error.message, 'error');
            }
        }
        
        loadPaste().then(() => {
            if (window.Prism) {
                Prism.highlightAll();
            }
        });

        const copyButton = document.getElementById('copyButton');
        copyButton.addEventListener('click', () => {
            const content = document.getElementById('pasteContent').innerText;
            navigator.clipboard.writeText(content).then(() => {
                showNotif('Copied to clipboard!', 'success');
            }, () => {
                showNotif('Failed to copy.', 'error');
            });
        });
    }

    if (document.getElementById('account-info')) {
        checkAuthRedirect();
        let currentUsername;
        let aboutSaveTimeout;

        async function saveAbout(username, aboutText) {
            try {
                await update(ref(db, `users/${username}`), { about: aboutText });
                showNotif('About information saved!', 'success');
            } catch (error) {
                showNotif('Error saving about information.', 'error');
            }
        }

        async function loadAccountInfo(username) {
            const usernameDisplay = document.getElementById('usernameDisplay');
            const idSpan = document.getElementById('idDisplay');
            const emailSpan = document.getElementById('emailDisplay');
            const avatarImage = document.getElementById('avatarImage');
            const aboutDisplay = document.getElementById('aboutDisplay');
            
            currentUsername = username;
            usernameDisplay.textContent = username;
            
            try {
                const snapshot = await get(child(dbRef, `users/${username}`));
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    idSpan.textContent = userData.id || 'Not found';
                    emailSpan.textContent = userData.email || 'Not found';
                    avatarImage.src = userData.avatarUrl || 'https://files.catbox.moe/nwvkbt.png';
                    aboutDisplay.textContent = userData.about || '';
                    
                    if (userData.id === loggedInUserId) {
                        aboutDisplay.contentEditable = true;
                        aboutDisplay.addEventListener('input', () => {
                            if (aboutDisplay.textContent.length > 25) {
                                aboutDisplay.textContent = aboutDisplay.textContent.slice(0, 25);
                            }
                            clearTimeout(aboutSaveTimeout);
                            aboutSaveTimeout = setTimeout(() => saveAbout(currentUsername, aboutDisplay.textContent), 5000);
                        });
                    }
                } else {
                    showNotif('Could not find user data.', 'error');
                }
            } catch (error) {
                showNotif('Error loading account details: ' + error.message, 'error');
            }
        }
        
        loadAccountInfo(getUsername());

        window.logout = function() {
            localStorage.removeItem('vcode_username');
            localStorage.removeItem('vcode_email');
            localStorage.removeItem('vcode_id');
            showNotif('Logged out successfully. Redirecting...', 'info');
            setTimeout(() => { window.location.href = 'sign-in.html'; }, 1500);
        }
    }

    if (document.getElementById('createPasteForm')) {
        if (!checkAuthRedirect()) return;
        
        const form = document.getElementById('createPasteForm');
        const submitButton = document.getElementById('submitButton');
        const tagsInput = document.getElementById('pasteTags');
        
        tagsInput.addEventListener('input', function() {
            const commaCount = (this.value.match(/,/g) || []).length;
            if (commaCount > 2) {
                this.value = this.value.substring(0, this.value.lastIndexOf(','));
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const title = document.getElementById('pasteTitle').value.trim();
            const pasteAuthorName = document.getElementById('pasteAuthor').value.trim();
            const descriptionPaste = document.getElementById('pasteDescription').value.trim();
            const tagPaste = document.getElementById('pasteTags').value.trim();
            const langPaste = document.getElementById('pasteLanguage').value;
            const content = document.getElementById('pasteContent').value.trim();
            const pasteId = generateRandomId(6);

            if (!content) return showNotif('Paste content cannot be empty.', 'error');
            
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>&nbsp;&nbsp;Saving...';
            
            const newPasteRef = push(ref(db, 'pastes'));
            try {
                await set(newPasteRef, {
                    title: title || "Untitled",
                    author: getUserId(),
                    authorName: pasteAuthorName || getUsername(),
                    description: descriptionPaste,
                    tag: tagPaste,
                    language: langPaste,
                    content: content,
                    timestamp: serverTimestamp(),
                    id: pasteId
                });
                showNotif('Paste created! Redirecting...', 'success');
                setTimeout(() => { window.location.href = `code.html?id=${pasteId}`; }, 1500);
            } catch (error) {
                showNotif('Error saving paste: ' + error.message, 'error');
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-save"></i>&nbsp;&nbsp;Save Paste';
            }
        });
    }

    if (document.getElementById('managePasteForm')) {
        if (!checkAuthRedirect()) return;

        const urlParams = new URLSearchParams(window.location.search);
        const pasteId = urlParams.get('id');

        async function loadPasteDataForEdit() {
            if (!pasteId) return showNotif('No Paste ID specified.', 'error');
            
            document.getElementById('pasteId').value = pasteId;
            document.getElementById('backToPaste').href = `code.html?id=${pasteId}`;

            try {
                const queryRef = query(ref(db, 'pastes'), orderByChild('id'), equalTo(pasteId));
                const snapshot = await get(queryRef);

                if (snapshot.exists()) {
                    let pasteData;
                    snapshot.forEach((childSnapshot) => { pasteData = childSnapshot.val(); });

                    if (pasteData.author !== loggedInUserId) {
                        showNotif('You are not authorized to edit this.', 'error');
                        window.location.href = `code.html?id=${pasteId}`;
                        return;
                    }
                    
                    document.getElementById('title').value = pasteData.title || '';
                    document.getElementById('authorName').value = pasteData.authorName || '';
                    document.getElementById('description').value = pasteData.description || '';
                    document.getElementById('language').value = pasteData.language || '';
                    document.getElementById('tags').value = pasteData.tag || '';
                    document.getElementById('content').value = pasteData.content || '';
                } else {
                    showNotif('Paste not found.', 'error');
                }
            } catch (error) {
                showNotif('Error loading paste data: ' + error.message, 'error');
            }
        }

        async function savePasteChanges(event) {
            event.preventDefault();
            const currentPasteId = document.getElementById('pasteId').value;
            if (!currentPasteId) return showNotif('Paste ID is missing.', 'error');

            const tagArray = document.getElementById('tags').value.split(',').map(t => t.trim()).filter(Boolean);
            if (tagArray.length > 3) return showNotif('Maksimum 3 tag (2 koma).', 'error');
            
            try {
                const queryRef = query(ref(db, 'pastes'), orderByChild('id'), equalTo(currentPasteId));
                const snapshot = await get(queryRef);

                if (snapshot.exists()) {
                    let pasteKey;
                    snapshot.forEach((childSnapshot) => { pasteKey = childSnapshot.key; });
                    
                    if(pasteKey) {
                        const pasteUpdate = {
                            title: document.getElementById('title').value,
                            authorName: document.getElementById('authorName').value,
                            description: document.getElementById('description').value,
                            language: document.getElementById('language').value,
                            tag: tagArray.join(','),
                            content: document.getElementById('content').value
                        };
                        await update(ref(db, `pastes/${pasteKey}`), pasteUpdate);
                        showNotif('Paste updated successfully!', 'success');
                        setTimeout(() => { window.location.href = `code.html?id=${currentPasteId}`; }, 1500);
                    }
                } else {
                    showNotif('Paste not found.', 'error');
                }
            } catch (error) {
                showNotif('Error updating paste: ' + error.message, 'error');
            }
        }
        
        loadPasteDataForEdit();
        document.getElementById('managePasteForm').addEventListener('submit', savePasteChanges);
    }
});