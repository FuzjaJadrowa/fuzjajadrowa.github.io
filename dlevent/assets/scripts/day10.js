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

const STORAGE_KEY = 'dlevent_day10_state_numberle';

const MAX_ATTEMPTS = 6;
const EQUATION_LENGTH = 8;

let TARGET_EQUATION = "";
let currentAttempt = 0;
let currentTile = 0;
let isGameOver = false;
let sessionCount = 1;
let guesses = [];

let nick;
let gridEl, numKeysEl, opKeysEl, messageEl, restartBtn;
let blocker, blockerTitle, blockerMsg;

document.addEventListener('DOMContentLoaded', () => {
    nick = localStorage.getItem('dlevent_nickname');

    gridEl = document.getElementById('grid');
    numKeysEl = document.getElementById('num-keys');
    opKeysEl = document.getElementById('op-keys');
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

function generateEquation() {
    while (true) {
        const modes = ['simple', 'complex'];
        const mode = modes[Math.floor(Math.random() * modes.length)];
        let eq = "";

        if (mode === 'simple') {
            const ops = ['+', '-', '*', '/'];
            const op = ops[Math.floor(Math.random() * ops.length)];
            const a = Math.floor(Math.random() * 99) + 1;
            const b = Math.floor(Math.random() * 99) + 1;

            if (checkValid(a, b, op)) {
                const res = eval(`${a}${op}${b}`);
                eq = `${a}${op}${b}=${res}`;
            }
        } else {
            const a = Math.floor(Math.random() * 9) + 1;
            const b = Math.floor(Math.random() * 9) + 1;
            const c = Math.floor(Math.random() * 9) + 1;
            const ops = ['+', '-', '*'];
            const op1 = ops[Math.floor(Math.random() * ops.length)];
            const op2 = ops[Math.floor(Math.random() * ops.length)];

            const expression = `${a}${op1}${b}${op2}${c}`;
            const res = eval(expression);
            eq = `${expression}=${res}`;
        }

        if (eq.length === EQUATION_LENGTH && Number.isInteger(eval(eq.split('=')[0])) && eval(eq.split('=')[0]) >= 0) {
            return eq;
        }
    }
}

function checkValid(a, b, op) {
    if (op === '/' && (a % b !== 0)) return false;
    if (op === '-' && (a - b < 0)) return false;
    return true;
}

function prepareNewRound() {
    TARGET_EQUATION = generateEquation();
    currentAttempt = 0;
    currentTile = 0;
    isGameOver = false;
    guesses = [];

    restartBtn.style.display = 'none';
    messageEl.textContent = '';

    createGrid();
    resetKeyboard();
    saveGameState();
}

function createGrid() {
    gridEl.innerHTML = '';
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const row = document.createElement('div');
        row.className = 'numberle-row';
        row.id = `row-${i}`;
        for (let j = 0; j < EQUATION_LENGTH; j++) {
            const tile = document.createElement('div');
            tile.className = 'num-tile';
            tile.id = `row-${i}-tile-${j}`;
            row.appendChild(tile);
        }
        gridEl.appendChild(row);
    }
}

function createKeyboard() {
    numKeysEl.innerHTML = '';
    "1234567890".split('').forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'num-key';
        btn.textContent = key;
        btn.onclick = () => {
            handleInput(key);
            btn.blur();
        };
        numKeysEl.appendChild(btn);
    });

    opKeysEl.innerHTML = '';
    const ops = ["+", "-", "*", "/", "=", "ENTER", "⌫"];
    ops.forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'num-key';
        if (key === "ENTER") {
            btn.className += " wide";
            btn.onclick = () => { checkGuess(); btn.blur(); };
        }
        else if (key === "⌫") {
            btn.className += " wide";
            btn.onclick = () => { deleteChar(); btn.blur(); };
        }
        else {
            btn.onclick = () => { handleInput(key); btn.blur(); };
        }
        btn.textContent = key;
        btn.dataset.key = key;
        opKeysEl.appendChild(btn);
    });

    document.addEventListener('keydown', (e) => {
        if (isGameOver) return;
        const key = e.key;

        if (key === "Enter") {
            e.preventDefault();
            checkGuess();
            return;
        }
        if (key === "Backspace") {
            deleteChar();
            return;
        }
        if ("0123456789+-*/=".includes(key)) {
            handleInput(key);
        }
    });
}

function resetKeyboard() {
    document.querySelectorAll('.num-key').forEach(k => {
        k.classList.remove('correct', 'present', 'absent');
    });
}

function handleInput(key) {
    if (isGameOver || currentTile >= EQUATION_LENGTH) return;
    const tile = document.getElementById(`row-${currentAttempt}-tile-${currentTile}`);
    tile.textContent = key;
    tile.classList.add('active');
    currentTile++;
}

function deleteChar() {
    if (isGameOver || currentTile <= 0) return;
    currentTile--;
    const tile = document.getElementById(`row-${currentAttempt}-tile-${currentTile}`);
    tile.textContent = '';
    tile.classList.remove('active');
}

function checkGuess() {
    if (currentTile !== EQUATION_LENGTH) {
        showMessage("Za krótkie!");
        return;
    }

    let guess = "";
    for (let i = 0; i < EQUATION_LENGTH; i++) {
        guess += document.getElementById(`row-${currentAttempt}-tile-${i}`).textContent;
    }

    if (!guess.includes('=')) {
        showMessage("Brak znaku '='");
        return;
    }
    const parts = guess.split('=');
    if (parts.length !== 2 || parts[1] === "") {
        showMessage("Błędny format");
        return;
    }

    try {
        const left = eval(parts[0].replace(/[^-+*/0-9]/g, ''));
        const right = parseInt(parts[1]);

        if (left !== right) {
            showMessage("Równanie nieprawdziwe!");
            return;
        }
    } catch (e) {
        showMessage("Błąd matematyczny");
        return;
    }

    processGuess(guess);
}

function processGuess(guess) {
    guesses.push(guess);
    const targetArr = TARGET_EQUATION.split('');
    const guessArr = guess.split('');

    for (let i = 0; i < EQUATION_LENGTH; i++) {
        const tile = document.getElementById(`row-${currentAttempt}-tile-${i}`);
        const keyBtn = getKeyButton(guessArr[i]);

        if (guessArr[i] === targetArr[i]) {
            tile.classList.remove('active');
            tile.classList.add('correct');

            if (keyBtn) {
                keyBtn.classList.remove('present');
                keyBtn.classList.add('correct');
            }
            targetArr[i] = null;
            guessArr[i] = null;
        }
    }

    for (let i = 0; i < EQUATION_LENGTH; i++) {
        if (guessArr[i] === null) continue;

        const tile = document.getElementById(`row-${currentAttempt}-tile-${i}`);
        const char = guess[i];
        const keyBtn = getKeyButton(char);
        const targetIndex = targetArr.indexOf(char);

        tile.classList.remove('active');

        if (targetIndex > -1) {
            tile.classList.add('present');
            if (keyBtn && !keyBtn.classList.contains('correct')) {
                keyBtn.classList.add('present');
            }
            targetArr[targetIndex] = null;
        } else {
            tile.classList.add('absent');
            if (keyBtn && !keyBtn.classList.contains('correct') && !keyBtn.classList.contains('present')) {
                keyBtn.classList.add('absent');
            }
        }
    }

    if (guess === TARGET_EQUATION) {
        isGameOver = true;
        messageEl.textContent = "GRATULACJE!";
        messageEl.style.color = "#00ff41";
        saveWin();
    } else {
        currentAttempt++;
        currentTile = 0;
        if (currentAttempt >= MAX_ATTEMPTS) {
            isGameOver = true;
            messageEl.textContent = `KONIEC! To było: ${TARGET_EQUATION}`;
            messageEl.style.color = "#ff3333";
            restartBtn.style.display = 'block';
        }
    }
    saveGameState();
}

function getKeyButton(char) {
    const buttons = Array.from(document.querySelectorAll('.num-key'));
    return buttons.find(b => b.textContent === char);
}

function showMessage(msg) {
    messageEl.textContent = msg;
    setTimeout(() => { if (!isGameOver) messageEl.textContent = ''; }, 2000);
}

function saveGameState() {
    const state = {
        sessionCount,
        targetEquation: TARGET_EQUATION,
        attempts: currentAttempt,
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

        if (state.targetEquation) {
            TARGET_EQUATION = state.targetEquation;
            currentAttempt = state.attempts || 0;
            guesses = state.guesses || [];
            isGameOver = state.isGameOver;

            createGrid();
            resetKeyboard();
            restoreBoard();

            if (isGameOver) {
                if (guesses.includes(TARGET_EQUATION)) {
                    messageEl.textContent = "GRATULACJE! (Odświeżono)";
                    messageEl.style.color = "#00ff41";
                } else {
                    messageEl.textContent = `KONIEC! To było: ${TARGET_EQUATION}`;
                    messageEl.style.color = "#ff3333";
                    restartBtn.style.display = 'block';
                }
            } else {
                currentTile = 0;
            }
        } else {
            prepareNewRound();
        }
    } else {
        prepareNewRound();
    }
}

function restoreBoard() {
    guesses.forEach((guess, idx) => {
        const savedAttempt = currentAttempt;
        currentAttempt = idx;

        const targetArr = TARGET_EQUATION.split('');
        const guessArr = guess.split('');

        for(let i=0; i<EQUATION_LENGTH; i++) {
            const tile = document.getElementById(`row-${currentAttempt}-tile-${i}`);
            tile.textContent = guess[i];
        }

        for (let i = 0; i < EQUATION_LENGTH; i++) {
            const tile = document.getElementById(`row-${currentAttempt}-tile-${i}`);
            const keyBtn = getKeyButton(guessArr[i]);
            if (guessArr[i] === targetArr[i]) {
                tile.classList.add('correct');
                if(keyBtn) {
                    keyBtn.classList.remove('present');
                    keyBtn.classList.add('correct');
                }
                targetArr[i] = null;
                guessArr[i] = null;
            }
        }
        for (let i = 0; i < EQUATION_LENGTH; i++) {
            if (guessArr[i] === null) continue;
            const tile = document.getElementById(`row-${currentAttempt}-tile-${i}`);
            const char = guess[i];
            const keyBtn = getKeyButton(char);
            const targetIndex = targetArr.indexOf(char);

            if (targetIndex > -1) {
                tile.classList.add('present');
                if (keyBtn && !keyBtn.classList.contains('correct')) keyBtn.classList.add('present');
                targetArr[targetIndex] = null;
            } else {
                tile.classList.add('absent');
                if (keyBtn && !keyBtn.classList.contains('correct') && !keyBtn.classList.contains('present')) {
                    keyBtn.classList.add('absent');
                }
            }
        }

        currentAttempt = savedAttempt;
    });
}

async function checkAccess() {
    if (!nick) {
        showBlocker("BRAK NICKU", "Wybierz swój nick na stronie głównej.");
        return false;
    }
    const today = new Date();
    const releaseDate = new Date(2025, 11, 10);

    if (today < releaseDate) {
        showBlocker("NIE OSZUKUJ!", "To zadanie nie jest jeszcze dostępne.");
        return false;
    }
    try {
        const userRef = ref(db, 'users/' + nick);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.completedDays && data.completedDays.includes(10)) {
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
    const releaseDate = new Date(2025, 11, 10);
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
        if (!completedDays.includes(10)) {
            completedDays.push(10);
            const newScore = (data.score || 0) + pointsEarned;
            await update(userRef, { score: newScore, completedDays: completedDays });
            messageEl.textContent += ` (+${pointsEarned} PKT)`;
            setTimeout(() => { showBlocker("UKOŃCZONE", `Zdobyłeś ${pointsEarned} pkt!`); }, 3000);
        } else {
            showBlocker("UKOŃCZONE", "Zadanie już zaliczone wcześniej.");
        }
    }
}