'use strict';

const AppState = {
    orders: [],
    waitingOrders: [],
    preOrders: [],
    incomingCalls: [],
    messages: [],
    drivers: [],
    vehicles: [],
    zones: [],
    addresses: [],
    config: {},
    map: null,
    vehicleMarkers: new Map(),
    currentDispatchMode: 'auto',
    soundEnabled: true,
    currentOperator: {
        name: 'Granit Gashi', initials: 'GD', loggedIn: false, loginTime: null,
        stats: { callsTaken: 0, callsWaiting: 0, callsOpened: 0, revenue: 0, trips: 0, cancelled: 0 }
    },
    manualAssignOrderId: null,
    audioContext: null
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => document.getElementById('loading-overlay')?.classList.add('hidden'), 600);
    loadData();
    initClock();
    initMap();
    initEventListeners();
    renderAll();
    startCallSimulation();
    startOrderSimulation();
    startMessageSimulation();
});

// ═══ DATA ═══
function loadData() {
    if (!window.TaxiData) { console.error('TaxiData missing'); return; }
    AppState.addresses = window.TaxiData.addresses || [];
    AppState.zones = window.TaxiData.zones || [];
    AppState.drivers = JSON.parse(JSON.stringify(window.TaxiData.drivers || []));
    AppState.vehicles = window.TaxiData.vehicles || [];
    AppState.config = window.TaxiData.config || {};

    AppState.orders = [
        { id: 1001, phone: '+383 44 123 456', name: 'Ardit Krasniqi', pickup: 'Grand Hotel Prishtina', destination: 'Aeroporti Ndërkombëtar', status: 'assigned', vehicle: '01', driverName: 'Arben Krasniqi', time: '19:04', zone: 'zona1', tariff: 'airport', operator: 'Granit Gashi', takenAt: '19:04', doneAt: '', nearbyCars: 3 },
        { id: 1002, phone: '+383 49 987 654', name: 'Blerim Hoxha', pickup: 'Newborn Monument', destination: 'Albi Mall', status: 'onroute', vehicle: '04', driverName: 'Endrit Morina', time: '19:02', zone: 'zona1', tariff: 'standard', operator: 'Granit Gashi', takenAt: '19:02', doneAt: '', nearbyCars: 5 },
        { id: 1003, phone: '+383 44 555 222', name: 'Driton Berisha', pickup: 'QKUK Spitali', destination: 'Aeroporti Ndërkombëtar', status: 'delay', vehicle: '05', driverName: 'Fisnik Gashi', time: '18:55', zone: 'zona2', tariff: 'standard', operator: 'Granit Gashi', takenAt: '18:55', doneAt: '', nearbyCars: 2 },
        { id: 1004, phone: '+383 45 111 222', name: 'Endrit Morina', pickup: 'Katedralja Nënë Tereza', destination: 'Kalabria', status: 'assigned', vehicle: '07', driverName: 'Hekuran Zeka', time: '18:50', zone: 'zona1', tariff: 'standard', operator: 'Granit Gashi', takenAt: '18:50', doneAt: '', nearbyCars: 4 }
    ];

    AppState.waitingOrders = [
        { id: 2001, phone: '+383 44 777 888', name: 'Genc Rama', pickup: 'Qendra Tregtare Kalabria', destination: 'Arbëria', waitStart: Date.now() - 45000, time: '19:08', zone: 'zona5', operator: 'Granit Gashi' },
        { id: 2002, phone: '+383 49 333 444', name: 'Ilir Thaçi', pickup: 'Hotel Swiss Diamond', destination: 'Stacioni i Autobusëve', waitStart: Date.now() - 120000, time: '19:10', zone: 'zona1', operator: 'Granit Gashi' },
        { id: 2003, phone: '+383 45 222 333', name: 'Jeton Bytyqi', pickup: 'QKUK Spitali', destination: 'Fushë Kosova', waitStart: Date.now() - 280000, time: '18:48', zone: 'zona1', operator: 'Granit Gashi' }
    ];

    AppState.preOrders = [
        { id: 3001, phone: '+383 44 111 999', name: 'Kreshnik Dema', pickup: 'Aeroporti Ndërkombëtar', destination: 'Grand Hotel Prishtina', date: '15/09', time: '06:30', zone: 'zona3', vehicle: '', operator: 'Granit Gashi' },
        { id: 3002, phone: '+383 44 222 888', name: 'Luan Ahmeti', pickup: 'Grand Hotel Prishtina', destination: 'QKUK Spitali', date: '15/09', time: '07:15', zone: 'zona1', vehicle: '', operator: 'Granit Gashi' },
        { id: 3003, phone: '+383 44 333 777', name: 'Mentor Bekteshi', pickup: 'Emerald Hotel', destination: 'Albi Mall', date: '15/09', time: '08:00', zone: 'zona2', vehicle: '', operator: 'Granit Gashi' }
    ];

    AppState.incomingCalls = [
        { id: Date.now() + 1, phone: '+383 44 555 001', name: 'Klient i Ri', lastAddress: 'Grand Hotel Prishtina', time: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }), ringing: true }
    ];

    AppState.messages = [
        { id: 1, driverId: 1, name: 'Arben Krasniqi', text: 'JASHT VETURE', time: '19:12', unread: true },
        { id: 2, driverId: 2, name: 'Blerim Hoxha', text: 'DUKE PRITUR', time: '19:10', unread: true },
        { id: 3, driverId: 3, name: 'Driton Berisha', text: 'KËRKESË PËR PAUZË', time: '19:05', unread: true }
    ];

    // Popullo manual vehicle select
    const manualSelect = document.getElementById('manual-vehicle-select');
    if (manualSelect) {
        AppState.vehicles.forEach(v => {
            const driver = AppState.drivers.find(d => d.vehicleId === v.id);
            const num = String(v.id).padStart(2, '0');
            const opt = document.createElement('option');
            opt.value = num;
            opt.textContent = `🚗 ${num} — ${v.plate} — ${driver ? driver.name : 'N/A'}`;
            manualSelect.appendChild(opt);
        });
    }

    // Popullo message target select
    const msgTarget = document.getElementById('msg-target');
    if (msgTarget) {
        AppState.drivers.forEach(d => {
            const num = String(d.vehicleId).padStart(2, '0');
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = `🚗 ${num} — ${d.name}`;
            msgTarget.appendChild(opt);
        });
    }
}

// ═══ CLOCK ═══
function initClock() {
    const update = () => {
        const now = new Date();
        const t = document.getElementById('clock-time');
        const d = document.getElementById('clock-date');
        if (t) t.textContent = now.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (d) d.textContent = now.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };
    update();
    setInterval(update, 1000);
}

// ═══ MAP ═══
function initMap() {
    const el = document.getElementById('map');
    if (!el) return;
    AppState.map = L.map('map', { center: [42.6629, 21.1655], zoom: 13, zoomControl: true, attributionControl: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd' }).addTo(AppState.map);
    renderZonesOnMap();
    renderVehiclesOnMap();
    renderAddressMarkers();
}

function renderZonesOnMap() {
    AppState.zones.forEach(zone => {
        L.polygon(zone.polygon, { color: zone.color, fillColor: zone.color, fillOpacity: 0.06, weight: 2, dashArray: '6,4' }).addTo(AppState.map);
    });
}

function renderAddressMarkers() {
    AppState.addresses.forEach(addr => {
        const cat = window.TaxiData.addressCategories[addr.category] || { icon: 'fa-location-dot', color: '#6b7280' };
        const icon = L.divIcon({
            className: 'address-marker',
            html: `<div style="background:${cat.color};width:8px;height:8px;border-radius:50%;border:1px solid white;box-shadow:0 0 4px ${cat.color};"></div>`,
            iconSize: [8, 8], iconAnchor: [4, 4]
        });
        L.marker([addr.lat, addr.lng], { icon }).addTo(AppState.map)
            .bindPopup(`<b>${addr.name}</b><br><small>${cat.label || ''}</small>`);
    });
}

function renderVehiclesOnMap() {
    AppState.drivers.forEach(driver => {
        const vehicle = AppState.vehicles.find(v => v.id === driver.vehicleId);
        if (!vehicle) return;
        const num = String(driver.vehicleId).padStart(2, '0');
        const mode = driver.mode || 'inactive';
        const icon = L.divIcon({
            className: 'vehicle-marker',
            html: `<div class="vehicle-marker-inner ${mode}" data-number="${num}"></div>`,
            iconSize: [28, 28], iconAnchor: [14, 14]
        });
        const marker = L.marker([driver.lat, driver.lng], { icon, title: `${num} - ${driver.name}` }).addTo(AppState.map);
        marker.bindPopup(`
            <div style="min-width:200px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                    <span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:${getModeColor(mode)};color:white;font-weight:800;font-family:monospace;font-size:13px;">${num}</span>
                    <div><div style="font-weight:700;font-size:13px;">${driver.name}</div><div style="font-size:11px;color:#8b7aa8;">${vehicle.plate}</div></div>
                </div>
                <div style="font-size:11px;color:#b8a8d9;">📞 ${driver.phone}<br>⭐ ${driver.rating}</div>
            </div>
        `);
        AppState.vehicleMarkers.set(driver.id, marker);
    });
    const cnt = document.getElementById('map-counter');
    if (cnt) cnt.textContent = `${AppState.drivers.length} taksí`;
}

function getModeColor(mode) {
    const c = { free: '#22c55e', taximeter: '#3b82f6', fixed: '#ef4444', pause: '#facc15', inactive: '#6b7280' };
    return c[mode] || c.inactive;
}

function updateVehicleMarker(driverId) {
    const driver = AppState.drivers.find(d => d.id === driverId);
    const marker = AppState.vehicleMarkers.get(driverId);
    if (!driver || !marker) return;
    const num = String(driver.vehicleId).padStart(2, '0');
    const icon = L.divIcon({
        className: 'vehicle-marker',
        html: `<div class="vehicle-marker-inner ${driver.mode}" data-number="${num}"></div>`,
        iconSize: [28, 28], iconAnchor: [14, 14]
    });
    marker.setIcon(icon);
}

// ═══ EVENT LISTENERS ═══
function initEventListeners() {
    document.getElementById('btn-new-order')?.addEventListener('click', openNewOrderModal);
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => document.getElementById(btn.dataset.close)?.classList.remove('active'));
    });
    document.querySelectorAll('.modal-overlay').forEach(ov => {
        ov.addEventListener('click', (e) => { if (e.target === ov) ov.classList.remove('active'); });
    });

    document.getElementById('order-form')?.addEventListener('submit', (e) => { e.preventDefault(); submitOrder(); });
    document.getElementById('btn-submit-order')?.addEventListener('click', (e) => { e.preventDefault(); submitOrder(); });

    document.querySelectorAll('.dispatch-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dispatch-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.currentDispatchMode = btn.dataset.dispatch;
            const picker = document.getElementById('manual-vehicle-picker');
            if (picker) picker.style.display = btn.dataset.dispatch === 'manual' ? 'block' : 'none';
        });
    });

    setupAutocomplete('pickup-address', 'pickup-suggestions');
    setupAutocomplete('destination-address', 'destination-suggestions');

    document.getElementById('order-search')?.addEventListener('input', (e) => filterOrders(e.target.value));

    document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
    });

    // SOUND
    document.getElementById('btn-sound-toggle')?.addEventListener('click', (e) => {
        AppState.soundEnabled = !AppState.soundEnabled;
        const btn = e.currentTarget;
        btn.classList.toggle('sound-on', AppState.soundEnabled);
        btn.classList.toggle('sound-off', !AppState.soundEnabled);
        btn.querySelector('i').className = AppState.soundEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
        showToast('info', 'Zëri', AppState.soundEnabled ? 'Aktivizuar' : 'Çaktivizuar');
    });

    // PANEL MIN/MAX
    document.querySelectorAll('[data-panel-min]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            const panel = document.getElementById(btn.dataset.panelMin);
            if (!panel) return;
            panel.classList.toggle('minimized');
            const icon = btn.querySelector('i');
            if (icon) icon.className = panel.classList.contains('minimized') ? 'fa-solid fa-plus' : 'fa-solid fa-minus';
            setTimeout(() => AppState.map?.invalidateSize(), 400);
        });
    });
    document.querySelectorAll('[data-panel-max]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            const panel = document.getElementById(btn.dataset.panelMax);
            if (!panel) return;
            const isMax = panel.classList.contains('maximized');
            document.querySelectorAll('.panel.maximized').forEach(p => {
                p.classList.remove('maximized');
                const ic = p.querySelector('[data-panel-max] i');
                if (ic) ic.className = 'fa-solid fa-expand';
            });
            if (!isMax) {
                panel.classList.add('maximized');
                const icon = btn.querySelector('i');
                if (icon) icon.className = 'fa-solid fa-compress';
            }
            setTimeout(() => AppState.map?.invalidateSize(), 400);
        });
    });

    // LOGIN
    document.getElementById('rail-user')?.addEventListener('click', () => {
        if (AppState.currentOperator.loggedIn) showOperatorStats();
        else document.getElementById('modal-login')?.classList.add('active');
    });
    document.getElementById('btn-do-login')?.addEventListener('click', doLogin);
    document.getElementById('btn-logout')?.addEventListener('click', doLogout);

    // MANUAL ASSIGN
    document.getElementById('btn-confirm-manual-assign')?.addEventListener('click', confirmManualAssign);
    document.getElementById('assign-vehicle-select')?.addEventListener('change', (e) => {
        const num = e.target.value;
        const vehicle = AppState.vehicles.find(v => String(v.id).padStart(2, '0') === num);
        const driver = vehicle ? AppState.drivers.find(d => d.vehicleId === vehicle.id) : null;
        document.getElementById('assign-driver-name').value = driver ? driver.name : '';
    });

    // MESSAGES
    document.getElementById('btn-messages')?.addEventListener('click', openMessages);
    document.getElementById('btn-send-msg')?.addEventListener('click', sendMessage);
    document.querySelectorAll('.msg-quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('msg-custom').value = btn.dataset.msg;
        });
    });
}

// ═══ LOGIN ═══
function doLogin() {
    const name = document.getElementById('login-username')?.value.trim();
    if (!name) { showToast('error', 'Gabim', 'Shkruaj emrin'); return; }
    AppState.currentOperator.name = name;
    AppState.currentOperator.initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    AppState.currentOperator.loggedIn = true;
    AppState.currentOperator.loginTime = Date.now();
    AppState.currentOperator.stats = { callsTaken: 0, callsWaiting: 0, callsOpened: 0, revenue: 0, trips: 0, cancelled: 0 };
    document.getElementById('rail-user').textContent = AppState.currentOperator.initials;
    document.getElementById('modal-login')?.classList.remove('active');
    showToast('success', 'U loguat', `Mirë se vjen, ${name}!`);
    showOperatorStats();
}

function doLogout() {
    AppState.currentOperator.loggedIn = false;
    AppState.currentOperator.loginTime = null;
    document.getElementById('rail-user').textContent = 'GD';
    document.getElementById('modal-operator-stats')?.classList.remove('active');
    showToast('info', 'U dilni', 'Dilni nga sistemi');
}

function showOperatorStats() {
    const op = AppState.currentOperator;
    const onlineTime = op.loginTime ? Math.floor((Date.now() - op.loginTime) / 60000) : 0;
    const onlineHours = Math.floor(onlineTime / 60);
    const onlineMins = onlineTime % 60;

    document.getElementById('operator-stats-body').innerHTML = `
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding:16px;background:var(--bg-tertiary);border-radius:12px;border-left:4px solid var(--accent-purple);">
            <div style="width:56px;height:56px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;color:white;">${op.initials}</div>
            <div>
                <div style="font-size:16px;font-weight:800;">${op.name}</div>
                <div style="font-size:12px;color:var(--text-muted);">Dispeçer ${op.loggedIn ? '· Online' : ''}</div>
            </div>
        </div>
        <div class="detail-section-title"><i class="fa-solid fa-chart-simple"></i> STATISTIKAT</div>
        <div class="stats-grid">
            <div class="stat-box"><span class="stat-box-label">💰 Të Ardhura</span><span class="stat-box-value green">€${op.stats.revenue.toFixed(2)}</span></div>
            <div class="stat-box"><span class="stat-box-label">🚗 Udhëtime</span><span class="stat-box-value">${op.stats.trips}</span></div>
            <div class="stat-box"><span class="stat-box-label">📞 Thirrje të Marra</span><span class="stat-box-value pink">${op.stats.callsTaken}</span></div>
            <div class="stat-box"><span class="stat-box-label">⏳ Në Pritje</span><span class="stat-box-value blue">${op.stats.callsWaiting}</span></div>
            <div class="stat-box"><span class="stat-box-label">📂 Thirrje të Hapura</span><span class="stat-box-value">${op.stats.callsOpened}</span></div>
            <div class="stat-box"><span class="stat-box-label">❌ Anuluar</span><span class="stat-box-value" style="color:var(--accent-red);">${op.stats.cancelled}</span></div>
            <div class="stat-box" style="grid-column:1/-1;"><span class="stat-box-label">⏱️ Koha Online</span><span class="stat-box-value">${onlineHours}h ${onlineMins}min</span></div>
        </div>
    `;
    document.getElementById('modal-operator-stats')?.classList.add('active');
}

// ═══ MESSAGES ═══
function openMessages() {
    renderMessages();
    document.getElementById('modal-messages')?.classList.add('active');
    AppState.messages.forEach(m => m.unread = false);
    updateMessagesBadge();
}

function renderMessages() {
    const list = document.getElementById('msgs-list');
    if (!list) return;
    if (!AppState.messages.length) {
        list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">Nuk ka mesazhe</div>`;
        return;
    }
    list.innerHTML = AppState.messages.map(m => `
        <div class="msg-item">
            <span class="msg-item-time">${m.time}</span>
            <div class="msg-item-content">
                <div class="msg-item-name">${m.name}</div>
                <div class="msg-item-text">${m.text}</div>
            </div>
        </div>
    `).join('');
}

function sendMessage() {
    const custom = document.getElementById('msg-custom')?.value.trim();
    const targetId = document.getElementById('msg-target')?.value;
    if (!custom) { showToast('error', 'Gabim', 'Shkruaj një mesazh'); return; }

    if (targetId === 'all') {
        AppState.drivers.forEach(d => {
            AppState.messages.unshift({
                id: Date.now() + d.id, driverId: d.id, name: d.name,
                text: custom,
                time: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })
            });
        });
        showToast('success', 'U dërgua', `Te të gjithë shoferët (${AppState.drivers.length})`);
    } else {
        const d = AppState.drivers.find(x => x.id == targetId);
        if (!d) return;
        AppState.messages.unshift({
            id: Date.now(), driverId: d.id, name: d.name, text: custom,
            time: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })
        });
        showToast('success', 'U dërgua', `Tek ${d.name}`);
    }

    document.getElementById('msg-custom').value = '';
    renderMessages();
}

function updateMessagesBadge() {
    const badge = document.getElementById('msgs-badge');
    if (!badge) return;
    const unread = AppState.messages.filter(m => m.unread).length;
    badge.textContent = unread;
    badge.style.display = unread > 0 ? 'inline-flex' : 'none';
}

// ═══ AUTCOMPLETE ═══
function setupAutocomplete(inputId, suggestId) {
    const input = document.getElementById(inputId);
    const sug = document.getElementById(suggestId);
    if (!input || !sug) return;
    input.addEventListener('input', (e) => {
        const q = e.target.value;
        if (q.length < 2) { sug.classList.remove('active'); return; }
        const results = window.TaxiData?.searchAddresses(q) || [];
        if (!results.length) { sug.classList.remove('active'); return; }
        sug.innerHTML = results.map(a => {
            const cat = window.TaxiData.addressCategories[a.category] || { icon: 'fa-location-dot', label: a.category };
            return `<div class="autocomplete-item" data-address="${a.name}"><i class="fa-solid ${cat.icon}"></i><div><div style="font-weight:600;">${a.name}</div><div style="font-size:10px;color:#8b7aa8;">${cat.label}</div></div></div>`;
        }).join('');
        sug.classList.add('active');
        sug.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => { input.value = item.dataset.address; sug.classList.remove('active'); });
        });
    });
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !sug.contains(e.target)) sug.classList.remove('active');
    });
}

// ═══ LOCATION ICON ═══
function getLocationIcon(address) {
    const a = (address || '').toLowerCase();
    if (a.includes('hotel') || a.includes('grandi') || a.includes('swiss') || a.includes('sirius') || a.includes('emerald')) return 'hotel';
    if (a.includes('aeroport')) return 'airport';
    if (a.includes('qkuk') || a.includes('spital')) return 'hospital';
    if (a.includes('mall') || a.includes('albi') || a.includes('kalabria')) return 'mall';
    return 'other';
}

// ═══ RENDER ALL ═══
function renderAll() {
    renderIncomingCalls();
    renderWaitingOrders();
    renderOrders();
    renderPreOrders();
    renderMessages();
    updateStats();
    updateMessagesBadge();
}

// ═══ CALLS ═══
function renderIncomingCalls() {
    const c = document.getElementById('calls-list');
    const cnt = document.getElementById('calls-count');
    if (cnt) cnt.textContent = AppState.incomingCalls.length;
    if (!c) return;
    if (!AppState.incomingCalls.length) {
        c.innerHTML = `<div style="text-align:center;padding:30px 16px;color:var(--text-muted);font-size:12px;"><i class="fa-solid fa-phone-slash" style="font-size:24px;opacity:0.3;display:block;margin-bottom:8px;"></i>Nuk ka thirrje</div>`;
        return;
    }
    c.innerHTML = AppState.incomingCalls.map(call => `
        <div class="call-card ${call.ringing ? 'ringing' : ''}">
            <div class="call-header"><span class="call-phone">${call.phone}</span><span class="call-time">${call.time}</span></div>
            ${call.name ? `<div class="call-name">${call.name}</div>` : ''}
            ${call.lastAddress ? `<div class="call-location"><i class="fa-solid fa-clock-rotate-left"></i> ${call.lastAddress}</div>` : ''}
            <div class="call-actions">
                <button class="btn-accept" onclick="acceptCall(${call.id})"><i class="fa-solid fa-phone"></i> KRIJO</button>
                <button class="btn-reject" onclick="rejectCall(${call.id})"><i class="fa-solid fa-xmark"></i></button>
            </div>
        </div>
    `).join('');
}

function acceptCall(callId) {
    const call = AppState.incomingCalls.find(c => c.id === callId);
    if (!call) return;
    AppState.currentOperator.stats.callsTaken++;
    AppState.currentOperator.stats.callsOpened++;
    openNewOrderModal();
    document.getElementById('client-phone').value = call.phone;
    if (call.name) document.getElementById('client-name').value = call.name;
    if (call.lastAddress) document.getElementById('pickup-address').value = call.lastAddress;
    AppState.incomingCalls = AppState.incomingCalls.filter(c => c.id !== callId);
    renderIncomingCalls();
    stopRing();
}

function rejectCall(callId) {
    AppState.incomingCalls = AppState.incomingCalls.filter(c => c.id !== callId);
    renderIncomingCalls();
    stopRing();
}

// ═══ SOUND ═══
let ringInterval = null;
function playRing() {
    if (!AppState.soundEnabled) return;
    try {
        if (!AppState.audioContext) AppState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = AppState.audioContext;
        const playBeep = (time, freq) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.15, time + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
            osc.start(time); osc.stop(time + 0.4);
        };
        const now = ctx.currentTime;
        playBeep(now, 880);
        playBeep(now + 0.5, 660);
        playBeep(now + 1.0, 880);
    } catch (e) {}
}
function startRing() {
    if (ringInterval) return;
    playRing();
    ringInterval = setInterval(playRing, 2000);
}
function stopRing() { if (ringInterval) { clearInterval(ringInterval); ringInterval = null; } }

// ═══ WAITING ═══
function renderWaitingOrders() {
    const tb = document.getElementById('waiting-tbody');
    const cnt = document.getElementById('waiting-count');
    if (!tb) return;
    if (cnt) cnt.textContent = AppState.waitingOrders.length;
    if (!AppState.waitingOrders.length) {
        tb.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">Asnjë porosi në pritje</td></tr>`;
        return;
    }
    tb.innerHTML = AppState.waitingOrders.map(o => {
        const wsec = Math.floor((Date.now() - o.waitStart) / 1000);
        const wmin = Math.floor(wsec / 60);
        const cls = wmin < 1 ? 'fresh' : wmin < 3 ? 'medium' : 'old';
        return `<tr>
            <td><strong>#${o.id}</strong></td>
            <td class="time">${o.time}</td>
            <td class="phone">${o.phone}</td>
            <td class="location"><div class="location-cell"><i class="fa-solid fa-location-dot ${getLocationIcon(o.pickup)}"></i><span>${o.pickup}</span></div></td>
            <td class="location"><div class="location-cell"><i class="fa-solid fa-flag-checkered ${getLocationIcon(o.destination)}"></i><span>${o.destination}</span></div></td>
            <td><span class="wait-time ${cls}">${wmin}min</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn auto" onclick="autoAssignWaiting(${o.id})">AUTO</button>
                    <button class="action-btn manual" onclick="manualAssignWaiting(${o.id})">MANUAL</button>
                    <button class="action-btn closest" onclick="closestAssignWaiting(${o.id})">AFËRTI</button>
                    <button class="action-btn cancel" onclick="cancelWaiting(${o.id})">X</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function autoAssignWaiting(id) {
    const o = AppState.waitingOrders.find(x => x.id === id);
    if (!o) return;
    const d = AppState.drivers.find(x => x.mode === 'free');
    if (!d) { showToast('warning', 'Nuk ka taksi', 'Të gjitha të zëna'); return; }
    const v = AppState.vehicles.find(x => x.id === d.vehicleId);
    const num = v ? String(v.id).padStart(2, '0') : '??';
    AppState.orders.unshift({
        id: o.id, phone: o.phone, name: o.name, pickup: o.pickup, destination: o.destination,
        status: 'assigned', vehicle: num, driverName: d.name, time: o.time, zone: o.zone,
        tariff: 'standard', operator: AppState.currentOperator.name, takenAt: o.time, doneAt: '', nearbyCars: Math.floor(Math.random() * 6) + 1
    });
    AppState.waitingOrders = AppState.waitingOrders.filter(x => x.id !== id);
    d.mode = Math.random() > 0.5 ? 'taximeter' : 'fixed';
    d.status = 'busy';
    updateVehicleMarker(d.id);
    AppState.currentOperator.stats.trips++;
    AppState.currentOperator.stats.revenue += 4.5;
    renderWaitingOrders(); renderOrders(); updateStats();
    showToast('success', 'Auto-caktuar', `🚗 ${num} — ${d.name}`);
}

function manualAssignWaiting(id) {
    AppState.manualAssignOrderId = id;
    const o = AppState.waitingOrders.find(x => x.id === id);
    if (!o) return;
    const sel = document.getElementById('assign-vehicle-select');
    sel.innerHTML = '<option value="">-- Zgjedh --</option>';
    AppState.vehicles.forEach(v => {
        const d = AppState.drivers.find(x => x.vehicleId === v.id);
        const num = String(v.id).padStart(2, '0');
        const opt = document.createElement('option');
        opt.value = num;
        opt.textContent = `🚗 ${num} — ${v.plate} — ${d ? d.name : ''} (${d ? d.mode : ''})`;
        sel.appendChild(opt);
    });
    const wsec = Math.floor((Date.now() - o.waitStart) / 1000);
    document.getElementById('assign-wait-time').value = `${Math.floor(wsec / 60)} minuta`;
    document.getElementById('assign-driver-name').value = '';
    document.getElementById('modal-manual-assign')?.classList.add('active');
}

function confirmManualAssign() {
    const num = document.getElementById('assign-vehicle-select').value;
    if (!num) { showToast('error', 'Gabim', 'Zgjedh një veturë'); return; }
    const id = AppState.manualAssignOrderId;
    const o = AppState.waitingOrders.find(x => x.id === id);
    if (!o) return;
    const v = AppState.vehicles.find(x => String(x.id).padStart(2, '0') === num);
    const d = v ? AppState.drivers.find(x => x.vehicleId === v.id) : null;
    AppState.orders.unshift({
        id: o.id, phone: o.phone, name: o.name, pickup: o.pickup, destination: o.destination,
        status: 'assigned', vehicle: num, driverName: d ? d.name : 'N/A', time: o.time, zone: o.zone,
        tariff: 'standard', operator: AppState.currentOperator.name, takenAt: o.time, doneAt: '', nearbyCars: Math.floor(Math.random() * 6) + 1
    });
    AppState.waitingOrders = AppState.waitingOrders.filter(x => x.id !== id);
    if (d) { d.mode = 'taximeter'; d.status = 'busy'; updateVehicleMarker(d.id); }
    AppState.currentOperator.stats.trips++;
    AppState.currentOperator.stats.revenue += 4.5;
    renderWaitingOrders(); renderOrders(); updateStats();
    document.getElementById('modal-manual-assign')?.classList.remove('active');
    showToast('success', 'Manual', `🚗 ${num} caktuar`);
}

function closestAssignWaiting(id) {
    const o = AppState.waitingOrders.find(x => x.id === id);
    if (!o) return;
    const target = AppState.addresses.find(a => a.name === o.pickup);
    const lat = target ? target.lat : 42.6629, lng = target ? target.lng : 21.1655;
    let best = null, minD = Infinity;
    AppState.drivers.filter(d => d.mode === 'free').forEach(d => {
        const dist = Math.hypot(d.lat - lat, d.lng - lng);
        if (dist < minD) { minD = dist; best = d; }
    });
    if (!best) { showToast('warning', 'Nuk ka taksi', 'Asnjë e lirë'); return; }
    const v = AppState.vehicles.find(x => x.id === best.vehicleId);
    const num = v ? String(v.id).padStart(2, '0') : '??';
    AppState.orders.unshift({
        id: o.id, phone: o.phone, name: o.name, pickup: o.pickup, destination: o.destination,
        status: 'assigned', vehicle: num, driverName: best.name, time: o.time, zone: o.zone,
        tariff: 'standard', operator: AppState.currentOperator.name, takenAt: o.time, doneAt: '', nearbyCars: 1
    });
    AppState.waitingOrders = AppState.waitingOrders.filter(x => x.id !== id);
    best.mode = 'taximeter'; best.status = 'busy';
    updateVehicleMarker(best.id);
    AppState.currentOperator.stats.trips++;
    AppState.currentOperator.stats.revenue += 4.5;
    renderWaitingOrders(); renderOrders(); updateStats();
    showToast('success', 'Më i afërti', `🚗 ${num} — ${best.name}`);
}

function cancelWaiting(id) {
    AppState.waitingOrders = AppState.waitingOrders.filter(x => x.id !== id);
    AppState.currentOperator.stats.cancelled++;
    renderWaitingOrders(); updateStats();
    showToast('info', 'Anuluar', `Porosia #${id}`);
}

// ═══ ORDERS ═══
function renderOrders() {
    const tb = document.getElementById('orders-tbody');
    const cnt = document.getElementById('orders-count');
    if (cnt) cnt.textContent = AppState.orders.length;
    if (!tb) return;
    if (!AppState.orders.length) { tb.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted);">Asnjë porosi</td></tr>`; return; }
    const lbl = { new: 'E Re', pending: 'Pritje', assigned: 'Caktuar', onroute: 'Në rrugë', delay: 'Vonesë', completed: 'Kryer' };
    tb.innerHTML = AppState.orders.map(o => `
        <tr onclick="openOrderDetail(${o.id})">
            <td><span class="status-badge ${o.status}">${lbl[o.status] || o.status}</span></td>
            <td class="time">${o.time}</td>
            <td>${o.vehicle ? `<span class="vehicle-badge">${o.vehicle}</span>` : `<span class="vehicle-badge empty">—</span>`}</td>
            <td class="phone">${o.phone}</td>
            <td class="location"><div class="location-cell"><i class="fa-solid fa-location-dot ${getLocationIcon(o.pickup)}"></i><span>${o.pickup}</span></div></td>
            <td class="location"><div class="location-cell"><i class="fa-solid fa-flag-checkered ${getLocationIcon(o.destination)}"></i><span>${o.destination}</span></div></td>
            <td>${o.driverName || '<span style="color:var(--text-muted)">—</span>'}</td>
            <td onclick="event.stopPropagation()">
                <div class="row-actions">
                    <button class="row-btn danger" onclick="cancelOrder(${o.id})"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openOrderDetail(id) {
    const o = AppState.orders.find(x => x.id === id);
    if (!o) return;
    const statusLbl = { new: 'E Re', pending: 'Në Pritje', assigned: 'E Caktuar', onroute: 'Në Rrugë', delay: 'Vonesë', completed: 'Përfunduar' };
    document.getElementById('order-detail-body').innerHTML = `
        <div class="detail-section">
            <div class="detail-section-title"><i class="fa-solid fa-receipt"></i> INFORMACION BAZË</div>
            <div class="detail-grid">
                <div class="detail-item"><label>ID e Porosisë</label><span class="mono">#${o.id}</span></div>
                <div class="detail-item"><label>Statusi</label><span><span class="status-badge ${o.status}">${statusLbl[o.status] || o.status}</span></span></div>
                <div class="detail-item"><label>Telefon</label><span class="mono">${o.phone}</span></div>
                <div class="detail-item"><label>Emri Klientit</label><span>${o.name || 'N/A'}</span></div>
                <div class="detail-item"><label>Operatori (Bazisti)</label><span style="color:var(--accent-purple);font-weight:700;">${o.operator || AppState.currentOperator.name}</span></div>
                <div class="detail-item"><label>Tarifa</label><span>${o.tariff || 'standard'}</span></div>
            </div>
        </div>
        <div class="detail-section">
            <div class="detail-section-title"><i class="fa-solid fa-route"></i> RRUGËTIMI</div>
            <div class="detail-grid">
                <div class="detail-item" style="grid-column:1/-1;"><label>Adresa e Marrjes</label><span>📍 ${o.pickup}</span></div>
                <div class="detail-item" style="grid-column:1/-1;"><label>Destinacioni</label><span>🏁 ${o.destination}</span></div>
                <div class="detail-item"><label>Zona</label><span>${o.zone || 'N/A'}</span></div>
                <div class="detail-item"><label>Vetura që mori</label><span class="mono">${o.vehicle ? '🚗 ' + o.vehicle : '—'}</span></div>
                <div class="detail-item"><label>Shoferi</label><span>${o.driverName || '—'}</span></div>
                <div class="detail-item"><label>Vetura afër në momentin e marrjes</label><span>${o.nearbyCars || 0} taksi</span></div>
            </div>
        </div>
        <div class="detail-section">
            <div class="detail-section-title"><i class="fa-solid fa-clock"></i> KOHËT</div>
            <div class="detail-grid">
                <div class="detail-item"><label>U mor në</label><span class="mono">${o.takenAt || o.time}</span></div>
                <div class="detail-item"><label>U lëshua në</label><span class="mono">${o.doneAt || '—'}</span></div>
                <div class="detail-item"><label>Statusi aktual</label><span>${statusLbl[o.status] || o.status}</span></div>
                <div class="detail-item"><label>Operatori</label><span>${o.operator || '—'}</span></div>
            </div>
        </div>
    `;
    document.getElementById('modal-order-detail')?.classList.add('active');
}

function cancelOrder(id) {
    AppState.orders = AppState.orders.filter(x => x.id !== id);
    AppState.currentOperator.stats.cancelled++;
    renderOrders(); updateStats();
    showToast('info', 'Anuluar', `Porosia #${id}`);
}

function filterOrders(q) {
    if (!q) { renderOrders(); return; }
    const lower = q.toLowerCase();
    const tb = document.getElementById('orders-tbody');
    if (!tb) return;
    const f = AppState.orders.filter(o => o.phone.includes(lower) || o.pickup.toLowerCase().includes(lower) || (o.destination || '').toLowerCase().includes(lower));
    if (!f.length) { tb.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted);">Nuk u gjet</td></tr>`; return; }
    const lbl = { new: 'E Re', pending: 'Pritje', assigned: 'Caktuar', onroute: 'Në rrugë', delay: 'Vonesë', completed: 'Kryer' };
    tb.innerHTML = f.map(o => `
        <tr onclick="openOrderDetail(${o.id})">
            <td><span class="status-badge ${o.status}">${lbl[o.status]}</span></td>
            <td class="time">${o.time}</td>
            <td>${o.vehicle ? `<span class="vehicle-badge">${o.vehicle}</span>` : '—'}</td>
            <td class="phone">${o.phone}</td>
            <td class="location"><div class="location-cell"><i class="fa-solid fa-location-dot ${getLocationIcon(o.pickup)}"></i><span>${o.pickup}</span></div></td>
            <td class="location"><div class="location-cell"><i class="fa-solid fa-flag-checkered ${getLocationIcon(o.destination)}"></i><span>${o.destination}</span></div></td>
            <td>${o.driverName || '—'}</td>
            <td onclick="event.stopPropagation()"><div class="row-actions"><button class="row-btn danger" onclick="cancelOrder(${o.id})"><i class="fa-solid fa-xmark"></i></button></div></td>
        </tr>
    `).join('');
}

// ═══ PRE-ORDERS ═══
function renderPreOrders() {
    const tb = document.getElementById('preorders-tbody');
    const cnt = document.getElementById('preorders-count');
    if (!tb) return;
    if (cnt) cnt.textContent = AppState.preOrders.length;
    if (!AppState.preOrders.length) { tb.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted);">Asnjë pre-order</td></tr>`; return; }
    tb.innerHTML = AppState.preOrders.map(o => `
        <tr>
            <td><span class="preorder-date">${o.date}</span></td>
            <td class="time">${o.time}</td>
            <td class="phone">${o.phone}</td>
            <td class="location"><div class="location-cell"><i class="fa-solid fa-location-dot ${getLocationIcon(o.pickup)}"></i><span>${o.pickup}</span></div></td>
            <td class="location"><div class="location-cell"><i class="fa-solid fa-flag-checkered ${getLocationIcon(o.destination)}"></i><span>${o.destination}</span></div></td>
            <td>${o.vehicle ? `<span class="vehicle-badge">${o.vehicle}</span>` : '—'}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn auto" onclick="activatePre(${o.id})">AKTIVIZO</button>
                    <button class="action-btn cancel" onclick="cancelPre(${o.id})">X</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function activatePre(id) {
    const o = AppState.preOrders.find(x => x.id === id);
    if (!o) return;
    AppState.preOrders = AppState.preOrders.filter(x => x.id !== id);
    AppState.waitingOrders.unshift({ id: o.id, phone: o.phone, name: o.name, pickup: o.pickup, destination: o.destination, waitStart: Date.now(), time: o.time, zone: o.zone, operator: AppState.currentOperator.name });
    AppState.currentOperator.stats.callsWaiting++;
    renderPreOrders(); renderWaitingOrders(); updateStats();
    showToast('info', 'Aktivizuar', `Pre-order #${id} → pritje`);
}

function cancelPre(id) {
    AppState.preOrders = AppState.preOrders.filter(x => x.id !== id);
    AppState.currentOperator.stats.cancelled++;
    renderPreOrders(); updateStats();
}

// ═══ NEW ORDER ═══
function openNewOrderModal() {
    document.getElementById('modal-new-order')?.classList.add('active');
    setTimeout(() => document.getElementById('client-phone')?.focus(), 200);
}

function submitOrder() {
    const phone = document.getElementById('client-phone')?.value.trim();
    const name = document.getElementById('client-name')?.value.trim();
    const pickup = document.getElementById('pickup-address')?.value.trim();
    const dest = document.getElementById('destination-address')?.value.trim();
    const zone = document.getElementById('order-zone')?.value;
    const tariff = document.getElementById('order-tariff')?.value;

    if (!phone || !pickup) { showToast('error', 'Gabim', 'Plotëso numrin dhe adresën'); return; }

    const order = {
        id: Date.now(), phone, name: name || 'Klient', pickup, destination: dest || 'N/A',
        status: 'new', vehicle: '', driverName: '',
        time: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
        zone: zone === 'auto' ? 'zona1' : zone, tariff: tariff || 'standard',
        operator: AppState.currentOperator.name,
        takenAt: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
        doneAt: '', nearbyCars: Math.floor(Math.random() * 6) + 1
    };

    if (AppState.currentDispatchMode === 'manual') {
        const num = document.getElementById('manual-vehicle-select')?.value;
        if (num) {
            const v = AppState.vehicles.find(x => String(x.id).padStart(2, '0') === num);
            const d = v ? AppState.drivers.find(x => x.vehicleId === v.id) : null;
            order.vehicle = num;
            order.driverName = d ? d.name : 'Manual';
            order.status = 'assigned';
            if (d) { d.mode = 'taximeter'; d.status = 'busy'; updateVehicleMarker(d.id); }
        } else {
            order.status = 'pending';
            AppState.waitingOrders.unshift({ ...order, waitStart: Date.now() });
            AppState.currentOperator.stats.callsWaiting++;
        }
    } else if (AppState.currentDispatchMode === 'closest') {
        const target = AppState.addresses.find(a => a.name === pickup);
        const lat = target ? target.lat : 42.6629, lng = target ? target.lng : 21.1655;
        let best = null, minD = Infinity;
        AppState.drivers.filter(d => d.mode === 'free').forEach(d => {
            const dist = Math.hypot(d.lat - lat, d.lng - lng);
            if (dist < minD) { minD = dist; best = d; }
        });
        if (best) {
            const v = AppState.vehicles.find(x => x.id === best.vehicleId);
            const num = v ? String(v.id).padStart(2, '0') : '??';
            order.vehicle = num; order.driverName = best.name; order.status = 'assigned';
            best.mode = 'taximeter'; best.status = 'busy';
            updateVehicleMarker(best.id);
        }
    } else {
        const d = AppState.drivers.find(x => x.mode === 'free');
        if (d) {
            const v = AppState.vehicles.find(x => x.id === d.vehicleId);
            const num = v ? String(v.id).padStart(2, '0') : '??';
            order.vehicle = num; order.driverName = d.name; order.status = 'assigned';
            d.mode = 'taximeter'; d.status = 'busy';
            updateVehicleMarker(d.id);
        }
    }

    if (order.status !== 'pending') {
        AppState.orders.unshift(order);
        AppState.currentOperator.stats.trips++;
        AppState.currentOperator.stats.revenue += 4.5;
    }

    AppState.currentOperator.stats.callsTaken++;
    AppState.currentOperator.stats.callsOpened++;

    updateStats();
    renderOrders(); renderWaitingOrders();
    document.getElementById('modal-new-order')?.classList.remove('active');
    document.getElementById('order-form')?.reset();
    document.getElementById('manual-vehicle-picker').style.display = 'none';
    showToast('success', 'Porosia u shtua', `${phone} — ${pickup}`);
}

// ═══ STATS ═══
function updateStats() {
    const online = AppState.drivers.filter(d => d.mode === 'free').length;
    const pending = AppState.waitingOrders.length;
    const trips = AppState.orders.filter(o => o.status === 'onroute' || o.status === 'completed').length;
    const revenue = AppState.orders.reduce((s, o) => s + (o.tariff === 'airport' ? 15 : 4.5), 0);
    setText('stat-online', online);
    setText('stat-pending', pending);
    setText('stat-trips', trips);
    setText('stat-revenue', `€${revenue.toFixed(0)}`);
}

function setText(id, val) { const e = document.getElementById(id); if (e) e.textContent = val; }

// ═══ TOAST ═══
function showToast(type, title, msg) {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><div class="toast-content"><div class="toast-title">${title}</div><div class="toast-message">${msg}</div></div>`;
    c.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0'; t.style.transform = 'translateX(400px)';
        setTimeout(() => t.remove(), 300);
    }, 3500);
}

// ═══ SIMULATION ═══
function startCallSimulation() {
    setTimeout(() => generateCall(), 5000);
    setInterval(() => { if (AppState.incomingCalls.length < 3) generateCall(); }, 30000);
}

function generateCall() {
    const phones = ['+383 44 111 001', '+383 44 222 002', '+383 49 333 003', '+383 45 444 004'];
    const names = ['Klient i Ri', 'Ardit Krasniqi', 'Blerim Hoxha', 'Driton Berisha'];
    const addrs = ['Grand Hotel Prishtina', 'Newborn Monument', 'Rr. UÇK Dardani', 'Albi Mall'];
    const i = Math.floor(Math.random() * phones.length);
    const call = {
        id: Date.now(), phone: phones[i],
        name: Math.random() > 0.4 ? names[i] : '',
        lastAddress: Math.random() > 0.5 ? addrs[Math.floor(Math.random() * addrs.length)] : '',
        time: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
        ringing: true
    };
    AppState.incomingCalls.push(call);
    renderIncomingCalls();
    startRing();
    setTimeout(() => { call.ringing = false; renderIncomingCalls(); }, 5000);
}

function startOrderSimulation() {
    setInterval(() => {
        AppState.vehicleMarkers.forEach((m, id) => {
            const d = AppState.drivers.find(x => x.id === id);
            if (!d || d.mode === 'inactive') return;
            const p = m.getLatLng();
            const nl = p.lat + (Math.random() - 0.5) * 0.0015;
            const ng = p.lng + (Math.random() - 0.5) * 0.0015;
            m.setLatLng([nl, ng]);
            d.lat = nl; d.lng = ng;
        });
    }, 4000);

    setInterval(() => { if (AppState.waitingOrders.length > 0) renderWaitingOrders(); }, 10000);

    setInterval(() => {
        AppState.drivers.forEach(d => {
            if (d.mode === 'taximeter' || d.mode === 'fixed') {
                if (Math.random() > 0.75) { d.mode = 'free'; d.status = 'available'; updateVehicleMarker(d.id); updateStats(); }
            } else if (d.mode === 'free') {
                if (Math.random() > 0.9) { d.mode = Math.random() > 0.5 ? 'taximeter' : 'fixed'; d.status = 'busy'; updateVehicleMarker(d.id); updateStats(); }
            }
        });
    }, 15000);

    setInterval(() => {
        if (AppState.waitingOrders.length < 5 && Math.random() > 0.5) {
            const pickups = ['Grand Hotel Prishtina', 'Newborn Monument', 'Hotel Sirius', 'Albi Mall'];
            const dests = ['QKUK Spitali', 'Aeroporti Ndërkombëtar', 'Sheshi Nënë Terezë'];
            AppState.waitingOrders.push({
                id: Date.now() + Math.floor(Math.random() * 1000),
                phone: '+383 44 ' + Math.floor(100 + Math.random() * 900) + ' ' + Math.floor(100 + Math.random() * 900),
                name: 'Klient',
                pickup: pickups[Math.floor(Math.random() * pickups.length)],
                destination: dests[Math.floor(Math.random() * dests.length)],
                waitStart: Date.now(),
                time: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
                zone: 'zona1', operator: AppState.currentOperator.name
            });
            renderWaitingOrders(); updateStats();
        }
    }, 40000);
}

function startMessageSimulation() {
    setInterval(() => {
        if (AppState.drivers.length && Math.random() > 0.5) {
            const d = AppState.drivers[Math.floor(Math.random() * AppState.drivers.length)];
            const msgs = ['JASHT VETURE', 'DUKE PRITUR', 'A MUNDESH ME I LAJMRU?', 'KËRKESË PËR PAUZË', 'NË PUNË JAM'];
            AppState.messages.unshift({
                id: Date.now(), driverId: d.id, name: d.name,
                text: msgs[Math.floor(Math.random() * msgs.length)],
                time: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
                unread: true
            });
            renderMessages();
            updateMessagesBadge();
        }
    }, 45000);
}

// ═══ GLOBAL ═══
window.acceptCall = acceptCall;
window.rejectCall = rejectCall;
window.autoAssignWaiting = autoAssignWaiting;
window.manualAssignWaiting = manualAssignWaiting;
window.closestAssignWaiting = closestAssignWaiting;
window.cancelWaiting = cancelWaiting;
window.cancelOrder = cancelOrder;
window.openOrderDetail = openOrderDetail;
window.activatePre = activatePre;
window.cancelPre = cancelPre;

console.log('✅ TaxiDispatch Pro Ready');
