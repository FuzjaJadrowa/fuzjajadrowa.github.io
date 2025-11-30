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

const STORAGE_KEY = 'dlevent_day8_state';

let LOCATIONS_DB = [];
let ALL_COUNTRIES = [];
let TARGET_DATA = null;

const MAX_ATTEMPTS = 4;
let attempts = 0;
let isGameOver = false;
let sessionCount = 1;
let historyGuesses = [];
let guessedISOs = new Set();

let nick;
let searchInput, searchResults, historyBody, messageEl, restartBtn, attemptsDisplay, imgElement, imgLoader;
let blocker, blockerTitle, blockerMsg;

document.addEventListener('DOMContentLoaded', () => {
    nick = localStorage.getItem('dlevent_nickname');

    searchInput = document.getElementById('geodle-search-input');
    searchResults = document.getElementById('geodle-search-results');
    historyBody = document.getElementById('geodle-history-body');
    messageEl = document.getElementById('message-area');
    restartBtn = document.getElementById('restart-btn');
    attemptsDisplay = document.getElementById('attempts-display');
    imgElement = document.getElementById('geodle-img');
    imgLoader = document.getElementById('img-loader');

    blocker = document.getElementById('access-blocker');
    blockerTitle = document.getElementById('blocker-title');
    blockerMsg = document.getElementById('blocker-msg');

    searchInput.addEventListener('input', (e) => filterCountries(e.target.value));
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.globle-ui')) {
            searchResults.style.display = 'none';
        }
    });

    restartBtn.addEventListener('click', () => {
        sessionCount++;
        saveGameState();
        prepareNewRound();
    });

    Promise.all([loadLocationsConfig(), loadCountriesData()]).then(() => {
        start();
    });
});

async function loadLocationsConfig() {
    try {
        const res = await fetch('../assets/scripts/day8config.json');
        LOCATIONS_DB = await res.json();
    } catch (e) {
        console.error("Błąd ładowania konfiguracji zdjęć:", e);
        messageEl.textContent = "Błąd ładowania gry.";
    }
}

async function loadCountriesData() {
    try {
        const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,translations,latlng');
        const data = await res.json();

        ALL_COUNTRIES = data.map(country => {
            const plName = country.translations?.pol?.common || country.name.common;
            return {
                name: plName,
                code: country.cca2.toLowerCase(),
                lat: country.latlng[0],
                lng: country.latlng[1]
            };
        });

        ALL_COUNTRIES.sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
        console.error("Błąd API Geograficznego:", e);
        messageEl.textContent = "Błąd danych mapy.";
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
    const releaseDate = new Date(2025, 11, 8);

    if (today < releaseDate) {
        showBlocker("NIE OSZUKUJ!", "To zadanie nie jest jeszcze dostępne.");
        return false;
    }
    try {
        const userRef = ref(db, 'users/' + nick);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.completedDays && data.completedDays.includes(8)) {
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
        sessionCount,
        targetIso: TARGET_DATA ? TARGET_DATA.iso : null,
        attempts,
        historyGuesses,
        guessedISOs: Array.from(guessedISOs),
        isGameOver
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGameState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && ALL_COUNTRIES.length > 0 && LOCATIONS_DB.length > 0) {
        const state = JSON.parse(saved);
        sessionCount = state.sessionCount || 1;

        if (state.targetIso) {
            const geoData = ALL_COUNTRIES.find(c => c.code === state.targetIso);
            const imgData = LOCATIONS_DB.find(l => l.iso === state.targetIso);

            if (geoData && imgData) {
                TARGET_DATA = {
                    ...geoData,
                    iso: state.targetIso,
                    img: imgData.img
                };

                attempts = state.attempts;
                historyGuesses = state.historyGuesses || [];
                guessedISOs = new Set(state.guessedISOs || []);
                isGameOver = state.isGameOver;

                setupUIForRound();

                for(let i = historyGuesses.length - 1; i >= 0; i--) {
                    const g = historyGuesses[i];
                    addHistoryRow(g.name, g.isTarget);
                }

                if (isGameOver) {
                    endGameUI();
                }
            } else {
                prepareNewRound();
            }
        } else {
            prepareNewRound();
        }
    } else {
        prepareNewRound();
    }
}

function prepareNewRound() {
    if (ALL_COUNTRIES.length === 0 || LOCATIONS_DB.length === 0) return;

    const randomLoc = LOCATIONS_DB[Math.floor(Math.random() * LOCATIONS_DB.length)];
    const geoData = ALL_COUNTRIES.find(c => c.code === randomLoc.iso);

    if (!geoData) {
        prepareNewRound();
        return;
    }

    TARGET_DATA = {
        ...geoData,
        iso: randomLoc.iso,
        img: randomLoc.img
    };

    attempts = 0;
    isGameOver = false;
    guessedISOs.clear();
    historyGuesses = [];

    setupUIForRound();
    saveGameState();
}

function setupUIForRound() {
    searchInput.value = '';
    searchInput.disabled = false;
    restartBtn.style.display = 'none';
    messageEl.textContent = '';
    attemptsDisplay.textContent = `Próby: ${attempts}/${MAX_ATTEMPTS}`;
    historyBody.innerHTML = '';

    imgLoader.style.display = 'block';
    imgElement.style.display = 'none';
    imgElement.src = TARGET_DATA.img;
    imgElement.onload = () => {
        imgLoader.style.display = 'none';
        imgElement.style.display = 'block';
    };
}

function filterCountries(query) {
    if (query.length < 2) {
        searchResults.style.display = 'none';
        return;
    }
    const lower = query.toLowerCase();
    const matches = ALL_COUNTRIES.filter(d => d.name.toLowerCase().includes(lower));

    searchResults.innerHTML = '';
    if (matches.length > 0) {
        searchResults.style.display = 'block';
        matches.slice(0, 10).forEach(d => {
            const div = document.createElement('div');
            div.className = 'globle-search-item';
            div.textContent = d.name;
            div.addEventListener('click', () => handleGuess(d));
            searchResults.appendChild(div);
        });
    } else {
        searchResults.style.display = 'none';
    }
}

function handleGuess(country) {
    if (isGameOver) return;
    searchResults.style.display = 'none';
    searchInput.value = '';

    if (guessedISOs.has(country.code)) {
        messageEl.textContent = "Ten kraj już był!";
        return;
    }
    guessedISOs.add(country.code);

    attempts++;
    attemptsDisplay.textContent = `Próby: ${attempts}/${MAX_ATTEMPTS}`;

    const isTarget = country.code === TARGET_DATA.iso;

    historyGuesses.push({
        name: country.name,
        isTarget: isTarget
    });

    addHistoryRow(country.name, isTarget);

    if (isTarget) {
        winGame();
    } else if (attempts >= MAX_ATTEMPTS) {
        loseGame();
    }
    saveGameState();
}

function addHistoryRow(name, isTarget) {
    const row = document.createElement('tr');
    row.className = 'globle-row';

    let icon = '❌';
    let color = '#ff3333';

    if (isTarget) {
        icon = '✅';
        color = '#00ff41';
    }

    row.innerHTML = `
        <td style="text-align: left;">${name}</td>
        <td style="text-align: center; color: ${color}; font-size: 1.2rem;">${icon}</td>
    `;
    historyBody.prepend(row);
}

function winGame() {
    isGameOver = true;
    messageEl.textContent = "GRATULACJE!";
    messageEl.style.color = "#00ff41";
    searchInput.disabled = true;
    saveWin();
}

function loseGame() {
    isGameOver = true;
    messageEl.textContent = `KONIEC! To: ${TARGET_DATA.name.toUpperCase()}`;
    messageEl.style.color = "#ff3333";
    endGameUI();
}

function endGameUI() {
    searchInput.disabled = true;
    restartBtn.style.display = 'block';
}

async function saveWin() {
    if (!nick) return;
    const today = new Date();
    const releaseDate = new Date(2025, 11, 8);
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
        if (!completedDays.includes(8)) {
            completedDays.push(8);
            const newScore = (data.score || 0) + pointsEarned;
            await update(userRef, { score: newScore, completedDays: completedDays });
            messageEl.textContent += ` (+${pointsEarned} PKT)`;
            setTimeout(() => { showBlocker("UKOŃCZONE", `Zdobyłeś ${pointsEarned} pkt!`); }, 3000);
        } else {
            showBlocker("UKOŃCZONE", "Zadanie już zaliczone wcześniej.");
        }
    }
}