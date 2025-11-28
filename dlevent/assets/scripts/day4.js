import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

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
const db = getDatabase(app);

let ALL_COUNTRIES = [];
let TARGET_COUNTRY = null;

const MAX_ATTEMPTS = 6;
let attempts = 0;
let isGameOver = false;
let sessionCount = 1;

let revealedMask = null;

let targetPixelData = null;

let nick;
let canvas, ctx;
let searchInput, searchResults, historyBody, messageEl, restartBtn, attemptsDisplay;
let blocker, blockerTitle, blockerMsg;

const targetImage = new Image();
targetImage.crossOrigin = "Anonymous";

document.addEventListener('DOMContentLoaded', () => {
    nick = localStorage.getItem('dlevent_nickname');

    canvas = document.getElementById('flag-canvas');
    ctx = canvas.getContext('2d', { willReadFrequently: true });

    searchInput = document.getElementById('flag-search-input');
    searchResults = document.getElementById('flag-search-results');
    historyBody = document.getElementById('flag-history-body');
    messageEl = document.getElementById('message-area');
    restartBtn = document.getElementById('restart-btn');
    attemptsDisplay = document.getElementById('attempts-display');

    blocker = document.getElementById('access-blocker');
    blockerTitle = document.getElementById('blocker-title');
    blockerMsg = document.getElementById('blocker-msg');

    searchInput.addEventListener('input', (e) => searchCountries(e.target.value));
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.flag-search-container')) {
            searchResults.style.display = 'none';
        }
    });

    restartBtn.addEventListener('click', () => {
        sessionCount++;
        prepareNewRound();
    });

    fetchAllCountries().then(() => {
        start();
    });
});

async function fetchAllCountries() {
    try {
        const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,translations');
        const data = await res.json();

        ALL_COUNTRIES = data.map(country => {
            const plName = country.translations?.pol?.common || country.name.common;
            return {
                name: plName,
                code: country.cca2.toLowerCase()
            };
        });
        ALL_COUNTRIES.sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
        console.error("Błąd API:", e);
        messageEl.textContent = "Błąd ładowania flag!";
    }
}

async function start() {
    const access = await checkAccess();
    if (access) {
        prepareNewRound();
    }
}

async function checkAccess() {
    if (!nick) {
        showBlocker("BRAK NICKU", "Wybierz swój nick na stronie głównej.");
        return false;
    }
    const today = new Date();
    const releaseDate = new Date(2025, 11, 4);

    if (today < releaseDate) {
        showBlocker("NIE OSZUKUJ!", "To zadanie nie jest jeszcze dostępne.");
        return false;
    }
    try {
        const userRef = ref(db, 'users/' + nick);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.completedDays && data.completedDays.includes(4)) {
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

function prepareNewRound() {
    if (ALL_COUNTRIES.length === 0) return;

    const randomCountry = ALL_COUNTRIES[Math.floor(Math.random() * ALL_COUNTRIES.length)];
    TARGET_COUNTRY = randomCountry;

    targetImage.src = `https://flagcdn.com/w640/${randomCountry.code}.png`;

    messageEl.textContent = "Przygotowywanie flagi...";
    searchInput.disabled = true;

    targetImage.onload = () => {
        const totalPixels = canvas.width * canvas.height;
        revealedMask = new Uint8Array(totalPixels).fill(0);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        tempCtx.drawImage(targetImage, 0, 0, canvas.width, canvas.height);
        targetPixelData = tempCtx.getImageData(0, 0, canvas.width, canvas.height).data;

        messageEl.textContent = "";
        initGameUI();
    };
}

function initGameUI() {
    attempts = 0;
    isGameOver = false;
    searchInput.value = '';
    searchInput.disabled = false;
    restartBtn.style.display = 'none';
    attemptsDisplay.textContent = `Próby: ${attempts}/${MAX_ATTEMPTS}`;

    renderHistoryTable();
    drawCanvas();
}

function drawCanvas() {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const canvasImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = canvasImageData.data;

    for (let i = 0; i < revealedMask.length; i++) {
        if (revealedMask[i] === 1) {
            const targetIndex = i * 4;
            data[targetIndex] = targetPixelData[targetIndex];
            data[targetIndex + 1] = targetPixelData[targetIndex + 1];
            data[targetIndex + 2] = targetPixelData[targetIndex + 2];
            data[targetIndex + 3] = 255;
        }
    }

    ctx.putImageData(canvasImageData, 0, 0);
}

function colorDistance(r1, g1, b1, r2, g2, b2) {
    return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2));
}

function searchCountries(query) {
    if (query.length < 2) {
        searchResults.style.display = 'none';
        return;
    }
    const lowerQuery = query.toLowerCase();
    const results = ALL_COUNTRIES.filter(c => c.name.toLowerCase().includes(lowerQuery));

    searchResults.innerHTML = '';
    if (results.length > 0) {
        searchResults.style.display = 'block';
        results.slice(0, 10).forEach(country => {
            const div = document.createElement('div');
            div.className = 'flag-search-item';
            div.innerHTML = `
                <img src="https://flagcdn.com/w40/${country.code}.png" class="mini-flag">
                <span>${country.name}</span>
            `;
            div.addEventListener('click', () => prepareGuess(country));
            searchResults.appendChild(div);
        });
    } else {
        searchResults.style.display = 'none';
    }
}

function prepareGuess(country) {
    searchResults.style.display = 'none';
    searchInput.value = '';

    if (country.code === TARGET_COUNTRY.code) {
        handleWin(country);
        return;
    }

    const guessImg = new Image();
    guessImg.crossOrigin = "Anonymous";
    guessImg.src = `https://flagcdn.com/w640/${country.code}.png`;

    guessImg.onload = () => {
        processGuess(country, guessImg);
    };
}

function processGuess(country, guessImg) {
    if (isGameOver) return;

    attempts++;
    attemptsDisplay.textContent = `Próby: ${attempts}/${MAX_ATTEMPTS}`;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    tempCtx.drawImage(guessImg, 0, 0, canvas.width, canvas.height);

    const guessData = tempCtx.getImageData(0, 0, canvas.width, canvas.height).data;

    let matchedPixelsInThisGuess = 0;
    const totalPixels = canvas.width * canvas.height;

    for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;

        const tr = targetPixelData[idx];
        const tg = targetPixelData[idx + 1];
        const tb = targetPixelData[idx + 2];
        const ta = targetPixelData[idx + 3];

        const gr = guessData[idx];
        const gg = guessData[idx + 1];
        const gb = guessData[idx + 2];
        const ga = guessData[idx + 3];

        if (ta < 128 || ga < 128) continue;

        if (colorDistance(tr, tg, tb, gr, gg, gb) < 60) {
            if (revealedMask[i] === 0) {
            }

            revealedMask[i] = 1;

            matchedPixelsInThisGuess++;
        }
    }

    const percent = Math.round((matchedPixelsInThisGuess / totalPixels) * 100);

    drawCanvas();
    updateHistoryTable(country, percent);

    if (attempts >= MAX_ATTEMPTS) {
        loseGame();
    }
}

function handleWin(country) {
    attempts++;
    attemptsDisplay.textContent = `Próby: ${attempts}/${MAX_ATTEMPTS}`;

    revealedMask.fill(1);
    drawCanvas();
    updateHistoryTable(country, 100);
    winGame();
}

function renderHistoryTable() {
    historyBody.innerHTML = '';
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const row = document.createElement('tr');
        row.className = 'flag-history-row empty-row';
        row.innerHTML = `<td></td><td></td><td></td>`;
        historyBody.appendChild(row);
    }
}

function updateHistoryTable(country, percent) {
    const rows = historyBody.children;
    const currentRow = rows[attempts - 1];
    if (currentRow) {
        currentRow.classList.remove('empty-row');
        currentRow.innerHTML = `
            <td>${country.name}</td>
            <td>${percent}%</td>
            <td><img src="https://flagcdn.com/w40/${country.code}.png" class="mini-flag"></td>
        `;
    }
}

function winGame() {
    isGameOver = true;
    messageEl.textContent = "GRATULACJE!";
    searchInput.disabled = true;
    saveWin();
}

function loseGame() {
    isGameOver = true;
    messageEl.textContent = `KONIEC! To: ${TARGET_COUNTRY.name.toUpperCase()}`;
    messageEl.style.color = "#ff3333";
    searchInput.disabled = true;
    restartBtn.style.display = 'block';

    revealedMask.fill(1);
    drawCanvas();
}

async function saveWin() {
    if (!nick) return;
    const today = new Date();
    const releaseDate = new Date(2025, 11, 4);
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
        if (!completedDays.includes(4)) {
            completedDays.push(4);
            const newScore = (data.score || 0) + pointsEarned;
            await update(userRef, { score: newScore, completedDays: completedDays });
            messageEl.textContent += ` (+${pointsEarned} PKT)`;
            setTimeout(() => { showBlocker("UKOŃCZONE", `Zdobyłeś ${pointsEarned} pkt!`); }, 3000);
        } else {
            showBlocker("UKOŃCZONE", "Zadanie już zaliczone wcześniej.");
        }
    }
}