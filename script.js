/* ═══════════════════════════════════════════════════════
   TaxiDispatch Pro - Dispatch Console Logic
   ═══════════════════════════════════════════════════════ */

'use strict';

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

// ═══ INIT ═══
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
    AppState.drivers = JSON.parse(JSON.stringify(window.TaxiData.drivers || []));
    AppState.vehicles = window.TaxiData.vehicles || [];
    AppState.config = window.TaxiData.config || {};

    // Porosi aktive
    AppState.orders = [
        { id: 1001, phone: '+383 44 123 456', name: 'Ardit Krasniqi', pickup: 'Grand Hotel Prishtina', destination: 'Aeroporti Ndërkombëtar i Prishtinës', status: 'assigned', vehicle: '01', driverName: 'Arben Krasniqi', time: '19:04', zone: 'zona1', tariff: 'airport' },
        { id: 1002, phone: '+383 49 987 654', name: 'Blerim Hoxha', pickup: 'Newborn Monument', destination: 'Albi Mall', status: 'onroute', vehicle: '04', driverName: 'Endrit Morina', time: '19:02', zone: 'zona1', tariff: 'standard' },
        { id: 1003, phone: '+383 44 555 222', name: 'Driton Berisha', pickup: 'QKUK - Qendra Klinike Universitare', destination: 'Aeroporti Ndërkombëtar i Prishtinës', status: 'delay', vehicle: '05', driverName: 'Fisnik Gashi', time: '18:55', zone: 'zona2', tariff: 'standard' },
        { id: 1004, phone: '+383 45 111 222', name: 'Endrit Morina', pickup: 'Katedralja Nënë Tereza', destination: 'Qendra Tregtare Kalabria', status: 'assigned', vehicle: '07', driverName: 'Hekuran Zeka', time: '18:50', zone: 'zona1', tariff: 'standard' },
        { id: 1007, phone: '+383 44 999 111', name: 'Fitim Berisha', pickup: 'Pallati i Drejtësisë', destination: 'Sheshi Nënë Terezë', status: 'onroute', vehicle: '09', driverName: 'Jeton Bytyqi', time: '19:05', zone: 'zona4', tariff: 'vip' },
        { id: 1009, phone: '+383 44 666 777', name: 'Gentian Krasniqi', pickup: 'Hotel Swiss Diamond', destination: 'Prishtina Mall', status: 'assigned', vehicle: '12', driverName: 'Mentor Bekteshi', time: '19:12', zone: 'zona1', tariff: 'standard' }
    ];

    // Waiting orders
    AppState.waitingOrders = [
        { id: 2001, phone: '+383 44 777 888', name: 'Genc Rama', pickup: 'Qendra Tregtare Kalabria', destination: 'Arbëria', waitStart: Date.now() - 45000, time: '19:08', zone: 'zona5' },
        { id: 2002, phone: '+383 49 333 444', name: 'Ilir Thaçi', pickup: 'Hotel Swiss Diamond', destination: 'Stacioni i Autobusëve', waitStart: Date.now() - 120000, time: '19:10', zone: 'zona1' },
        { id: 2003, phone: '+383 45 222 333', name: 'Jeton Bytyqi', pickup: 'QKUK - Qendra Klinike Universitare', destination: 'Fushë Kosova', waitStart: Date.now() - 280000, time: '18:48', zone: 'zona1' },
        { id: 2004, phone: '+383 44 555 666', name: 'Luan Ahmeti', pickup: 'Hotel Sirius', destination: 'Aeroporti Ndërkombëtar i Prishtinës', waitStart: Date.now() - 60000, time: '19:15', zone: 'zona1' },
        { id: 2005, phone: '+383 49 888 999', name: 'Fatmir Berisha', pickup: 'Grand Hotel Prishtina', destination: 'Viva Fresh', waitStart: Date.now() - 180000, time: '19:18', zone: 'zona1' }
    ];

    // Pre-orders
    AppState.preOrders = [
        { id: 3001, phone: '+383 44 111 999', name: 'Kreshnik Dema', pickup: 'Aeroporti Ndërkombëtar i Prishtinës', destination: 'Grand Hotel Prishtina', date: '15/09', time: '06:30', zone: 'zona3', vehicle: '' },
        { id: 3002, phone: '+383 44 222 888', name: 'Luan Ahmeti', pickup: 'Grand Hotel Prishtina', destination: 'QKUK - Qendra Klinike Universitare', date: '15/09', time: '07:15', zone: 'zona1', vehicle: '' },
        { id: 3003, phone: '+383 44 333 777', name: 'Mentor Bekteshi', pickup: 'Hotel Emerald', destination: 'Albi Mall', date: '15/09', time: '08:00', zone: 'zona2', vehicle: '' },
        { id: 3004, phone: '+383 45 444 555', name: 'Ardit Krasniqi', pickup: 'Hotel Sirius', destination: 'Aeroporti Ndërkombëtar i Prishtinës', date: '15/09', time: '09:45', zone: 'zona1', vehicle: '' },
        { id: 3005, phone: '+383 49 555 111', name: 'Blerim Hoxha', pickup: 'Swiss Diamond Hotel', destination: 'Qendra Tregtare Kalabria', date: '15/09', time: '11:00', zone: 'zona1', vehicle: '' }
    ];

    // Thirrje fillestare
    AppState.incomingCalls = [
        { id: Date.now() + 1, phone: '+383 44 555 001', name: 'Klient i Ri', lastAddress: 'Grand Hotel Prishtina', time: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }), ringing: true }
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
        const statusClass = driver.mode || 'inactive';

        const icon = L.divIcon({
            className: 'vehicle-marker',
            html: `<div class="vehicle-marker-inner ${statusClass}" data-number="${vehicleNumber}"></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        const marker = L.marker([driver.lat, driver.lng], {
            icon: icon,
            title: `${vehicleNumber} - ${driver.name}`
        }).addTo(AppState.map);

        marker.bindPopup(`
            <div style="font-family:Inter,sans-serif;min-width:220px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                    <span style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:${getModeColor(driver.mode)};color:white;font-weight:800;font-family:monospace;font-size:13px;">${vehicleNumber}</span>
                    <div>
                        <div style="font-weight:700;font-size:13px;">${driver.name}</div>
                        <div style="font-size:11px;color:#8b7aa8;">${vehicle.plate} · ${vehicle.model}</div>
                    </div>
                </div>
                <div style="font-size:11px;color:#b8a8d9;display:flex;flex-direction:column;gap:3px;">
                    <div>📞 ${driver.phone}</div>
                    <div>⭐ ${driver.rating} · ${driver.trips} udhëtime</div>
                    <div style="margin-top:6px;padding:4px 8px;background:${getModeColor(driver.mode)}20;color:${getModeColor(driver.mode)};font-weight:700;text-transform:uppercase;border-radius:6px;font-size:10px;display:inline-block;">
                        ${getModeLabel(driver.mode)}
                    </div>
                </div>
            </div>
        `);

        AppState.vehicleMarkers.set(driver.id, marker);
    });
    updateMapCounter();
}

function getModeColor(mode) {
    const colors = { free: '#22c55e', taximeter: '#3b82f6', fixed: '#ef4444', pause: '#facc15', inactive: '#6b7280' };
    return colors[mode] || colors.inactive;
}

function getModeLabel(mode) {
    const labels = { free: 'E LIRË', taximeter: 'ME TAKSIMETËR', fixed: 'ÇMIM FIKS', pause: 'PUSHIM', inactive: 'JOAKTIV' };
    return labels[mode] || mode;
}

function updateVehicleMarker(driverId) {
    const driver = AppState.drivers.find(d => d.id === driverId);
    const marker = AppState.vehicleMarkers.get(driverId);
    if (!driver || !marker) return;
    const vehicleNumber = String(driver.vehicleId).padStart(2, '0');
    const statusClass = driver.mode || 'inactive';
    const newIcon = L.divIcon({
        className: 'vehicle-marker',
        html: `<div class="vehicle-marker-inner ${statusClass}" data-number="${vehicleNumber}"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });
    marker.setIcon(newIcon);
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

    document.querySelectorAll('.dispatch-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dispatch-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.currentDispatchMode = btn.dataset.dispatch;
        });
    });

    setupAutocomplete('pickup-address', 'pickup-suggestions');
    setupAutocomplete('destination-address', 'destination-suggestions');

    document.getElementById('order-search')?.addEventListener('input', (e) => {
        filterOrders(e.target.value);
    });

    document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
    });

    document.getElementById('btn-notifications')?.addEventListener('click', () => {
        showToast('info', 'Njoftime', 'Keni 3 njoftime të reja');
    });

    // PANEL MIN/MAX
    document.querySelectorAll('[data-panel-toggle]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const panelId = btn.dataset.panelToggle;
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.classList.toggle('minimized');
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.className = panel.classList.contains('minimized')
                        ? 'fa-solid fa-plus'
                        : 'fa-solid fa-minus';
                }
                setTimeout(() => AppState.map?.invalidateSize(), 300);
            }
        });
    });

    document.querySelectorAll('[data-panel-maximize]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const panelId = btn.dataset.panelMaximize;
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.classList.toggle('maximized');
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.className = panel.classList.contains('maximized')
                        ? 'fa-solid fa-compress'
                        : 'fa-solid fa-expand';
                }
                setTimeout(() => AppState.map?.invalidateSize(), 300);
            }
        });
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
        suggestions.innerHTML = results.map(addr => {
            const cat = window.TaxiData.addressCategories[addr.category] || { label: addr.category, icon: 'fa-location-dot' };
            return `
                <div class="autocomplete-item" data-address="${addr.name}">
                    <i class="fa-solid ${cat.icon}"></i>
                    <div>
                        <div style="font-weight:600;color:#f5f0ff;">${addr.name}</div>
                        <div style="font-size:10px;color:#8b7aa8;">${cat.label}</div>
                    </div>
                </div>
            `;
        }).join('');
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

// ═══ LOCATION ICON ═══
function getLocationIcon(address) {
    const a = (address || '').toLowerCase();
    if (a.includes('hotel') || a.includes('grandi') || a.includes('swiss') || a.includes('sirius') || a.includes('emerald') || a.includes('victory') || a.includes('begolli')) return 'hotel';
    if (a.includes('aeroport') || a.includes('airport')) return 'airport';
    if (a.includes('qkuk') || a.includes('spital') || a.includes('klinika')) return 'hospital';
    if (a.includes('mall') || a.includes('albi') || a.includes('kalabria')) return 'mall';
    return 'other';
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
    const badge = document.getElementById('rail-calls-badge');
    if (badge) badge.textContent = AppState.incomingCalls.length;
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
    openNewOrderModal();
    document.getElementById('client-phone').value = call.phone;
    if (call.name) document.getElementById('client-name').value = call.name;
    if (call.lastAddress) document.getElementById('pickup-address').value = call.lastAddress;
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
        const locIcon = getLocationIcon(order.pickup);
        const dstIcon = getLocationIcon(order.destination);

        return `
            <tr data-order-id="${order.id}">
                <td><strong>#${order.id}</strong></td>
                <td class="time">${order.time}</td>
                <td class="phone">${order.phone}</td>
                <td class="location">
                    <div class="location-cell">
                        <i class="fa-solid fa-location-dot ${locIcon}"></i>
                        <span>${order.pickup}</span>
                    </div>
                </td>
                <td class="location">
                    <div class="location-cell">
                        <i class="fa-solid fa-flag-checkered ${dstIcon}"></i>
                        <span>${order.destination}</span>
                    </div>
                </td>
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

    const availableDriver = AppState.drivers.find(d => d.mode === 'free' || d.status === 'available');
    if (!availableDriver) {
        showToast('warning', 'Nuk ka taksi', 'Të gjitha taksitë janë të zëna');
        return;
    }

    const vehicle = AppState.vehicles.find(v => v.id === availableDriver.vehicleId);
    const vehicleNumber = vehicle ? String(vehicle.id).padStart(2, '0') : '??';

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

    AppState.waitingOrders = AppState.waitingOrders.filter(o => o.id !== orderId);
    availableDriver.status = 'busy';
    availableDriver.mode = Math.random() > 0.5 ? 'taximeter' : 'fixed';

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

// ═══ ORDERS ═══
function renderOrders() {
    const tbody = document.getElementById('orders-tbody');
    const countEl = document.getElementById('orders-count');
    const railBadge = document.getElementById('rail-orders-badge');
    if (!tbody) return;
    if (countEl) countEl.textContent = AppState.orders.length;
    if (railBadge) railBadge.textContent = AppState.orders.length;

    if (AppState.orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted);font-size:12px;">Nuk ka porosi aktive</td></tr>`;
        return;
    }

    const statusLabels = { new: 'E Re', pending: 'Pritje', assigned: 'Caktuar', onroute: 'Në rrugë', delay: 'Vonesë', completed: 'Kryer' };

    tbody.innerHTML = AppState.orders.map(order => {
        const locIcon = getLocationIcon(order.pickup);
        const dstIcon = getLocationIcon(order.destination);
        return `
            <tr data-order-id="${order.id}">
                <td><span class="status-badge ${order.status}">${statusLabels[order.status] || order.status}</span></td>
                <td class="time">${order.time}</td>
                <td>
                    ${order.vehicle
                        ? `<span class="vehicle-badge">${order.vehicle}</span>`
                        : `<span class="vehicle-badge empty">—</span>`}
                </td>
                <td class="phone">${order.phone}</td>
                <td class="location">
                    <div class="location-cell">
                        <i class="fa-solid fa-location-dot ${locIcon}"></i>
                        <span>${order.pickup}</span>
                    </div>
                </td>
                <td class="location">
                    <div class="location-cell">
                        <i class="fa-solid fa-flag-checkered ${dstIcon}"></i>
                        <span>${order.destination}</span>
                    </div>
                </td>
                <td>${order.driverName || '<span style="color:var(--text-muted)">Pa caktuar</span>'}</td>
                <td>
                    <div class="row-actions">
                        <button class="row-btn primary" title="Shiko"><i class="fa-solid fa-eye"></i></button>
                        <button class="row-btn success" title="Telefono"><i class="fa-solid fa-phone"></i></button>
                        <button class="row-btn danger" onclick="cancelOrder(${order.id})" title="Anulo"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
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
        o.phone.includes(q) || o.pickup.toLowerCase().includes(q) || (o.destination || '').toLowerCase().includes(q)
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
            <td class="location"><div class="location-cell"><i class="fa-solid fa-location-dot ${getLocationIcon(order.pickup)}"></i><span>${order.pickup}</span></div></td>
            <td class="location"><div class="location-cell"><i class="fa-solid fa-flag-checkered ${getLocationIcon(order.destination)}"></i><span>${order.destination}</span></div></td>
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
            <td class="location">
                <div class="location-cell">
                    <i class="fa-solid fa-location-dot ${getLocationIcon(order.pickup)}"></i>
                    <span>${order.pickup}</span>
                </div>
            </td>
            <td class="location">
                <div class="location-cell">
                    <i class="fa-solid fa-flag-checkered ${getLocationIcon(order.destination)}"></i>
                    <span>${order.destination}</span>
                </div>
            </td>
            <td>${order.vehicle ? `<span class="vehicle-badge">${order.vehicle}</span>` : '—'}</td>
            <td>
                <div class="row-actions">
                    <button class="row-btn primary" onclick="activatePreorder(${order.id})" title="Aktivizo"><i class="fa-solid fa-play"></i></button>
                    <button class="row-btn danger" onclick="cancelPreorder(${order.id})" title="Anulo"><i class="fa-solid fa-xmark"></i></button>
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

// ═══ MODAL ═══
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

    if (!phone || !pickup) {
        showToast('error', 'Gabim', 'Plotëso numrin dhe adresën');
        return;
    }

    const newOrder = {
        id: Date.now(),
        phone, name: name || 'Klient',
        pickup, destination: destination || 'N/A',
        status: 'new', vehicle: '', driverName: '',
        time: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
        zone: zone === 'auto' ? 'zona1' : zone,
        tariff: tariff || 'standard'
    };

    if (AppState.currentDispatchMode === 'manual') {
        newOrder.status = 'pending';
        AppState.waitingOrders.unshift({ ...newOrder, waitStart: Date.now() });
        renderWaitingOrders();
    } else {
        const availableDriver = AppState.drivers.find(d => d.mode === 'free' || d.status === 'available');
        if (availableDriver) {
            const vehicle = AppState.vehicles.find(v => v.id === availableDriver.vehicleId);
            const vehicleNumber = vehicle ? String(vehicle.id).padStart(2, '0') : '??';
            newOrder.status = 'assigned';
            newOrder.vehicle = vehicleNumber;
            newOrder.driverName = availableDriver.name;
            availableDriver.status = 'busy';
            availableDriver.mode = Math.random() > 0.5 ? 'taximeter' : 'fixed';
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

// ═══ STATS ═══
function updateStats() {
    const online = AppState.drivers.filter(d => d.mode === 'free' || d.status === 'available').length;
    const pending = AppState.waitingOrders.length;
    const trips = AppState.orders.filter(o => o.status === 'onroute' || o.status === 'completed').length;
    const revenue = (trips * 4.5 + AppState.orders.length * 3.2).toFixed(0);

    setText('stat-online', online);
    setText('stat-pending', pending);
    setText('stat-trips', trips);
    setText('stat-revenue', `€${revenue}`);
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ═══ TOAST ═══
function showToast(type, title, message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
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
    setTimeout(() => generateIncomingCall(), 5000);
    AppState.callInterval = setInterval(() => {
        if (AppState.incomingCalls.length < 3) generateIncomingCall();
    }, 25000);
}

function generateIncomingCall() {
    const phones = ['+383 44 111 001', '+383 44 222 002', '+383 49 333 003', '+383 45 444 004', '+383 44 555 005'];
    const names = ['Klient i Ri', 'Ardit Krasniqi', 'Blerim Hoxha', 'Driton Berisha', 'Endrit Morina'];
    const addresses = ['Grand Hotel Prishtina', 'Newborn Monument', 'Rr. UÇK Dardani', 'Dardania', 'Albi Mall'];
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
    setTimeout(() => { call.ringing = false; renderIncomingCalls(); }, 5000);
}

// ═══ SIMULIM ORDERS ═══
function startOrderSimulation() {
    // Vetura lëvizin
    setInterval(() => {
        AppState.vehicleMarkers.forEach((marker, driverId) => {
            const driver = AppState.drivers.find(d => d.id === driverId);
            if (!driver || driver.mode === 'inactive') return;
            const pos = marker.getLatLng();
            const newLat = pos.lat + (Math.random() - 0.5) * 0.0015;
            const newLng = pos.lng + (Math.random() - 0.5) * 0.0015;
            marker.setLatLng([newLat, newLng]);
            driver.lat = newLat;
            driver.lng = newLng;
        });
    }, 4000);

    // Update waiting times
    setInterval(() => {
        if (AppState.waitingOrders.length > 0) renderWaitingOrders();
    }, 10000);

    // Ndryshimi i statuseve
    setInterval(() => {
        AppState.drivers.forEach(driver => {
            if (driver.mode === 'taximeter' || driver.mode === 'fixed') {
                if (Math.random() > 0.7) {
                    driver.mode = 'free';
                    driver.status = 'available';
                    updateVehicleMarker(driver.id);
                    updateStats();
                }
            } else if (driver.mode === 'free') {
                if (Math.random() > 0.85) {
                    driver.mode = Math.random() > 0.5 ? 'taximeter' : 'fixed';
                    driver.status = 'busy';
                    updateVehicleMarker(driver.id);
                    updateStats();
                }
            }
        });
    }, 15000);

    // Porosi të re në pritje
    setInterval(() => {
        if (AppState.waitingOrders.length < 5 && Math.random() > 0.5) {
            const phones = ['+383 44 666 777', '+383 45 888 999', '+383 49 111 222'];
            const pickups = ['Grand Hotel Prishtina', 'Newborn Monument', 'Rr. UÇK Dardani', 'Hotel Sirius', 'Albi Mall'];
            const dests = ['QKUK - Qendra Klinike Universitare', 'Aeroporti Ndërkombëtar i Prishtinës', 'Qendra Tregtare Kalabria', 'Arbëria', 'Sheshi Nënë Terezë'];

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

console.log('%c✅ TaxiDispatch Pro Ready', 'color:#a855f7;font-size:14px;font-weight:bold;');
