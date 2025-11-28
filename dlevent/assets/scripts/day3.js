import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

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
const db = getDatabase(app);

const SONGS_DB = [
    { id: 1, artist: "Wham!", title: "Last Christmas", file: "/dlevent/assets/audio/1.mp3" },
    { id: 2, artist: "Mariah Carey", title: "All I Want For Christmas Is You", file: "/dlevent/assets/audio/2.mp3" },
    { id: 3, artist: "Czerwone Gitary", title: "Dzień jeden w roku", file: "/dlevent/assets/audio/3.mp3" },
    { id: 4, artist: "Dean Martin", title: "Let It Snow!", file: "/dlevent/assets/audio/4.mp3" },
    { id: 5, artist: "Chris Rea", title: "Driving Home For Christmas", file: "/dlevent/assets/audio/5.mp3" },
    { id: 6, artist: "Frank Sinatra", title: "Jingle Bells", file: "/dlevent/assets/audio/6.mp3" },
    { id: 7, artist: "De Su", title: "Kto wie?", file: "/dlevent/assets/audio/7.mp3" },
    { id: 8, artist: "Brenda Lee", title: "Rockin' Around The Christmas Tree", file: "/dlevent/assets/audio/8.mp3" },
    { id: 9, artist: "José Feliciano", title: "Feliz Navidad", file: "/dlevent/assets/audio/9.mp3" },
    { id: 10, artist: "Bobby Helms", title: "Jingle Bell Rock", file: "/dlevent/assets/audio/10.mp3" }
];

const STORAGE_KEY = 'dlevent_day3_state';

let TARGET_SONG;
const STEPS = [
    { time: 0.5, width: 6 },
    { time: 1.0, width: 6 },
    { time: 2.0, width: 12 },
    { time: 4.0, width: 20 },
    { time: 8.0, width: 26 },
    { time: 15.0, width: 30 }
];

let currentStep = 0;
let isPlaying = false;
let audio = new Audio();
let selectedSong = null;
let isGameOver = false;
let sessionCount = 1;
let historyGuesses = [];

let nick;
let playBtn, progressFill, progressContainer, searchInput, searchResults, skipBtn, submitBtn, messageEl, restartBtn, guessesList;
let blocker, blockerTitle, blockerMsg;

document.addEventListener('DOMContentLoaded', () => {
    nick = localStorage.getItem('dlevent_nickname');

    playBtn = document.getElementById('play-btn');
    progressFill = document.getElementById('progress-fill');
    progressContainer = document.getElementById('progress-container');
    searchInput = document.getElementById('song-search');
    searchResults = document.getElementById('search-results');
    skipBtn = document.getElementById('skip-btn');
    submitBtn = document.getElementById('submit-btn');
    messageEl = document.getElementById('message-area');
    restartBtn = document.getElementById('restart-btn');
    guessesList = document.getElementById('guesses-list');

    blocker = document.getElementById('access-blocker');
    blockerTitle = document.getElementById('blocker-title');
    blockerMsg = document.getElementById('blocker-msg');

    initUI();

    playBtn.addEventListener('click', togglePlay);
    skipBtn.addEventListener('click', handleSkip);
    submitBtn.addEventListener('click', handleGuess);

    let timeout = null;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => searchSongsITunes(e.target.value), 300);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            searchResults.style.display = 'none';
        }
    });

    restartBtn.addEventListener('click', () => {
        sessionCount++;
        resetGame();
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
    const releaseDate = new Date(2025, 11, 3);

    if (today < releaseDate) {
        showBlocker("NIE OSZUKUJ!", "To zadanie nie jest jeszcze dostępne.");
        return false;
    }

    try {
        const userRef = ref(db, 'users/' + nick);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.completedDays && data.completedDays.includes(3)) {
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
        targetSongId: TARGET_SONG.id,
        currentStep,
        historyGuesses,
        sessionCount,
        isGameOver
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGameState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const state = JSON.parse(saved);
        TARGET_SONG = SONGS_DB.find(s => s.id === state.targetSongId);
        if (!TARGET_SONG) { resetGame(); return; }

        audio.src = TARGET_SONG.file;
        currentStep = state.currentStep;
        historyGuesses = state.historyGuesses || [];
        sessionCount = state.sessionCount || 1;
        isGameOver = state.isGameOver;

        historyGuesses.forEach((g, i) => {
            const boxes = guessesList.children;
            const box = boxes[i];
            box.textContent = g.text;
            box.classList.add(g.status);
        });

        if (isGameOver) {
            submitBtn.disabled = true;
            skipBtn.disabled = true;
            progressFill.style.width = '100%';

            const last = historyGuesses[historyGuesses.length-1];
            if (last && last.status === 'correct') {
                messageEl.textContent = "GRATULACJE!";
            } else {
                messageEl.textContent = `KONIEC! To było: ${TARGET_SONG.artist} - ${TARGET_SONG.title}`;
                messageEl.style.color = "#ff3333";
                restartBtn.style.display = 'block';
            }
        } else {
            messageEl.textContent = `Odblokowano ${STEPS[currentStep].time} sekundy!`;
        }
    } else {
        resetGame();
    }
}

function initUI() {
    progressContainer.innerHTML = '<div class="progress-fill" id="progress-fill"></div>';

    STEPS.forEach((step) => {
        const div = document.createElement('div');
        div.className = 'progress-segment';
        div.style.width = step.width + '%';
        div.style.backgroundColor = 'transparent';
        progressContainer.appendChild(div);
    });
    progressFill = document.getElementById('progress-fill');
}

function resetGame() {
    TARGET_SONG = SONGS_DB[Math.floor(Math.random() * SONGS_DB.length)];
    audio.src = TARGET_SONG.file;

    currentStep = 0;
    isGameOver = false;
    selectedSong = null;
    historyGuesses = [];
    searchInput.value = '';
    searchInput.disabled = false;
    submitBtn.disabled = false;
    skipBtn.disabled = false;
    restartBtn.style.display = 'none';
    messageEl.textContent = '';

    const boxes = guessesList.children;
    for(let box of boxes) {
        box.className = 'guess-box';
        box.textContent = '';
        box.className = 'guess-box';
    }

    stopAudio();
    saveGameState();
}

function togglePlay() {
    if (isPlaying) {
        stopAudio();
    } else {
        playAudio();
    }
}

function playAudio() {
    if(isGameOver && currentStep >= STEPS.length - 1) {
    }
    if (isGameOver && historyGuesses.length > 0 && historyGuesses[historyGuesses.length-1].status !== 'correct' && currentStep < 5) return;

    const maxDuration = STEPS[Math.min(currentStep, 5)].time;

    audio.play().catch(error => {
        console.error("Błąd odtwarzania:", error);
        alert("Nie można odtworzyć pliku audio. Upewnij się, że plik mp3 jest w folderze dlevent/audio/ na GitHubie.");
        isPlaying = false;
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
    });

    isPlaying = true;
    playBtn.innerHTML = '<i class="fas fa-stop"></i>';

    progressFill.style.transition = `width ${maxDuration}s linear`;

    let totalWidth = 0;
    for(let i=0; i<=Math.min(currentStep, 5); i++) totalWidth += STEPS[i].width;

    progressFill.style.width = totalWidth + '%';

    setTimeout(() => {
        if (isPlaying) stopAudio();
    }, maxDuration * 1000);
}

function stopAudio() {
    audio.pause();
    audio.currentTime = 0;
    isPlaying = false;
    playBtn.innerHTML = '<i class="fas fa-play"></i>';

    progressFill.style.transition = 'none';
    progressFill.style.width = '0%';
}

async function searchSongsITunes(query) {
    if (query.length < 2) {
        searchResults.style.display = 'none';
        return;
    }

    try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=5`);
        const data = await res.json();

        searchResults.innerHTML = '';
        if (data.results.length > 0) {
            searchResults.style.display = 'block';
            data.results.forEach(song => {
                const div = document.createElement('div');
                div.className = 'search-item';
                div.innerHTML = `
                    <img src="${song.artworkUrl60}" alt="cover" style="border-radius:5px;">
                    <div>
                        <div style="font-weight:bold">${song.trackName}</div>
                        <div style="color:#aaa; font-size:0.8rem">${song.artistName}</div>
                    </div>
                `;
                div.addEventListener('click', () => {
                    selectSong(song);
                });
                searchResults.appendChild(div);
            });
        }
    } catch (e) {
        console.error("Błąd iTunes:", e);
    }
}

function selectSong(song) {
    selectedSong = song;
    searchInput.value = `${song.artistName} - ${song.trackName}`;
    searchResults.style.display = 'none';
}

function handleSkip() {
    if(isGameOver) return;
    recordAttempt("POMINIĘTO", "skipped");
}

function handleGuess() {
    if(isGameOver) return;
    if(!selectedSong) {
        messageEl.textContent = "Wybierz piosenkę z listy!";
        return;
    }

    const targetArtist = TARGET_SONG.artist.toLowerCase();
    const targetTitle = TARGET_SONG.title.toLowerCase();

    const guessArtist = selectedSong.artistName.toLowerCase();
    const guessTitle = selectedSong.trackName.toLowerCase();

    const artistMatch = guessArtist.includes(targetArtist) || targetArtist.includes(guessArtist);
    const titleMatch = guessTitle.includes(targetTitle) || targetTitle.includes(guessTitle);

    if (artistMatch && titleMatch) {
        winGame();
    } else {
        recordAttempt(`${selectedSong.artistName} - ${selectedSong.trackName}`, "wrong");
    }

    selectedSong = null;
    searchInput.value = '';
}

function recordAttempt(text, status) {
    historyGuesses.push({text, status});

    const boxes = guessesList.children;
    const box = boxes[currentStep];

    box.textContent = text;
    box.classList.add(status);

    if (currentStep < 5) {
        currentStep++;
        messageEl.textContent = `Odblokowano ${STEPS[currentStep].time} sekundy!`;
    } else {
        loseGame();
    }
    saveGameState();
}

function winGame() {
    const boxes = guessesList.children;
    boxes[currentStep].textContent = `${TARGET_SONG.artist} - ${TARGET_SONG.title}`;
    boxes[currentStep].classList.add('correct');

    historyGuesses.push({text: `${TARGET_SONG.artist} - ${TARGET_SONG.title}`, status: 'correct'});

    isGameOver = true;
    messageEl.textContent = "GRATULACJE!";

    progressFill.style.width = '100%';
    submitBtn.disabled = true;
    skipBtn.disabled = true;

    saveWin();
    saveGameState();
}

function loseGame() {
    isGameOver = true;
    messageEl.textContent = `KONIEC! To było: ${TARGET_SONG.artist} - ${TARGET_SONG.title}`;
    messageEl.style.color = "#ff3333";
    restartBtn.style.display = 'block';
    saveGameState();
}

async function saveWin() {
    if (!nick) return;

    const today = new Date();
    const releaseDate = new Date(2025, 11, 3);
    const isReleaseDay = (today.getDate() === releaseDate.getDate() && today.getMonth() === releaseDate.getMonth() && today.getFullYear() === releaseDate.getFullYear());

    let pointsEarned = 5;

    if (isReleaseDay) {
        if (currentStep <= 3) pointsEarned = 10;
        else if (currentStep === 4) pointsEarned = 8;
        else pointsEarned = 6;
    }

    const userRef = ref(db, 'users/' + nick);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
        const data = snapshot.val();
        let completedDays = data.completedDays || [];

        if (!completedDays.includes(3)) {
            completedDays.push(3);
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