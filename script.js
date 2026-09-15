/* ═══════════════════════════════════════════════════════
   TaxiDispatch Pro - Dispatch Console Logic
   ═══════════════════════════════════════════════════════ */

'use strict';

// ═══ STATE ═══
const AppState = {
    orders: [],
    waitingOrders: [],
    preOrders: [],
    incomingCalls: [],
    drivers: [],
    vehicles: [],
    zones: [],
    addresses: [],
    config: {},
    map: null,
    vehicleMarkers: new Map(),
    currentDispatchMode: 'auto',
    callInterval: null,
    simulationInterval: null
};

// ═══ INITIALIZATION ═══
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        document.getElementById('loading-overlay')?.classList.add('hidden');
    }, 600);

    loadData();
    initClock();
    initMap();
    initEventListeners();
    renderAll();
    startCallSimulation();
    startOrderSimulation();
});

// ═══ LOAD DATA ═══
function loadData() {
    if (!window.TaxiData) {
        console.error('TaxiData nuk u ngarkua!');
        return;
    }

    AppState.addresses = window.TaxiData.addresses || [];
    AppState.zones = window.TaxiData.zones || [];
    AppState.drivers = window.TaxiData.drivers || [];
    AppState.vehicles = window.TaxiData.vehicles || [];
    AppState.config = window.TaxiData.config || {};

    // Porosi aktive (mock)
    AppState.orders = [
        { id: 1001, phone: '+383 44 123 456', name: 'Ardit Krasniqi', pickup: 'Grand Hotel Prishtina', destination: 'Aeroporti Ndërkombëtar', status: 'assigned', vehicle: '01', driverName: 'Arben Krasniqi', time: '19:04', zone: 'zona1', tariff: 'airport' },
        { id: 1002, phone: '+383 49 987 654', name: 'Blerim Hoxha', pickup: 'Newborn Monument', destination: 'Albi Mall', status: 'onroute', vehicle: '04', driverName: 'Endrit Morina', time: '19:02', zone: 'zona1', tariff: 'standard' },
        { id: 1003, phone: '+383 44 555 222', name: 'Driton Berisha', pickup: 'Rr. UÇK Dardani', destination: 'QKUK', status: 'delay', vehicle: '05', driverName: 'Fisnik Gashi', time: '18:55', zone: 'zona2', tariff: 'standard' },
        { id: 1004, phone: '+383 45 111 222', name: 'Endrit Morina', pickup: 'Katedralja Nënë Tereza', destination: 'Kalabria', status: 'assigned', vehicle: '07', driverName: 'Hekuran Zeka', time: '18:50', zone: 'zona1', tariff: 'standard' },
        { id: 1007, phone: '+383 44 999 111', name: 'Fitim Berisha', pickup: 'Pallati i Drejtësisë', destination: 'Sheshi Nëna Terezë', status: 'onroute', vehicle: '09', driverName: 'Jeton Bytyqi', time: '19:05', zone: 'zona4', tariff: 'vip' }
    ];

    // Porosi në pritje (waiting)
    AppState.waitingOrders = [
        { id: 2001, phone: '+383 44 777 888', name: 'Genc Rama', pickup: 'Qendra Tregtare Kalabria', destination: 'Arbëria', waitStart: Date.now() - 45000, time: '19:08', zone: 'zona5' },
        { id: 2002, phone: '+383 49 333 444', name: 'Ilir Thaçi', pickup: 'Hotel Swiss Diamond', destination: 'Stacioni i Autobusëve', waitStart: Date.now() - 120000, time: '19:10', zone: 'zona1' },
        { id: 2003, phone: '+383 45 222 333', name: 'Jeton Bytyqi', pickup: 'QKUK', destination: 'Fushë Kosova', waitStart: Date.now() - 280000, time: '18:48', zone: 'zona1' }
    ];

    // Pre-orders
    AppState.preOrders = [
        { id: 3001, phone: '+383 44 111 999', name: 'Kreshnik Dema', pickup: 'Aeroporti Ndërkombëtar', destination: 'Qendra', date: '15/09', time: '06:30', zone: 'zona3', vehicle: '' },
        { id: 3002, phone: '+383 44 222 888', name: 'Luan Ahmeti', pickup: 'Grand Hotel Prishtina', destination: 'QKUK', date: '15/09', time: '07:15', zone: 'zona1', vehicle: '' },
        { id: 3003, phone: '+383 44 333 777', name: 'Mentor Bekteshi', pickup: 'Dardania', destination: 'Albi Mall', date: '15/09', time: '08:00', zone: 'zona2', vehicle: '' }
    ];
}

// ═══ CLOCK ═══
function initClock() {
    const updateClock = () => {
        const now = new Date();
        const timeEl = document.getElementById('clock-time');
        const dateEl = document.getElementById('clock-date');
        if (timeEl) {
            timeEl.textContent = now.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
    };
    updateClock();
    setInterval(updateClock, 1000);
}

// ═══ MAP ═══
function initMap() {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    AppState.map = L.map('map', {
        center: [42.6629, 21.1655],
        zoom: 13,
        zoomControl: true,
        attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
    }).addTo(AppState.map);

    renderZonesOnMap();
    renderVehiclesOnMap();
}

function renderZonesOnMap() {
    AppState.zones.forEach(zone => {
        L.polygon(zone.polygon, {
            color: zone.color,
            fillColor: zone.color,
            fillOpacity: 0.06,
            weight: 2,
            dashArray: '6,4'
        }).addTo(AppState.map);
    });
}

function renderVehiclesOnMap() {
    AppState.drivers.forEach(driver => {
        const vehicle = AppState.vehicles.find(v => v.id === driver.vehicleId);
        if (!vehicle) return;

        const vehicleNumber = String(driver.vehicleId).padStart(2, '0');
        const statusClass = driver.status;

        const icon = L.divIcon({
            className: 'vehicle-marker',
            html: `<div class="vehicle-marker-inner ${statusClass}">${vehicleNumber}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        const marker = L.marker([driver.lat, driver.lng], {
            icon: icon,
            title: `${vehicleNumber} - ${driver.name}`
        }).addTo(AppState.map);

        marker.bindPopup(`
            <div style="font-family:Inter,sans-serif;min-width:200px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                    <span style="
                        display:inline-flex;align-items:center;justify-content:center;
                        width:32px;height:32px;border-radius:50%;
                        background:linear-gradient(135deg,#a855f7,#ec4899);
                        color:white;font-weight:800;font-family:monospace;font-size:12px;
                    ">${vehicleNumber}</span>
                    <div>
                        <div style="font-weight:700;font-size:13px;">${driver.name}</div>
                        <div style="font-size:11px;color:#8b7aa8;">${vehicle.plate} · ${vehicle.model}</div>
                    </div>
                </div>
                <div style="font-size:11px;color:#b8a8d9;">
                    <div>📞 ${driver.phone}</div>
                    <div>⭐ ${driver.rating} · ${driver.trips} udhëtime</div>
                    <div style="margin-top:4px;color:${driver.status === 'available' ? '#22c55e' : driver.status === 'busy' ? '#f43f5e' : '#f59e0b'};font-weight:700;text-transform:uppercase;">
                        ${driver.status}
                    </div>
                </div>
            </div>
        `);

        AppState.vehicleMarkers.set(driver.id, marker);
    });

    updateMapCounter();
}

function updateMapCounter() {
    const el = document.getElementById('map-counter');
    if (el) el.textContent = `${AppState.drivers.length} taksí`;
}

// ═══ EVENT LISTENERS ═══
function initEventListeners() {
    document.getElementById('btn-new-order')?.addEventListener('click', openNewOrderModal);
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById(btn.dataset.close)?.classList.remove('active');
        });
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
    });

    document.getElementById('order-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        submitOrder();
    });
    document.getElementById('btn-submit-order')?.addEventListener('click', (e) => {
        e.preventDefault();
        submitOrder();
    });

    // Dispatch mode
    document.querySelectorAll('.dispatch-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dispatch-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.currentDispatchMode = btn.dataset.dispatch;
        });
    });

    // Autocomplete
    setupAutocomplete('pickup-address', 'pickup-suggestions');
    setupAutocomplete('destination-address', 'destination-suggestions');

    // Kërkim porosive
    document.getElementById('order-search')?.addEventListener('input', (e) => {
        filterOrders(e.target.value);
    });

    // Fullscreen
    document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    });

    // Notifications
    document.getElementById('btn-notifications')?.addEventListener('click', () => {
        showToast('info', 'Njoftime', 'Keni 3 njoftime të reja');
    });
}

// ═══ AUTCOMPLETE ═══
function setupAutocomplete(inputId, suggestId) {
    const input = document.getElementById(inputId);
    const suggestions = document.getElementById(suggestId);
    if (!input || !suggestions) return;

    input.addEventListener('input', (e) => {
        const query = e.target.value;
        if (query.length < 2) {
            suggestions.classList.remove('active');
            return;
        }
        const results = window.TaxiData?.searchAddresses(query) || [];
        if (results.length === 0) {
            suggestions.classList.remove('active');
            return;
        }
        suggestions.innerHTML = results.map(addr => `
            <div class="autocomplete-item" data-address="${addr.name}">
                <i class="fa-solid fa-location-dot"></i>
                <span>${addr.name}</span>
            </div>
        `).join('');
        suggestions.classList.add('active');

        suggestions.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                input.value = item.dataset.address;
                suggestions.classList.remove('active');
            });
        });
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.classList.remove('active');
        }
    });
}

// ═══ RENDER ALL ═══
function renderAll() {
    renderIncomingCalls();
    renderWaitingOrders();
    renderOrders();
    renderPreOrders();
    updateStats();
}

// ═══ INCOMING CALLS ═══
function renderIncomingCalls() {
    const container = document.getElementById('calls-list');
    if (!container) return;

    if (AppState.incomingCalls.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:30px 16px;color:var(--text-muted);font-size:12px;">
                <i class="fa-solid fa-phone-slash" style="font-size:24px;opacity:0.3;display:block;margin-bottom:8px;"></i>
                Nuk ka thirrje hyrëse
            </div>
        `;
        return;
    }

    container.innerHTML = AppState.incomingCalls.map(call => `
        <div class="call-card ${call.ringing ? 'ringing' : ''}" data-call-id="${call.id}">
            <div class="call-header">
                <span class="call-phone">${call.phone}</span>
                <span class="call-time">${call.time}</span>
            </div>
            ${call.name ? `<div class="call-name">${call.name}</div>` : ''}
            ${call.lastAddress ? `<div class="call-location"><i class="fa-solid fa-clock-rotate-left"></i> ${call.lastAddress}</div>` : ''}
            <div class="call-actions">
                <button class="btn-accept" onclick="acceptCall(${call.id})">
                    <i class="fa-solid fa-phone"></i> KRIJO POROSI
                </button>
                <button class="btn-reject" onclick="rejectCall(${call.id})">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function acceptCall(callId) {
    const call = AppState.incomingCalls.find(c => c.id === callId);
    if (!call) return;

    // Hap modalin me numrin e paraplotësuar
    openNewOrderModal();
    document.getElementById('client-phone').value = call.phone;
    if (call.name) document.getElementById('client-name').value = call.name;
    if (call.lastAddress) document.getElementById('pickup-address').value = call.lastAddress;

    // Hiq thirrjen nga lista
    AppState.incomingCalls = AppState.incomingCalls.filter(c => c.id !== callId);
    renderIncomingCalls();
}

function rejectCall(callId) {
    AppState.incomingCalls = AppState.incomingCalls.filter(c => c.id !== callId);
    renderIncomingCalls();
}

// ═══ WAITING ORDERS ═══
function renderWaitingOrders() {
    const tbody = document.getElementById('waiting-tbody');
    const countEl = document.getElementById('waiting-count');
    if (!tbody) return;

    if (countEl) countEl.textContent = AppState.waitingOrders.length;

    if (AppState.waitingOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">Nuk ka porosi në pritje</td></tr>`;
        return;
    }

    tbody.innerHTML = AppState.waitingOrders.map(order => {
        const waitSec = Math.floor((Date.now() - order.waitStart) / 1000);
        const waitMin = Math.floor(waitSec / 60);
        const waitClass = waitMin < 1 ? 'fresh' : waitMin < 3 ? 'medium' : 'old';

        return `
            <tr data-order-id="${order.id}">
                <td><strong>#${order.id}</strong></td>
                <td class="time">${order.time}</td>
                <td class="phone">${order.phone}</td>
                <td class="location">${order.pickup}</td>
                <td class="location">${order.destination}</td>
                <td><span class="wait-time ${waitClass}">${waitMin} min</span></td>
                <td>
                    <div class="row-actions">
                        <button class="row-btn primary" onclick="assignWaitingOrder(${order.id})" title="Cakto">
                            <i class="fa-solid fa-user-plus"></i>
                        </button>
                        <button class="row-btn danger" onclick="cancelWaitingOrder(${order.id})" title="Anulo">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function assignWaitingOrder(orderId) {
    const order = AppState.waitingOrders.find(o => o.id === orderId);
    if (!order) return;

    // Gjej veturën e lirë
    const availableDriver = AppState.drivers.find(d => d.status === 'available');
    if (!availableDriver) {
        showToast('warning', 'Nuk ka taksi', 'Të gjitha taksitë janë të zëna');
        return;
    }

    const vehicle = AppState.vehicles.find(v => v.id === availableDriver.vehicleId);
    const vehicleNumber = vehicle ? String(vehicle.id).padStart(2, '0') : '??';

    order.status = 'assigned';
    order.vehicle = vehicleNumber;
    order.driverName = availableDriver.name;

    // Kalo në orders
    AppState.orders.unshift({
        id: order.id,
        phone: order.phone,
        name: order.name,
        pickup: order.pickup,
        destination: order.destination,
        status: 'assigned',
        vehicle: vehicleNumber,
        driverName: availableDriver.name,
        time: order.time,
        zone: order.zone,
        tariff: 'standard'
    });

    // Hiq nga waiting
    AppState.waitingOrders = AppState.waitingOrders.filter(o => o.id !== orderId);
    availableDriver.status = 'busy';

    renderWaitingOrders();
    renderOrders();
    updateStats();
    updateVehicleMarker(availableDriver.id);

    showToast('success', 'U caktua', `${availableDriver.name} — Vetura ${vehicleNumber}`);
}

function cancelWaitingOrder(orderId) {
    AppState.waitingOrders = AppState.waitingOrders.filter(o => o.id !== orderId);
    renderWaitingOrders();
    updateStats();
    showToast('info', 'U anulua', `Porosia #${orderId} u anulua`);
}

// ═══ ORDERS TABLE ═══
function renderOrders() {
    const tbody = document.getElementById('orders-tbody');
    const countEl = document.getElementById('orders-count');
    if (!tbody) return;

    if (countEl) countEl.textContent = AppState.orders.length;

    if (AppState.orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted);font-size:12px;">Nuk ka porosi aktive</td></tr>`;
        return;
    }

    const statusLabels = {
        new: 'E Re',
        pending: 'Pritje',
        assigned: 'Caktuar',
        onroute: 'Në rrugë',
        delay: 'Vonesë',
        completed: 'Kryer'
    };

    tbody.innerHTML = AppState.orders.map(order => `
        <tr data-order-id="${order.id}">
            <td><span class="status-badge ${order.status}">${statusLabels[order.status] || order.status}</span></td>
            <td class="time">${order.time}</td>
            <td>
                ${order.vehicle
                    ? `<span class="vehicle-badge">${order.vehicle}</span>`
                    : `<span class="vehicle-badge empty">—</span>`}
            </td>
            <td class="phone">${order.phone}</td>
            <td class="location">${order.pickup}</td>
            <td class="location">${order.destination}</td>
            <td>${order.driverName || '<span style="color:var(--text-muted)">Pa caktuar</span>'}</td>
            <td>
                <div class="row-actions">
                    <button class="row-btn primary" title="Shiko">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    <button class="row-btn success" title="Telefono">
                        <i class="fa-solid fa-phone"></i>
                    </button>
                    <button class="row-btn danger" onclick="cancelOrder(${order.id})" title="Anulo">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function cancelOrder(orderId) {
    AppState.orders = AppState.orders.filter(o => o.id !== orderId);
    renderOrders();
    updateStats();
    showToast('info', 'U anulua', `Porosia #${orderId}`);
}

function filterOrders(query) {
    if (!query) { renderOrders(); return; }
    const q = query.toLowerCase();
    const tbody = document.getElementById('orders-tbody');
    if (!tbody) return;

    const filtered = AppState.orders.filter(o =>
        o.phone.includes(q) ||
        o.pickup.toLowerCase().includes(q) ||
        (o.destination || '').toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted);">Nuk u gjet</td></tr>`;
        return;
    }

    const statusLabels = { new: 'E Re', pending: 'Pritje', assigned: 'Caktuar', onroute: 'Në rrugë', delay: 'Vonesë', completed: 'Kryer' };
    tbody.innerHTML = filtered.map(order => `
        <tr>
            <td><span class="status-badge ${order.status}">${statusLabels[order.status] || order.status}</span></td>
            <td class="time">${order.time}</td>
            <td>${order.vehicle ? `<span class="vehicle-badge">${order.vehicle}</span>` : '—'}</td>
            <td class="phone">${order.phone}</td>
            <td class="location">${order.pickup}</td>
            <td class="location">${order.destination}</td>
            <td>${order.driverName || '—'}</td>
            <td>
                <div class="row-actions">
                    <button class="row-btn primary"><i class="fa-solid fa-eye"></i></button>
                    <button class="row-btn danger" onclick="cancelOrder(${order.id})"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ═══ PRE-ORDERS ═══
function renderPreOrders() {
    const tbody = document.getElementById('preorders-tbody');
    const countEl = document.getElementById('preorders-count');
    if (!tbody) return;

    if (countEl) countEl.textContent = AppState.preOrders.length;

    if (AppState.preOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">Nuk ka pre-orders</td></tr>`;
        return;
    }

    tbody.innerHTML = AppState.preOrders.map(order => `
        <tr data-order-id="${order.id}">
            <td><span class="preorder-date">${order.date}</span></td>
            <td class="time">${order.time}</td>
            <td class="phone">${order.phone}</td>
            <td class="location">${order.pickup}</td>
            <td class="location">${order.destination}</td>
            <td>${order.vehicle ? `<span class="vehicle-badge">${order.vehicle}</span>` : '—'}</td>
            <td>
                <div class="row-actions">
                    <button class="row-btn primary" onclick="activatePreorder(${order.id})" title="Aktivizo">
                        <i class="fa-solid fa-play"></i>
                    </button>
                    <button class="row-btn danger" onclick="cancelPreorder(${order.id})" title="Anulo">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function activatePreorder(orderId) {
    const order = AppState.preOrders.find(o => o.id === orderId);
    if (!order) return;
    AppState.preOrders = AppState.preOrders.filter(o => o.id !== orderId);
    AppState.waitingOrders.unshift({
        id: order.id,
        phone: order.phone,
        name: order.name,
        pickup: order.pickup,
        destination: order.destination,
        waitStart: Date.now(),
        time: order.time,
        zone: order.zone
    });
    renderPreOrders();
    renderWaitingOrders();
    showToast('info', 'U aktivizua', `Pre-order #${orderId} → në pritje`);
}

function cancelPreorder(orderId) {
    AppState.preOrders = AppState.preOrders.filter(o => o.id !== orderId);
    renderPreOrders();
    updateStats();
}

// ═══ MODAL NEW ORDER ═══
function openNewOrderModal() {
    document.getElementById('modal-new-order')?.classList.add('active');
    document.getElementById('client-phone')?.focus();
}

function submitOrder() {
    const phone = document.getElementById('client-phone')?.value.trim();
    const name = document.getElementById('client-name')?.value.trim();
    const pickup = document.getElementById('pickup-address')?.value.trim();
    const destination = document.getElementById('destination-address')?.value.trim();
    const zone = document.getElementById('order-zone')?.value;
    const tariff = document.getElementById('order-tariff')?.value;
    const note = document.getElementById('order-note')?.value.trim();

    if (!phone || !pickup) {
        showToast('error', 'Gabim', 'Plotëso numrin dhe adresën');
        return;
    }

    const newOrder = {
        id: Date.now(),
        phone,
        name: name || 'Klient',
        pickup,
        destination: destination || 'N/A',
        status: 'new',
        vehicle: '',
        driverName: '',
        time: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
        zone: zone === 'auto' ? 'zona1' : zone,
        tariff: tariff || 'standard',
        note
    };

    if (AppState.currentDispatchMode === 'manual') {
        newOrder.status = 'pending';
        AppState.waitingOrders.unshift({
            ...newOrder,
            waitStart: Date.now()
        });
        renderWaitingOrders();
    } else {
        // Auto assign
        const availableDriver = AppState.drivers.find(d => d.status === 'available');
        if (availableDriver) {
            const vehicle = AppState.vehicles.find(v => v.id === availableDriver.vehicleId);
            const vehicleNumber = vehicle ? String(vehicle.id).padStart(2, '0') : '??';
            newOrder.status = 'assigned';
            newOrder.vehicle = vehicleNumber;
            newOrder.driverName = availableDriver.name;
            availableDriver.status = 'busy';
            updateVehicleMarker(availableDriver.id);
        }
        AppState.orders.unshift(newOrder);
        renderOrders();
    }

    updateStats();
    document.getElementById('modal-new-order')?.classList.remove('active');
    document.getElementById('order-form')?.reset();
    showToast('success', 'Porosia u shtua', `${phone} — ${pickup}`);
}

// ═══ VEHICLE MARKER UPDATE ═══
function updateVehicleMarker(driverId) {
    const driver = AppState.drivers.find(d => d.id === driverId);
    const marker = AppState.vehicleMarkers.get(driverId);
    if (!driver || !marker) return;

    const vehicleNumber = String(driver.vehicleId).padStart(2, '0');
    const newIcon = L.divIcon({
        className: 'vehicle-marker',
        html: `<div class="vehicle-marker-inner ${driver.status}">${vehicleNumber}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });
    marker.setIcon(newIcon);
}

// ═══ STATS ═══
function updateStats() {
    const online = AppState.drivers.filter(d => d.status === 'available').length;
    const pending = AppState.waitingOrders.length + AppState.orders.filter(o => o.status === 'new' || o.status === 'pending').length;
    const trips = AppState.orders.filter(o => o.status === 'onroute' || o.status === 'completed').length;
    const revenue = (trips * 4.5 + AppState.orders.length * 3.2).toFixed(0);

    setText('stat-online', online);
    setText('stat-pending', pending);
    setText('stat-trips', trips);
    setText('stat-revenue', `€${revenue}`);
    setText('rail-orders-badge', AppState.orders.length);
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ═══ TOAST ═══
function showToast(type, title, message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
        success: 'fa-circle-check',
        error: 'fa-circle-xmark',
        warning: 'fa-triangle-exclamation',
        info: 'fa-circle-info'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${icons[type] || icons.info}"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ═══ SIMULIM THIRRJESH ═══
function startCallSimulation() {
    // Thirrje e parë pas 3 sekondash
    setTimeout(() => generateIncomingCall(), 3000);

    AppState.callInterval = setInterval(() => {
        if (AppState.incomingCalls.length < 3) {
            generateIncomingCall();
        }
    }, 25000);
}

function generateIncomingCall() {
    const phones = ['+383 44 111 001', '+383 44 222 002', '+383 49 333 003', '+383 45 444 004', '+383 44 555 005'];
    const names = ['Klient i Ri', 'Ardit Krasniqi', 'Blerim Hoxha', 'Driton Berisha', 'Endrit Morina'];
    const addresses = ['Grand Hotel Prishtina', 'Newborn Monument', 'Rr. UÇK', 'Dardania', 'Albi Mall'];
    const idx = Math.floor(Math.random() * phones.length);

    const call = {
        id: Date.now(),
        phone: phones[idx],
        name: Math.random() > 0.4 ? names[idx] : '',
        lastAddress: Math.random() > 0.5 ? addresses[Math.floor(Math.random() * addresses.length)] : '',
        time: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
        ringing: true
    };

    AppState.incomingCalls.push(call);
    renderIncomingCalls();

    // Ndal ringing pas 5 sekondash
    setTimeout(() => {
        call.ringing = false;
        renderIncomingCalls();
    }, 5000);
}

// ═══ SIMULIM POROSISH ═══
function startOrderSimulation() {
    // Lëvizja e veturave në hartë
    setInterval(() => {
        AppState.vehicleMarkers.forEach((marker, driverId) => {
            const driver = AppState.drivers.find(d => d.id === driverId);
            if (!driver || driver.status === 'offline') return;

            const pos = marker.getLatLng();
            const newLat = pos.lat + (Math.random() - 0.5) * 0.0015;
            const newLng = pos.lng + (Math.random() - 0.5) * 0.0015;
            marker.setLatLng([newLat, newLng]);
            driver.lat = newLat;
            driver.lng = newLng;
        });
    }, 4000);

    // Update waiting times çdo 10 sekonda
    setInterval(() => {
        if (AppState.waitingOrders.length > 0) {
            renderWaitingOrders();
        }
    }, 10000);

    // Ndryshimi i statuseve
    setInterval(() => {
        AppState.drivers.forEach(driver => {
            if (driver.status === 'busy' && Math.random() > 0.7) {
                driver.status = 'available';
                updateVehicleMarker(driver.id);
                updateStats();
            } else if (driver.status === 'available' && Math.random() > 0.85) {
                driver.status = 'busy';
                updateVehicleMarker(driver.id);
                updateStats();
            }
        });
    }, 15000);

    // Porosi të re automatike në pritje
    setInterval(() => {
        if (AppState.waitingOrders.length < 5 && Math.random() > 0.6) {
            const phones = ['+383 44 666 777', '+383 45 888 999', '+383 49 111 222'];
            const pickups = ['Grandi', 'Newborn', 'Rr. UÇK', 'Dardania', 'Albi Mall'];
            const dests = ['QKUK', 'Aeroporti', 'Kalabria', 'Arbëria', 'Qendra'];

            AppState.waitingOrders.push({
                id: Date.now() + Math.floor(Math.random() * 1000),
                phone: phones[Math.floor(Math.random() * phones.length)],
                name: 'Klient',
                pickup: pickups[Math.floor(Math.random() * pickups.length)],
                destination: dests[Math.floor(Math.random() * dests.length)],
                waitStart: Date.now(),
                time: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
                zone: 'zona1'
            });
            renderWaitingOrders();
            updateStats();
            showToast('warning', 'Porosi e re në pritje', 'Kërkon caktim');
        }
    }, 35000);
}

// ═══ GLOBAL ═══
window.acceptCall = acceptCall;
window.rejectCall = rejectCall;
window.assignWaitingOrder = assignWaitingOrder;
window.cancelWaitingOrder = cancelWaitingOrder;
window.cancelOrder = cancelOrder;
window.activatePreorder = activatePreorder;
window.cancelPreorder = cancelPreorder;
window.showToast = showToast;

console.log('%c✅ TaxiDispatch Pro - Dispatch Console Ready', 'color:#a855f7;font-size:14px;font-weight:bold;');
