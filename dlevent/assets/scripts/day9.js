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

const STORAGE_KEY = 'dlevent_day10_state';

let ELEMENTS_DB = [];
let TARGET_ELEMENT = null;

const MAX_ATTEMPTS = 5;
let attempts = 0;
let isGameOver = false;
let sessionCount = 1;
let historyGuesses = [];

let nick;
let searchInput, searchResults, historyBody, messageEl, restartBtn, attemptsDisplay;
let blocker, blockerTitle, blockerMsg;

document.addEventListener('DOMContentLoaded', () => {
    nick = localStorage.getItem('dlevent_nickname');

    searchInput = document.getElementById('element-search-input');
    searchResults = document.getElementById('element-search-results');
    historyBody = document.getElementById('elementle-history-body');
    messageEl = document.getElementById('message-area');
    restartBtn = document.getElementById('restart-btn');
    attemptsDisplay = document.getElementById('attempts-display');

    blocker = document.getElementById('access-blocker');
    blockerTitle = document.getElementById('blocker-title');
    blockerMsg = document.getElementById('blocker-msg');

    searchInput.addEventListener('input', (e) => filterElements(e.target.value));
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.elementle-search-box')) {
            searchResults.style.display = 'none';
        }
    });

    restartBtn.addEventListener('click', () => {
        sessionCount++;
        saveGameState();
        prepareNewRound();
    });

    loadElementsConfig().then(() => {
        start();
    });
});

async function loadElementsConfig() {
    try {
        const res = await fetch('../assets/scripts/day9config.json');
        ELEMENTS_DB = await res.json();
    } catch (e) {
        console.error("Błąd ładowania configu:", e);
        messageEl.textContent = "Błąd bazy pierwiastków!";
    }
}

async function start() {
    const access = await checkAccess();
    if (access) {
        loadGameState();
    }
}

function prepareNewRound() {
    if (ELEMENTS_DB.length === 0) return;

    TARGET_ELEMENT = ELEMENTS_DB[Math.floor(Math.random() * ELEMENTS_DB.length)];

    attempts = 0;
    isGameOver = false;
    historyGuesses = [];
    searchInput.value = '';
    searchInput.disabled = false;
    restartBtn.style.display = 'none';
    messageEl.textContent = '';
    attemptsDisplay.textContent = `Próby: ${attempts}/${MAX_ATTEMPTS}`;
    historyBody.innerHTML = '';

    for(let i=0; i<MAX_ATTEMPTS; i++) {
        const row = document.createElement('tr');
        row.className = 'elementle-row empty-row';
        row.innerHTML = `<td></td><td></td><td></td><td></td><td></td>`;
        historyBody.appendChild(row);
    }

    saveGameState();
}

function filterElements(query) {
    if (query.length < 1) {
        searchResults.style.display = 'none';
        return;
    }
    const lower = query.toLowerCase();
    const matches = ELEMENTS_DB.filter(e =>
        e.name.toLowerCase().includes(lower) ||
        e.symbol.toLowerCase() === lower
    );

    searchResults.innerHTML = '';
    if (matches.length > 0) {
        searchResults.style.display = 'block';
        matches.slice(0, 10).forEach(e => {
            const div = document.createElement('div');
            div.className = 'element-search-item';
            div.innerHTML = `<span>${e.name}</span> <span class="element-symbol">${e.symbol}</span>`;
            div.addEventListener('click', () => handleGuess(e));
            searchResults.appendChild(div);
        });
    } else {
        searchResults.style.display = 'none';
    }
}

function handleGuess(element) {
    if (isGameOver) return;
    searchResults.style.display = 'none';
    searchInput.value = '';

    if (historyGuesses.some(g => g.name === element.name)) {
        messageEl.textContent = "Ten pierwiastek już był!";
        return;
    }

    attempts++;
    attemptsDisplay.textContent = `Próby: ${attempts}/${MAX_ATTEMPTS}`;

    const isTarget = element.name === TARGET_ELEMENT.name;

    const result = {
        name: element.name,
        symbol: element.symbol,

        matchType: element.type === TARGET_ELEMENT.type,
        matchReact: element.reactivity === TARGET_ELEMENT.reactivity,
        matchGroup: element.groupProp === TARGET_ELEMENT.groupProp,
        matchUnique: isTarget,

        valType: element.type,
        valReact: element.reactivity,
        valGroup: element.groupProp,
        valUnique: element.unique
    };

    historyGuesses.push(result);
    updateTable(result);

    if (isTarget) {
        winGame();
    } else if (attempts >= MAX_ATTEMPTS) {
        loseGame();
    }
    saveGameState();
}

function updateTable(res) {
    const rows = historyBody.children;
    const currentRow = rows[attempts - 1];

    if (currentRow) {
        currentRow.classList.remove('empty-row');
        currentRow.innerHTML = `
            <td><span class="periodic-tile">${res.symbol}</span>${res.name}</td>
            <td class="${res.matchType ? 'ele-correct' : 'ele-wrong'}">${res.valType}</td>
            <td class="${res.matchReact ? 'ele-correct' : 'ele-wrong'}">${res.valReact}</td>
            <td class="${res.matchGroup ? 'ele-correct' : 'ele-wrong'}">${res.valGroup}</td>
            <td class="${res.matchUnique ? 'ele-correct' : 'ele-wrong'}">${res.valUnique}</td>
        `;
    }
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
    messageEl.textContent = `KONIEC! To był: ${TARGET_ELEMENT.name}`;
    messageEl.style.color = "#ff3333";
    searchInput.disabled = true;
    restartBtn.style.display = 'block';
}

function saveGameState() {
    const state = {
        sessionCount,
        targetName: TARGET_ELEMENT ? TARGET_ELEMENT.name : null,
        attempts,
        historyGuesses,
        isGameOver
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGameState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const state = JSON.parse(saved);
        sessionCount = state.sessionCount || 1;

        if (state.targetName && ELEMENTS_DB.length > 0) {
            TARGET_ELEMENT = ELEMENTS_DB.find(e => e.name === state.targetName);
            if (!TARGET_ELEMENT) { prepareNewRound(); return; }

            attempts = state.attempts;
            historyGuesses = state.historyGuesses || [];
            isGameOver = state.isGameOver;

            attemptsDisplay.textContent = `Próby: ${attempts}/${MAX_ATTEMPTS}`;
            historyBody.innerHTML = '';

            for(let i=0; i<MAX_ATTEMPTS; i++) {
                const row = document.createElement('tr');
                row.className = 'elementle-row empty-row';
                row.innerHTML = `<td></td><td></td><td></td><td></td><td></td>`;
                historyBody.appendChild(row);
            }

            const savedAttempts = attempts;
            attempts = 0;
            historyGuesses.forEach(res => {
                attempts++;
                updateTable(res);
            });
            attempts = savedAttempts;

            if (isGameOver) {
                searchInput.disabled = true;
                const last = historyGuesses[historyGuesses.length-1];
                if (last && last.matchUnique) {
                    messageEl.textContent = "GRATULACJE! (Odświeżono)";
                    messageEl.style.color = "#00ff41";
                } else {
                    messageEl.textContent = `KONIEC! To był: ${TARGET_ELEMENT.name}`;
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
    const releaseDate = new Date(2025, 11, 9);

    if (today < releaseDate) {
        showBlocker("NIE OSZUKUJ!", "To zadanie nie jest jeszcze dostępne.");
        return false;
    }
    try {
        const userRef = ref(db, 'users/' + nick);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.completedDays && data.completedDays.includes(9)) {
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
    const releaseDate = new Date(2025, 11, 9);
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
        if (!completedDays.includes(9)) {
            completedDays.push(9);
            const newScore = (data.score || 0) + pointsEarned;
            await update(userRef, { score: newScore, completedDays: completedDays });
            messageEl.textContent += ` (+${pointsEarned} PKT)`;
            setTimeout(() => { showBlocker("UKOŃCZONE", `Zdobyłeś ${pointsEarned} pkt!`); }, 3000);
        } else {
            showBlocker("UKOŃCZONE", "Zadanie już zaliczone wcześniej.");
        }
    }
}