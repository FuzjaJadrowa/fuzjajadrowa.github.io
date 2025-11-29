import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getDatabase, ref, set, get, query, orderByChild, limitToLast, onValue, update } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
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

const modal = document.getElementById('login-modal');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const nickInput = document.getElementById('nickname-input');
const passInput = document.getElementById('password-input');
const mainBtn = document.getElementById('main-action-btn');
const switchBtn = document.getElementById('switch-mode-btn');
const errorMsg = document.getElementById('modal-error');

const grid = document.getElementById('calendar-grid');
const leaderboardBody = document.querySelector('#leaderboard-table tbody');

let currentUser = localStorage.getItem('dlevent_nickname');
let currentPass = localStorage.getItem('dlevent_password');
let authMode = 'login';

async function checkAutoLogin() {
    if (currentUser && currentPass) {
        const userRef = ref(db, 'users/' + currentUser);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.password === currentPass) {
                modal.style.display = 'none';
                renderGrid(data.completedDays || []);
                return;
            }
        }
    }
    localStorage.removeItem('dlevent_nickname');
    localStorage.removeItem('dlevent_password');
    modal.style.display = 'flex';
    setMode('login');
}

function setMode(mode) {
    authMode = mode;
    errorMsg.textContent = '';
    passInput.value = '';

    if (mode === 'login') {
        modalTitle.textContent = "LOGOWANIE";
        modalDesc.textContent = "Wpisz nick i hasło.";
        mainBtn.textContent = "ZALOGUJ";
        switchBtn.textContent = "Stwórz nowe konto";
        switchBtn.style.display = 'inline-block';
        nickInput.disabled = false;
    } else if (mode === 'register') {
        modalTitle.textContent = "Witaj w DLEVENT";
        modalDesc.textContent = "Podaj nick i utwórz hasło, aby zapisać wynik.";
        mainBtn.textContent = "DOŁĄCZ DO GRY";
        switchBtn.textContent = "Mam już konto (Zaloguj)";
        switchBtn.style.display = 'inline-block';
        nickInput.disabled = false;
    } else if (mode === 'set_password') {
        modalTitle.textContent = "ZABEZPIECZ KONTO";
        modalDesc.textContent = `Cześć ${nickInput.value}! Twoje konto nie ma hasła. Utwórz je teraz.`;
        mainBtn.textContent = "ZAPISZ HASŁO";
        switchBtn.style.display = 'none';
        nickInput.disabled = true;
    }
}

switchBtn.addEventListener('click', () => {
    if (authMode === 'login') setMode('register');
    else setMode('login');
});

mainBtn.addEventListener('click', async () => {
    const nick = nickInput.value.trim();
    const pass = passInput.value.trim();

    if (nick.length < 3) {
        errorMsg.textContent = "Nick za krótki (min 3 znaki).";
        return;
    }

    if (authMode !== 'login' && pass.length < 3) {
        errorMsg.textContent = "Hasło za krótkie (min 3 znaki).";
        return;
    }

    const userRef = ref(db, 'users/' + nick);
    const snapshot = await get(userRef);

    if (authMode === 'login') {
        if (snapshot.exists()) {
            const data = snapshot.val();

            if (!data.password) {
                setMode('set_password');
                return;
            }

            if (pass.length < 3) {
                errorMsg.textContent = "Podaj hasło.";
                return;
            }

            if (data.password === pass) {
                loginSuccess(nick, pass, data.completedDays);
            } else {
                errorMsg.textContent = "Błędne hasło.";
            }
        } else {
            errorMsg.textContent = "Taki gracz nie istnieje.";
        }

    } else if (authMode === 'register') {
        if (snapshot.exists()) {
            errorMsg.textContent = "Ten nick jest już zajęty!";
        } else {
            await set(userRef, {
                score: 0,
                completedDays: [],
                password: pass
            });
            loginSuccess(nick, pass, []);
        }

    } else if (authMode === 'set_password') {
        await update(userRef, {
            password: pass
        });
        loginSuccess(nick, pass, snapshot.val().completedDays);
    }
});

function loginSuccess(nick, pass, completedDays) {
    localStorage.setItem('dlevent_nickname', nick);
    localStorage.setItem('dlevent_password', pass);
    currentUser = nick;
    modal.style.display = 'none';
    renderGrid(completedDays || []);
}

function renderGrid(completedDays = []) {
    grid.innerHTML = '';
    const currentDate = new Date();
    const releaseYear = 2025;
    const releaseMonth = 11;

    for (let i = 1; i <= 24; i++) {
        const btn = document.createElement('button');
        btn.classList.add('day-btn');

        let isLocked = true;
        if (currentDate.getFullYear() > releaseYear) isLocked = false;
        else if (currentDate.getFullYear() === releaseYear &&
            currentDate.getMonth() === releaseMonth &&
            currentDate.getDate() >= i) isLocked = false;

        const isCompleted = completedDays.includes(i);

        if (isCompleted) {
            btn.classList.add('completed');
            btn.innerHTML = `${i} <span class="checkmark">✓</span>`;
        } else {
            btn.textContent = i;
        }

        if (isLocked) {
            btn.classList.add('locked');
            btn.disabled = true;
        } else {
            btn.addEventListener('click', () => {
                window.location.href = `day/${i}.html`;
            });
        }
        grid.appendChild(btn);
    }
}

const topScoresQuery = query(ref(db, 'users'), orderByChild('score'), limitToLast(10));

onValue(topScoresQuery, (snapshot) => {
    leaderboardBody.innerHTML = '';
    const users = [];
    snapshot.forEach((child) => {
        users.push({ nick: child.key, ...child.val() });
    });
    users.sort((a, b) => b.score - a.score);

    for (let i = 0; i < 10; i++) {
        const row = document.createElement('tr');
        if (users[i]) {
            if (users[i].nick === currentUser) row.classList.add('me');
            row.innerHTML = `
                <td>${i + 1}</td>
                <td>${users[i].nick}</td>
                <td>${users[i].score}</td>
            `;
        } else {
            row.innerHTML = `<td>-</td><td>-</td><td>-</td>`;
        }
        leaderboardBody.appendChild(row);
    }
});

checkAutoLogin();