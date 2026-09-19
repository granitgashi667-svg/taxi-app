'use strict';

/**
 * js/driver/queue.js — Radha e porosive për shoferin
 */

window.DriverQueue = (() => {
    let queueUnsubscribe = null;
    let queueCache = [];

    function init() {
        console.log('📋 DriverQueue: Init...');
    }

    function startQueueListener() {
        const driver = window.DriverApp?.currentDriver;
        if (!driver) return;

        if (queueUnsubscribe) queueUnsubscribe();

        try {
            queueUnsubscribe = firebase.firestore().collection('orders')
                .where('driverId', '==', driver.id)
                .where('status', '==', 'waiting')
                .onSnapshot(snap => {
                    queueCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    renderQueue();
                });
        } catch (e) {
            console.warn('Queue listener:', e);
        }
    }

    function renderQueue() {
        const el = document.getElementById('queue-list');
        const cnt = document.getElementById('queue-count');
        if (cnt) cnt.textContent = queueCache.length;

        if (!el) return;

        if (!queueCache.length) {
            el.innerHTML = `
                <div class="queue-empty">
                    <i class="fa-solid fa-inbox"></i>
                    <p>Nuk ka porosi në pritje</p>
                </div>
            `;
            return;
        }

        el.innerHTML = queueCache.map(o => `
            <div class="queue-item">
                <div class="qi-left">
                    <i class="fa-solid fa-phone"></i>
                    <div>
                        <div class="qi-phone">${o.phone || '—'}</div>
                        <div class="qi-addr">${o.pickup || '—'}</div>
                    </div>
                </div>
                <div class="qi-time">${formatTime(o.created_at || o.createdAtLocal)}</div>
            </div>
        `).join('');
    }

    function formatTime(ts) {
        if (!ts) return '—';
        const d = new Date(ts);
        return d.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' });
    }

    return { init, startQueueListener };
})();

console.log('✅ js/driver/queue.js ngarkuar');
