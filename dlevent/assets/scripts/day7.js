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

const STORAGE_KEY = 'dlevent_day7_state';

let countriesData = [];
let TARGET_COUNTRY = null;
const MAX_ATTEMPTS = 6;
let attempts = 0;
let isGameOver = false;
let sessionCount = 1;
let guessedISOs = new Set();
let historyGuesses = [];

let nick;
let canvas, ctx;
let searchInput, searchResults, historyBody, messageEl, restartBtn, attemptsDisplay;
let blocker, blockerTitle, blockerMsg;
let polishNamesMap = {};

document.addEventListener('DOMContentLoaded', () => {
    nick = localStorage.getItem('dlevent_nickname');

    canvas = document.getElementById('worldle-canvas');
    ctx = canvas.getContext('2d');

    searchInput = document.getElementById('worldle-search-input');
    searchResults = document.getElementById('worldle-search-results');
    historyBody = document.getElementById('worldle-history-body');
    messageEl = document.getElementById('message-area');
    restartBtn = document.getElementById('restart-btn');
    attemptsDisplay = document.getElementById('attempts-display');

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

    loadPolishNames().then(() => {
        loadGeoJSON().then(() => {
            start();
        });
    });
});

async function loadPolishNames() {
    try {
        const res = await fetch('https://restcountries.com/v3.1/all?fields=cca2,translations');
        const data = await res.json();
        data.forEach(c => {
            const pl = c.translations?.pol?.common;
            if (pl) polishNamesMap[c.cca2] = pl;
        });
    } catch (e) {
        console.error("Błąd tłumaczeń:", e);
    }
}

async function loadGeoJSON() {
    try {
        const res = await fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson');
        const data = await res.json();

        countriesData = data.features.filter(d => d.properties.ISO_A2 !== 'AQ' && d.properties.ISO_A2 !== '-99');
        countriesData.forEach(d => {
            const iso = d.properties.ISO_A2;
            if (polishNamesMap[iso]) d.properties.NAME = polishNamesMap[iso];
        });
        countriesData.sort((a, b) => a.properties.NAME.localeCompare(b.properties.NAME));
    } catch (e) {
        console.error("Błąd GeoJSON:", e);
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
    const releaseDate = new Date(2025, 11, 7);

    if (today < releaseDate) {
        showBlocker("NIE OSZUKUJ!", "To zadanie nie jest jeszcze dostępne.");
        return false;
    }
    try {
        const userRef = ref(db, 'users/' + nick);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.completedDays && data.completedDays.includes(7)) {
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
        sessionCount: sessionCount,
        targetIso: TARGET_COUNTRY ? TARGET_COUNTRY.iso : null,
        attempts,
        historyGuesses,
        guessedISOs: Array.from(guessedISOs),
        isGameOver
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGameState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && countriesData.length > 0) {
        const state = JSON.parse(saved);

        sessionCount = state.sessionCount || 1;

        if (state.targetIso) {
            const targetFeature = countriesData.find(f => f.properties.ISO_A2 === state.targetIso);
            if (!targetFeature) { prepareNewRound(); return; }

            const centroid = calculateCentroid(targetFeature.geometry);
            TARGET_COUNTRY = {
                name: targetFeature.properties.NAME,
                iso: targetFeature.properties.ISO_A2,
                geometry: targetFeature.geometry,
                lat: centroid[1],
                lng: centroid[0]
            };

            attempts = state.attempts;
            historyGuesses = state.historyGuesses || [];
            guessedISOs = new Set(state.guessedISOs || []);
            isGameOver = state.isGameOver;

            drawCountryOnCanvas(TARGET_COUNTRY.geometry);

            attemptsDisplay.textContent = `Próby: ${attempts}/${MAX_ATTEMPTS}`;
            historyBody.innerHTML = '';

            for(let i = historyGuesses.length - 1; i >= 0; i--) {
                const g = historyGuesses[i];
                addHistoryRow(g.name, g.dist, g.percent, g.lat, g.lng, g.isTarget);
            }

            if (isGameOver) {
                searchInput.disabled = true;
                if (historyGuesses.length > 0 && historyGuesses[historyGuesses.length-1].isTarget) {
                    messageEl.textContent = "GRATULACJE! (Odświeżono)";
                    messageEl.style.color = "#00ff41";
                } else {
                    messageEl.textContent = `KONIEC! To: ${TARGET_COUNTRY.name.toUpperCase()}`;
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

function prepareNewRound() {
    if (countriesData.length === 0) return;

    attempts = 0;
    isGameOver = false;
    guessedISOs.clear();
    historyGuesses = [];
    searchInput.value = '';
    searchInput.disabled = false;
    restartBtn.style.display = 'none';
    messageEl.textContent = '';
    attemptsDisplay.textContent = `Próby: ${attempts}/${MAX_ATTEMPTS}`;
    historyBody.innerHTML = '';

    const randomFeature = countriesData[Math.floor(Math.random() * countriesData.length)];
    const centroid = calculateCentroid(randomFeature.geometry);

    TARGET_COUNTRY = {
        name: randomFeature.properties.NAME,
        iso: randomFeature.properties.ISO_A2,
        geometry: randomFeature.geometry,
        lat: centroid[1],
        lng: centroid[0]
    };

    drawCountryOnCanvas(TARGET_COUNTRY.geometry);
    saveGameState();
}

function drawCountryOnCanvas(geometry) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    const scanCoords = (coords) => {
        coords.forEach(pt => {
            const x = pt[0];
            const y = pt[1];
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        });
    };

    const processGeometry = (geo) => {
        if (geo.type === 'Polygon') {
            geo.coordinates.forEach(ring => scanCoords(ring));
        } else if (geo.type === 'MultiPolygon') {
            geo.coordinates.forEach(poly => poly.forEach(ring => scanCoords(ring)));
        }
    };
    processGeometry(geometry);

    const geoWidthRaw = maxX - minX;
    const geoHeight = maxY - minY;

    if (geoWidthRaw === 0 || geoHeight === 0) return;

    const midY = (minY + maxY) / 2;
    const correction = Math.cos(midY * Math.PI / 180);
    const geoWidthCorrected = geoWidthRaw * correction;

    const padding = 40;
    const availableW = canvas.width - (padding * 2);
    const availableH = canvas.height - (padding * 2);

    const scaleX = availableW / geoWidthCorrected;
    const scaleY = availableH / geoHeight;
    const scale = Math.min(scaleX, scaleY);

    const transform = (lng, lat) => {
        const drawnW = geoWidthCorrected * scale;
        const drawnH = geoHeight * scale;
        const offsetX = (canvas.width - drawnW) / 2;
        const offsetY = (canvas.height - drawnH) / 2;
        const x = (lng - minX) * correction * scale + offsetX;
        const y = canvas.height - ((lat - minY) * scale + offsetY);
        return [x, y];
    };

    ctx.beginPath();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.fillStyle = "#ffffff";

    const drawPoly = (coords) => {
        coords.forEach(ring => {
            ring.forEach((pt, index) => {
                const [cx, cy] = transform(pt[0], pt[1]);
                if (index === 0) ctx.moveTo(cx, cy);
                else ctx.lineTo(cx, cy);
            });
            ctx.closePath();
        });
    };

    if (geometry.type === 'Polygon') {
        drawPoly(geometry.coordinates);
    } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach(poly => drawPoly(poly));
    }

    ctx.fill();
    ctx.stroke();
}

function filterCountries(query) {
    if (query.length < 2) {
        searchResults.style.display = 'none';
        return;
    }
    const lower = query.toLowerCase();
    const matches = countriesData.filter(d => d.properties.NAME.toLowerCase().includes(lower));

    searchResults.innerHTML = '';
    if (matches.length > 0) {
        searchResults.style.display = 'block';
        matches.slice(0, 10).forEach(d => {
            const div = document.createElement('div');
            div.className = 'globle-search-item';
            div.textContent = d.properties.NAME;
            div.addEventListener('click', () => handleGuess(d));
            searchResults.appendChild(div);
        });
    } else {
        searchResults.style.display = 'none';
    }
}

function handleGuess(feature) {
    if (isGameOver) return;
    searchResults.style.display = 'none';
    searchInput.value = '';

    const iso = feature.properties.ISO_A2;
    if (guessedISOs.has(iso)) {
        messageEl.textContent = "Ten kraj już był!";
        return;
    }
    guessedISOs.add(iso);

    attempts++;
    attemptsDisplay.textContent = `Próby: ${attempts}/${MAX_ATTEMPTS}`;

    const center = calculateCentroid(feature.geometry);
    const guessLat = center[1];
    const guessLng = center[0];

    const dist = getDistanceFromLatLonInKm(guessLat, guessLng, TARGET_COUNTRY.lat, TARGET_COUNTRY.lng);
    const roundedDist = Math.round(dist / 100) * 100;

    let percent = Math.round(100 - (dist / 20000 * 100));
    if (percent < 0) percent = 0;
    if (dist === 0) percent = 100;

    const isTarget = iso === TARGET_COUNTRY.iso;

    historyGuesses.push({
        name: feature.properties.NAME,
        dist: roundedDist,
        percent: percent,
        lat: guessLat,
        lng: guessLng,
        isTarget: isTarget
    });

    addHistoryRow(feature.properties.NAME, roundedDist, percent, guessLat, guessLng, isTarget);

    if (isTarget) {
        winGame();
    } else if (attempts >= MAX_ATTEMPTS) {
        loseGame();
    }
    saveGameState();
}

function addHistoryRow(name, dist, percent, lat, lng, isTarget) {
    const row = document.createElement('tr');
    row.className = 'globle-row';

    const bearing = getBearing(lat, lng, TARGET_COUNTRY.lat, TARGET_COUNTRY.lng);
    const arrow = getArrow(bearing);

    let icon = arrow;
    if (isTarget) icon = '🏆';
    else if (dist === 0) icon = '🎯';

    row.innerHTML = `
        <td>${name}</td>
        <td>${dist} km</td>
        <td>${icon}</td>
        <td>${percent}%</td>
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
    messageEl.textContent = `KONIEC! To: ${TARGET_COUNTRY.name}`;
    messageEl.style.color = "#ff3333";
    searchInput.disabled = true;
    restartBtn.style.display = 'block';
}

function calculateCentroid(geometry) {
    let coords = [];
    if (geometry.type === 'Polygon') {
        coords = geometry.coordinates[0];
    } else if (geometry.type === 'MultiPolygon') {
        let maxArea = 0;
        let maxPoly = geometry.coordinates[0][0];
        geometry.coordinates.forEach(poly => {
            if (poly[0].length > maxArea) {
                maxArea = poly[0].length;
                maxPoly = poly[0];
            }
        });
        coords = maxPoly;
    }
    let x = 0, y = 0;
    coords.forEach(p => { x += p[0]; y += p[1]; });
    return [x / coords.length, y / coords.length];
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.floor(R * c);
}
function deg2rad(deg) { return deg * (Math.PI / 180); }
function toRadians(deg) { return deg * Math.PI / 180; }
function toDegrees(rad) { return rad * 180 / Math.PI; }

function getBearing(startLat, startLng, destLat, destLng) {
    startLat = toRadians(startLat);
    startLng = toRadians(startLng);
    destLat = toRadians(destLat);
    destLng = toRadians(destLng);
    const y = Math.sin(destLng - startLng) * Math.cos(destLat);
    const x = Math.cos(startLat) * Math.sin(destLat) - Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
    let brng = Math.atan2(y, x);
    brng = toDegrees(brng);
    return (brng + 360) % 360;
}

function getArrow(angle) {
    const directions = ['⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️'];
    const index = Math.round(((angle %= 360) < 0 ? angle + 360 : angle) / 45) % 8;
    return directions[index];
}

async function saveWin() {
    if (!nick) return;
    const today = new Date();
    const releaseDate = new Date(2025, 11, 7);
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
        if (!completedDays.includes(7)) {
            completedDays.push(7);
            const newScore = (data.score || 0) + pointsEarned;
            await update(userRef, { score: newScore, completedDays: completedDays });
            messageEl.textContent += ` (+${pointsEarned} PKT)`;
            setTimeout(() => { showBlocker("UKOŃCZONE", `Zdobyłeś ${pointsEarned} pkt!`); }, 3000);
        } else {
            showBlocker("UKOŃCZONE", "Zadanie już zaliczone wcześniej.");
        }
    }
}