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

const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('6LfFWBssAAAAAIzB7v1dQfzBW-MLG9-cDk2RUqGD'),
    isTokenAutoRefreshEnabled: true
});

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const STORAGE_KEY = 'dlevent_day2_state';

let targetAngle = 0;
let attempts = 0;
const MAX_ATTEMPTS = 4;
let isGameOver = false;
let sessionCount = 1;
let historyGuesses = [];

let nick;
let canvas, ctx;
let guessInput, submitBtn, restartBtn, attemptsDisplay, messageEl;
let historyBody;
let blocker, blockerTitle, blockerMsg;

document.addEventListener('DOMContentLoaded', () => {
    nick = localStorage.getItem('dlevent_nickname');

    canvas = document.getElementById('angle-canvas');
    ctx = canvas.getContext('2d');
    guessInput = document.getElementById('guess-input');
    submitBtn = document.getElementById('submit-guess');
    restartBtn = document.getElementById('restart-btn');
    attemptsDisplay = document.getElementById('attempts-display');
    messageEl = document.getElementById('message-area');
    historyBody = document.getElementById('history-body');

    blocker = document.getElementById('access-blocker');
    blockerTitle = document.getElementById('blocker-title');
    blockerMsg = document.getElementById('blocker-msg');

    submitBtn.addEventListener('click', handleGuess);
    guessInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleGuess();
    });

    restartBtn.addEventListener('click', () => {
        sessionCount++;
        initGame();
    });

    start();
});

async function start() {
    const access = await checkAccess();
    if (access) {
        loadGameState();
    }
}

async function checkAccess() {
    if (!nick) {
        showBlocker("BRAK NICKU", "Wybierz swój nick na stronie głównej.");
        return false;
    }

    const today = new Date();
    const releaseDate = new Date(2025, 11, 2);

    if (today < releaseDate) {
        showBlocker("NIE OSZUKUJ!", "To zadanie nie jest jeszcze dostępne.");
        return false;
    }

    try {
        const userRef = ref(db, 'users/' + nick);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.completedDays && data.completedDays.includes(2)) {
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

function saveGameState() {
    const state = {
        targetAngle,
        attempts,
        historyGuesses,
        sessionCount,
        isGameOver
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGameState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const state = JSON.parse(saved);
        targetAngle = state.targetAngle;
        attempts = state.attempts;
        historyGuesses = state.historyGuesses || [];
        sessionCount = state.sessionCount || 1;
        isGameOver = state.isGameOver;

        guessInput.value = '';
        if(historyBody) historyBody.innerHTML = '';

        attemptsDisplay.textContent = `Próby: ${attempts}/${MAX_ATTEMPTS}`;

        if (historyGuesses.length > 0) {
            drawGame(historyGuesses[historyGuesses.length - 1]);
        } else {
            drawGame();
        }

        historyGuesses.forEach(g => addHistoryRow(g, targetAngle));

        if (isGameOver) {
            guessInput.disabled = true;
            submitBtn.disabled = true;
            if (historyGuesses[historyGuesses.length - 1] === targetAngle) {
                messageEl.textContent = `PERFEKCYJNIE! (Odświeżono)`;
                messageEl.style.color = "#00ff41";
            } else {
                messageEl.textContent = `KONIEC! Kąt to: ${targetAngle}°`;
                messageEl.style.color = "#ff3333";
                restartBtn.style.display = 'block';
            }
        }
    } else {
        initGame();
    }
}

function initGame() {
    targetAngle = Math.floor(Math.random() * 340) + 10;
    attempts = 0;
    isGameOver = false;
    historyGuesses = [];

    guessInput.value = '';
    guessInput.disabled = false;
    submitBtn.disabled = false;
    restartBtn.style.display = 'none';
    messageEl.textContent = '';
    attemptsDisplay.textContent = `Próby: ${attempts}/${MAX_ATTEMPTS}`;

    if(historyBody) historyBody.innerHTML = '';

    drawGame();
    saveGameState();
}

function drawGame(userGuessAngle) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = 100;

    ctx.beginPath();
    ctx.arc(cx, cy, radius + 20, 0, 2 * Math.PI);
    ctx.fillStyle = "#0a0a0a";
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff";
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 2;
    ctx.stroke();

    const targetRad = -targetAngle * (Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + radius * Math.cos(targetRad), cy + radius * Math.sin(targetRad));
    ctx.strokeStyle = "#00ff41";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 30, targetRad, 0);
    ctx.strokeStyle = "rgba(0, 255, 65, 0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();

}

function addHistoryRow(guess, target) {
    if (!historyBody) return;

    let icon = "";
    let hintText = "";
    let iconColor = "#00ccff";

    if (guess === target) {
        icon = "✅";
        hintText = "IDEALNIE!";
        iconColor = "#00ff41";
    } else {
        if (target > guess) {
            icon = "⬆️";
            hintText = "Więcej";
        } else {
            icon = "⬇️";
            hintText = "Mniej";
        }
    }

    const row = document.createElement('tr');
    row.className = "history-row";
    row.innerHTML = `
        <td>${guess}°</td>
        <td style="color: ${iconColor}">${icon}</td>
        <td class="hint-text">${hintText}</td>
    `;

    historyBody.prepend(row);
}

function handleGuess() {
    if (isGameOver) return;

    const val = guessInput.value;
    if (val === '') return;

    let guess = parseInt(val);
    if (guess < 0) guess = 0;
    if (guess > 360) guess = 360;

    attempts++;
    historyGuesses.push(guess);
    attemptsDisplay.textContent = `Próby: ${attempts}/${MAX_ATTEMPTS}`;

    let diff = Math.abs(targetAngle - guess);
    if (diff > 180) {
        diff = 360 - diff;
    }

    drawGame();
    addHistoryRow(guess, targetAngle);

    const MARGIN_OF_ERROR = 0;

    if (diff <= MARGIN_OF_ERROR) {
        isGameOver = true;
        messageEl.textContent = `PERFEKCYJNIE! To jest ${targetAngle}°.`;
        messageEl.style.color = "#00ff41";
        guessInput.disabled = true;
        submitBtn.disabled = true;
        saveWin();
    } else {
        if (attempts >= MAX_ATTEMPTS) {
            isGameOver = true;
            messageEl.textContent = `KONIEC! Kąt to: ${targetAngle}°`;
            messageEl.style.color = "#ff3333";
            guessInput.disabled = true;
            submitBtn.disabled = true;
            restartBtn.style.display = 'block';
        } else {
            guessInput.value = '';
            guessInput.focus();
        }
    }
    saveGameState();
}

async function saveWin() {
    if (!nick) return;

    const today = new Date();
    const releaseDate = new Date(2025, 11, 2);
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

        if (!completedDays.includes(2)) {
            completedDays.push(2);
            const newScore = (data.score || 0) + pointsEarned;

            await update(userRef, {
                score: newScore,
                completedDays: completedDays
            });

            messageEl.textContent += ` (+${pointsEarned} PKT)`;
            setTimeout(() => {
                showBlocker("UKOŃCZONE", `Zdobyłeś ${pointsEarned} pkt!`);
            }, 3000);
        } else {
            showBlocker("UKOŃCZONE", "Zadanie już zaliczone wcześniej.");
        }
    }
    saveGameState();
}