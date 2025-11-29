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

const STORAGE_KEY = 'dlevent_day5_state';

const ROWS = 16;
const COLS = 16;
const NORMAL_MINES_COUNT = 40;
const DOUBLE_MINES_COUNT = 1;

let grid = [];
let gameOver = false;
let attempts = 0;
let sessionCount = 1;
let firstClick = true;

let flagsLeft = 20;
let doubleFlagsLeft = 1;

let nick;
let gridElement, messageEl, restartBtn, singleCountEl, doubleCountEl, attemptsDisplay;
let blocker, blockerTitle, blockerMsg;

document.addEventListener('DOMContentLoaded', () => {
    nick = localStorage.getItem('dlevent_nickname');

    gridElement = document.getElementById('grid');
    messageEl = document.getElementById('message-area');
    restartBtn = document.getElementById('restart-btn');
    singleCountEl = document.getElementById('single-count');
    doubleCountEl = document.getElementById('double-count');
    attemptsDisplay = document.getElementById('attempts-display');

    blocker = document.getElementById('access-blocker');
    blockerTitle = document.getElementById('blocker-title');
    blockerMsg = document.getElementById('blocker-msg');

    restartBtn.addEventListener('click', () => {
        attempts++;
        sessionCount++;
        initGame();
        saveGameState();
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
    const releaseDate = new Date(2025, 11, 5);

    if (today < releaseDate) {
        showBlocker("NIE OSZUKUJ!", "Dostępne od 5 grudnia!");
        return false;
    }
    try {
        const userRef = ref(db, 'users/' + nick);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.completedDays && data.completedDays.includes(5)) {
                showBlocker("UKOŃCZONE", "Zadanie już wykonane!");
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
        grid,
        flagsLeft,
        doubleFlagsLeft,
        gameOver,
        attempts,
        sessionCount,
        firstClick
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGameState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const state = JSON.parse(saved);
        grid = state.grid;
        flagsLeft = state.flagsLeft;
        doubleFlagsLeft = state.doubleFlagsLeft;
        gameOver = state.gameOver;
        attempts = state.attempts;
        sessionCount = state.sessionCount || 1;
        firstClick = state.firstClick;

        updateUI();
        renderGrid();

        attemptsDisplay.textContent = `Próby: ${attempts}`;

        if (gameOver) {
            messageEl.textContent = "KONIEC GRY! (Odświeżono)";
            messageEl.style.color = "#ff3333";
            restartBtn.style.display = 'block';
        }
    } else {
        initGame();
    }
}

function initGame() {
    gameOver = false;
    firstClick = true;
    flagsLeft = NORMAL_MINES_COUNT;
    doubleFlagsLeft = DOUBLE_MINES_COUNT;

    updateUI();
    restartBtn.style.display = 'none';
    messageEl.textContent = '';
    attemptsDisplay.textContent = `Próby: ${attempts}`;

    createEmptyGrid();
    renderGrid();
    saveGameState();
}

function createEmptyGrid() {
    grid = [];
    for (let r = 0; r < ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) {
            row.push({
                r, c,
                isMine: false,
                isDoubleMine: false,
                revealed: false,
                flagState: 0,
                neighborCount: 0
            });
        }
        grid.push(row);
    }
}

function placeMines(safeR, safeC) {
    let minesPlaced = 0;
    let doublePlaced = 0;

    while (doublePlaced < DOUBLE_MINES_COUNT) {
        const r = Math.floor(Math.random() * ROWS);
        const c = Math.floor(Math.random() * COLS);
        if (!grid[r][c].isMine && Math.abs(r - safeR) > 1 && Math.abs(c - safeC) > 1) {
            grid[r][c].isMine = true;
            grid[r][c].isDoubleMine = true;
            doublePlaced++;
        }
    }

    while (minesPlaced < NORMAL_MINES_COUNT) {
        const r = Math.floor(Math.random() * ROWS);
        const c = Math.floor(Math.random() * COLS);
        if (!grid[r][c].isMine && Math.abs(r - safeR) > 1 && Math.abs(c - safeC) > 1) {
            grid[r][c].isMine = true;
            minesPlaced++;
        }
    }

    calculateNumbers();
}

function calculateNumbers() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c].isMine) continue;

            let sum = 0;
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    const nr = r + i;
                    const nc = c + j;
                    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                        if (grid[nr][nc].isMine) {
                            sum += grid[nr][nc].isDoubleMine ? 2 : 1;
                        }
                    }
                }
            }
            grid[r][c].neighborCount = sum;
        }
    }
}

function renderGrid() {
    gridElement.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = grid[r][c];
            const div = document.createElement('div');
            div.classList.add('cell');
            div.dataset.r = r;
            div.dataset.c = c;

            div.addEventListener('click', () => handleLeftClick(r, c));
            div.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleRightClick(r, c);
            });

            if (cell.revealed) {
                div.classList.add('revealed');
                if (cell.isMine) {
                    div.classList.add('exploded');
                    div.textContent = cell.isDoubleMine ? '💀' : '💣';
                } else if (cell.neighborCount > 0) {
                    div.textContent = cell.neighborCount;
                    div.classList.add(`val-${cell.neighborCount}`);
                }
            } else if (cell.flagState === 1) {
                div.textContent = '🚩';
                div.classList.add('flag-single');
            } else if (cell.flagState === 2) {
                div.textContent = '🏴';
                div.classList.add('flag-double');
            }

            gridElement.appendChild(div);
        }
    }
}

function updateUI() {
    singleCountEl.textContent = flagsLeft;
    doubleCountEl.textContent = doubleFlagsLeft;
}

function handleLeftClick(r, c) {
    if (gameOver || grid[r][c].flagState !== 0) return;

    if (firstClick) {
        placeMines(r, c);
        firstClick = false;
    }

    const cell = grid[r][c];
    if (cell.revealed) return;

    if (cell.isMine) {
        cell.revealed = true;
        revealAllMines();
        gameOver = true;
        messageEl.textContent = "BOOM! Spróbuj ponownie.";
        messageEl.style.color = "#ff3333";
        restartBtn.style.display = 'block';
    } else {
        revealCell(r, c);
        checkWin();
    }
    renderGrid();
    saveGameState();
}

function revealCell(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || grid[r][c].revealed || grid[r][c].flagState !== 0) return;

    grid[r][c].revealed = true;

    if (grid[r][c].neighborCount === 0) {
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                revealCell(r + i, c + j);
            }
        }
    }
}

function handleRightClick(r, c) {
    if (gameOver || grid[r][c].revealed) return;

    const cell = grid[r][c];

    if (cell.flagState === 0) {
        if (flagsLeft > 0) {
            cell.flagState = 1;
            flagsLeft--;
        } else {
            if(doubleFlagsLeft > 0) {
                cell.flagState = 2;
                doubleFlagsLeft--;
            }
        }
    } else if (cell.flagState === 1) {
        flagsLeft++;
        if (doubleFlagsLeft > 0) {
            cell.flagState = 2;
            doubleFlagsLeft--;
        } else {
            cell.flagState = 0;
        }
    } else if (cell.flagState === 2) {
        cell.flagState = 0;
        doubleFlagsLeft++;
    }

    updateUI();
    renderGrid();
    checkWin();
    saveGameState();
}

function revealAllMines() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c].isMine) grid[r][c].revealed = true;
        }
    }
}

function checkWin() {
    let safeRevealed = 0;
    const totalSafe = (ROWS * COLS) - (NORMAL_MINES_COUNT + DOUBLE_MINES_COUNT);
    let doubleMineFlaggedCorrectly = false;

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = grid[r][c];

            if (!cell.isMine && cell.revealed) {
                safeRevealed++;
            }

            if (cell.isDoubleMine && cell.flagState === 2) {
                doubleMineFlaggedCorrectly = true;
            }
        }
    }

    if (safeRevealed === totalSafe && doubleMineFlaggedCorrectly) {
        gameOver = true;
        messageEl.textContent = "GRATULACJE! Saperze!";
        messageEl.style.color = "#00ff41";
        saveWin();
    }
}

async function saveWin() {
    if (!nick) return;
    const today = new Date();
    const releaseDate = new Date(2025, 11, 5);
    const isReleaseDay = (today.getDate() === releaseDate.getDate() && today.getMonth() === releaseDate.getMonth() && today.getFullYear() === releaseDate.getFullYear());

    let pointsEarned = 5;
    if (isReleaseDay) {
        if (attempts === 0) pointsEarned = 10;
        else if (attempts === 1) pointsEarned = 8;
        else pointsEarned = 6;
    }

    const userRef = ref(db, 'users/' + nick);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        let completedDays = data.completedDays || [];
        if (!completedDays.includes(5)) {
            completedDays.push(5);
            const newScore = (data.score || 0) + pointsEarned;
            await update(userRef, { score: newScore, completedDays: completedDays });
            messageEl.textContent += ` (+${pointsEarned} PKT)`;
            setTimeout(() => { showBlocker("UKOŃCZONE", `Zdobyłeś ${pointsEarned} pkt!`); }, 3000);
        } else {
            showBlocker("UKOŃCZONE", "Zadanie już zaliczone wcześniej.");
        }
    }
}