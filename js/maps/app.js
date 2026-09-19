'use strict';

/**
 * js/maps/app.js — TV Display për zyrën
 * Shfaq live: hartën, shoferët, porositë, statistikat
 */

window.MapsApp = (() => {
    let map = null;
    let vehicleMarkers = new Map(); // driverId -> marker
    let driversCache = [];
    let ordersCache = [];
    let unsubscribers = [];
    let clockTimer = null;
    let refreshTimer = null;

    // ═══════════════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════════════
    function init() {
        console.log('📺 MapsApp: Init...');

        // Clock
        startClock();

        // Wait pak për Firebase
        setTimeout(() => {
            initMap();
            startListeners();
            startAutoRefresh();
        }, 500);

        console.log('✅ TV Display gati');
    }

    // ═══════════════════════════════════════════════════════
    // CLOCK
    // ═══════════════════════════════════════════════════════
    function startClock() {
        const update = () => {
            const now = new Date();
            const t = document.getElementById('tv-clock-time');
            const d = document.getElementById('tv-clock-date');
            if (t) t.textContent = now.toLocaleTimeString('sq-AL', {
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            });
            if (d) d.textContent = now.toLocaleDateString('sq-AL', {
                weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
            });
        };
        update();
        clockTimer = setInterval(update, 1000);
    }

    // ═══════════════════════════════════════════════════════
    // MAP
    // ═══════════════════════════════════════════════════════
    function initMap() {
        const el = document.getElementById('tv-map');
        if (!el || !window.L) {
            console.error('Leaflet nuk është ngarkuar');
            return;
        }

        map = L.map('tv-map', {
            center: [42.6629, 21.1655],
            zoom: 13,
            zoomControl: true,
            attributionControl: false
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd'
        }).addTo(map);

        console.log('✅ Harta u inicializua');

        setTimeout(() => map.invalidateSize(), 300);
    }

    // ═══════════════════════════════════════════════════════
    // LISTENERS — Live Firestore
    // ═══════════════════════════════════════════════════════
    function startListeners() {
        const db = window.TaxiFirebase?.db || firebase.firestore();

        // ═══ DRIVERS — Live ═══
        try {
            const unsub1 = db.collection('drivers').onSnapshot(snap => {
                driversCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                renderVehiclesOnMap();
                updateStats();
                renderTopDrivers();
            }, err => console.warn('Drivers listener:', err.message));
            unsubscribers.push(unsub1);
        } catch (e) { console.warn(e); }

        // ═══ ORDERS — Live ═══
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const unsub2 = db.collection('orders')
                .where('createdAtLocal', '>=', today.getTime())
                .onSnapshot(snap => {
                    ordersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    updateStats();
                    renderActiveOrders();
                    renderWaitingOrders();
                    updateTicker();
                }, err => {
                    // Fallback: pa filter
                    db.collection('orders').limit(500).get().then(s => {
                        ordersCache = s.docs.map(d => ({ id: d.id, ...d.data() }));
                        updateStats();
                        renderActiveOrders();
                        renderWaitingOrders();
                        updateTicker();
                    });
                });
            unsubscribers.push(unsub2);
        } catch (e) { console.warn(e); }
    }

    // ═══════════════════════════════════════════════════════
    // AUTO REFRESH
    // ═══════════════════════════════════════════════════════
    function startAutoRefresh() {
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(() => {
            updateStats();
            renderVehiclesOnMap();
            if (map) map.invalidateSize();
        }, 30000);
    }

    // ═══════════════════════════════════════════════════════
    // RENDER VEHICLES ON MAP
    // ═══════════════════════════════════════════════════════
    function renderVehiclesOnMap() {
        if (!map) return;

        const activeIds = new Set();

        driversCache.forEach(driver => {
            const lat = parseFloat(driver.lat);
            const lng = parseFloat(driver.lng);

            if (!lat || !lng) return;

            const num = String(driver.vehicle_number || driver.vehicleNum || '?').padStart(2, '0');
            const mode = driver.mode || 'inactive';

            // Zgjidh ngjyrën
            let colorClass = 'inactive';
            if (mode === 'free') colorClass = 'free';
            else if (mode === 'taximeter' || mode === 'fixed' || mode === 'busy') colorClass = 'busy';
            else if (mode === 'pause') colorClass = 'pause';

            const icon = L.divIcon({
                className: 'tv-vehicle-marker',
                html: `<div class="tv-vehicle-inner ${colorClass}" data-number="${num}"></div>`,
                iconSize: [44, 44],
                iconAnchor: [22, 22]
            });

            if (vehicleMarkers.has(driver.id)) {
                const marker = vehicleMarkers.get(driver.id);
                marker.setLatLng([lat, lng]);
                marker.setIcon(icon);
            } else {
                const marker = L.marker([lat, lng], { icon }).addTo(map);
                marker.bindPopup(`
                    <div style="min-width:180px;">
                        <div style="font-weight:800;font-size:14px;margin-bottom:6px;">${driver.name || 'Shofer'}</div>
                        <div style="font-size:12px;color:#b8a8d9;">
                            🚗 Vetura ${num}<br>
                            ${driver.phone ? '📞 ' + driver.phone + '<br>' : ''}
                            ⚡ ${mode === 'free' ? 'Lirë' : mode === 'pause' ? 'Pauzë' : mode === 'inactive' ? 'Joaktiv' : 'Në udhëtim'}<br>
                            ${driver.speed ? '🏎️ ' + parseFloat(driver.speed).toFixed(0) + ' km/h' : ''}
                        </div>
                    </div>
                `);
                vehicleMarkers.set(driver.id, marker);
            }

            activeIds.add(driver.id);
        });

        // Fshij marker-at e vjetër
        vehicleMarkers.forEach((marker, id) => {
            if (!activeIds.has(id)) {
                marker.remove();
                vehicleMarkers.delete(id);
            }
        });
    }

    // ═══════════════════════════════════════════════════════
    // UPDATE STATS
    // ═══════════════════════════════════════════════════════
    function updateStats() {
        const free = driversCache.filter(d => d.mode === 'free').length;
        const busy = driversCache.filter(d => ['taximeter', 'fixed', 'busy'].includes(d.mode)).length;
        const pause = driversCache.filter(d => d.mode === 'pause').length;
        const inactive = driversCache.filter(d => !d.mode || d.mode === 'inactive').length;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayOrders = ordersCache.filter(o => (o.createdAtLocal || 0) >= today.getTime());
        const completed = todayOrders.filter(o => o.status === 'completed');
        const revenue = completed.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);

        setText('stat-free', free);
        setText('stat-busy', busy);
        setText('stat-pause', pause);
        setText('stat-inactive', inactive);
        setText('stat-orders', todayOrders.length);
        setText('stat-revenue', '€' + revenue.toFixed(0));
    }

    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    // ═══════════════════════════════════════════════════════
    // RENDER TOP DRIVERS
    // ═══════════════════════════════════════════════════════
    function renderTopDrivers() {
        const el = document.getElementById('tv-top-drivers');
        if (!el) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayOrders = ordersCache.filter(o =>
            (o.createdAtLocal || 0) >= today.getTime() && o.status === 'completed'
        );

        // Grumbullo sipas driverId
        const byDriver = {};
        todayOrders.forEach(o => {
            if (!o.driverId) return;
            if (!byDriver[o.driverId]) {
                byDriver[o.driverId] = {
                    name: o.driverName || 'Shofer',
                    vehicleNum: o.vehicleNum || '',
                    orders: 0,
                    revenue: 0
                };
            }
            byDriver[o.driverId].orders++;
            byDriver[o.driverId].revenue += parseFloat(o.price) || 0;
        });

        const top = Object.entries(byDriver)
            .map(([id, d]) => ({ id, ...d }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 6);

        if (!top.length) {
            el.innerHTML = '<div class="tv-empty">Nuk ka të dhëna sot</div>';
            return;
        }

        el.innerHTML = top.map((d, i) => {
            const rank = i + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
            return `
                <div class="tv-driver-item rank-${rank <= 3 ? rank : ''}">
                    <div class="tv-driver-rank">${medal}</div>
                    <div class="tv-driver-info">
                        <div class="tv-driver-name">${d.name}</div>
                        <div class="tv-driver-meta">
                            ${d.vehicleNum ? '🚗 ' + String(d.vehicleNum).padStart(2, '0') + ' · ' : ''}
                            ${d.orders} udhëtime
                        </div>
                    </div>
                    <div class="tv-driver-earnings">€${d.revenue.toFixed(0)}</div>
                </div>
            `;
        }).join('');
    }

    // ═══════════════════════════════════════════════════════
    // RENDER ACTIVE ORDERS
    // ═══════════════════════════════════════════════════════
    function renderActiveOrders() {
        const el = document.getElementById('tv-active-orders');
        const cnt = document.getElementById('tv-active-count');
        if (!el) return;

        const active = ordersCache.filter(o =>
            ['assigned', 'onroute', 'arrived', 'taximeter', 'fixed'].includes(o.status)
        );

        if (cnt) cnt.textContent = active.length;

        if (!active.length) {
            el.innerHTML = '<div class="tv-empty">Nuk ka porosi aktive</div>';
            return;
        }

        el.innerHTML = active.slice(0, 10).map(o => {
            const num = String(o.vehicleNum || '?').padStart(2, '0');
            const time = o.createdAtLocal
                ? new Date(o.createdAtLocal).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })
                : '—';

            return `
                <div class="tv-order-item">
                    <div class="tv-order-vehicle">${num}</div>
                    <div class="tv-order-info">
                        <div class="tv-order-phone">${o.phone || '—'}</div>
                        <div class="tv-order-route">${o.pickup || '—'} → ${o.destination || '—'}</div>
                    </div>
                    <div class="tv-order-time">${time}</div>
                </div>
            `;
        }).join('');
    }

    // ═══════════════════════════════════════════════════════
    // RENDER WAITING ORDERS
    // ═══════════════════════════════════════════════════════
    function renderWaitingOrders() {
        const el = document.getElementById('tv-waiting-orders');
        const cnt = document.getElementById('tv-waiting-count');
        if (!el) return;

        const waiting = ordersCache.filter(o => o.status === 'waiting');

        if (cnt) cnt.textContent = waiting.length;

        if (!waiting.length) {
            el.innerHTML = '<div class="tv-empty">Nuk ka porosi në pritje</div>';
            return;
        }

        el.innerHTML = waiting.slice(0, 8).map(o => {
            const time = o.createdAtLocal
                ? new Date(o.createdAtLocal).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })
                : '—';

            const waitSec = o.createdAtLocal
                ? Math.floor((Date.now() - o.createdAtLocal) / 1000)
                : 0;
            const waitMin = Math.floor(waitSec / 60);
            const waitText = waitMin < 1 ? 'Tani' : `${waitMin}m`;

            return `
                <div class="tv-order-item waiting">
                    <div class="tv-order-vehicle" style="background:linear-gradient(135deg,#ec4899,#be185d);">
                        <i class="fa-solid fa-hourglass-half"></i>
                    </div>
                    <div class="tv-order-info">
                        <div class="tv-order-phone">${o.phone || '—'}</div>
                        <div class="tv-order-route">${o.pickup || '—'}</div>
                    </div>
                    <div class="tv-order-time" style="color:#ec4899;">${waitText}</div>
                </div>
            `;
        }).join('');
    }

    // ═══════════════════════════════════════════════════════
    // TICKER
    // ═══════════════════════════════════════════════════════
    function updateTicker() {
        const el = document.getElementById('tv-ticker');
        if (!el) return;

        const recent = [...ordersCache]
            .sort((a, b) => (b.createdAtLocal || 0) - (a.createdAtLocal || 0))
            .slice(0, 8);

        if (!recent.length) {
            el.textContent = 'Nuk ka aktivitet...';
            return;
        }

        const items = recent.map(o => {
            const time = o.createdAtLocal
                ? new Date(o.createdAtLocal).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })
                : '—';
            const statusLbl = {
                waiting: '⏳ Në pritje',
                assigned: '🎯 Caktuar',
                onroute: '🚗 Në rrugë',
                arrived: '📍 Arritur',
                completed: '✅ Përfunduar',
                cancelled: '❌ Anuluar',
                taximeter: '🚕 Taksimetër'
            }[o.status] || o.status;

            return `[${time}] ${statusLbl} · ${o.phone || '—'} · ${o.pickup || '—'}`;
        });

        el.textContent = items.join('     ●     ');
    }

    // ═══════════════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════════════
    function destroy() {
        unsubscribers.forEach(u => { try { u(); } catch (e) {} });
        unsubscribers = [];
        if (clockTimer) clearInterval(clockTimer);
        if (refreshTimer) clearInterval(refreshTimer);
        if (map) { try { map.remove(); } catch (e) {} }
    }

    return { init, destroy };
})();

console.log('✅ js/maps/app.js ngarkuar');
