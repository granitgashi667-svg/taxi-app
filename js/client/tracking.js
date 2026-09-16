'use strict';

/**
 * js/client/tracking.js — Tracking live i shoferit + vlerësim
 */

window.ClientTracking = (() => {
    let currentOrder = null;
    let unsubscribeOrder = null;
    let trackingMap = null;
    let driverMarker = null;
    let pickupMarker = null;
    let destMarker = null;
    let orderTimerInterval = null;
    let orderSeconds = 0;
    let selectedRating = 0;
    let completedOrderForRating = null;

    // ═══ INIT ═══
    function init() {
        console.log('📍 ClientTracking: Init...');

        // Rating stars
        document.querySelectorAll('#stars-container i').forEach(star => {
            star.addEventListener('click', () => {
                selectedRating = parseInt(star.dataset.star);
                updateStars(selectedRating);
            });
            star.addEventListener('mouseenter', () => {
                updateStars(parseInt(star.dataset.star));
            });
        });

        document.getElementById('stars-container')?.addEventListener('mouseleave', () => {
            updateStars(selectedRating);
        });

        // Dërgo vlerësimin
        document.getElementById('btn-submit-rating')?.addEventListener('click', submitRating);

        // Anulo porosinë
        document.getElementById('btn-cancel-ride')?.addEventListener('click', cancelOrder);

        console.log('✅ ClientTracking gati');
    }

    // ═══ FILLO TRACKING ═══
    async function startTracking(orderId, orderData) {
        console.log('📍 Duke filluar tracking për:', orderId);

        currentOrder = { id: orderId, ...orderData };

        // Shfaq tracking section
        switchToTrackingView();

        // Nis timer
        startOrderTimer();

        // Krijo hartën
        initTrackingMap();

        // Dëgjo ndryshimet
        subscribeToOrder(orderId);
    }

    // ═══ NDËRRO VIEW ═══
    function switchToTrackingView() {
        document.getElementById('order-section').style.display = 'none';
        document.getElementById('tracking-section').style.display = 'block';
        document.getElementById('rate-section').style.display = 'none';
    }

    function switchToOrderView() {
        document.getElementById('order-section').style.display = 'block';
        document.getElementById('tracking-section').style.display = 'none';
        document.getElementById('rate-section').style.display = 'none';
    }

    function switchToRateView() {
        document.getElementById('order-section').style.display = 'none';
        document.getElementById('tracking-section').style.display = 'none';
        document.getElementById('rate-section').style.display = 'block';
    }

    // ═══ TIMER ═══
    function startOrderTimer() {
        if (orderTimerInterval) clearInterval(orderTimerInterval);
        orderSeconds = 0;

        orderTimerInterval = setInterval(() => {
            orderSeconds++;
            const m = Math.floor(orderSeconds / 60);
            const s = orderSeconds % 60;
            const el = document.getElementById('th-time');
            if (el) el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }, 1000);
    }

    // ═══ HARTA ═══
    function initTrackingMap() {
        const el = document.getElementById('tracking-map');
        if (!el) return;

        // Fshij hartën e vjetër
        if (trackingMap) {
            trackingMap.remove();
            trackingMap = null;
        }

        // Krijo hartën e re
        trackingMap = L.map('tracking-map', {
            center: [42.6629, 21.1655],
            zoom: 13,
            zoomControl: false,
            attributionControl: false
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd'
        }).addTo(trackingMap);

        // Marker për pickup
        if (currentOrder?.pickup) {
            const addr = window.TaxiData?.addresses?.find(a => a.name === currentOrder.pickup);
            if (addr) {
                pickupMarker = L.marker([addr.lat, addr.lng], {
                    icon: L.divIcon({
                        className: 'custom-marker',
                        html: '<div style="background:#ec4899;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 12px #ec4899;"></div>',
                        iconSize: [16, 16],
                        iconAnchor: [8, 8]
                    })
                }).addTo(trackingMap);
            }
        }

        // Marker për destination
        if (currentOrder?.destination) {
            const addr = window.TaxiData?.addresses?.find(a => a.name === currentOrder.destination);
            if (addr) {
                destMarker = L.marker([addr.lat, addr.lng], {
                    icon: L.divIcon({
                        className: 'custom-marker',
                        html: '<div style="background:#22c55e;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 12px #22c55e;"></div>',
                        iconSize: [16, 16],
                        iconAnchor: [8, 8]
                    })
                }).addTo(trackingMap);
            }
        }

        setTimeout(() => trackingMap?.invalidateSize(), 200);
    }

    // ═══ DËGJO POROSINË ═══
    function subscribeToOrder(orderId) {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        if (unsubscribeOrder) unsubscribeOrder();

        unsubscribeOrder = db.collection('orders').doc(orderId)
            .onSnapshot((doc) => {
                if (!doc.exists) return;

                const order = { id: doc.id, ...doc.data() };
                handleOrderUpdate(order);
            }, (err) => {
                console.error('❌ Order listen error:', err);
            });
    }

    // ═══ UPDATE POROSI ═══
    function handleOrderUpdate(order) {
        const prevStatus = currentOrder?.status;
        currentOrder = { ...currentOrder, ...order };

        // Update statusi në UI
        updateTrackingStatus(order);

        // Update info të shoferit
        if (order.driverName) {
            document.getElementById('ti-vehicle').textContent = `🚗 Vetura ${order.vehicleNum || '—'}`;
            document.getElementById('ti-driver').textContent = order.driverName;
        }

        // Nëse ka driverId → shfaq driver në hartë
        if (order.driverId && !driverMarker) {
            addDriverMarker(order.driverId);
        }

        // Nëse ka ETA
        if (order.status === 'assigned' || order.status === 'onroute') {
            updateEta(order);
        }

        // Kontrollo statuset speciale
        if (order.status === 'arrived' && prevStatus !== 'arrived') {
            document.getElementById('th-status-text').textContent = '🚗 Shoferi arriti!';
            if (window.TaxiSound) {
                window.TaxiSound.playNotification();
                setTimeout(() => window.TaxiSound.playNotification(), 500);
            }
            showToast('success', '🚗 Shoferi arriti', `Vetura ${order.vehicleNum || ''} është duke ju pritur`);
        }

        if (order.status === 'taximeter' || order.status === 'fixed') {
            document.getElementById('th-status-text').textContent = '🛣️ Në udhëtim...';
        }

        if (order.status === 'completed') {
            onOrderCompleted(order);
        }

        if (order.status === 'cancelled') {
            onOrderCancelled(order);
        }
    }

    // ═══ UPDATE STATUS UI ═══
    function updateTrackingStatus(order) {
        const statusText = document.getElementById('th-status-text');
        const statusEl = document.getElementById('th-status');

        const statuses = {
            waiting: { text: '⏳ Duke kërkuar shofer...', color: '#f59e0b' },
            assigned: { text: '🚗 Shoferi u caktua!', color: '#ec4899' },
            onroute: { text: '🛣️ Shoferi në rrugë...', color: '#3b82f6' },
            arrived: { text: '🚗 Shoferi arriti!', color: '#facc15' },
            taximeter: { text: '🛣️ Në udhëtim...', color: '#3b82f6' },
            fixed: { text: '🛣️ Në udhëtim...', color: '#ef4444' },
            completed: { text: '✅ Përfundoi!', color: '#22c55e' }
        };

        const st = statuses[order.status] || statuses.waiting;
        if (statusText) statusText.textContent = st.text;

        // Ndrysho ngjyrën e pulse
        const pulse = document.querySelector('.th-pulse');
        if (pulse) {
            pulse.style.background = st.color;
            pulse.style.boxShadow = `0 0 10px ${st.color}`;
        }
    }

    // ═══ SHT0 MARKER TË SHOFRIT ═══
    function addDriverMarker(driverId) {
        const db = window.TaxiFirebase?.db;
        if (!db || !trackingMap) return;

        // Dëgjo pozicionin e shoferit
        db.collection('drivers').doc(driverId)
            .onSnapshot((doc) => {
                if (!doc.exists) return;
                const driver = doc.data();
                if (!driver.lat || !driver.lng) return;

                const icon = L.divIcon({
                    className: 'driver-marker',
                    html: `<div class="driver-marker-inner">🚗</div>`,
                    iconSize: [40, 40],
                    iconAnchor: [20, 20]
                });

                if (driverMarker) {
                    driverMarker.setLatLng([driver.lat, driver.lng]);
                } else {
                    driverMarker = L.marker([driver.lat, driver.lng], { icon }).addTo(trackingMap);
                }

                // Përshtat pamjen
                fitBounds();
            });
    }

    // ═══ PËRSHTAT PAMJEN ═══
    function fitBounds() {
        if (!trackingMap) return;
        const points = [];
        if (driverMarker) points.push(driverMarker.getLatLng());
        if (pickupMarker) points.push(pickupMarker.getLatLng());
        if (destMarker) points.push(destMarker.getLatLng());

        if (points.length > 1) {
            trackingMap.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
        } else if (points.length === 1) {
            trackingMap.setView(points[0], 15);
        }
    }

    // ═══ UPDATE ETA ═══
    async function updateEta(order) {
        if (!window.TaxiMaps?.getEtaForOrder) return;

        try {
            const eta = await window.TaxiMaps.getEtaForOrder(order);
            if (!eta) return;

            const trafficIcon = eta.hasTraffic
                ? (eta.trafficDelay > 120 ? '🔴' : eta.trafficDelay > 60 ? '🟡' : '🟢')
                : '⚪';

            const el = document.getElementById('ti-eta');
            if (el) el.textContent = `${trafficIcon} ${eta.etaMinutes}min · ${eta.distanceKm}km`;
        } catch (e) {
            console.warn('ETA error:', e);
        }
    }

    // ═══ POROSIA PËRFUNDOI ═══
    function onOrderCompleted(order) {
        console.log('✅ Porosia përfundoi');

        if (orderTimerInterval) clearInterval(orderTimerInterval);
        if (unsubscribeOrder) unsubscribeOrder();

        completedOrderForRating = order;
        currentOrder = null;

        // Nëse është anuluar → kthim
        if (!order.price || parseFloat(order.price) <= 0) {
            showToast('info', '✅ Udhëtimi përfundoi', 'Faleminderit!');
            switchToOrderView();
            return;
        }

        // Shfaq ekranin e vlerësimit
        setTimeout(() => {
            document.getElementById('rate-price').textContent = `€${parseFloat(order.price).toFixed(2)}`;
            document.getElementById('rate-driver').textContent = order.driverName || '—';
            selectedRating = 0;
            updateStars(0);
            document.getElementById('rate-comment').value = '';
            switchToRateView();
        }, 1500);
    }

    // ═══ POROSIA U ANULUA ═══
    function onOrderCancelled(order) {
        console.log('❌ Porosia u anulua');

        if (orderTimerInterval) clearInterval(orderTimerInterval);
        if (unsubscribeOrder) unsubscribeOrder();

        currentOrder = null;

        showToast('error', '❌ Anuluar', 'Porosia u anulua');

        setTimeout(() => {
            switchToOrderView();
        }, 1500);
    }

    // ═══ VLERËSIMI — STAR ═══
    function updateStars(count) {
        document.querySelectorAll('#stars-container i').forEach((star, idx) => {
            star.classList.toggle('active', idx < count);
        });
    }

    // ═══ DËRGO VLERËSIMIN ═══
    async function submitRating() {
        if (selectedRating === 0) {
            showToast('warning', 'Vlerëso', 'Zgjidh 1-5 yje');
            return;
        }

        if (!completedOrderForRating) {
            showToast('error', 'Gabim', 'Nuk ka porosi për të vlerësuar');
            return;
        }

        const comment = document.getElementById('rate-comment')?.value.trim() || '';

        try {
            const btn = document.getElementById('btn-submit-rating');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>DUKE DËRGUAR...</span>';

            const db = window.TaxiFirebase?.db;
            if (!db) throw new Error('Firebase nuk është gati');

            // Ruaj vlerësimin
            await db.collection('ratings').add({
                orderId: completedOrderForRating.id,
                clientId: window.ClientApp?.currentClient?.id || null,
                clientName: window.ClientApp?.currentClient?.name || '',
                driverId: completedOrderForRating.driverId,
                driverName: completedOrderForRating.driverName || '',
                rating: selectedRating,
                comment: comment,
                createdAt: Date.now(),
                createdAtStr: new Date().toLocaleString('sq-AL')
            });

            // Përditëso vlerësimin mesatar të shoferit
            if (completedOrderForRating.driverId) {
                await updateDriverRating(completedOrderForRating.driverId);
            }

            showToast('success', '🙏 Faleminderit!', `Vlerësimi: ${selectedRating} yje`);

            // Reset
            completedOrderForRating = null;
            selectedRating = 0;

            // Kthehu në home
            setTimeout(() => switchToOrderView(), 1000);

        } catch (e) {
            console.error('❌ submitRating:', e);
            showToast('error', 'Gabim', 'Nuk mund të dërgohet vlerësimi');
        } finally {
            const btn = document.getElementById('btn-submit-rating');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i><span>DËRGO VLERËSIMIN</span>';
            }
        }
    }

    // ═══ PËRDITËSO VLERËSIMIN E SHOFRIT ═══
    async function updateDriverRating(driverId) {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        try {
            const snap = await db.collection('ratings').where('driverId', '==', driverId).get();
            if (snap.empty) return;

            let total = 0;
            snap.forEach(doc => total += doc.data().rating || 0);
            const avg = total / snap.size;

            await db.collection('drivers').doc(driverId).update({
                rating: +avg.toFixed(2),
                totalRatings: snap.size
            });

            console.log(`⭐ Vlerësimi i shoferit u përditësua: ${avg.toFixed(2)}`);
        } catch (e) {
            console.warn('updateDriverRating:', e);
        }
    }

    // ═══ ANULO POROSINË ═══
    async function cancelOrder() {
        if (!currentOrder) return;
        if (!confirm('A jeni i sigurt që dëshironi të ANULONI porosinë?')) return;

        try {
            const db = window.TaxiFirebase?.db;
            if (!db) return;

            await db.collection('orders').doc(currentOrder.id).update({
                status: 'cancelled',
                cancelledAt: Date.now(),
                cancelledBy: 'client',
                cancelledByClientId: window.ClientApp?.currentClient?.id || null
            });

            showToast('info', '❌ Anuluar', 'Porosia u anulua');

            if (window.TaxiAuditLog) {
                window.TaxiAuditLog.log('client_cancelled_order', { orderId: currentOrder.id });
            }

        } catch (e) {
            console.error('❌ cancelOrder:', e);
            showToast('error', 'Gabim', 'Nuk mund të anulohet');
        }
    }

    // ═══ KONTROLLO STATUS ═══
    function hasActiveOrder() {
        return currentOrder !== null && currentOrder.status !== 'completed' && currentOrder.status !== 'cancelled';
    }

    function hasCompletedOrder() {
        return completedOrderForRating !== null;
    }

    // ═══ NDAJ ═══
    function stop() {
        if (unsubscribeOrder) {
            unsubscribeOrder();
            unsubscribeOrder = null;
        }
        if (orderTimerInterval) {
            clearInterval(orderTimerInterval);
            orderTimerInterval = null;
        }
        if (trackingMap) {
            trackingMap.remove();
            trackingMap = null;
        }
        driverMarker = null;
        pickupMarker = null;
        destMarker = null;
        currentOrder = null;
    }

    return {
        init, stop,
        startTracking, cancelOrder, submitRating,
        hasActiveOrder, hasCompletedOrder,
        updateStars
    };
})();

console.log('✅ client/tracking.js ngarkuar');
