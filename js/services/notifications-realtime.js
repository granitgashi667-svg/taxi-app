'use strict';

window.TaxiNotificationsRealtime = (() => {
    let listeners = [];
    let bellContainer = null;

    function init() {
        console.log('🔔 TaxiNotificationsRealtime: Init...');
        createBell();
        startListeners();
    }

    function createBell() {
        const topbar = document.querySelector('.topbar-actions');
        if (!topbar || document.getElementById('notif-bell')) return;

        bellContainer = document.createElement('div');
        bellContainer.id = 'notif-bell';
        bellContainer.style.cssText = 'position:relative;';
        bellContainer.innerHTML = `
            <button class="topbar-toggle" onclick="TaxiNotificationsRealtime.togglePanel()" title="Notifikime">
                <i class="fa-solid fa-bell"></i>
                <span id="notif-count" style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:white;font-size:9px;font-weight:800;padding:2px 6px;border-radius:10px;display:none;">0</span>
            </button>
        `;

        topbar.insertBefore(bellContainer, topbar.firstChild);

        const panel = document.createElement('div');
        panel.id = 'notif-panel';
        panel.style.cssText = `
            position:fixed;top:70px;right:20px;width:360px;max-height:500px;overflow-y:auto;
            background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:12px;
            box-shadow:0 20px 60px rgba(0,0,0,.6);z-index:9998;display:none;padding:8px;
        `;
        panel.onclick = (e) => e.stopPropagation();
        document.body.appendChild(panel);

        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target) && !bellContainer.contains(e.target)) {
                panel.style.display = 'none';
            }
        });
    }

    function startListeners() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        // 1. Porosi të reja në pritje
        try {
            const unsub1 = db.collection('orders')
                .where('status', '==', 'waiting')
                .limit(50)
                .onSnapshot(snap => {
                    snap.docChanges().forEach(change => {
                        if (change.type === 'added') {
                            const data = change.doc.data();
                            notify({
                                type: 'order',
                                icon: 'fa-clipboard-list',
                                color: '#f59e0b',
                                title: 'Porosi e re në pritje',
                                message: `${data.phone || '—'} · ${data.pickup || '—'}`,
                                timestamp: Date.now()
                            });
                        }
                    });
                });
            listeners.push(unsub1);
        } catch (e) { console.warn('Listener orders:', e); }

        // 2. SOS / Emergjenca
        try {
            const unsub2 = db.collection('emergencies')
                .orderBy('createdAt', 'desc')
                .limit(10)
                .onSnapshot(snap => {
                    snap.docChanges().forEach(change => {
                        if (change.type === 'added') {
                            const data = change.doc.data();
                            notify({
                                type: 'sos',
                                icon: 'fa-triangle-exclamation',
                                color: '#ef4444',
                                title: '🚨 SOS EMERGJENCË',
                                message: `${data.driverName || data.phone || '—'} kërkon ndihmë!`,
                                timestamp: Date.now(),
                                priority: 'high'
                            });
                        }
                    });
                });
            listeners.push(unsub2);
        } catch (e) { console.warn('Listener SOS:', e); }

        // 3. Trackers offline (periodik)
        setInterval(checkOfflineTrackers, 5 * 60 * 1000);

        // 4. Paga në pritje (kujtesë ditorе)
        setTimeout(checkPendingSalaries, 30000);
    }

    async function checkOfflineTrackers() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;
        try {
            const snap = await db.collection('trackers').limit(200).get();
            const now = Date.now();
            const offline = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => {
                if (!t.lastSeen) return true;
                const ts = t.lastSeen.toDate ? t.lastSeen.toDate().getTime() : (t.lastSeen.seconds ? t.lastSeen.seconds * 1000 : 0);
                return (now - ts) > 30 * 60 * 1000;
            });
            if (offline.length > 0) {
                notify({
                    type: 'tracker',
                    icon: 'fa-satellite-dish',
                    color: '#f59e0b',
                    title: `${offline.length} trackers offline`,
                    message: 'Kontrollo veturat',
                    timestamp: Date.now()
                });
            }
        } catch {}
    }

    async function checkPendingSalaries() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;
        try {
            const now = new Date();
            const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const snap = await db.collection('salaries').limit(200).get();
            const pending = snap.docs.map(d => d.data()).filter(s => s.month === month && s.status !== 'paid').length;
            if (pending > 0) {
                notify({
                    type: 'salary',
                    icon: 'fa-money-bill-wave',
                    color: '#06b6d4',
                    title: `${pending} paga në pritje`,
                    message: `Për muajin ${month}`,
                    timestamp: Date.now()
                });
            }
        } catch {}
    }

    const notifications = [];

    function notify(data) {
        notifications.unshift(data);
        if (notifications.length > 50) notifications.pop();
        updateBadge();
        renderPanel();
        playSound(data);
    }

    function playSound(data) {
        if (!window.TaxiSound) return;
        if (data.priority === 'high') window.TaxiSound.playError?.();
        else window.TaxiSound.playSuccess?.();
    }

    function updateBadge() {
        const count = document.getElementById('notif-count');
        if (!count) return;
        const unread = notifications.filter(n => !n.read).length;
        if (unread > 0) {
            count.textContent = unread > 9 ? '9+' : unread;
            count.style.display = 'block';
        } else {
            count.style.display = 'none';
        }
    }

    function renderPanel() {
        const panel = document.getElementById('notif-panel');
        if (!panel) return;

        if (!notifications.length) {
            panel.innerHTML = '<div style="text-align:center;padding:30px;color:#94a3b8;font-size:12px;">Nuk ka notifikime</div>';
            return;
        }

        panel.innerHTML = `
            <div style="padding:10px 12px;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <strong style="font-size:13px;">Notifikime (${notifications.length})</strong>
                <button onclick="TaxiNotificationsRealtime.clearAll()" style="background:transparent;border:none;color:#94a3b8;font-size:11px;cursor:pointer;">
                    <i class="fa-solid fa-trash"></i> Pastro
                </button>
            </div>
            ${notifications.map((n, i) => `
                <div onclick="TaxiNotificationsRealtime.markRead(${i})" style="padding:10px 12px;border-radius:8px;cursor:pointer;display:flex;gap:10px;margin-bottom:4px;background:${n.read ? 'transparent' : n.color + '10'};border-left:3px solid ${n.read ? 'transparent' : n.color};">
                    <div style="width:32px;height:32px;background:${n.color}22;color:${n.color};border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <i class="fa-solid ${n.icon}"></i>
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:700;font-size:12px;">${n.title}</div>
                        <div style="font-size:11px;color:#94a3b8;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${n.message}</div>
                        <div style="font-size:9px;color:#64748b;margin-top:2px;font-family:var(--font-mono);">${timeAgo(n.timestamp)}</div>
                    </div>
                </div>
            `).join('')}
        `;
    }

    function timeAgo(ts) {
        const diff = Date.now() - ts;
        const min = Math.floor(diff / 60000);
        if (min < 1) return 'Tani';
        if (min < 60) return `${min} min më parë`;
        const h = Math.floor(min / 60);
        if (h < 24) return `${h} orë më parë`;
        return `${Math.floor(h / 24)} ditë më parë`;
    }

    function togglePanel() {
        const panel = document.getElementById('notif-panel');
        if (!panel) return;
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
        renderPanel();
    }

    function markRead(i) {
        if (notifications[i]) {
            notifications[i].read = true;
            updateBadge();
            renderPanel();
        }
    }

    function clearAll() {
        notifications.length = 0;
        updateBadge();
        renderPanel();
    }

    function destroy() {
        listeners.forEach(unsub => { try { unsub(); } catch {} });
        listeners = [];
    }

    return { init, togglePanel, markRead, clearAll, destroy, notify };
})();

console.log('✅ services/notifications-realtime.js ngarkuar');
