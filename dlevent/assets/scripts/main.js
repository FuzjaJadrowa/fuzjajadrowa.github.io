import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getDatabase, ref, set, get, query, orderByChild, limitToLast, onValue } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCy4pA-GPhj5Ul9nok4gDBDpCSoAfyzGA0",
    authDomain: "dlevent-db.firebaseapp.com",
    databaseURL: "https://dlevent-db-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "dlevent-db",
    storageBucket: "dlevent-db.firebasestorage.app",
    messagingSenderId: "868572467780",
    appId:
    "1:868572467780:web:788d6f6f04b844253ba211"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const modal = document.getElementById('login-modal');
const nickInput = document.getElementById('nickname-input');
const startBtn = document.getElementById('start-btn');
const errorMsg = document.getElementById('modal-error');
const grid = document.getElementById('calendar-grid');
const leaderboardBody = document.querySelector('#leaderboard-table tbody');

let currentUser = localStorage.getItem('dlevent_nickname');

async function initGame() {
    if (currentUser) {
        const userSnapshot = await get(ref(db, 'users/' + currentUser));
        if (userSnapshot.exists()) {
            modal.style.display = 'none';
            renderGrid(userSnapshot.val().completedDays || []);
        } else {
            localStorage.removeItem('dlevent_nickname');
            modal.style.display = 'flex';
        }
    } else {
        modal.style.display = 'flex';
    }
}

startBtn.addEventListener('click', async () => {
    const nick = nickInput.value.trim();

    if (nick.length < 3) {
        errorMsg.textContent = "Nick za krótki (min 3 znaki).";
        return;
    }

    const userRef = ref(db, 'users/' + nick);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
        errorMsg.textContent = "Ten nick jest już zajęty!";
    } else {
        await set(userRef, {
            score: 0,
            completedDays: []
        });
        
        localStorage.setItem('dlevent_nickname', nick);
        currentUser = nick;
        modal.style.display = 'none';
        renderGrid([]);
    }
});

function renderGrid(completedDays = []) {
    grid.innerHTML = '';

    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const debugMode = false;

    for (let i = 1; i <= 24; i++) {
        const btn = document.createElement('button');
        btn.classList.add('day-btn');

        let isLocked = true;

        if (debugMode) {
            isLocked = false;
        } else {
            if (currentYear > 2025) isLocked = false;
            else if (currentYear === 2025 && currentMonth === 11 && i <= currentDay) isLocked = false;
        }

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
                console.log(`Otwieranie dnia ${i}`);
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

    const displayCount = 10;
    for (let i = 0; i < displayCount; i++) {
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

initGame();