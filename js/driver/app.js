'use strict';

/**
 * js/driver/app.js — Logjika kryesore e AppShofer
 */

window.DriverApp = (() => {
    let currentDriver = null;
    let currentTab = 'orders';
    let currentStatus = 'inactive';
    let activeOrder = null;
    let queueOrders = [];
    let newOrderTimer = null;
    let newOrderCountdown = 30;
    let pendingOrder = null;
    let map = null;
    let orderUnsubscribe = null;
    let gpsWatchId = null;
    let activeOrderTimer = null;
    let activeOrderSeconds = 0;

    // ═══════════════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════════════
    function init() {
        console.log('🚗 DriverApp: Init...');

        // Init login
        if (window.DriverLogin) DriverLogin.init();

        // Init navigation
        if (window.DriverNavigation) DriverNavigation.init();

        // Init queue
        if (window.DriverQueue) DriverQueue.init();

        // Fshih loading
        setTimeout(() => {
            document.getElementById('loading-overlay')?.classList.add('hidden');
        }, 800);

        // Setup buttons
        setupButtons();
    }

    // ═══════════════════════════════════════════════════════
    // SETUP BUTTONS
    // ═══════════════════════════════════════════════════════
    function setupButtons() {
        // Status toggle
        document.getElementById('sb-toggle')?.addEventListener('click', () => openStatusModal());

        // Status options
        document.querySelectorAll('.status-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const status = btn.dataset.status;
                changeStatus(status);
                closeStatusModal();
            });
        });

        // Modal new order — accept/reject
        document.getElementById('btn-accept-order')?.addEventListener('click', acceptOrder);
        document.getElementById('btn-reject-order')?.addEventListener('click', rejectOrder);

        // Active order buttons
        document.getElementById('btn-navigate')?.addEventListener('click', () => {
            if (activeOrder && window.DriverNavigation) {
                DriverNavigation.openNavigation(activeOrder);
            }
        });

        document.getElementById('btn-arrived')?.addEventListener('click', markArrived);
        document.getElementById('btn-finish')?.addEventListener('click', finishOrder);
        document.getElementById('btn-cancel-order')?.addEventListener('click', cancelOrder);

        // Map FAB
        // (tashmë është handle nga switchTab)
    }

    // ═══════════════════════════════════════════════════════
    // KUR LOGIN ME SUKSES
    // ═══════════════════════════════════════════════════════
    function onLoginSuccess(driver) {
        currentDriver = driver;
        console.log('✅ Shoferi u ngarkua:', driver.name);

        // Update UI
        updateDriverUI(driver);

        // Switch screen
        showScreen('main');

        // Start GPS tracking
        startGPSTracking();

        // Load orders
        loadActiveOrders();

        // Listen për porosi të reja
        listenForNewOrders();

        // Set status free by default
        changeStatus('free');

        // Start clock
        startOrderClock();

        // Toast
        showToast('success', `Mirë se vjen, ${driver.name}!`);
    }

    // ═══════════════════════════════════════════════════════
    // UPDATE UI
    // ═══════════════════════════════════════════════════════
    function updateDriverUI(driver) {
        const avatar = (driver.name || 'S').slice(0, 2).toUpperCase();
        const vehicleNum = driver.vehicle_number || driver.vehicleNum || '—';

        document.getElementById('driver-avatar').textContent = avatar;
        document.getElementById('driver-name').textContent = driver.name || 'Shoferi';
        document.getElementById('driver-vehicle').textContent = `Vetura ${vehicleNum}`;
        document.getElementById('profile-avatar').textContent = avatar;
        document.getElementById('profile-name').textContent = driver.name || 'Shoferi';
        document.getElementById('profile-vehicle').textContent = `Vetura ${vehicleNum}`;
    }

    // ═══════════════════════════════════════════════════════
    // SHFAQ SCREEN
    // ═══════════════════════════════════════════════════════
    function showScreen(name) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(`screen-${name}`)?.classList.add('active');
    }

    // ═══════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════
    function openStatusModal() {
        document.getElementById('modal-status')?.classList.add('active');
    }

    function closeStatusModal() {
        document.getElementById('modal-status')?.classList.remove('active');
    }

    async function changeStatus(status) {
        if (!currentDriver) return;

        currentStatus = status;

        // Update UI
        const statusText = {
            free: 'Lirë',
            pause: 'Pauzë',
            inactive: 'Offline',
            busy: 'I zënë'
        };

        document.getElementById('driver-status-text').textContent = statusText[status] || status;
        document.getElementById('sb-title').textContent = `Statusi: ${statusText[status]}`;

        const sbIcon = document.getElementById('sb-icon');
        const sbSub = document.getElementById('sb-sub');
        const pill = document.getElementById('driver-status-pill');

        // Ngjyrat
        if (status === 'free') {
            sbIcon.style.background = 'linear-gradient(135deg,#22c55e,#16a34a)';
            sbSub.textContent = 'Duke pritur porosi...';
            pill.style.borderColor = '#22c55e';
        } else if (status === 'pause') {
            sbIcon.style.background = 'linear-gradient(135deg,#facc15,#eab308)';
            sbSub.textContent = 'Në pauzë';
            pill.style.borderColor = '#facc15';
        } else if (status === 'busy') {
            sbIcon.style.background = 'linear-gradient(135deg,#3b82f6,#1d4ed8)';
            sbSub.textContent = 'Me klient';
            pill.style.borderColor = '#3b82f6';
        } else {
            sbIcon.style.background = 'linear-gradient(135deg,#6b7280,#4b5563)';
            sbSub.textContent = 'Jashtë turnit';
            pill.style.borderColor = '#6b7280';
        }

        // Ruaj në Firestore
        try {
            await firebase.firestore().collection('drivers').doc(currentDriver.id).update({
                mode: status,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                online: status !== 'inactive'
            });
        } catch (e) {
            console.warn('Status update:', e);
        }
    }

    function toggleStatus() {
        openStatusModal();
    }

    // ═══════════════════════════════════════════════════════
    // TABS
    // ═══════════════════════════════════════════════════════
    function switchTab(tab) {
        currentTab = tab;

        document.querySelectorAll('.nav-item').forEach(i => {
            i.classList.toggle('active', i.dataset.tab === tab);
        });

        if (tab === 'map') {
            initMap();
        }
    }

    // ═══════════════════════════════════════════════════════
    // LISTEN PËR POROSI TË REJA
    // ═══════════════════════════════════════════════════════
    function listenForNewOrders() {
        if (!currentDriver) return;

        if (orderUnsubscribe) orderUnsubscribe();

        try {
            orderUnsubscribe = firebase.firestore().collection('orders')
                .where('driverId', '==', currentDriver.id)
                .where('status', '==', 'assigned')
                .onSnapshot(snap => {
                    snap.docChanges().forEach(change => {
                        if (change.type === 'added') {
                            const order = { id: change.doc.id, ...change.doc.data() };
                            showNewOrderModal(order);
                        }
                    });
                }, err => {
                    console.warn('Orders listener:', err.message);
                });
        } catch (e) {
            console.warn('Listener error:', e);
        }
    }

    // ═══════════════════════════════════════════════════════
    // MODAL POROSI E RE
    // ═══════════════════════════════════════════════════════
    function showNewOrderModal(order) {
        pendingOrder = order;

        // Plotëso
        document.getElementById('om-phone').textContent = order.phone || '—';
        document.getElementById('om-pickup').textContent = order.pickup || '—';
        document.getElementById('om-destination').textContent = order.destination || '—';

        if (order.remark) {
            document.getElementById('om-remark').style.display = 'flex';
            document.getElementById('om-remark-text').textContent = order.remark;
        } else {
            document.getElementById('om-remark').style.display = 'none';
        }

        // Shfaq modal
        document.getElementById('modal-new-order')?.classList.add('active');

        // Audio
        if (window.TaxiSound) TaxiSound.playRing?.();

        // Timer 30 sekonda
        newOrderCountdown = 30;
        document.getElementById('om-timer').textContent = newOrderCountdown;

        if (newOrderTimer) clearInterval(newOrderTimer);
        newOrderTimer = setInterval(() => {
            newOrderCountdown--;
            document.getElementById('om-timer').textContent = newOrderCountdown;

            if (newOrderCountdown <= 0) {
                clearInterval(newOrderTimer);
                newOrderTimer = null;
                rejectOrder();
            }
        }, 1000);
    }

    // ═══════════════════════════════════════════════════════
    // ACCEPT ORDER
    // ═══════════════════════════════════════════════════════
    async function acceptOrder() {
        if (!pendingOrder) return;

        if (newOrderTimer) {
            clearInterval(newOrderTimer);
            newOrderTimer = null;
        }

        try {
            await firebase.firestore().collection('orders').doc(pendingOrder.id).update({
                status: 'onroute',
                acceptedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            activeOrder = { ...pendingOrder, status: 'onroute' };
            pendingOrder = null;

            document.getElementById('modal-new-order')?.classList.remove('active');

            showActiveOrder(activeOrder);
            changeStatus('busy');
            startActiveOrderTimer();

            showToast('success', '✅ Porosia u pranua');

        } catch (e) {
            console.error('Accept order:', e);
            showToast('error', 'Gabim gjatë pranimit');
        }
    }

    // ═══════════════════════════════════════════════════════
    // REJECT ORDER
    // ═══════════════════════════════════════════════════════
    async function rejectOrder() {
        if (!pendingOrder) return;

        if (newOrderTimer) {
            clearInterval(newOrderTimer);
            newOrderTimer = null;
        }

        try {
            await firebase.firestore().collection('orders').doc(pendingOrder.id).update({
                driverId: null,
                driverName: null,
                status: 'waiting',
                rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
                rejectedBy: currentDriver.id
            });
        } catch (e) {
            console.warn('Reject order:', e);
        }

        pendingOrder = null;
        document.getElementById('modal-new-order')?.classList.remove('active');
        showToast('info', '❌ Porosia u refuzua');
    }

    // ═══════════════════════════════════════════════════════
    // SHOW ACTIVE ORDER
    // ═══════════════════════════════════════════════════════
    function showActiveOrder(order) {
        const el = document.getElementById('active-order');
        if (!el) return;

        el.style.display = 'block';

        document.getElementById('ao-phone').textContent = order.phone || '—';
        document.getElementById('ao-pickup').textContent = order.pickup || '—';
        document.getElementById('ao-destination').textContent = order.destination || '—';

        if (order.remark) {
            document.getElementById('ao-remark').style.display = 'flex';
            document.getElementById('ao-remark-text').textContent = order.remark;
        } else {
            document.getElementById('ao-remark').style.display = 'none';
        }

        // Butonat
        document.getElementById('btn-navigate').style.display = 'flex';
        document.getElementById('btn-arrived').style.display = 'flex';
        document.getElementById('btn-finish').style.display = 'none';

        if (order.status === 'onroute') {
            document.getElementById('ao-badge').textContent = 'NË RRUGË';
            document.getElementById('ao-badge').style.background = 'linear-gradient(135deg,#3b82f6,#1d4ed8)';
        } else if (order.status === 'arrived') {
            document.getElementById('ao-badge').textContent = 'ARRITUR';
            document.getElementById('ao-badge').style.background = 'linear-gradient(135deg,#facc15,#eab308)';
            document.getElementById('btn-arrived').style.display = 'none';
            document.getElementById('btn-finish').style.display = 'flex';
        } else if (order.status === 'taximeter') {
            document.getElementById('ao-badge').textContent = 'ME KLIENT';
            document.getElementById('ao-badge').style.background = 'linear-gradient(135deg,#22c55e,#16a34a)';
            document.getElementById('btn-navigate').style.display = 'none';
            document.getElementById('btn-arrived').style.display = 'none';
            document.getElementById('btn-finish').style.display = 'flex';
        }
    }

    // ═══════════════════════════════════════════════════════
    // MARK ARRIVED
    // ═══════════════════════════════════════════════════════
    async function markArrived() {
        if (!activeOrder) return;

        try {
            await firebase.firestore().collection('orders').doc(activeOrder.id).update({
                status: 'arrived',
                arrivedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            activeOrder.status = 'arrived';
            showActiveOrder(activeOrder);
            showToast('info', '📍 Ke arritur');
        } catch (e) {
            console.warn('Arrived:', e);
        }
    }

    // ═══════════════════════════════════════════════════════
    // FINISH ORDER
    // ═══════════════════════════════════════════════════════
    async function finishOrder() {
        if (!activeOrder) return;

        const priceStr = prompt('Çmimi final (€):', activeOrder.price || '5.00');
        if (priceStr === null) return;

        const price = parseFloat(priceStr);
        if (isNaN(price)) return;

        try {
            await firebase.firestore().collection('orders').doc(activeOrder.id).update({
                status: 'completed',
                price: price,
                completedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            activeOrder = null;
            document.getElementById('active-order').style.display = 'none';
            stopActiveOrderTimer();
            changeStatus('free');

            showToast('success', `✅ Përfunduar — €${price.toFixed(2)}`);
        } catch (e) {
            console.error('Finish:', e);
            showToast('error', 'Gabim');
        }
    }

    // ═══════════════════════════════════════════════════════
    // CANCEL ORDER
    // ═══════════════════════════════════════════════════════
    async function cancelOrder() {
        if (!activeOrder) return;
        if (!confirm('Anulo porosinë?')) return;

        try {
            await firebase.firestore().collection('orders').doc(activeOrder.id).update({
                status: 'cancelled',
                cancelReason: 'Anuluar nga shoferi',
                cancelledAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            activeOrder = null;
            document.getElementById('active-order').style.display = 'none';
            stopActiveOrderTimer();
            changeStatus('free');

            showToast('info', 'Porosia u anulua');
        } catch (e) {
            console.warn('Cancel:', e);
        }
    }

    // ═══════════════════════════════════════════════════════
    // TIMER POROSIE AKTIVE
    // ═══════════════════════════════════════════════════════
    function startActiveOrderTimer() {
        activeOrderSeconds = 0;
        if (activeOrderTimer) clearInterval(activeOrderTimer);
        activeOrderTimer = setInterval(() => {
            activeOrderSeconds++;
            const min = String(Math.floor(activeOrderSeconds / 60)).padStart(2, '0');
            const sec = String(activeOrderSeconds % 60).padStart(2, '0');
            document.getElementById('ao-time').textContent = `${min}:${sec}`;
        }, 1000);
    }

    function stopActiveOrderTimer() {
        if (activeOrderTimer) clearInterval(activeOrderTimer);
        activeOrderTimer = null;
        activeOrderSeconds = 0;
    }

    // ═══════════════════════════════════════════════════════
    // LOAD ACTIVE ORDERS
    // ═══════════════════════════════════════════════════════
    async function loadActiveOrders() {
        if (!currentDriver) return;

        try {
            // Gjej porosi aktive për këtë shofer
            const snap = await firebase.firestore().collection('orders')
                .where('driverId', '==', currentDriver.id)
                .where('status', 'in', ['assigned', 'onroute', 'arrived', 'taximeter', 'fixed'])
                .limit(1).get();

            if (!snap.empty) {
                const doc = snap.docs[0];
                activeOrder = { id: doc.id, ...doc.data() };
                showActiveOrder(activeOrder);
                changeStatus('busy');
                startActiveOrderTimer();
            }
        } catch (e) {
            console.warn('Load active:', e);
        }
    }

    // ═══════════════════════════════════════════════════════
    // GPS TRACKING
    // ═══════════════════════════════════════════════════════
    function startGPSTracking() {
        if (!navigator.geolocation) {
            console.warn('GPS nuk mbështetet');
            return;
        }

        gpsWatchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude, speed } = pos.coords;
                updateGPSOnServer(latitude, longitude, speed);
            },
            (err) => console.warn('GPS error:', err.message),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );
    }

    async function updateGPSOnServer(lat, lng, speed) {
        if (!currentDriver) return;

        try {
            await firebase.firestore().collection('drivers').doc(currentDriver.id).update({
                lat: lat,
                lng: lng,
                speed: speed || 0,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            // Nuk bëj asgjë — mund të dështojë nëse internet dobët
        }
    }

    // ═══════════════════════════════════════════════════════
    // MAP
    // ═══════════════════════════════════════════════════════
    function initMap() {
        const el = document.getElementById('driver-map');
        if (!el || !window.L) return;

        if (map) {
            setTimeout(() => map.invalidateSize(), 200);
            return;
        }

        map = L.map('driver-map', {
            center: [42.6629, 21.1655],
            zoom: 14,
            zoomControl: false
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd'
        }).addTo(map);

        setTimeout(() => map.invalidateSize(), 300);
    }

    function toggleMap() {
        switchTab('map');
    }

    // ═══════════════════════════════════════════════════════
    // CLOCK
    // ═══════════════════════════════════════════════════════
    function startOrderClock() {
        // Përditëso kohën çdo minutë për stats
        setInterval(() => {
            // Llogarit statistika ditore
            updateDailyStats();
        }, 60000);
    }

    async function updateDailyStats() {
        if (!currentDriver) return;

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const snap = await firebase.firestore().collection('orders')
                .where('driverId', '==', currentDriver.id)
                .where('status', '==', 'completed')
                .where('completedAt', '>=', today)
                .get();

            const orders = snap.docs.map(d => d.data());
            const earnings = orders.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);

            document.getElementById('ps-trips').textContent = orders.length;
            document.getElementById('ps-earnings').textContent = `€${earnings.toFixed(2)}`;

        } catch (e) {}
    }

    // ═══════════════════════════════════════════════════════
    // CHAT
    // ═══════════════════════════════════════════════════════
    function openChat() {
        switchTab('profile');
    }

    // ═══════════════════════════════════════════════════════
    // SOS
    // ═══════════════════════════════════════════════════════
    async function activateSOS() {
        if (!confirm('Aktivizo SOS? Zyra do të njoftohet menjëherë!')) return;
        if (!currentDriver) return;

        try {
            // Merr pozicionin
            navigator.geolocation.getCurrentPosition(async (pos) => {
                await firebase.firestore().collection('emergencies').add({
                    driverId: currentDriver.id,
                    driverName: currentDriver.name,
                    vehicleNum: currentDriver.vehicle_number,
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    type: 'sos',
                    status: 'active',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                showToast('warning', '🚨 SOS u dërgua!');
            }, () => {
                // Nëse GPS nuk punon, dërgo pa pozicion
                firebase.firestore().collection('emergencies').add({
                    driverId: currentDriver.id,
                    driverName: currentDriver.name,
                    type: 'sos',
                    status: 'active',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                showToast('warning', '🚨 SOS u dërgua!');
            });
        } catch (e) {
            console.error('SOS:', e);
        }
    }

    // ═══════════════════════════════════════════════════════
    // LOGOUT
    // ═══════════════════════════════════════════════════════
    async function logout() {
        if (!confirm('Dil nga llogaria?')) return;

        // Set offline
        if (currentDriver) {
            try {
                await firebase.firestore().collection('drivers').doc(currentDriver.id).update({
                    online: false,
                    mode: 'inactive'
                });
            } catch (e) {}
        }

        // Pastro
        if (gpsWatchId) navigator.geolocation.clearWatch(gpsWatchId);
        if (orderUnsubscribe) orderUnsubscribe();
        if (newOrderTimer) clearInterval(newOrderTimer);
        if (activeOrderTimer) clearInterval(activeOrderTimer);

        await firebase.auth().signOut();
        location.reload();
    }

    // ═══════════════════════════════════════════════════════
    // TOAST
    // ═══════════════════════════════════════════════════════
    function showToast(type, msg) {
        const c = document.getElementById('toast-container');
        if (!c) return;

        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#a855f7'
        };

        const t = document.createElement('div');
        t.style.cssText = `
            background:#1a0f30;
            border-left:4px solid ${colors[type] || colors.info};
            border-radius:10px;
            padding:12px 16px;
            margin-bottom:8px;
            font-size:13px;
            color:#f5f0ff;
            box-shadow:0 10px 30px rgba(0,0,0,.5);
            animation:slideIn .3s ease;
        `;
        t.textContent = msg;
        c.appendChild(t);

        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transform = 'translateY(-10px)';
            setTimeout(() => t.remove(), 300);
        }, 3500);
    }

    return {
        init,
        onLoginSuccess,
        switchTab,
        changeStatus,
        toggleStatus,
        openStatusModal,
        closeStatusModal,
        acceptOrder,
        rejectOrder,
        markArrived,
        finishOrder,
        cancelOrder,
        activateSOS,
        logout,
        openChat,
        toggleMap
    };
})();

console.log('✅ js/driver/app.js ngarkuar');
