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

const STORAGE_KEY = 'dlevent_day4_state';

let ALL_COUNTRIES = [];
let TARGET_COUNTRY = null;

const MAX_ATTEMPTS = 6;
let attempts = 0;
let isGameOver = false;
let sessionCount = 1;
let revealedColors = new Set();
let historyGuesses = [];

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
        console.error("Błąd pobierania krajów:", e);
        messageEl.textContent = "Błąd API flag!";
    }
}

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

function saveGameState() {
    const state = {
        targetCode: TARGET_COUNTRY ? TARGET_COUNTRY.code : null,
        targetName: TARGET_COUNTRY ? TARGET_COUNTRY.name : null,
        targetColors: TARGET_COUNTRY ? TARGET_COUNTRY.colors : null,
        attempts,
        historyGuesses,
        revealedColors: Array.from(revealedColors),
        sessionCount,
        isGameOver
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGameState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const state = JSON.parse(saved);
        sessionCount = state.sessionCount || 1;

        if (state.targetCode) {
            TARGET_COUNTRY = {
                name: state.targetName,
                code: state.targetCode,
                colors: state.targetColors
            };

            attempts = state.attempts;
            historyGuesses = state.historyGuesses || [];
            revealedColors = new Set(state.revealedColors || []);
            isGameOver = state.isGameOver;

            targetImage.src = `https://flagcdn.com/w640/${TARGET_COUNTRY.code}.png`;
            targetImage.onload = () => {
                initGameUI();

                historyGuesses.forEach(g => {
                    updateHistoryTable({name: g.name, code: g.code}, g.percent);
                });

                if (isGameOver) {
                    searchInput.disabled = true;
                    if (historyGuesses.length > 0 && historyGuesses[historyGuesses.length-1].code === TARGET_COUNTRY.code) {
                        messageEl.textContent = "GRATULACJE! (Odświeżono)";
                    } else {
                        messageEl.textContent = `KONIEC! To: ${TARGET_COUNTRY.name.toUpperCase()}`;
                        messageEl.style.color = "#ff3333";
                        restartBtn.style.display = 'block';
                    }
                    TARGET_COUNTRY.colors.forEach(c => revealedColors.add(`${c.r},${c.g},${c.b}`));
                    drawCanvas();
                }
            };
        } else {
            prepareNewRound();
        }
    } else {
        prepareNewRound();
    }
}

function prepareNewRound() {
    if (ALL_COUNTRIES.length === 0) return;

    const randomCountry = ALL_COUNTRIES[Math.floor(Math.random() * ALL_COUNTRIES.length)];
    targetImage.src = `https://flagcdn.com/w640/${randomCountry.code}.png`;

    messageEl.textContent = "Analiza flagi...";
    searchInput.disabled = true;

    targetImage.onload = () => {
        const extractedColors = extractColorsFromImage(targetImage);

        TARGET_COUNTRY = {
            name: randomCountry.name,
            code: randomCountry.code,
            colors: extractedColors
        };

        messageEl.textContent = "";

        attempts = 0;
        isGameOver = false;
        revealedColors.clear();
        historyGuesses = [];

        initGameUI();
        saveGameState();
    };
}

function extractColorsFromImage(img) {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    c.width = 100;
    c.height = 100 * (img.height / img.width);
    ctx.drawImage(img, 0, 0, c.width, c.height);

    const imageData = ctx.getImageData(0, 0, c.width, c.height).data;
    const colorCounts = {};
    const totalPixels = imageData.length / 4;

    for (let i = 0; i < imageData.length; i += 4) {
        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];
        const a = imageData[i + 3];

        if (a < 128) continue;

        const key = `${Math.round(r/30)*30},${Math.round(g/30)*30},${Math.round(b/30)*30}`;
        if (!colorCounts[key]) colorCounts[key] = { count: 0, r, g, b };
        colorCounts[key].count++;
    }

    const threshold = totalPixels * 0.02;
    const palette = [];

    for (const key in colorCounts) {
        if (colorCounts[key].count > threshold) {
            const {r, g, b} = colorCounts[key];
            palette.push({r, g, b});
        }
    }
    return palette;
}

function initGameUI() {
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

    if (revealedColors.size === 0) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    tempCtx.drawImage(targetImage, 0, 0, canvas.width, canvas.height);

    const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a < 50) continue;

        let closestColor = null;
        let minDist = Infinity;

        for (const paletteColor of TARGET_COUNTRY.colors) {
            const dist = colorDistance(r, g, b, paletteColor.r, paletteColor.g, paletteColor.b);
            if (dist < minDist) {
                minDist = dist;
                closestColor = paletteColor;
            }
        }

        if (closestColor) {
            const colorKey = `${closestColor.r},${closestColor.g},${closestColor.b}`;

            if (!revealedColors.has(colorKey)) {
                data[i] = 0;
                data[i+1] = 0;
                data[i+2] = 0;
            }
        }
    }
    ctx.putImageData(imageData, 0, 0);
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
        handleGuess(country, TARGET_COUNTRY.colors);
        return;
    }

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = `https://flagcdn.com/w160/${country.code}.png`;
    img.onload = () => {
        const colors = extractColorsFromImage(img);
        handleGuess(country, colors);
    };
}

function handleGuess(country, guessColors) {
    if (isGameOver) return;

    attempts++;
    attemptsDisplay.textContent = `Próby: ${attempts}/${MAX_ATTEMPTS}`;

    let matchedInThisGuess = 0;

    guessColors.forEach(guessC => {
        let matchFound = false;
        for (const targetC of TARGET_COUNTRY.colors) {
            if (colorDistance(guessC.r, guessC.g, guessC.b, targetC.r, targetC.g, targetC.b) < 60) {
                const targetKey = `${targetC.r},${targetC.g},${targetC.b}`;
                revealedColors.add(targetKey);
                matchFound = true;
            }
        }
        if (matchFound) matchedInThisGuess++;
    });

    let targetColorsHit = 0;
    TARGET_COUNTRY.colors.forEach(targetC => {
        for (const guessC of guessColors) {
            if (colorDistance(guessC.r, guessC.g, guessC.b, targetC.r, targetC.g, targetC.b) < 60) {
                targetColorsHit++;
                break;
            }
        }
    });

    let percent = 0;
    if (TARGET_COUNTRY.colors.length > 0) {
        percent = Math.round((targetColorsHit / TARGET_COUNTRY.colors.length) * 100);
    }

    historyGuesses.push({
        name: country.name,
        code: country.code,
        percent: percent
    });

    drawCanvas();
    updateHistoryTable(country, percent);

    if (country.code === TARGET_COUNTRY.code) {
        winGame();
    } else if (attempts >= MAX_ATTEMPTS) {
        loseGame();
    }
    saveGameState();
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

    TARGET_COUNTRY.colors.forEach(c => revealedColors.add(`${c.r},${c.g},${c.b}`));
    drawCanvas();
    saveWin();
}

function loseGame() {
    isGameOver = true;
    messageEl.textContent = `KONIEC! To: ${TARGET_COUNTRY.name.toUpperCase()}`;
    messageEl.style.color = "#ff3333";
    searchInput.disabled = true;
    restartBtn.style.display = 'block';

    TARGET_COUNTRY.colors.forEach(c => revealedColors.add(`${c.r},${c.g},${c.b}`));
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