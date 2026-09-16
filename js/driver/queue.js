'use strict';

/**
 * js/driver/queue.js — Radha e porosive në pritje për shoferin
 * Shfaq të gjitha porositë "waiting" që nuk kanë shofer
 */

window.DriverQueue = (() => {
    let unsubscribeQueue = null;
    let queueOrders = [];
    let refreshInterval = null;

    // ═══ INIT ═══
    function init() {
        console.log('📋 DriverQueue: Init...');
        subscribeToQueue();
        startAutoRefresh();
    }

    // ═══ DËGJO POROSITË NË PRITJE ═══
    function subscribeToQueue() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        if (unsubscribeQueue) unsubscribeQueue();

        console.log('🔔 Duke dëgjuar porositë në pritje...');

        // Filtro: status = waiting, pa driverId
        unsubscribeQueue = db.collection('orders')
            .where('status', '==', 'waiting')
            .orderBy('createdAtLocal', 'desc')
            .limit(30)
            .onSnapshot((snap) => {
                queueOrders = snap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(o => !o.driverId);

                renderQueue();
                console.log('📋 Porosi në pritje:', queueOrders.length);
            }, (err) => {
                console.error('❌ Queue listen error:', err);
            });
    }

    // ═══ RENDER RADHA ═══
    function renderQueue() {
        const list = document.getElementById('queue-list');
        const count = document.getElementById('queue-count');
        if (!list) return;

        if (count) count.textContent = queueOrders.length;

        if (!queueOrders.length) {
            list.innerHTML = `
                <div class="queue-empty">
                    <i class="fa-solid fa-inbox"></i>
                    <p>Nuk ka porosi në pritje</p>
                </div>
            `;
            return;
        }

        list.innerHTML = queueOrders.map(o => {
            const waitMin = Math.floor((Date.now() - (o.createdAtLocal || Date.now())) / 60000);
            const waitClass = waitMin < 1 ? 'fresh' : waitMin < 3 ? 'medium' : 'old';
            const borderColor = waitMin < 1 ? '#22c55e' : waitMin < 3 ? '#f59e0b' : '#f43f5e';

            return `
                <div class="queue-item" style="border-left-color:${borderColor};" onclick="DriverQueue.previewOrder('${o.id}')">
                    <div class="qi-header">
                        <span class="qi-phone">${o.phone}</span>
                        <span class="qi-time">${waitMin}min</span>
                    </div>
                    <div class="qi-address">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>${o.pickup}</span>
                    </div>
                    ${o.destination && o.destination !== 'N/A' ? `
                        <div class="qi-address">
                            <i class="fa-solid fa-flag-checkered"></i>
                            <span>${o.destination}</span>
                        </div>
                    ` : ''}
                    ${o.remark ? `
                        <div class="qi-address" style="color:var(--accent-yellow);">
                            <i class="fa-solid fa-note-sticky"></i>
                            <span>${o.remark}</span>
                        </div>
                    ` : ''}
                    <div class="qi-actions">
                        <button class="qi-btn qi-btn-accept" onclick="event.stopPropagation(); DriverQueue.acceptOrder('${o.id}')">
                            <i class="fa-solid fa-check"></i> PRANO
                        </button>
                        <button class="qi-btn qi-btn-skip" onclick="event.stopPropagation(); DriverQueue.hideOrder('${o.id}')">
                            <i class="fa-solid fa-eye-slash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ═══ PRANO POROSINË ═══
    async function acceptOrder(orderId) {
        if (!window.DriverApp?.currentDriver) {
            showToast('error', 'Gabim', 'Nuk je i loguar');
            return;
        }

        // Nëse ka porosi aktive → refuzo
        if (window.DriverApp?.currentOrder) {
            showToast('warning', 'Ke porosi aktive', 'Përfundo porosinë e tanishme së pari');
            return;
        }

        const driver = window.DriverApp.currentDriver;

        if (!confirm(`A jeni i sigurt që doni ta pranoni këtë porosi?`)) return;

        try {
            const db = window.TaxiFirebase?.db;
            if (!db) return;

            // Merr emrin e veturës
            const vehicleNum = String(driver.vehicleId).padStart(2, '0');

            // Update në Firestore
            await db.collection('orders').doc(orderId).update({
                status: 'assigned',
                driverId: driver.id,
                driverName: driver.name,
                vehicleNum: vehicleNum,
                vehicleId: driver.vehicleId,
                assignedAt: Date.now(),
                acceptedBy: driver.id,
                acceptedAt: Date.now()
            });

            showToast('success', '✅ Prano', 'Porosia u pranua');

            // Njofto App-in
            if (window.TaxiAuditLog) {
                window.TaxiAuditLog.log('driver_accepted_from_queue', { orderId, driverId: driver.id });
            }

        } catch (e) {
            console.error('❌ acceptOrder:', e);
            showToast('error', 'Gabim', 'Nuk mund të pranohet porosia');
        }
    }

    // ═══ FSHIH POROSINË NGA LISTA (lokalisht) ═══
    const hiddenOrders = new Set();

    function hideOrder(orderId) {
        hiddenOrders.add(orderId);
        // Fshi nga lista
        const el = document.querySelector(`.queue-item[data-order-id="${orderId}"]`);
        // Ri-rendero
        renderQueue();
        showToast('info', '👁️ Fshehur', 'Porosia u fsheh nga lista');

        // Nëse dëshiron ta ruash në Firestore për sesionin → mund të shtohet
    }

    // ═══ PREVIEW POROSINË ═══
    function previewOrder(orderId) {
        const o = queueOrders.find(x => x.id === orderId);
        if (!o) return;

        // Shfaq modal të shpejtë
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-preview-order';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title">
                        <i class="fa-solid fa-receipt"></i>
                        <h3>Porosi në pritje</h3>
                    </div>
                    <button class="modal-close" onclick="document.getElementById('modal-preview-order').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="ao-row">
                        <i class="fa-solid fa-phone"></i>
                        <div>
                            <div class="ao-label">Klienti</div>
                            <div class="ao-value">${o.phone}</div>
                        </div>
                    </div>
                    <div class="ao-row">
                        <i class="fa-solid fa-user"></i>
                        <div>
                            <div class="ao-label">Emri</div>
                            <div class="ao-value">${o.name || 'Klient'}</div>
                        </div>
                    </div>
                    <div class="ao-row">
                        <i class="fa-solid fa-location-dot"></i>
                        <div>
                            <div class="ao-label">Marrja</div>
                            <div class="ao-value">${o.pickup}</div>
                        </div>
                    </div>
                    ${o.destination && o.destination !== 'N/A' ? `
                        <div class="ao-row">
                            <i class="fa-solid fa-flag-checkered"></i>
                            <div>
                                <div class="ao-label">Destinacioni</div>
                                <div class="ao-value">${o.destination}</div>
                            </div>
                        </div>
                    ` : ''}
                    ${o.remark ? `
                        <div class="ao-remark" style="display:flex;">
                            <i class="fa-solid fa-note-sticky"></i>
                            <span>${o.remark}</span>
                        </div>
                    ` : ''}
                    <div class="ao-row">
                        <i class="fa-solid fa-clock"></i>
                        <div>
                            <div class="ao-label">Koha e pritjes</div>
                            <div class="ao-value">${Math.floor((Date.now() - (o.createdAtLocal || Date.now())) / 60000)} minuta</div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-preview-order').remove()">Mbyll</button>
                    <button class="btn-primary" onclick="DriverQueue.acceptOrder('${o.id}'); document.getElementById('modal-preview-order').remove();">
                        <i class="fa-solid fa-check"></i> PRANO
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ═══ REFRESH AUTOMATIK ═══
    function startAutoRefresh() {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(() => {
            if (queueOrders.length > 0) {
                renderQueue();
            }
        }, 10000);
    }

    // ═══ NDAJ ═══
    function stop() {
        if (unsubscribeQueue) {
            unsubscribeQueue();
            unsubscribeQueue = null;
        }
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
        console.log('📋 DriverQueue u ndal');
    }

    // ═══ INIT AUTO ═══
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.TaxiFirebase?.ready) {
                init();
            } else if (window.TaxiFirebase) {
                // Prit sa të jetë gati
                let tries = 0;
                const wait = setInterval(() => {
                    tries++;
                    if (window.TaxiFirebase?.ready || tries > 20) {
                        clearInterval(wait);
                        init();
                    }
                }, 500);
            }
        }, 2000);
    });

    return {
        init, stop,
        renderQueue, acceptOrder, hideOrder, previewOrder,
        get orders() { return queueOrders; }
    };
})();

console.log('✅ driver/queue.js ngarkuar');
