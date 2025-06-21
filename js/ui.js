export function showPopup(title, message) {
    const modal = document.getElementById('popup-modal');
    const titleEl = document.getElementById('popup-title');
    const messageEl = document.getElementById('popup-message');
    const closeBtn = document.getElementById('popup-close');

    titleEl.textContent = title;
    messageEl.textContent = message;

    modal.classList.add('visible');

    const closeHandler = () => {
        modal.classList.remove('visible');
        closeBtn.removeEventListener('click', closeHandler);
        modal.removeEventListener('click', overlayClickHandler);
    };
    
    const overlayClickHandler = (e) => {
        if (e.target === modal) {
            closeHandler();
        }
    };

    closeBtn.addEventListener('click', closeHandler);
    modal.addEventListener('click', overlayClickHandler);
}