import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app-check.js";

const firebaseConfig = {
    apiKey: "AIzaSyCy4pA-GPhj5Ul9nok4gDBDpCSoAfyzGA0",
    authDomain: "dlevent-db.firebaseapp.com",
    databaseURL: "https://dlevent-db-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "dlevent-db",
    storageBucket: "dlevent-db.firebasestorage.app",
    messagingSenderId: "868572467780",
    appId: "1:868572467780:web:788d6f6f04b844253ba211"
};

const app = initializeApp(firebaseConfig);
const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('6LfFWBssAAAAAIzB7v1dQfzBW-MLG9-cDk2RUqGD'),
    isTokenAutoRefreshEnabled: true
});
const db = getDatabase(app);

const STORAGE_KEY = 'dlevent_day12_state';

let PRODUCTS_DB = [];
let TARGET_PRODUCT = null;

const MAX_ATTEMPTS = 6;
let attempts = 0;
let isGameOver = false;
let sessionCount = 1;
let historyGuesses = [];

let nick;
let productName, productImg, priceInput, submitBtn, historyBody, messageEl, restartBtn, attemptsDisplay;
let blocker, blockerTitle, blockerMsg;

document.addEventListener('DOMContentLoaded', () => {
    nick = localStorage.getItem('dlevent_nickname');

    productName = document.getElementById('product-name');
    productImg = document.getElementById('product-img');
    priceInput = document.getElementById('cendle-price-input');
    submitBtn = document.getElementById('submit-guess-btn');
    historyBody = document.getElementById('cendle-history-body');
    messageEl = document.getElementById('message-area');
    restartBtn = document.getElementById('restart-btn');
    attemptsDisplay = document.getElementById('attempts-display');

    blocker = document.getElementById('access-blocker');
    blockerTitle = document.getElementById('blocker-title');
    blockerMsg = document.getElementById('blocker-msg');

    submitBtn.addEventListener('click', handleGuess);
    priceInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleGuess();
    });

    restartBtn.addEventListener('click', () => {
        sessionCount++;
        saveGameState();
        prepareNewRound();
    });

    loadConfig().then(() => {
        start();
    });
});

async function loadConfig() {
    try {
        const res = await fetch('../assets/scripts/day12config.json');
        PRODUCTS_DB = await res.json();
    } catch (e) {
        console.error("Błąd configu:", e);
        messageEl.textContent = "Błąd bazy produktów!";
    }
}

async function start() {
    const access = await checkAccess();
    if (access) {
        loadGameState();
    }
}

function prepareNewRound() {
    if (PRODUCTS_DB.length === 0) return;

    const randomProduct = PRODUCTS_DB[Math.floor(Math.random() * PRODUCTS_DB.length)];
    TARGET_PRODUCT = randomProduct;

    attempts = 0;
    isGameOver = false;
    historyGuesses = [];

    setupUI();
    saveGameState();
}

function setupUI() {
    priceInput.value = '';
    priceInput.disabled = false;
    submitBtn.disabled = false;
    restartBtn.style.display = 'none';
    messageEl.textContent = '';
    attemptsDisplay.textContent = `Próby: ${attempts}/${MAX_ATTEMPTS}`;
    historyBody.innerHTML = '';

    productName.textContent = TARGET_PRODUCT.name;
    productImg.src = TARGET_PRODUCT.img;
    productImg.style.display = 'block';
}

function handleGuess() {
    if (isGameOver) return;

    let rawVal = priceInput.value.replace(',', '.');
    const val = parseFloat(rawVal);

    if (isNaN(val) || val < 0) {
        messageEl.textContent = "Podaj poprawną cenę!";
        return;
    }

    const guessPrice = Math.round(val * 100) / 100;

    attempts++;
    attemptsDisplay.textContent = `Próby: ${attempts}/${MAX_ATTEMPTS}`;

    historyGuesses.push(guessPrice);

    let status = '';
    if (guessPrice === TARGET_PRODUCT.price) status = 'correct';
    else if (guessPrice < TARGET_PRODUCT.price) status = 'higher';
    else status = 'lower';

    updateTable(guessPrice, status);

    if (status === 'correct') {
        winGame();
    } else if (attempts >= MAX_ATTEMPTS) {
        loseGame();
    } else {
        priceInput.value = '';
        priceInput.focus();
    }
    saveGameState();
}

function updateTable(guess, status) {
    const row = document.createElement('tr');
    row.className = 'cendle-row';

    let icon = '';
    let text = '';

    if (status === 'correct') {
        icon = '<span class="win-check">✅</span>';
        text = 'IDEALNIE!';
    } else if (status === 'higher') {
        icon = '<span class="low-arrow">⬆️</span>';
        text = 'Więcej';
    } else {
        icon = '<span class="high-arrow">⬇️</span>';
        text = 'Mniej';
    }

    row.innerHTML = `
        <td>${guess.toFixed(2)} PLN</td>
        <td>${icon} ${text}</td>
    `;
    historyBody.prepend(row);
}

function winGame() {
    isGameOver = true;
    messageEl.textContent = "GRATULACJE! W punkt!";
    messageEl.style.color = "#00ff41";
    priceInput.disabled = true;
    submitBtn.disabled = true;
    saveWin();
}

function loseGame() {
    isGameOver = true;
    const formattedPrice = TARGET_PRODUCT.price.toFixed(2);
    messageEl.textContent = `KONIEC! Cena to: ${formattedPrice} PLN`;
    messageEl.style.color = "#ff3333";
    priceInput.disabled = true;
    submitBtn.disabled = true;
    restartBtn.style.display = 'block';
}

function saveGameState() {
    const state = {
        sessionCount,
        productId: TARGET_PRODUCT ? TARGET_PRODUCT.id : null,
        attempts,
        historyGuesses,
        isGameOver
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGameState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && PRODUCTS_DB.length > 0) {
        const state = JSON.parse(saved);
        sessionCount = state.sessionCount || 1;

        if (state.productId) {
            const found = PRODUCTS_DB.find(p => p.id === state.productId);
            if (!found) { prepareNewRound(); return; }

            TARGET_PRODUCT = found;

            attempts = state.attempts;
            historyGuesses = state.historyGuesses || [];
            isGameOver = state.isGameOver;

            setupUI();

            historyGuesses.forEach(guess => {
                let status = '';
                if (guess === TARGET_PRODUCT.price) status = 'correct';
                else if (guess < TARGET_PRODUCT.price) status = 'higher';
                else status = 'lower';
                updateTable(guess, status);
            });

            if (isGameOver) {
                priceInput.disabled = true;
                submitBtn.disabled = true;
                const last = historyGuesses[historyGuesses.length-1];
                if (last === TARGET_PRODUCT.price) {
                    messageEl.textContent = "GRATULACJE! (Odświeżono)";
                    messageEl.style.color = "#00ff41";
                } else {
                    const formattedPrice = TARGET_PRODUCT.price.toFixed(2);
                    messageEl.textContent = `KONIEC! Cena to: ${formattedPrice} PLN`;
                    messageEl.style.color = "#ff3333";
                    restartBtn.style.display = 'block';
                }
            }
        } else {
            prepareNewRound();
        }
    } else {
        prepareNewRound();
    }
}

async function checkAccess() {
    if (!nick) {
        showBlocker("BRAK NICKU", "Wybierz swój nick na stronie głównej.");
        return false;
    }
    const today = new Date();
    const releaseDate = new Date(2025, 10, 12);

    if (today < releaseDate) {
        showBlocker("NIE OSZUKUJ!", "To zadanie nie jest jeszcze dostępne.");
        return false;
    }
    try {
        const userRef = ref(db, 'users/' + nick);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.completedDays && data.completedDays.includes(12)) {
                showBlocker("UKOŃCZONE", "Ta gra została już ukończona!");
                return false;
            }
        }
    } catch (error) {
        console.error("Błąd bazy:", error);
    }
    return true;
}

function showBlocker(title, msg) {
    if(blocker) {
        blocker.style.display = 'flex';
        blockerTitle.textContent = title;
        blockerMsg.textContent = msg;
    }
}

async function saveWin() {
    if (!nick) return;
    const today = new Date();
    const releaseDate = new Date(2025, 11, 12);
    const isReleaseDay = (today.getDate() === releaseDate.getDate() && today.getMonth() === releaseDate.getMonth() && today.getFullYear() === releaseDate.getFullYear());

    let pointsEarned = 5;
    if (isReleaseDay) {
        if (sessionCount === 1) pointsEarned = 10;
        else if (sessionCount === 2) pointsEarned = 8;
        else pointsEarned = 6;
    }

    const userRef = ref(db, 'users/' + nick);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        let completedDays = data.completedDays || [];
        if (!completedDays.includes(12)) {
            completedDays.push(12);
            const newScore = (data.score || 0) + pointsEarned;
            await update(userRef, { score: newScore, completedDays: completedDays });
            messageEl.textContent += ` (+${pointsEarned} PKT)`;
            setTimeout(() => { showBlocker("UKOŃCZONE", `Zdobyłeś ${pointsEarned} pkt!`); }, 3000);
        } else {
            showBlocker("UKOŃCZONE", "Zadanie już zaliczone wcześniej.");
        }
    }
}