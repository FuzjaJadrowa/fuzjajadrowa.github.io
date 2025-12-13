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

const WORDS = [
    "AGENT", "ALARM", "ARBUZ", "ASTRA", "ATOMY", "BAGNO", "BAJKA", "BALON", "BARAN", "BASEN", "BAZAR", "BEKSA", "BETON", "BIURO", "BLOND", "BŁOTO", "BRAMA", "BRODA", "BURZA", "CEGŁA", "CECHA", "CHATA", "CHLEB", "CIAŁO", "CIOSY", "CÓRKA", "CYFRA", "CZAPA", "DACHY", "DAWKA", "DESKA", "DIETA", "DOBRA", "DOMEK", "DROGA", "DRZWI", "DUSZA", "DYMEK", "DYWAN", "EKIPA", "EKRAN", "ELITA", "FARBA", "FAUNA", "FILMY", "FIRMA", "FLOTA", "FORMA", "FOTEL", "GAZDA", "GLINA", "GŁOWA", "GÓRAL", "GRUPA", "GWIZD", "HAŁAS", "HASŁO", "HONOR", "HOTEL", "HYMNY", "IGLOO", "IKONA", "IMBIR", "ISKRA", "JACHT", "JADŁO", "JASNE", "JĘZYK", "JUTRO", "KABEL", "KAFEL", "KAJAK", "KANAŁ", "KARTA", "KASZA", "KIBIC", "KLASA", "KOSZE", "KOWAL", "KREDA", "KUBEK", "KULIG", "KWIAT", "LAMPA", "LASER", "LIDER", "LITRA", "LIZAK", "LOGIN", "LOKAL", "ŁAWKA", "ŁÓDKA", "ŁYŻWA", "MAZAK", "MAZUR", "MEBLE", "MEDIA", "METRO", "MIARA", "MISJA", "MLEKO", "MODEL", "MORZE", "MOTYL", "MÓZGI", "MUSZLA", "MYSZY", "NABÓJ", "NAKAZ", "NAUKA", "NORMA", "NOSZE", "NUTKI", "OBIAD", "OBRAZ", "OCZKO", "OGIEŃ", "OKAZY", "OKIEN", "OLEJE", "OPERA", "OPOKA", "ORZEŁ", "OSOBA", "OWOCE", "PALEC", "PAŁAC", "PASEK", "PAJĄK", "PANNA", "PARYŻ", "PAZUR", "PIANA", "PILOT", "PISAK", "PIZZA", "PLAMA", "PLAŻA", "PŁYTA", "POKÓJ", "POMOC", "POTOK", "PRACA", "PRASA", "PUDŁO", "PUMA", "PUNKT", "PYŁEK", "RABAT", "RADAR", "RADIO", "RAMKA", "RANGA", "REKIN", "ROBOT", "ROWER", "ROZUM", "RÓZGA", "RUINA", "RURKA", "RYBAK", "RYNEK", "RZEKA", "SALON", "SANIE", "SCENA", "SERCE", "SKLEP", "SKRÓT", "SŁOWO", "SMOKI", "SOSNA", "SPORT", "ŚNIEG", "ŚLIWA", "ŚWIAT", "TABELA", "TAŃCE", "TARAS", "TATRY", "TEMAT", "TEREN", "TĘCZA", "TOAST", "TORBA", "TORTY", "TRAWA", "TREMA", "TRASA", "TWARZ", "TYTUŁ", "ULICA", "URLOP", "WAGON", "WALKA", "WAŁEK", "WATKA", "WAŻNE", "WELON", "WIDOK", "WIATR", "WINDA", "WIRUS", "WŁOSY", "WODNY", "WOJNA", "WOREK", "WSTĘP", "WYSPA", "WZORY", "ZAKUP", "ZAMEK", "ZAPAŁ", "ZEGAR", "ZIMNO", "ZŁOTO", "ZNAKI", "ZNICZ", "ZOŁZA", "ŻABKA", "ŻNIWA", "ŻUREK", "ŻYCIE"
];

const STORAGE_KEY = 'dlevent_day14_state';

const MAX_ATTEMPTS = 14;
const BOARD_COUNT = 8;

let secretWords = [];
let boardStatus = [];
let guesses = [];
let currentTile = 0;
let isGameOver = false;
let isChecking = false;
let sessionCount = 1;

let nick;
let boardsContainer, keyboardEl, messageEl, restartBtn;
let blocker, blockerTitle, blockerMsg;

document.addEventListener('DOMContentLoaded', () => {
    nick = localStorage.getItem('dlevent_nickname');

    boardsContainer = document.getElementById('boards-container');
    keyboardEl = document.getElementById('keyboard');
    messageEl = document.getElementById('message-area');
    restartBtn = document.getElementById('restart-btn');
    blocker = document.getElementById('access-blocker');
    blockerTitle = document.getElementById('blocker-title');
    blockerMsg = document.getElementById('blocker-msg');

    createKeyboard();

    restartBtn.addEventListener('click', () => {
        restartBtn.blur();
        sessionCount++;
        saveGameState();
        prepareNewRound();
    });

    start();
});

async function start() {
    const access = await checkAccess();
    if (access) {
        loadGameState();
    }
}

function prepareNewRound() {
    secretWords = [];
    const pool = [...WORDS];
    for (let i = 0; i < BOARD_COUNT; i++) {
        const randomIndex = Math.floor(Math.random() * pool.length);
        secretWords.push(pool[randomIndex]);
        pool.splice(randomIndex, 1);
    }

    guesses = [];
    boardStatus = new Array(BOARD_COUNT).fill(false);
    isGameOver = false;
    currentTile = 0;

    restartBtn.style.display = 'none';
    messageEl.textContent = '';

    renderBoards();
    resetKeyboard();
    saveGameState();
}

function renderBoards() {
    boardsContainer.innerHTML = '';

    for (let b = 0; b < BOARD_COUNT; b++) {
        const board = document.createElement('div');
        board.className = 'octo-board';
        board.id = `board-${b}`;

        if (boardStatus[b]) board.classList.add('solved');

        for (let r = 0; r < MAX_ATTEMPTS; r++) {
            const row = document.createElement('div');
            row.className = 'octo-row';
            row.id = `b${b}-r${r}`;

            if (r === guesses.length && !isGameOver && !boardStatus[b]) {
                row.classList.add('current');
            }

            for (let t = 0; t < 5; t++) {
                const tile = document.createElement('div');
                tile.className = 'octo-tile';
                tile.id = `b${b}-r${r}-t${t}`;

                if (r < guesses.length) {
                    const guess = guesses[r];
                    const letter = guess[t];
                    const secret = secretWords[b];

                    tile.textContent = letter;
                    const colorClass = getTileColor(letter, t, secret, guess);
                    tile.classList.add(colorClass);
                }

                row.appendChild(tile);
            }
            board.appendChild(row);
        }
        boardsContainer.appendChild(board);
    }
}

function updateCurrentRow() {
    const rowIdx = guesses.length;
    if (rowIdx >= MAX_ATTEMPTS) return;

    for (let b = 0; b < BOARD_COUNT; b++) {
        if (boardStatus[b]) continue;

        for (let t = 0; t < 5; t++) {
            const tile = document.getElementById(`b${b}-r${rIdx}-t${t}`);
        }
    }
}

function handleInput(key) {
    if (isGameOver || isChecking) return;

    const rowIdx = guesses.length;
    if (rowIdx >= MAX_ATTEMPTS) return;

    if (key === 'BACKSPACE') {
        if (currentTile > 0) {
            currentTile--;
            updateActiveTiles('');
        }
    } else if (key === 'ENTER') {
        if (currentTile === 5) checkGuess();
        else showMessage("Za mało liter!");
    } else {
        if (currentTile < 5) {
            updateActiveTiles(key);
            currentTile++;
        }
    }
}

function updateActiveTiles(char) {
    const rowIdx = guesses.length;
    for (let b = 0; b < BOARD_COUNT; b++) {
        if (!boardStatus[b]) {
            const tileIdx = char === '' ? currentTile : currentTile;
            const tile = document.getElementById(`b${b}-r${rowIdx}-t${tileIdx}`);
            if (tile) tile.textContent = char;
        }
    }
}

async function checkIsPolishWord(word) {
    try {
        const url = `https://pl.wiktionary.org/w/api.php?action=query&titles=${word.toLowerCase()}&format=json&origin=*`;
        const response = await fetch(url);
        const data = await response.json();
        const pages = data.query.pages;
        return Object.keys(pages)[0] !== "-1";
    } catch (error) {
        return true;
    }
}

async function checkGuess() {
    let guess = "";
    let firstActiveBoard = -1;
    for(let b=0; b<BOARD_COUNT; b++) {
        if(!boardStatus[b]) {
            firstActiveBoard = b;
            break;
        }
    }

    if (firstActiveBoard === -1) return;

    const rowIdx = guesses.length;
    for(let t=0; t<5; t++) {
        guess += document.getElementById(`b${firstActiveBoard}-r${rowIdx}-t${t}`).textContent;
    }

    isChecking = true;
    messageEl.textContent = "Sprawdzam...";
    const exists = await checkIsPolishWord(guess);
    isChecking = false;
    messageEl.textContent = "";

    if (!exists) {
        showMessage("Nie ma takiego słowa!");
        return;
    }

    guesses.push(guess);
    currentTile = 0;

    let allSolved = true;

    for (let b = 0; b < BOARD_COUNT; b++) {
        if (boardStatus[b]) continue;

        const secret = secretWords[b];

        for (let t = 0; t < 5; t++) {
            const tile = document.getElementById(`b${b}-r${rowIdx}-t${t}`);
            tile.textContent = guess[t];
            const color = getTileColor(guess[t], t, secret, guess);
            tile.classList.add(color);
        }

        if (guess === secret) {
            boardStatus[b] = true;
            document.getElementById(`board-${b}`).classList.add('solved');
        } else {
            allSolved = false;
        }
    }

    updateKeyboardColors();

    renderBoards();

    if (allSolved) {
        isGameOver = true;
        messageEl.textContent = "GRATULACJE! Wszystkie hasła odgadnięte!";
        messageEl.style.color = "#00ff41";
        saveWin();
    } else if (guesses.length >= MAX_ATTEMPTS) {
        isGameOver = true;
        messageEl.textContent = "KONIEC GRY! Zabrakło prób.";
        messageEl.style.color = "#ff3333";
        restartBtn.style.display = 'block';
    }

    saveGameState();
}

function getTileColor(letter, index, secret, guess) {
    if (letter === secret[index]) return 'correct';

    let countInSecret = 0;
    for(let i=0; i<5; i++) if(secret[i] === letter) countInSecret++;

    let correctMatches = 0;
    for(let i=0; i<5; i++) if(guess[i] === secret[i] && guess[i] === letter) correctMatches++;

    let misplacedSoFar = 0;
    for(let i=0; i<=index; i++) {
        if(guess[i] === letter && guess[i] !== secret[i]) misplacedSoFar++;
    }

    if (secret.includes(letter)) {
        if (misplacedSoFar <= (countInSecret - correctMatches)) return 'present';
    }

    return 'absent';
}

function updateKeyboardColors() {
    const keyStatus = {};

    guesses.forEach(guess => {
        for (let b = 0; b < BOARD_COUNT; b++) {

            if (boardStatus[b]) continue;

            const secret = secretWords[b];
            for (let i = 0; i < 5; i++) {
                const char = guess[i];
                const color = getTileColor(char, i, secret, guess);

                let priority = 0;
                if (color === 'correct') priority = 2;
                else if (color === 'present') priority = 1;

                if (!keyStatus[char] || priority > keyStatus[char]) {
                    keyStatus[char] = priority;
                }
            }
        }
    });

    document.querySelectorAll('.key').forEach(btn => {
        const char = btn.dataset.key;
        if (!char) return;

        btn.classList.remove('correct', 'present', 'absent');

        if (keyStatus[char] === 2) btn.classList.add('correct');
        else if (keyStatus[char] === 1) btn.classList.add('present');
        else if (keyStatus[char] === 0) btn.classList.add('absent');
        else if (keyStatus[char] === undefined) {

        }

    });
}

function createKeyboard() {
    keyboardEl.innerHTML = '';
    const keys = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM", "ĄĆĘŁŃÓŚŹŻ"];
    keys.forEach(rowString => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'key-row';
        rowString.split('').forEach(char => {
            const btn = document.createElement('button');
            btn.className = 'key';
            btn.textContent = char;
            btn.dataset.key = char;
            btn.addEventListener('click', () => { handleInput(char); btn.blur(); });
            rowDiv.appendChild(btn);
        });
        keyboardEl.appendChild(rowDiv);
    });

    const actionRow = document.createElement('div');
    actionRow.className = 'key-row';
    const enter = document.createElement('button');
    enter.className = 'key wide';
    enter.textContent = 'ENTER';
    enter.addEventListener('click', () => { handleInput('ENTER'); enter.blur(); });
    const back = document.createElement('button');
    back.className = 'key wide';
    back.textContent = '⌫';
    back.addEventListener('click', () => { handleInput('BACKSPACE'); back.blur(); });
    actionRow.appendChild(enter);
    actionRow.appendChild(back);
    keyboardEl.appendChild(actionRow);

    document.addEventListener('keydown', (e) => {
        if (isGameOver) return;
        const key = e.key.toUpperCase();
        if (key === 'ENTER' || key === 'BACKSPACE' || /^[A-ZĄĆĘŁŃÓŚŹŻ]$/.test(key)) {
            handleInput(key);
        }
    });
}

function resetKeyboard() {
    document.querySelectorAll('.key').forEach(k => {
        k.classList.remove('correct', 'present', 'absent');
    });
}

function showMessage(msg) {
    messageEl.textContent = msg;
    setTimeout(() => { if (!isGameOver) messageEl.textContent = ''; }, 2000);
}

function saveGameState() {
    const state = {
        sessionCount,
        secretWords,
        boardStatus,
        guesses,
        isGameOver
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGameState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const state = JSON.parse(saved);
        sessionCount = state.sessionCount || 1;

        if (state.secretWords && state.secretWords.length === BOARD_COUNT) {
            secretWords = state.secretWords;
            boardStatus = state.boardStatus;
            guesses = state.guesses || [];
            isGameOver = state.isGameOver;

            renderBoards();
            updateKeyboardColors();

            if (isGameOver) {
                restartBtn.style.display = 'block';
                if (boardStatus.every(s => s)) {
                    messageEl.textContent = "GRATULACJE! (Odświeżono)";
                    messageEl.style.color = "#00ff41";
                } else {
                    messageEl.textContent = "KONIEC GRY!";
                    messageEl.style.color = "#ff3333";
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
    const releaseDate = new Date(2025, 11, 14);

    if (today < releaseDate) {
        showBlocker("NIE OSZUKUJ!", "To zadanie nie jest jeszcze dostępne.");
        return false;
    }
    try {
        const userRef = ref(db, 'users/' + nick);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.completedDays && data.completedDays.includes(14)) {
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
    const releaseDate = new Date(2025, 11, 14);
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
        if (!completedDays.includes(14)) {
            completedDays.push(14);
            const newScore = (data.score || 0) + pointsEarned;
            await update(userRef, { score: newScore, completedDays: completedDays });
            messageEl.textContent += ` (+${pointsEarned} PKT)`;
            setTimeout(() => { showBlocker("UKOŃCZONE", `Zdobyłeś ${pointsEarned} pkt!`); }, 3000);
        } else {
            showBlocker("UKOŃCZONE", "Zadanie już zaliczone wcześniej.");
        }
    }
}