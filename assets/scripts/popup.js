const emailBtn = document.querySelector(".email-btn");
const popup = document.getElementById("popup");

function showPopup(message, duration = 2000) {
    popup.textContent = message;
    popup.style.opacity = "1";
    setTimeout(() => {
        popup.style.opacity = "0";
    }, duration);
}

if (emailBtn) {
    emailBtn.addEventListener("click", () => {
        navigator.clipboard.writeText("dlafuzji@gmail.com").then(() => {
            let msg = "Skopiowano email!";

            if (typeof currentLang !== 'undefined' && currentLang === 'en' &&
                typeof translations !== 'undefined' && translations && translations.popup) {
                msg = translations.popup.copied;
            }

            showPopup(msg);
        }).catch(() => {
            let msg = "Błąd kopiowania!";
            if (typeof currentLang !== 'undefined' && currentLang === 'en' &&
                typeof translations !== 'undefined' && translations && translations.popup) {
                msg = translations.popup.error;
            }
            showPopup(msg, 2000);
        });
    });
}