'use strict';

/**
 * js/driver/app.js — Logjika kryesore e App-it të Shoferit
 */

window.DriverApp = (() => {
    let currentDriver = null;
    let currentOrder = null;
    let unsubscribeOrders = null;
    let orderTimerInterval = null;
    let activeTimeInterval = null;
    let activeSeconds = 0;
    let currentTab = 'orders';

    // ═══ INIT ═══
    async function init() {
        console.log('🚗 Driver App: Init...');

        // Init modulet
        if (window.TaxiLocale) window.TaxiLocale.init();
        if (window.TaxiOffline) window.TaxiOffline.init();
        if (window.TaxiSound) window.TaxiSound.init();

        // Firebase
        if (window.TaxiFirebase) window.TaxiFirebase.init();

        // DriverLogin init
        if (window.DriverLogin) window.DriverLogin.init();

        // Kontrollo sesion ekzistues
        const existing = await window.DriverLogin?.checkExistingSession();
        if (existing) {
            console.log('✅ Sesion ekzistues:', existing.name);
            onLoginSuccess(existing);
        } else {
            showScreen('login');
        }

        // Fshij loading
        setTimeout(() => {
            document.getElementById('loading-overlay')?.classList.add('hidden');
        }, 600);

        // Event listeners
        setupEventListeners();
    }

    // ═══ SETUP EVENT LISTENERS ═══
    function setupEventListeners() {
        // Status toggle
        document.getElementById('sb-toggle')?.addEventListener('click', openStatusModal);

        // Status options
        document.querySelectorAll('.status-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const status = btn.dataset.status;
                changeStatus(status);
            });
        });

        // Modal buttons
        document.getElementById('btn-accept-order')?.addEventListener('click', acceptNewOrder);
        document.getElementById('btn-reject-order')?.addEventListener('click', rejectNewOrder);
        document.getElementById('btn-navigate')?.addEventListener('click', navigateToPickup);
        document.getElementById('btn-arrived')?.addEventListener('click', markArrived);
        document.getElementById('btn-finish')?.addEventListener('click', finishTrip);
        document.getElementById('btn-cancel-order')?.addEventListener('click', cancelActiveOrder);
    }

    // ═══ KUR LOGIN ME SUKSES ═══
    function onLoginSuccess(driver) {
        currentDriver = driver;

        // Update UI
        updateDriverUI(driver);

        // Switch screen
        showScreen('main');

        // Load stats
        loadDriverStats(driver);

        // Dëgjo porositë
        subscribeToOrders(driver);

        // Nis tracking
        startActiveTracking();

        // Nis heartbeat
        startHeartbeat(driver);

        // Sound
        if (window.TaxiSound) window.TaxiSound.activate();

        // Toast
        showToast('success', '👋 Mirë se vjen', driver.name);
    }

    // ═══ UPDATE UI ═══
    function updateDriverUI(driver) {
        document.getElementById('driver-avatar').textContent = driver.avatar || driver.name.slice(0, 2).toUpperCase();
        document.getElementById('driver-name').textContent = driver.name;
        document.getElementById('driver-vehicle').textContent = `🚗 Vetura ${String(driver.vehicleId || 0).padStart(2, '0')}`;
        updateStatusPill(driver.mode || 'free');
    }

    // ═══ UPDATE STATUS PILL ═══
    function updateStatusPill(mode) {
        const pill = document.getElementById('driver-status-pill');
        const text = document.getElementById('driver-status-text');
        const banner = document.getElementById('status-banner');
        const sbTitle = document.getElementById('sb-title');
        const sbSub = document.getElementById('sb-sub');
        const sbIcon = document.getElementById('sb-icon');

        const labels = {
            free: { pill: 'Lirë', title: 'Statusi: Lirë', sub: 'Duke pritur porosi...', icon: 'fa-car' },
            busy: { pill: 'Në udhëtim', title: 'Në udhëtim', sub: 'Me klient', icon: 'fa-route' },
            pause: { pill: 'Pauzë', title: 'Statusi: Pauzë', sub: 'Pushim i shkurtër', icon: 'fa-pause' },
            inactive: { pill: 'Offline', title: 'Statusi: Offline', sub: 'Jashtë turnit', icon: 'fa-power-off' }
        };

        const lbl = labels[mode] || labels.free;
        text.textContent = lbl.pill;
        sbTitle.textContent = lbl.title;
        sbSub.textContent = lbl.sub;
        sbIcon.innerHTML = `<i class="fa-solid ${lbl.icon}"></i>`;

        if (pill) {
            pill.classList.remove('pause', 'inactive', 'busy');
            if (mode === 'pause') pill.classList.add('pause');
            if (mode === 'inactive') pill.classList.add('inactive');
            if (mode === 'busy') pill.classList.add('busy');
        }

        if (banner) {
            banner.classList.remove('pause', 'inactive', 'busy');
            if (mode === 'pause') banner.classList.add('pause');
            if (mode === 'inactive') banner.classList.add('inactive');
            if (mode === 'busy') banner.classList.add('busy');
        }
    }

    // ═══ SHFAQ STATUS MODAL ═══
    function openStatusModal() {
        document.getElementById('modal-status')?.classList.add('active');
    }

    function closeStatusModal() {
        document.getElementById('modal-status')?.classList.remove('active');
    }

    // ═══ NDRYSHO STATUS ═══
    async function changeStatus(status) {
        if (!currentDriver) return;

        closeStatusModal();

        try {
            // Update në Firestore
            if (window.TaxiDrivers) {
                await window.TaxiDrivers.setMode(currentDriver.id, status);
            }

            currentDriver.mode = status;
            updateStatusPill(status);

            showToast('success', '✅ Statusi', 'U ndryshua në ' + status);

            // Audit
            if (window.TaxiAuditLog) {
                window.TaxiAuditLog.log('driver_status_change', { driverId: currentDriver.id, status });
            }
        } catch (e) {
            console.error('❌ changeStatus:', e);
            showToast('error', 'Gabim', 'Nuk mund të ndryshohet statusi');
        }
    }

    // ═══ DËGJO POROSITË NË FIRESTORE ═══
    function subscribeToOrders(driver) {
        if (unsubscribeOrders) unsubscribeOrders();

        const db = window.TaxiFirebase?.db;
        if (!db) return;

        console.log('🔔 Duke dëgjuar porositë për shoferin:', driver.name);

        unsubscribeOrders = db.collection('orders')
            .where('driverId', '==', driver.id)
            .onSnapshot((snap) => {
                snap.docChanges().forEach(change => {
                    const data = { id: change.doc.id, ...change.doc.data() };

                    if (change.type === 'added') {
                        console.log('📥 Porosi e re:', data);
                        // Nëse është "waiting" dhe e caktuar për mua → shfaq modal
                        if (data.status === 'assigned') {
                            showNewOrderModal(data);
                        }
                    }

                    if (change.type === 'modified') {
                        console.log('✏️ Porosi u ndryshua:', data.status);
                        handleOrderUpdate(data);
                    }

                    if (change.type === 'removed') {
                        console.log('🗑️ Porosi u fshi');
                    }
                });
            }, (err) => {
                console.error('❌ Firestore listen error:', err);
            });
    }

    // ═══ POROSI E RE — MODAL ═══
    let pendingOrder = null;
    let pendingTimer = null;

    function showNewOrderModal(order) {
        pendingOrder = order;

        document.getElementById('om-phone').textContent = order.phone;
        document.getElementById('om-pickup').textContent = order.pickup;
        document.getElementById('om-destination').textContent = order.destination || '—';

        if (order.remark) {
            document.getElementById('om-remark').style.display = 'flex';
            document.getElementById('om-remark-text').textContent = order.remark;
        } else {
            document.getElementById('om-remark').style.display = 'none';
        }

        document.getElementById('modal-new-order').classList.add('active');

        // Nis timer 30 sek
        let remaining = 30;
        document.getElementById('om-timer').textContent = remaining;

        if (pendingTimer) clearInterval(pendingTimer);
        pendingTimer = setInterval(() => {
            remaining--;
            document.getElementById('om-timer').textContent = remaining;

            if (remaining <= 0) {
                clearInterval(pendingTimer);
                rejectNewOrder();
            }
        }, 1000);

        // Luaj tingull
        if (window.TaxiSound) {
            window.TaxiSound.playNotification();
            setTimeout(() => window.TaxiSound.playNotification(), 500);
        }
    }

    // ═══ PRANO POROSINË ═══
    async function acceptNewOrder() {
        if (!pendingOrder) return;

        if (pendingTimer) clearInterval(pendingTimer);
        document.getElementById('modal-new-order').classList.remove('active');

        currentOrder = pendingOrder;
        pendingOrder = null;

        // Update status
        await changeStatus('busy');

        // Shfaq kartën aktive
        showActiveOrder(currentOrder);

        // Toast
        showToast('success', '✅ Prano', 'Porosia u pranua. Shko te klienti.');

        // Audit
        if (window.TaxiAuditLog) {
            window.TaxiAuditLog.log('driver_accepted_order', { orderId: currentOrder.id });
        }
    }

    // ═══ REFUZO POROSINË ═══
    async function rejectNewOrder() {
        if (!pendingOrder) return;

        if (pendingTimer) clearInterval(pendingTimer);
        document.getElementById('modal-new-order').classList.remove('active');

        const order = pendingOrder;
        pendingOrder = null;

        // Update në Firestore — kthe në waiting
        try {
            const db = window.TaxiFirebase?.db;
            if (db) {
                await db.collection('orders').doc(order.id).update({
                    status: 'waiting',
                    driverId: null,
                    driverName: null,
                    vehicleNum: null,
                    vehicleId: null,
                    rejectedBy: currentDriver.id,
                    rejectedAt: Date.now()
                });
            }
        } catch (e) {
            console.error('❌ Reject error:', e);
        }

        showToast('info', '❌ Refuzuar', 'Porosia u refuzua');

        if (window.TaxiAuditLog) {
            window.TaxiAuditLog.log('driver_rejected_order', { orderId: order.id });
        }
    }

    // ═══ SHFAQ POROSINË AKTIVE ═══
    function showActiveOrder(order) {
        const ao = document.getElementById('active-order');
        if (!ao) return;

        ao.style.display = 'block';

        document.getElementById('ao-phone').textContent = order.phone;
        document.getElementById('ao-pickup').textContent = order.pickup;
        document.getElementById('ao-destination').textContent = order.destination || '—';

        if (order.remark) {
            document.getElementById('ao-remark').style.display = 'flex';
            document.getElementById('ao-remark-text').textContent = order.remark;
        } else {
            document.getElementById('ao-remark').style.display = 'none';
        }

        // Butonat sipas statusit
        const btnNavigate = document.getElementById('btn-navigate');
        const btnArrived = document.getElementById('btn-arrived');
        const btnFinish = document.getElementById('btn-finish');

        if (order.status === 'assigned' || order.status === 'onroute') {
            btnNavigate.style.display = 'flex';
            btnArrived.style.display = 'flex';
            btnFinish.style.display = 'none';
        } else if (order.status === 'arrived') {
            btnNavigate.style.display = 'flex';
            btnArrived.style.display = 'none';
            btnFinish.style.display = 'flex';
        } else if (order.status === 'taximeter' || order.status === 'fixed') {
            btnNavigate.style.display = 'none';
            btnArrived.style.display = 'none';
            btnFinish.style.display = 'flex';
        }

        // Nis timer
        startOrderTimer();
    }

    // ═══ TIMER I POROSISË ═══
    function startOrderTimer() {
        if (orderTimerInterval) clearInterval(orderTimerInterval);

        let seconds = 0;
        orderTimerInterval = setInterval(() => {
            seconds++;
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            const el = document.getElementById('ao-time');
            if (el) el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }, 1000);
    }

    // ═══ UPDATE POROSI ═══
    function handleOrderUpdate(order) {
        if (!currentOrder || currentOrder.id !== order.id) {
            // Nëse është porosi e re e caktuar për mua
            if (order.status === 'assigned' && !currentOrder) {
                currentOrder = order;
                showActiveOrder(order);
            }
            return;
        }

        // Update statusin
        currentOrder = order;
        showActiveOrder(order);
    }

    // ═══ NAVIGO ═══
    function navigateToPickup() {
        if (!currentOrder) return;

        const addr = window.TaxiData?.addresses?.find(a => a.name === currentOrder.pickup);
        if (!addr) {
            showToast('warning', '⚠️ Adresa', 'Koordinatat nuk u gjetën');
            // Provo me Google Maps direkt
            const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(currentOrder.pickup)}`;
            window.open(url, '_blank');
            return;
        }

        const url = `https://www.google.com/maps/dir/?api=1&destination=${addr.lat},${addr.lng}`;
        window.open(url, '_blank');

        showToast('info', '🗺️ Navigim', 'Google Maps u hap');

        if (window.TaxiAuditLog) {
            window.TaxiAuditLog.log('driver_navigate', { orderId: currentOrder.id });
        }
    }

    // ═══ KËTU JAM ═══
    async function markArrived() {
        if (!currentOrder) return;

        try {
            const db = window.TaxiFirebase?.db;
            if (db) {
                await db.collection('orders').doc(currentOrder.id).update({
                    status: 'arrived',
                    arrivedAt: Date.now(),
                    arrivedAtStr: new Date().toLocaleTimeString('sq-AL')
                });
            }

            currentOrder.status = 'arrived';
            showActiveOrder(currentOrder);
            showToast('success', '📍 Këtu jam', 'Statusi u përditësua');

            // Dërgo SMS #2
            if (window.TaxiSms) {
                await window.TaxiSms.sendArrived(currentOrder);
            }
        } catch (e) {
            console.error('❌ markArrived:', e);
            showToast('error', 'Gabim', 'Nuk mund të përditësohet');
        }
    }

    // ═══ PËRFUNDO UDHËTIMIN ═══
    async function finishTrip() {
        if (!currentOrder) return;

        // Pyet çmimin final
        const priceStr = prompt('Çmimi final (€):', currentOrder.price || currentOrder.tariff === 'airport' ? '15' : '4.50');
        if (priceStr === null) return;

        const price = parseFloat(priceStr);
        if (isNaN(price) || price < 0) {
            showToast('error', 'Gabim', 'Çmimi nuk është valid');
            return;
        }

        try {
            const db = window.TaxiFirebase?.db;
            if (db) {
                await db.collection('orders').doc(currentOrder.id).update({
                    status: 'completed',
                    price: price,
                    completedAt: Date.now(),
                    completedAtStr: new Date().toLocaleString('sq-AL')
                });
            }

            if (orderTimerInterval) clearInterval(orderTimerInterval);

            // Fshij kartën
            document.getElementById('active-order').style.display = 'none';

            // Update status
            await changeStatus('free');

            // Njofto zyrën
            if (window.TaxiEvents) {
                window.TaxiEvents.emit('order:completed', { orderId: currentOrder.id, price });
            }

            currentOrder = null;

            showToast('success', '✅ Përfundoi', `€${price.toFixed(2)} u regjistrua`);

            if (window.TaxiAuditLog) {
                window.TaxiAuditLog.log('driver_completed_order', { price });
            }
        } catch (e) {
            console.error('❌ finishTrip:', e);
            showToast('error', 'Gabim', 'Nuk mund të përfundohet');
        }
    }

    // ═══ ANULO POROSINË ═══
    async function cancelActiveOrder() {
        if (!currentOrder) return;
        if (!confirm('A jeni i sigurt që dëshironi të anuloni porosinë?')) return;

        try {
            const db = window.TaxiFirebase?.db;
            if (db) {
                await db.collection('orders').doc(currentOrder.id).update({
                    status: 'waiting',
                    driverId: null,
                    driverName: null,
                    vehicleNum: null,
                    vehicleId: null,
                    cancelledBy: currentDriver.id,
                    cancelledAt: Date.now()
                });
            }

            if (orderTimerInterval) clearInterval(orderTimerInterval);
            document.getElementById('active-order').style.display = 'none';

            await changeStatus('free');

            showToast('info', '❌ Anuluar', 'Porosia u anulua');

            currentOrder = null;
        } catch (e) {
            console.error('❌ cancelOrder:', e);
        }
    }

    // ═══ TELEFONO KLIENTIN ═══
    function callClient() {
        if (!currentOrder) return;
        window.location.href = `tel:${currentOrder.phone}`;
    }

    // ═══ SWITCH TAB ═══
    function switchTab(tab) {
        currentTab = tab;

        document.querySelectorAll('.nav-item').forEach(i => {
            i.classList.toggle('active', i.dataset.tab === tab);
        });

        const queueSection = document.getElementById('queue-section');
        if (queueSection) {
            queueSection.style.display = tab === 'orders' ? 'block' : 'none';
        }

        showToast('info', '📱 ' + tab, '');
    }

    // ═══ TOGGLE MAP ═══
    function toggleMap() {
        showToast('info', '🗺️ Harta', 'Google Maps');
        if (currentOrder) {
            const addr = window.TaxiData?.addresses?.find(a => a.name === currentOrder.pickup);
            if (addr) {
                window.open(`https://www.google.com/maps?q=${addr.lat},${addr.lng}`, '_blank');
            }
        }
    }

    // ═══ TRACKING (dërgim GPS në Firestore) ═══
    function startActiveTracking() {
        if (activeTimeInterval) clearInterval(activeTimeInterval);

        activeTimeInterval = setInterval(async () => {
            if (!currentDriver || !navigator.geolocation) return;

            navigator.geolocation.getCurrentPosition(async (pos) => {
                const { latitude, longitude } = pos.coords;

                const db = window.TaxiFirebase?.db;
                if (db) {
                    try {
                        await db.collection('drivers').doc(currentDriver.id).update({
                            lat: latitude,
                            lng: longitude,
                            lastSeen: Date.now()
                        });
                    } catch (e) { /* silent */ }
                }
            }, () => {}, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 30000
            });
        }, 15000); // Çdo 15 sek

        console.log('📍 GPS tracking aktivizuar');
    }

    // ═══ HEARTBEAT (regjistro kohën aktive) ═══
    function startHeartbeat(driver) {
        activeSeconds = 0;
        setInterval(() => {
            activeSeconds++;
            // Çdo 60 sek, ruaj në Firestore
            if (activeSeconds % 60 === 0) {
                const db = window.TaxiFirebase?.db;
                if (db) {
                    db.collection('drivers').doc(driver.id).update({
                        activeMinutes: firebase.firestore.FieldValue.increment(1),
                        lastHeartbeat: Date.now()
                    }).catch(() => {});
                }
            }
        }, 1000);
    }

    // ═══ LOAD DRIVER STATS ═══
    async function loadDriverStats(driver) {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        try {
            const ordersSnap = await db.collection('orders')
                .where('driverId', '==', driver.id)
                .where('status', '==', 'completed')
                .get();

            const completed = ordersSnap.size;
            const revenue = ordersSnap.docs.reduce((s, d) => s + (parseFloat(d.data().price) || 0), 0);

            // Ruaj në state për statistikat
            if (window.TaxiState) {
                window.TaxiState.set('driverStats', {
                    completed,
                    revenue: +revenue.toFixed(2),
                    avgPrice: completed > 0 ? +(revenue / completed).toFixed(2) : 0
                });
            }
        } catch (e) {
            console.warn('Stats load:', e);
        }
    }

    // ═══ SHFAQ SCREEN ═══
    function showScreen(name) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(`screen-${name}`)?.classList.add('active');
    }

    // ═══ LOGOUT ═══
    async function logout() {
        if (!confirm('A jeni i sigurt që dëshironi të dilni?')) return;

        try {
            await firebase.auth().signOut();
            window.TaxiStorage?.remove('taxi.driver');
            if (unsubscribeOrders) unsubscribeOrders();
            if (orderTimerInterval) clearInterval(orderTimerInterval);
            if (activeTimeInterval) clearInterval(activeTimeInterval);

            location.reload();
        } catch (e) {
            console.error('Logout error:', e);
        }
    }

    // ═══ TOAST ═══
    function showToast(type, title, msg) {
        const c = document.getElementById('toast-container');
        if (!c) return;
        const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><div class="toast-content"><div class="toast-title">${title}</div><div class="toast-message">${msg || ''}</div></div>`;
        c.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(-20px)'; setTimeout(() => t.remove(), 300); }, 3500);
        if (window.TaxiSound) {
            if (type === 'success') window.TaxiSound.playSuccess();
            else if (type === 'error') window.TaxiSound.playError();
        }
    }

    return {
        init, onLoginSuccess, logout,
        changeStatus, openStatusModal, closeStatusModal,
        acceptNewOrder, rejectNewOrder,
        navigateToPickup, markArrived, finishTrip, cancelActiveOrder, callClient,
        switchTab, toggleMap, showToast,
        get currentDriver() { return currentDriver; },
        get currentOrder() { return currentOrder; }
    };
})();

console.log('✅ driver/app.js ngarkuar');
