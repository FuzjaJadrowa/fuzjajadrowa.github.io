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
    "AGENT", "ALARM", "ARBUZ", "ATOMY", "BAGNO", "BAJKA", "BALON", "BARAN", "BASEN", "BAZAR", "BEKSA", "BETON", "BIURO", "BLOND", "BŁOTO", "BRAMA", "BRODA", "BURZA", "CEGŁA", "CECHA", "CHATA", "CHLEB", "CIAŁO", "CIOSY", "CÓRKA", "CYFRA", "CZAPA", "DACHY", "DAWKA", "DESKA", "DIETA", "DOBRA", "DOMEK", "DROGA", "DRZWI", "DUSZA", "DYMEK", "DYWAN", "EKIPA", "EKRAN", "ELITA", "FARBA", "FAUNA", "FILMY", "FIRMA", "FLOTA", "FORMA", "FOTEL", "GAZDA", "GLINA", "GŁOWA", "GÓRAL", "GRUPA", "GWIZD", "HAŁAS", "HASŁO", "HONOR", "HOTEL", "HYMNY", "IGLOO", "IKONA", "IMBIR", "ISKRA", "JACHT", "JADŁO", "JASNE", "JĘZYK", "JUTRO", "KABEL", "KAFEL", "KAJAK", "KANAŁ", "KARTA", "KASZA", "KIBIC", "KLASA", "KOSZE", "KOWAL", "KREDA", "KUBEK", "KULIG", "KWIAT", "LAMPA", "LASER", "LIDER", "LITRA", "LIZAK", "LOGIN", "LOKAL", "ŁAWKA", "ŁÓDKA", "ŁYŻWA", "MAZAK", "MAZUR", "MEBLE", "MEDIA", "METRO", "MIARA", "MISJA", "MLEKO", "MODEL", "MORZE", "MOTYL", "MÓZGI", "MUSZLA", "MYSZY", "NABÓJ", "NAKAZ", "NAUKA", "NORMA", "NOSZE", "NUTKI", "OBIAD", "OBRAZ", "OCZKO", "OGIEŃ", "OKAZY", "OKIEN", "OLEJE", "OPERA", "OPOKA", "ORZEŁ", "OSOBA", "OWOCE", "PALEC", "PAŁAC", "PASEK", "PAJĄK", "PANNA", "PARYŻ", "PAZUR", "PIANA", "PILOT", "PISAK", "PIZZA", "PLAMA", "PLAŻA", "PŁYTA", "POKÓJ", "POMOC", "POTOK", "PRACA", "PRASA", "PUDŁO", "PUMA", "PUNKT", "PYŁEK", "RABAT", "RADAR", "RADIO", "RAMKA", "RANGA", "REKIN", "ROBOT", "ROWER", "ROZUM", "RÓZGA", "RUINA", "RURKA", "RYBAK", "RYNEK", "RZEKA", "SALON", "SANIE", "SCENA", "SERCE", "SKLEP", "SKRÓT", "SŁOWO", "SMOKI", "SOSNA", "SPORT", "ŚNIEG", "ŚLIWA", "ŚWIAT", "TABELA", "TAŃCE", "TARAS", "TATRY", "TEMAT", "TEREN", "TĘCZA", "TOAST", "TORBA", "TORTY", "TRAWA", "TREMA", "TRASA", "TWARZ", "TYTUŁ", "ULICA", "URLOP", "WAGON", "WALKA", "WAŁEK", "WATKA", "WAŻNE", "WELON", "WIDOK", "WIATR", "WINDA", "WIRUS", "WŁOSY", "WODNY", "WOJNA", "WOREK", "WSTĘP", "WYSPA", "WZORY", "ZAKUP", "ZAMEK", "ZAPAŁ", "ZEGAR", "ZIMNO", "ZŁOTO", "ZNAKI", "ZNICZ", "ZOŁZA", "ŻABKA", "ŻNIWA", "ŻUREK", "ŻYCIE"
];

const STORAGE_KEY = 'dlevent_day1_state';

let secretWord = "";
let currentAttempt = 0;
let currentTile = 0;
let isGameOver = false;
let sessionCount = 1;
let isChecking = false;
let guesses = [];

const nick = localStorage.getItem('dlevent_nickname');
const gridEl = document.getElementById('grid');
const keyboardEl = document.getElementById('keyboard');
const messageEl = document.getElementById('message-area');
const restartBtn = document.getElementById('restart-btn');
const blocker = document.getElementById('access-blocker');
const blockerTitle = document.getElementById('blocker-title');
const blockerMsg = document.getElementById('blocker-msg');

async function checkAccess() {
    if (!nick) {
        showBlocker("BRAK NICKU", "Wybierz swój nick na stronie głównej.");
        return false;
    }

    const today = new Date();
    const releaseDate = new Date(2025, 11, 1);

    if (today < releaseDate) {
        showBlocker("NIE OSZUKUJ!", "To zadanie nie jest jeszcze dostępne.");
        return false;
    }

    try {
        const userRef = ref(db, 'users/' + nick);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.completedDays && data.completedDays.includes(1)) {
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
    blocker.style.display = 'flex';
    blockerTitle.textContent = title;
    blockerMsg.textContent = msg;
}

(async function start() {
    const access = await checkAccess();
    if (access) {
        loadGameState();
    }
})();

function saveGameState() {
    const state = {
        secretWord,
        currentAttempt,
        guesses,
        sessionCount,
        isGameOver
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGameState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const state = JSON.parse(saved);
        secretWord = state.secretWord;
        currentAttempt = state.currentAttempt;
        guesses = state.guesses || [];
        sessionCount = state.sessionCount || 1;
        isGameOver = state.isGameOver;

        createGrid();
        createKeyboard();
        restoreGrid();

        if (isGameOver) {
            restartBtn.style.display = 'block';
            if (guesses.includes(secretWord)) {
                messageEl.textContent = "GRATULACJE! (Odświeżono)";
            } else {
                messageEl.textContent = `KONIEC! Hasło to: ${secretWord}`;
            }
        }
    } else {
        initGame();
    }

    window.removeEventListener('keydown', handleKeydown);
    window.addEventListener('keydown', handleKeydown);
}

function initGame() {
    secretWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    currentAttempt = 0;
    currentTile = 0;
    isGameOver = false;
    isChecking = false;
    guesses = [];

    gridEl.innerHTML = '';
    keyboardEl.innerHTML = '';
    messageEl.textContent = '';
    restartBtn.style.display = 'none';

    createGrid();
    createKeyboard();
    saveGameState();
}

function restoreGrid() {
    guesses.forEach((guess, attemptIndex) => {
        for (let i = 0; i < 5; i++) {
            const tile = document.getElementById(`row-${attemptIndex}-tile-${i}`);
            tile.textContent = guess[i];

            const secretArr = secretWord.split('');
            if (guess[i] === secretArr[i]) {
                tile.classList.add('correct');
                secretArr[i] = null;
            }
        }
        const secretArr2 = secretWord.split('');
        for(let i=0; i<5; i++) if(guess[i] === secretArr2[i]) secretArr2[i] = null;

        for (let i = 0; i < 5; i++) {
            const tile = document.getElementById(`row-${attemptIndex}-tile-${i}`);
            if (tile.classList.contains('correct')) continue;

            const indexInSecret = secretArr2.indexOf(guess[i]);
            if (indexInSecret > -1) {
                tile.classList.add('present');
                secretArr2[indexInSecret] = null;
            } else {
                tile.classList.add('absent');
            }
        }
    });
}

function createGrid() {
    gridEl.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const row = document.createElement('div');
        row.className = 'wordle-row';
        row.id = `row-${i}`;
        for (let j = 0; j < 5; j++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `row-${i}-tile-${j}`;
            row.appendChild(tile);
        }
        gridEl.appendChild(row);
    }
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
            btn.addEventListener('click', () => handleInput(char));
            rowDiv.appendChild(btn);
        });
        keyboardEl.appendChild(rowDiv);
    });

    const actionRow = document.createElement('div');
    actionRow.className = 'key-row';
    const enter = document.createElement('button');
    enter.className = 'key wide';
    enter.textContent = 'ENTER';
    enter.addEventListener('click', () => handleInput('ENTER'));
    const back = document.createElement('button');
    back.className = 'key wide';
    back.textContent = '⌫';
    back.addEventListener('click', () => handleInput('BACKSPACE'));
    actionRow.appendChild(enter);
    actionRow.appendChild(back);
    keyboardEl.appendChild(actionRow);
}

function handleKeydown(e) {
    if (isGameOver || isChecking) return;
    const key = e.key.toUpperCase();
    if (key === 'ENTER' || key === 'BACKSPACE' || /^[A-ZĄĆĘŁŃÓŚŹŻ]$/.test(key)) {
        handleInput(key);
    }
}

function handleInput(key) {
    if (isGameOver || isChecking) return;
    if (key === 'BACKSPACE') {
        if (currentTile > 0) {
            currentTile--;
            const tile = document.getElementById(`row-${currentAttempt}-tile-${currentTile}`);
            tile.textContent = '';
            tile.classList.remove('active');
        }
        return;
    }
    if (key === 'ENTER') {
        if (currentTile === 5) checkWord();
        else showMessage("Za mało liter!");
        return;
    }
    if (currentTile < 5) {
        const tile = document.getElementById(`row-${currentAttempt}-tile-${currentTile}`);
        tile.textContent = key;
        tile.classList.add('active');
        currentTile++;
    }
}

function showMessage(msg) {
    messageEl.textContent = msg;
    setTimeout(() => {
        if (messageEl.textContent === msg) messageEl.textContent = '';
    }, 2000);
}

async function checkIsPolishWord(word) {
    try {
        const url = `https://pl.wiktionary.org/w/api.php?action=query&titles=${word.toLowerCase()}&format=json&origin=*`;
        const response = await fetch(url);
        const data = await response.json();
        const pages = data.query.pages;
        return Object.keys(pages)[0] !== "-1";
    } catch (error) {
        console.error(error);
        return true;
    }
}

async function checkWord() {
    let guess = "";
    for (let i = 0; i < 5; i++) {
        guess += document.getElementById(`row-${currentAttempt}-tile-${i}`).textContent;
    }

    isChecking = true;
    messageEl.textContent = "Sprawdzam słownik...";
    const exists = await checkIsPolishWord(guess);
    isChecking = false;
    messageEl.textContent = "";

    if (!exists) {
        showMessage("Nie ma takiego słowa!");
        const row = document.getElementById(`row-${currentAttempt}`);
        row.style.animation = "shake 0.5s";
        setTimeout(() => row.style.animation = "", 500);
        return;
    }

    guesses.push(guess);
    const secretArr = secretWord.split('');
    const guessArr = guess.split('');

    for (let i = 0; i < 5; i++) {
        const tile = document.getElementById(`row-${currentAttempt}-tile-${i}`);
        const key = document.querySelector(`.key[data-key="${guessArr[i]}"]`);

        if (guessArr[i] === secretArr[i]) {
            tile.classList.remove('active');
            tile.classList.add('correct');

            if(key) {
                key.classList.remove('present');
                key.classList.add('correct');
            }
            secretArr[i] = null;
            guessArr[i] = null;
        }
    }

    for (let i = 0; i < 5; i++) {
        if (guessArr[i] === null) continue;

        const tile = document.getElementById(`row-${currentAttempt}-tile-${i}`);
        const key = document.querySelector(`.key[data-key="${guess[i]}"]`);
        const indexInSecret = secretArr.indexOf(guessArr[i]);

        tile.classList.remove('active');

        if (indexInSecret > -1) {
            tile.classList.add('present');
            if(key && !key.classList.contains('correct')) {
                key.classList.add('present');
            }
            secretArr[indexInSecret] = null;
        } else {
            tile.classList.add('absent');
            if(key && !key.classList.contains('correct') && !key.classList.contains('present')) {
                key.classList.add('absent');
            }
        }
    }

    if (guess === secretWord) {
        isGameOver = true;
        messageEl.textContent = "GRATULACJE! WYGRAŁEŚ!";
        saveGameState();
        await saveWin();
    } else {
        currentAttempt++;
        currentTile = 0;
        if (currentAttempt >= 6) {
            isGameOver = true;
            messageEl.textContent = `KONIEC! Hasło to: ${secretWord}`;
            restartBtn.style.display = 'block';
        }
        saveGameState();
    }
}

restartBtn.addEventListener('click', () => {
    sessionCount++;
    initGame();
});

async function saveWin() {
    if (!nick) return;

    const today = new Date();
    const releaseDate = new Date(2025, 11, 1);
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
        if (!completedDays.includes(1)) {
            completedDays.push(1);
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
}