'use strict';

/**
 * js/tv/app.js — Logjika e TV Display
 */

window.TvApp = (() => {
    let map = null;
    let markers = new Map();
    let clockInterval = null;
    let updateInterval = null;

    // ═══ INIT ═══
    async function init() {
        console.log('📺 TV Display: Init...');

        // Firebase
        if (window.TaxiFirebase) window.TaxiFirebase.init();

        // Init modules
        if (window.TaxiTvDisplay) window.TaxiTvDisplay.init();

        // Nis orën
        startClock();

        // Init hartën
        setTimeout(initMap, 500);

        // Kontrollo sesionin
        checkSession();

        // Auto-update
        startAutoUpdate();

        // Fshij loading
        setTimeout(() => {
            document.getElementById('loading-overlay')?.classList.add('hidden');
        }, 800);

        // Listen për ndryshime
        listenOrders();

        console.log('✅ TV Display gati');
    }

    // ═══ SESIONI ═══
    function checkSession() {
        // TV lejon vetëm përdorues të loguar
        const user = firebase.auth?.().currentUser;
        if (!user) {
            console.warn('⚠️ Nuk ka sesion aktiv');
            // Opsionale: kërko login
        }
    }

    // ═══ ORA ═══
    function startClock() {
        const update = () => {
            const now = new Date();
            const t = document.getElementById('tv-clock-time');
            const d = document.getElementById('tv-clock-date');
            if (t) t.textContent = now.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            if (d) d.textContent = now.toLocaleDateString('sq-AL', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
        };
        update();
        clockInterval = setInterval(update, 1000);
    }

    // ═══ HARTA ═══
    function initMap() {
        const el = document.getElementById('tv-map');
        if (!el) return;

        map = L.map('tv-map', {
            center: [42.6629, 21.1655],
            zoom: 12,
            zoomControl: false,
            attributionControl: false
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd'
        }).addTo(map);

        // Zonat
        (window.TaxiData?.zones || []).forEach(z => {
            L.polygon(z.polygon, {
                color: z.color,
                fillColor: z.color,
                fillOpacity: 0.06,
                weight: 2,
                dashArray: '6,4'
            }).addTo(map);
        });

        // Render veturat
        renderVehicles();

        // Refresh çdo 5 sek
        setInterval(renderVehicles, 5000);

        console.log('✅ TV Harta gati');
    }

    // ═══ RENDER VETURAT ═══
    function renderVehicles() {
        if (!map) return;

        // Fshij markerat e vjetër
        markers.forEach(m => map.removeLayer(m));
        markers.clear();

        const drivers = window.AppState?.drivers || window.TaxiData?.drivers || [];
        const filtered = filterDrivers(drivers);

        filtered.forEach(driver => {
            const vehicle = (window.AppState?.vehicles || window.TaxiData?.vehicles || []).find(v => v.id === driver.vehicleId);
            if (!vehicle) return;

            const num = String(driver.vehicleId).padStart(2, '0');
            const mode = driver.mode || 'inactive';

            const icon = L.divIcon({
                className: 'tv-marker',
                html: `<div class="tv-marker-inner ${mode}">${num}</div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });

            const marker = L.marker([driver.lat, driver.lng], { icon }).addTo(map);

            // Popup me detaje sipas settings
            const settings = window.TaxiTvDisplay?.settings || {};
            let popupContent = '<div style="font-family:Inter,sans-serif;font-size:12px;padding:4px;">';
            if (settings.showVehicleNum !== false) popupContent += `<strong style="color:#a855f7;font-size:14px;">🚗 ${num}</strong><br>`;
            if (settings.showDriverName !== false) popupContent += `${driver.name}<br>`;
            if (settings.showPlate && vehicle) popupContent += `Targa: ${vehicle.plate}<br>`;
            if (settings.showSpeed) popupContent += `Shpejtësia: ${driver.speed || 0} km/h<br>`;
            if (settings.showStatus !== false) popupContent += `Statusi: ${mode}<br>`;
            popupContent += '</div>';

            marker.bindPopup(popupContent);
            markers.set(driver.id, marker);
        });

        // Update counter
        const counter = document.getElementById('tv-count');
        if (counter) counter.textContent = filtered.length;
    }

    // ═══ FILTRO ═══
    function filterDrivers(drivers) {
        const filter = window.TaxiTvDisplay?.settings?.vehicleFilter || 'all';
        if (filter === 'all') return drivers;
        if (filter === 'free') return drivers.filter(d => d.mode === 'free');
        if (filter === 'busy') return drivers.filter(d => d.mode === 'taximeter' || d.mode === 'fixed');
        if (filter === 'pause') return drivers.filter(d => d.mode === 'pause');
        return drivers;
    }

    // ═══ LISTEN ORDERS ═══
    function listenOrders() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        db.collection('orders')
            .where('createdAtLocal', '>=', todayStart.getTime())
            .onSnapshot((snap) => {
                const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                updateStats(orders);
            }, (err) => console.warn('Orders listen:', err));
    }

    // ═══ UPDATE STATS ═══
    function updateStats(orders) {
        const total = orders.length;
        const completed = orders.filter(o => o.status === 'completed').length;
        const cancelled = orders.filter(o => o.status === 'cancelled').length;
        const revenue = orders.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);

        setText('tv-stat-orders', total);
        setText('tv-stat-completed', completed);
        setText('tv-stat-cancelled', cancelled);
        setText('tv-stat-revenue', `€${revenue.toFixed(2)}`);
    }

    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    // ═══ AUTO-UPDATE ═══
    function startAutoUpdate() {
        if (updateInterval) clearInterval(updateInterval);
        updateInterval = setInterval(() => {
            renderVehicles();
        }, 30000);
    }

    return { init };
})();

console.log('✅ tv/app.js ngarkuar');
