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
            showPopup(translations[window.currentLang].popup.copied);
        }).catch(() => {
            showPopup(translations[window.currentLang].popup.error, 2000);
        });
    });
}