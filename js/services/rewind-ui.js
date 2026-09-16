'use strict';

/**
 * rewind-ui.js — Rewind UI (kthim në kohë në hartë)
 */

window.TaxiRewindUI = (() => {
    let isActive = false;
    let currentTime = Date.now();
    let playbackInterval = null;
    let rewindLayers = [];
    let playbackSpeed = 1;

    // ═══ INIT ═══
    function init() {
        console.log('⏪ Rewind UI gati');
    }

    // ═══ SHFAQ PANEL ═══
    function openPanel() {
        const existing = document.getElementById('rewind-panel');
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.id = 'rewind-panel';
        panel.className = 'rewind-panel';
        panel.innerHTML = `
            <div class="rw-header">
                <i class="fa-solid fa-clock-rotate-left"></i>
                <span>Rewind — Kthim në kohë</span>
                <button class="rw-close" onclick="TaxiRewindUI.closePanel()">&times;</button>
            </div>

            <div class="rw-time-display">
                <div class="rw-current-time" id="rw-current-time">—</div>
                <div class="rw-label">Koha e zgjedhur</div>
            </div>

            <div class="rw-shortcuts">
                <button class="rw-btn" onclick="TaxiRewindUI.goBack(60)">1 min</button>
                <button class="rw-btn" onclick="TaxiRewindUI.goBack(600)">10 min</button>
                <button class="rw-btn" onclick="TaxiRewindUI.goBack(3600)">1 orë</button>
                <button class="rw-btn" onclick="TaxiRewindUI.goBack(86400)">Dje</button>
                <button class="rw-btn" onclick="TaxiRewindUI.goBack(604800)">1 javë</button>
                <button class="rw-btn" onclick="TaxiRewindUI.goBack(2592000)">1 muaj</button>
                <button class="rw-btn" onclick="TaxiRewindUI.goBack(31536000)">1 vit</button>
            </div>

            <div class="rw-slider-wrap">
                <input type="range" id="rw-slider" class="rw-slider" min="0" max="100" value="100" oninput="TaxiRewindUI.onSliderChange(this.value)">
                <div class="rw-slider-labels">
                    <span>Më herët</span>
                    <span>Tani</span>
                </div>
            </div>

            <div class="rw-playback">
                <button class="rw-play-btn" id="rw-play" onclick="TaxiRewindUI.togglePlayback()">
                    <i class="fa-solid fa-play"></i> Play
                </button>
                <select id="rw-speed" class="rw-speed" onchange="TaxiRewindUI.setSpeed(this.value)">
                    <option value="1">1x</option>
                    <option value="2">2x</option>
                    <option value="5">5x</option>
                    <option value="10">10x</option>
                    <option value="60">60x</option>
                </select>
                <button class="rw-play-btn" onclick="TaxiRewindUI.resetToNow()">
                    <i class="fa-solid fa-rotate"></i> Tani
                </button>
            </div>

            <div class="rw-info" id="rw-info">
                <i class="fa-solid fa-circle-info"></i>
                Kliko një shortcut për të kthyer kohën
            </div>
        `;
        document.body.appendChild(panel);
        isActive = true;

        updateTimeDisplay();
    }

    function closePanel() {
        stopPlayback();
        clearLayers();
        document.getElementById('rewind-panel')?.remove();
        isActive = false;
    }

    // ═══ KTHEHET PAS ═══
    function goBack(seconds) {
        currentTime = Date.now() - (seconds * 1000);
        updateTimeDisplay();
        loadPositions();
    }

    function resetToNow() {
        stopPlayback();
        currentTime = Date.now();
        updateTimeDisplay();
        clearLayers();
    }

    // ═══ SLIDER ═══
    function onSliderChange(value) {
        // 0 = më herët (1 ditë), 100 = tani
        const maxBack = 7 * 24 * 3600 * 1000; // 7 ditë
        currentTime = Date.now() - ((100 - value) / 100) * maxBack;
        updateTimeDisplay();
        loadPositions();
    }

    // ═══ UPDATE TIME DISPLAY ═══
    function updateTimeDisplay() {
        const el = document.getElementById('rw-current-time');
        if (el) {
            el.textContent = new Date(currentTime).toLocaleString('sq-AL');
        }

        const diff = Date.now() - currentTime;
        const info = document.getElementById('rw-info');
        if (info) {
            if (diff < 60000) info.innerHTML = '<i class="fa-solid fa-circle-info"></i> Duke shfaqur: Tani';
            else if (diff < 3600000) info.innerHTML = `<i class="fa-solid fa-clock"></i> Para ${Math.floor(diff / 60000)} minutash`;
            else if (diff < 86400000) info.innerHTML = `<i class="fa-solid fa-clock"></i> Para ${Math.floor(diff / 3600000)} orësh`;
            else info.innerHTML = `<i class="fa-solid fa-clock"></i> Para ${Math.floor(diff / 86400000)} ditësh`;
        }
    }

    // ═══ NGRO POROZIT E POZICIONET ═══
    async function loadPositions() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        try {
            clearLayers();

            const from = currentTime - 60000; // 1 min më herët
            const to = currentTime + 60000;   // 1 min më vonë

            const snap = await db.collection('positions_history')
                .where('timestamp', '>=', from)
                .where('timestamp', '<=', to)
                .limit(500)
                .get();

            if (snap.empty) {
                const info = document.getElementById('rw-info');
                if (info) info.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Nuk ka të dhëna për këtë kohë';
                return;
            }

            const map = window.AppState?.map;
            if (!map) return;

            snap.forEach(doc => {
                const p = doc.data();
                if (!p.lat || !p.lng) return;

                const marker = L.circleMarker([p.lat, p.lng], {
                    radius: 8,
                    color: '#f59e0b',
                    fillColor: '#f59e0b',
                    fillOpacity: 0.7,
                    weight: 2
                }).addTo(map);

                marker.bindPopup(`
                    <div style="font-size:11px;">
                        <strong>🚗 ${p.driverId || 'N/A'}</strong><br>
                        ${new Date(p.timestamp).toLocaleString('sq-AL')}<br>
                        Mode: ${p.mode || '—'}
                    </div>
                `);

                rewindLayers.push(marker);
            });

            const info = document.getElementById('rw-info');
            if (info) info.innerHTML = `<i class="fa-solid fa-check"></i> ${snap.size} pozicione u shfaqën`;

        } catch (e) {
            console.error('❌ loadPositions:', e);
        }
    }

    // ═══ PLAYBACK ═══
    function togglePlayback() {
        if (playbackInterval) {
            stopPlayback();
        } else {
            startPlayback();
        }
    }

    function startPlayback() {
        if (playbackInterval) return;

        const btn = document.getElementById('rw-play');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';

        playbackInterval = setInterval(() => {
            currentTime += 1000 * playbackSpeed;
            if (currentTime >= Date.now()) {
                currentTime = Date.now();
                stopPlayback();
                return;
            }
            updateTimeDisplay();
            // Rifresko pozicionet çdo 5 sek
            if (Math.floor((currentTime / 1000)) % 5 === 0) {
                loadPositions();
            }
        }, 1000);
    }

    function stopPlayback() {
        if (playbackInterval) {
            clearInterval(playbackInterval);
            playbackInterval = null;
        }
        const btn = document.getElementById('rw-play');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-play"></i> Play';
    }

    function setSpeed(speed) {
        playbackSpeed = parseInt(speed) || 1;
    }

    // ═══ CLEAR ═══
    function clearLayers() {
        const map = window.AppState?.map;
        if (!map) return;
        rewindLayers.forEach(layer => {
            try { map.removeLayer(layer); } catch (e) {}
        });
        rewindLayers = [];
    }

    return {
        init, openPanel, closePanel,
        goBack, resetToNow, onSliderChange,
        togglePlayback, setSpeed,
        get isActive() { return isActive; }
    };
})();

console.log('✅ rewind-ui.js ngarkuar');
