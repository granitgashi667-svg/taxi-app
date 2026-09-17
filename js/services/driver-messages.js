'use strict';

/**
 * js/services/driver-messages.js
 * Chat dy-kahësh: Shofer ↔ Operator/Dispatcher
 * Koleksionet: driver_messages (threads), driver_messages/{id}/messages
 */

window.TaxiDriverMessages = (() => {
    let currentThreadId = null;
    let unsubscribeMessages = null;
    let unsubscribeThreads = null;
    let threadsCache = [];
    let unreadCount = 0;

    function init() {
        console.log('💬 TaxiDriverMessages: Init...');
        injectPanel();
        startThreadsListener();
        injectStyles();
    }

    // ═══ PANEL I RE (lart-djathtas i porosive në pritje) ═══
    function injectPanel() {
        if (document.getElementById('driver-messages-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'driver-messages-panel';
        panel.innerHTML = `
            <div class="dmp-header" onclick="TaxiDriverMessages.toggleCollapse()">
                <div class="dmp-title">
                    <i class="fa-solid fa-comments"></i>
                    <span>Mesazhe nga Shoferët</span>
                    <span class="dmp-badge" id="dmp-unread" style="display:none;">0</span>
                </div>
                <button class="dmp-toggle" id="dmp-toggle-icon">
                    <i class="fa-solid fa-chevron-down"></i>
                </button>
            </div>
            <div class="dmp-body" id="dmp-body">
                <div class="dmp-threads" id="dmp-threads">
                    <div class="dmp-empty">
                        <i class="fa-solid fa-inbox"></i>
                        <p>Pa mesazhe</p>
                    </div>
                </div>
                <div class="dmp-chat" id="dmp-chat" style="display:none;">
                    <div class="dmp-chat-header">
                        <button class="dmp-back" onclick="TaxiDriverMessages.closeChat()">
                            <i class="fa-solid fa-arrow-left"></i>
                        </button>
                        <div class="dmp-chat-info">
                            <strong id="dmp-chat-name">—</strong>
                            <small id="dmp-chat-vehicle">—</small>
                        </div>
                        <span class="dmp-status" id="dmp-chat-status"></span>
                    </div>
                    <div class="dmp-messages" id="dmp-messages"></div>
                    <div class="dmp-input-row">
                        <input type="text" id="dmp-input" class="dmp-input" placeholder="Shkruaj mesazh..." onkeydown="if(event.key==='Enter')TaxiDriverMessages.sendMessage()">
                        <button class="dmp-send" onclick="TaxiDriverMessages.sendMessage()">
                            <i class="fa-solid fa-paper-plane"></i>
                        </button>
                    </div>
                    <div class="dmp-quick">
                        <button onclick="TaxiDriverMessages.quickSend('A mundesh me lajmëru?')">Lajmëro</button>
                        <button onclick="TaxiDriverMessages.quickSend('Kërkesë për pauzë')">Pauzë</button>
                        <button onclick="TaxiDriverMessages.quickSend('A je i lirë?')">I lirë?</button>
                        <button onclick="TaxiDriverMessages.quickSend('Vjen menjëherë')">Vjen</button>
                    </div>
                </div>
            </div>
        `;

        // Vendose lart-djathtas brenda panelit të porosive në pritje
        const target = document.querySelector('.panel-waiting .panel-header') ||
                       document.querySelector('#waiting-tbody')?.closest('.panel')?.querySelector('.panel-header') ||
                       document.querySelector('.col-center');

        if (target) {
            if (target.classList.contains('panel-header')) {
                target.parentElement.insertBefore(panel, target.nextSibling);
            } else {
                target.insertBefore(panel, target.firstChild);
            }
        } else {
            document.body.appendChild(panel);
            panel.classList.add('floating');
        }
    }

    // ═══ LISTENER I THREADS ═══
    function startThreadsListener() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        if (unsubscribeThreads) unsubscribeThreads();

        try {
            unsubscribeThreads = db.collection('driver_messages')
                .orderBy('lastMessageAt', 'desc')
                .limit(50)
                .onSnapshot(snap => {
                    threadsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    unreadCount = threadsCache.reduce((s, t) => s + (t.unreadByOperator || 0), 0);
                    renderThreads();
                    updateBadge();
                });
        } catch (e) {
            console.error('❌ threads listener:', e);
        }
    }

    function updateBadge() {
        const el = document.getElementById('dmp-unread');
        if (!el) return;
        if (unreadCount > 0) {
            el.textContent = unreadCount > 9 ? '9+' : unreadCount;
            el.style.display = 'inline-flex';
        } else {
            el.style.display = 'none';
        }
    }

    function renderThreads() {
        const el = document.getElementById('dmp-threads');
        if (!el) return;

        if (!threadsCache.length) {
            el.innerHTML = `<div class="dmp-empty"><i class="fa-solid fa-inbox"></i><p>Pa mesazhe</p></div>`;
            return;
        }

        el.innerHTML = threadsCache.map(t => {
            const unread = t.unreadByOperator || 0;
            const time = formatTime(t.lastMessageAt);
            return `
                <div class="dmp-thread ${unread > 0 ? 'unread' : ''}" onclick="TaxiDriverMessages.openChat('${t.id}')">
                    <div class="dmp-thread-avatar">${(t.driverName || 'S').slice(0,2).toUpperCase()}</div>
                    <div class="dmp-thread-info">
                        <div class="dmp-thread-name">${t.driverName || 'Shofer'}</div>
                        <div class="dmp-thread-last">${t.lastMessage || '—'}</div>
                    </div>
                    <div class="dmp-thread-meta">
                        <span class="dmp-thread-time">${time}</span>
                        ${unread > 0 ? `<span class="dmp-thread-badge">${unread}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // ═══ HAP CHAT ═══
    async function openChat(threadId) {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        currentThreadId = threadId;
        const thread = threadsCache.find(t => t.id === threadId);
        if (!thread) return;

        document.getElementById('dmp-threads').style.display = 'none';
        document.getElementById('dmp-chat').style.display = 'flex';
        document.getElementById('dmp-chat-name').textContent = thread.driverName || 'Shofer';
        document.getElementById('dmp-chat-vehicle').textContent = thread.vehicleNum ? `🚗 ${thread.vehicleNum}` : '';
        document.getElementById('dmp-chat-status').innerHTML = thread.online ? '<span style="color:#10b981;">● Online</span>' : '<span style="color:#64748b;">○ Offline</span>';

        // Zero unread
        try {
            await db.collection('driver_messages').doc(threadId).update({ unreadByOperator: 0 });
        } catch {}

        // Listener i mesazheve
        if (unsubscribeMessages) unsubscribeMessages();
        unsubscribeMessages = db.collection('driver_messages').doc(threadId)
            .collection('messages')
            .orderBy('createdAt', 'asc')
            .limit(200)
            .onSnapshot(snap => {
                const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                renderMessages(msgs);
            });
    }

    function closeChat() {
        currentThreadId = null;
        if (unsubscribeMessages) { unsubscribeMessages(); unsubscribeMessages = null; }
        document.getElementById('dmp-threads').style.display = 'block';
        document.getElementById('dmp-chat').style.display = 'none';
    }

    function renderMessages(msgs) {
        const el = document.getElementById('dmp-messages');
        if (!el) return;

        if (!msgs.length) {
            el.innerHTML = `<div class="dmp-empty" style="padding:20px;"><i class="fa-solid fa-comment"></i><p>Pa mesazhe</p></div>`;
            return;
        }

        const currentUser = window.TaxiFirebase?.auth?.currentUser;
        const myId = currentUser?.uid || 'operator';

        el.innerHTML = msgs.map(m => {
            const mine = m.senderId === myId || m.senderType === 'operator';
            return `
                <div class="dmp-msg ${mine ? 'mine' : 'theirs'}">
                    <div class="dmp-bubble">
                        <div class="dmp-text">${escapeHtml(m.text || '')}</div>
                        <div class="dmp-time">${formatTime(m.createdAt)}</div>
                    </div>
                </div>
            `;
        }).join('');

        el.scrollTop = el.scrollHeight;
    }

    // ═══ DËRGO MESAZH ═══
    async function sendMessage() {
        const input = document.getElementById('dmp-input');
        const text = input?.value?.trim();
        if (!text || !currentThreadId) return;

        input.value = '';
        await sendToThread(currentThreadId, text);
    }

    async function quickSend(text) {
        if (!currentThreadId) return;
        await sendToThread(currentThreadId, text);
    }

    async function sendToThread(threadId, text) {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        const user = window.TaxiFirebase?.auth?.currentUser;
        const senderId = user?.uid || 'operator';
        const senderName = window.AdminApp?.currentOperator?.name || window.AppState?.currentOperator?.name || 'Operator';

        try {
            await db.collection('driver_messages').doc(threadId).collection('messages').add({
                senderId,
                senderName,
                senderType: 'operator',
                text,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            await db.collection('driver_messages').doc(threadId).update({
                lastMessage: text.slice(0, 60),
                lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
                unreadByDriver: firebase.firestore.FieldValue.increment(1)
            });
        } catch (e) {
            console.error('❌ send:', e);
            alert('Gabim: ' + e.message);
        }
    }

    // ═══ COLLAPSE ═══
    function toggleCollapse() {
        const panel = document.getElementById('driver-messages-panel');
        const icon = document.getElementById('dmp-toggle-icon')?.querySelector('i');
        if (!panel) return;
        panel.classList.toggle('collapsed');
        if (icon) icon.className = panel.classList.contains('collapsed') ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
    }

    // ═══ HELPERS ═══
    function formatTime(ts) {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
        const now = new Date();
        const diff = now - d;
        if (diff < 60000) return 'Tani';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
        if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' });
        return d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit' });
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function injectStyles() {
        if (document.getElementById('dmp-styles')) return;
        const s = document.createElement('style');
        s.id = 'dmp-styles';
        s.textContent = `
            #driver-messages-panel {
                background: var(--bg-card, #1a0f30);
                border: 1px solid var(--border-color, #2d1a4a);
                border-left: 3px solid #a855f7;
                border-radius: 12px;
                margin: 8px;
                overflow: hidden;
                transition: all .2s;
                max-height: 500px;
                display: flex;
                flex-direction: column;
            }
            #driver-messages-panel.floating {
                position: fixed;
                top: 80px;
                right: 20px;
                width: 340px;
                z-index: 500;
                box-shadow: 0 20px 60px rgba(0,0,0,.6);
            }
            #driver-messages-panel.collapsed { max-height: 44px; }
            #driver-messages-panel.collapsed .dmp-body { display: none; }
            .dmp-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 14px;
                background: linear-gradient(90deg, rgba(168,85,247,.15), transparent);
                cursor: pointer;
                user-select: none;
            }
            .dmp-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 12px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: .5px;
                color: #f1f5f9;
            }
            .dmp-title i { color: #a855f7; }
            .dmp-badge {
                background: #ef4444;
                color: white;
                font-size: 9px;
                font-weight: 800;
                padding: 2px 6px;
                border-radius: 10px;
                min-width: 16px;
                text-align: center;
            }
            .dmp-toggle {
                background: transparent;
                border: none;
                color: #94a3b8;
                cursor: pointer;
                font-size: 12px;
                padding: 4px;
            }
            .dmp-body {
                flex: 1;
                display: flex;
                flex-direction: column;
                min-height: 0;
                overflow: hidden;
            }
            .dmp-threads {
                overflow-y: auto;
                flex: 1;
                max-height: 380px;
            }
            .dmp-thread {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 12px;
                border-bottom: 1px solid rgba(45,26,74,.5);
                cursor: pointer;
                transition: background .15s;
            }
            .dmp-thread:hover { background: rgba(168,85,247,.08); }
            .dmp-thread.unread { background: rgba(168,85,247,.1); border-left: 3px solid #a855f7; }
            .dmp-thread-avatar {
                width: 36px;
                height: 36px;
                background: linear-gradient(135deg, #a855f7, #ec4899);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 800;
                font-size: 12px;
                flex-shrink: 0;
            }
            .dmp-thread-info { flex: 1; min-width: 0; }
            .dmp-thread-name { font-weight: 700; font-size: 12px; color: #f1f5f9; }
            .dmp-thread-last {
                font-size: 11px;
                color: #94a3b8;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                margin-top: 2px;
            }
            .dmp-thread-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
            .dmp-thread-time { font-size: 10px; color: #64748b; font-family: var(--font-mono, monospace); }
            .dmp-thread-badge {
                background: #ef4444;
                color: white;
                font-size: 9px;
                font-weight: 800;
                padding: 2px 6px;
                border-radius: 8px;
                min-width: 16px;
                text-align: center;
            }
            .dmp-empty {
                text-align: center;
                padding: 30px 16px;
                color: #64748b;
                font-size: 11px;
            }
            .dmp-empty i { font-size: 24px; opacity: .3; display: block; margin-bottom: 8px; }
            .dmp-chat { flex-direction: column; flex: 1; min-height: 0; }
            .dmp-chat-header {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: rgba(168,85,247,.08);
                border-bottom: 1px solid rgba(45,26,74,.5);
            }
            .dmp-back {
                background: transparent;
                border: none;
                color: #94a3b8;
                cursor: pointer;
                font-size: 14px;
                padding: 4px 8px;
            }
            .dmp-chat-info { flex: 1; }
            .dmp-chat-info strong { display: block; font-size: 12px; color: #f1f5f9; }
            .dmp-chat-info small { font-size: 10px; color: #94a3b8; }
            .dmp-status { font-size: 10px; font-weight: 700; }
            .dmp-messages {
                flex: 1;
                overflow-y: auto;
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                min-height: 200px;
                max-height: 300px;
            }
            .dmp-msg { display: flex; }
            .dmp-msg.mine { justify-content: flex-end; }
            .dmp-bubble {
                max-width: 75%;
                padding: 8px 12px;
                border-radius: 12px;
                word-wrap: break-word;
            }
            .dmp-msg.mine .dmp-bubble {
                background: linear-gradient(135deg, #a855f7, #ec4899);
                color: white;
                border-bottom-right-radius: 4px;
            }
            .dmp-msg.theirs .dmp-bubble {
                background: rgba(45,26,74,.6);
                color: #f1f5f9;
                border-bottom-left-radius: 4px;
            }
            .dmp-text { font-size: 12px; line-height: 1.4; }
            .dmp-time { font-size: 9px; opacity: .7; margin-top: 3px; font-family: var(--font-mono, monospace); }
            .dmp-input-row {
                display: flex;
                gap: 6px;
                padding: 8px 10px;
                border-top: 1px solid rgba(45,26,74,.5);
            }
            .dmp-input {
                flex: 1;
                padding: 8px 12px;
                background: rgba(20,10,36,.6);
                border: 1px solid #2d1a4a;
                border-radius: 20px;
                color: #f1f5f9;
                font-size: 12px;
                outline: none;
            }
            .dmp-input:focus { border-color: #a855f7; }
            .dmp-send {
                width: 36px;
                height: 36px;
                background: linear-gradient(135deg, #a855f7, #ec4899);
                border: none;
                border-radius: 50%;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .dmp-send:hover { transform: scale(1.08); }
            .dmp-quick {
                display: flex;
                gap: 4px;
                padding: 6px 10px;
                flex-wrap: wrap;
                border-top: 1px solid rgba(45,26,74,.5);
            }
            .dmp-quick button {
                flex: 1;
                min-width: 60px;
                padding: 5px 8px;
                background: rgba(168,85,247,.12);
                border: 1px solid rgba(168,85,247,.3);
                border-radius: 6px;
                color: #a855f7;
                font-size: 10px;
                font-weight: 700;
                cursor: pointer;
                transition: all .15s;
            }
            .dmp-quick button:hover { background: rgba(168,85,247,.25); }
        `;
        document.head.appendChild(s);
    }

    return { init, toggleCollapse, openChat, closeChat, sendMessage, quickSend };
})();

console.log('✅ services/driver-messages.js ngarkuar');
