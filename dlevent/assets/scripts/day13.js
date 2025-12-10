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

const STORAGE_KEY = 'dlevent_day13_state';

const EXTRA_ARTISTS = [
    "Zdzisław Beksiński", "Stanisław Ignacy Witkiewicz", "Olga Boznańska", "Władysław Podkowiński",
    "Aleksander Gierymski", "Józef Chełmoński", "Tadeusz Makowski", "Nikifor Krynicki",
    "Henri Matisse", "Jackson Pollock", "Pierre-Auguste Renoir", "Paul Cézanne", "Marc Chagall",
    "Edgar Degas", "Paul Gauguin", "Édouard Manet", "Tycjan", "Peter Paul Rubens", "El Greco",
    "Albrecht Dürer", "Pieter Bruegel (starszy)", "William Blake", "J.M.W. Turner", "John Constable",
    "Jean-Michel Basquiat", "Keith Haring", "Banksy", "Mary Cassatt", "Artemisia Gentileschi",
    "Dante Gabriel Rossetti", "Roy Lichtenstein", "Piet Mondrian", "Joan Miró", "Egon Schiele",
    "Amedeo Modigliani", "Henri de Toulouse-Lautrec", "Camille Pissarro", "Georges Braque",
    "Francis Bacon", "Lucian Freud", "David Hockney", "Yayoi Kusama", "Ai Weiwei", "Marina Abramović",
    "Auguste Rodin", "Donatello", "Gian Lorenzo Bernini", "Antonio Canova", "Winslow Homer"
];

let ART_DB = [];
let ALL_ARTISTS = [];
let TARGET_ART = null;

const ZOOM_LEVELS = [12, 8, 5, 3, 2, 1];
const MAX_ATTEMPTS = 6;

let attempts = 0;
let isGameOver = false;
let sessionCount = 1;
let historyGuesses = [];

let nick;
let artImg, imgLoader, searchInput, searchResults, historyBody, messageEl, restartBtn, attemptsDisplay;
let blocker, blockerTitle, blockerMsg;

document.addEventListener('DOMContentLoaded', () => {
    nick = localStorage.getItem('dlevent_nickname');

    artImg = document.getElementById('artle-img');
    imgLoader = document.getElementById('img-loader');
    searchInput = document.getElementById('artle-search-input');
    searchResults = document.getElementById('artle-search-results');
    historyBody = document.getElementById('artle-history-body');
    messageEl = document.getElementById('message-area');
    restartBtn = document.getElementById('restart-btn');
    attemptsDisplay = document.getElementById('attempts-display');

    blocker = document.getElementById('access-blocker');
    blockerTitle = document.getElementById('blocker-title');
    blockerMsg = document.getElementById('blocker-msg');

    searchInput.addEventListener('input', (e) => filterArtists(e.target.value));

    document.addEventListener('click', (e) => {
        if (e.target !== searchInput && e.target !== searchResults) {
            searchResults.style.display = 'none';
        }
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
        const res = await fetch('../assets/scripts/day13config.json');
        ART_DB = await res.json();

        const configArtists = ART_DB.map(item => item.artist);
        const combined = new Set([...configArtists, ...EXTRA_ARTISTS]);
        ALL_ARTISTS = Array.from(combined).sort((a, b) => a.localeCompare(b));

    } catch (e) {
        console.error("Błąd configu:", e);
        messageEl.textContent = "Błąd bazy dzieł!";
    }
}

async function start() {
    const access = await checkAccess();
    if (access) {
        loadGameState();
    }
}

function prepareNewRound() {
    if (ART_DB.length === 0) return;

    let randomArt;
    do {
        randomArt = ART_DB[Math.floor(Math.random() * ART_DB.length)];
    } while (TARGET_ART && randomArt.id === TARGET_ART.id && ART_DB.length > 1);

    TARGET_ART = randomArt;

    attempts = 0;
    isGameOver = false;
    historyGuesses = [];

    setupUI();
    saveGameState();
}

function setupUI() {
    searchInput.value = '';
    searchInput.disabled = false;
    restartBtn.style.display = 'none';
    messageEl.textContent = '';
    attemptsDisplay.textContent = `Próby: ${attempts}/${MAX_ATTEMPTS}`;
    historyBody.innerHTML = '';

    imgLoader.style.display = 'block';
    artImg.style.display = 'none';
    artImg.src = TARGET_ART.img;
    artImg.style.objectFit = 'cover';

    setZoom(ZOOM_LEVELS[0]);

    artImg.onload = () => {
        imgLoader.style.display = 'none';
        artImg.style.display = 'block';
    };
}

function setZoom(scale) {
    artImg.style.transform = `scale(${scale})`;
}

function filterArtists(query) {
    if (query.length < 2) {
        searchResults.style.display = 'none';
        return;
    }
    const lower = query.toLowerCase();
    const matches = ALL_ARTISTS.filter(artist => artist.toLowerCase().includes(lower));

    searchResults.innerHTML = '';
    if (matches.length > 0) {
        searchResults.style.display = 'block';
        matches.slice(0, 10).forEach(artist => {
            const div = document.createElement('div');
            div.className = 'artle-search-item';
            div.textContent = artist;
            div.addEventListener('click', () => handleGuess(artist));
            searchResults.appendChild(div);
        });
    } else {
        searchResults.style.display = 'none';
    }
}

function handleGuess(artistName) {
    if (isGameOver) return;
    searchResults.style.display = 'none';
    searchInput.value = '';

    if (historyGuesses.includes(artistName)) {
        messageEl.textContent = "Już typowałeś tego artystę!";
        return;
    }

    attempts++;
    attemptsDisplay.textContent = `Próby: ${attempts}/${MAX_ATTEMPTS}`;
    historyGuesses.push(artistName);

    const isCorrect = artistName === TARGET_ART.artist;

    addHistoryRow(artistName, isCorrect);

    if (isCorrect) {
        winGame();
    } else {
        if (attempts < MAX_ATTEMPTS) {
            setZoom(ZOOM_LEVELS[attempts]);
        }

        if (attempts >= MAX_ATTEMPTS) {
            loseGame();
        }
    }
    saveGameState();
}

function addHistoryRow(name, isCorrect) {
    const row = document.createElement('tr');
    row.className = 'artle-row';

    const icon = isCorrect ? '🎨' : '❌';
    const styleClass = isCorrect ? 'status-correct' : 'status-wrong';

    row.innerHTML = `
        <td>${name}</td>
        <td class="${styleClass}">${icon}</td>
    `;
    historyBody.prepend(row);
}

function winGame() {
    isGameOver = true;
    messageEl.textContent = "GRATULACJE!";
    messageEl.style.color = "#00ff41";
    searchInput.disabled = true;
    setZoom(1);
    artImg.style.objectFit = 'contain';
    saveWin();
}

function loseGame() {
    isGameOver = true;
    messageEl.textContent = `KONIEC! To: ${TARGET_ART.artist} - "${TARGET_ART.title}"`;
    messageEl.style.color = "#ff3333";
    searchInput.disabled = true;
    restartBtn.style.display = 'block';
    setZoom(1);
    artImg.style.objectFit = 'contain';
}

function saveGameState() {
    const state = {
        sessionCount,
        artId: TARGET_ART ? TARGET_ART.id : null,
        attempts,
        historyGuesses,
        isGameOver
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGameState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && ART_DB.length > 0) {
        const state = JSON.parse(saved);
        sessionCount = state.sessionCount || 1;

        if (state.artId) {
            const found = ART_DB.find(a => a.id === state.artId);
            if (!found) { prepareNewRound(); return; }

            TARGET_ART = found;
            attempts = state.attempts;
            historyGuesses = state.historyGuesses || [];
            isGameOver = state.isGameOver;

            setupUI();

            if (!isGameOver) {
                setZoom(ZOOM_LEVELS[attempts]);
            } else {
                setZoom(1);
                artImg.style.objectFit = 'contain';
            }

            historyGuesses.forEach(guess => {
                addHistoryRow(guess, guess === TARGET_ART.artist);
            });

            if (isGameOver) {
                searchInput.disabled = true;
                const last = historyGuesses[historyGuesses.length-1];
                if (last === TARGET_ART.artist) {
                    messageEl.textContent = "GRATULACJE! (Odświeżono)";
                    messageEl.style.color = "#00ff41";
                } else {
                    messageEl.textContent = `KONIEC! To: ${TARGET_ART.artist} - "${TARGET_ART.title}"`;
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
    const releaseDate = new Date(2025, 11, 13);

    if (today < releaseDate) {
        showBlocker("NIE OSZUKUJ!", "To zadanie nie jest jeszcze dostępne.");
        return false;
    }
    try {
        const userRef = ref(db, 'users/' + nick);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.completedDays && data.completedDays.includes(13)) {
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
    const releaseDate = new Date(2025, 11, 13);
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
        if (!completedDays.includes(13)) {
            completedDays.push(13);
            const newScore = (data.score || 0) + pointsEarned;
            await update(userRef, { score: newScore, completedDays: completedDays });
            messageEl.textContent += ` (+${pointsEarned} PKT)`;
            setTimeout(() => { showBlocker("UKOŃCZONE", `Zdobyłeś ${pointsEarned} pkt!`); }, 3000);
        } else {
            showBlocker("UKOŃCZONE", "Zadanie już zaliczone wcześniej.");
        }
    }
}