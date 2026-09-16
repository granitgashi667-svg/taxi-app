'use strict';

/**
 * chat.js — Chat live mes klientit dhe shoferit
 */

window.TaxiChat = (() => {
    const COLLECTION = 'chats';
    let currentChatId = null;
    let unsubscribe = null;
    let currentUser = null;

    function db() { return window.TaxiFirebase?.db || null; }

    // ═══ HAP CHATIN ═══
    async function openChat(orderId, userType, userId, userName) {
        const database = db();
        if (!database) return null;

        currentChatId = orderId;
        currentUser = { type: userType, id: userId, name: userName };

        console.log('💬 Duke hapur chat për:', orderId);

        return await loadMessages();
    }

    // ═══ DËRGO MESAZH ═══
    async function sendMessage(text) {
        if (!text || !text.trim() || !currentChatId || !currentUser) return;

        const database = db();
        if (!database) return;

        try {
            await database.collection(COLLECTION)
                .doc(currentChatId)
                .collection('messages')
                .add({
                    text: text.trim(),
                    from: currentUser.type,
                    fromId: currentUser.id,
                    fromName: currentUser.name,
                    sentAt: Date.now(),
                    sentAtStr: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })
                });

            console.log('💬 Mesazhi u dërgua');
        } catch (e) {
            console.error('❌ sendMessage:', e);
        }
    }

    // ═══ DËGJO MESAZHET ═══
    function listenMessages(callback) {
        const database = db();
        if (!database || !currentChatId) return;

        if (unsubscribe) unsubscribe();

        unsubscribe = database.collection(COLLECTION)
            .doc(currentChatId)
            .collection('messages')
            .orderBy('sentAt', 'asc')
            .limit(100)
            .onSnapshot((snap) => {
                const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                if (callback) callback(messages);
            }, (err) => console.warn('Chat listen:', err));
    }

    // ═══ NGARKO MESAZHET ═══
    async function loadMessages() {
        const database = db();
        if (!database || !currentChatId) return [];

        try {
            const snap = await database.collection(COLLECTION)
                .doc(currentChatId)
                .collection('messages')
                .orderBy('sentAt', 'asc')
                .limit(100)
                .get();

            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.error('❌ loadMessages:', e);
            return [];
        }
    }

    // ═══ MËRSO CHATIN ═══
    function closeChat() {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
        currentChatId = null;
        currentUser = null;
        console.log('💬 Chat u mbyll');
    }

    // ═══ RENDER UI ═══
    function renderChatModal(messages) {
        const modal = document.getElementById('modal-chat');
        if (!modal) return;

        const messagesEl = document.getElementById('chat-messages');
        if (!messagesEl) return;

        if (!messages.length) {
            messagesEl.innerHTML = `
                <div style="text-align:center;padding:40px 20px;color:var(--text-muted);">
                    <i class="fa-solid fa-comments" style="font-size:40px;opacity:0.3;display:block;margin-bottom:12px;"></i>
                    <p style="font-size:12px;">Nuk ka mesazhe</p>
                    <p style="font-size:11px;margin-top:4px;">Shkruaj mesazhin e parë</p>
                </div>
            `;
            return;
        }

        messagesEl.innerHTML = messages.map(m => {
            const isMe = m.from === currentUser?.type;
            return `
                <div class="chat-message ${isMe ? 'me' : 'other'}">
                    <div class="chat-bubble">
                        <div class="chat-text">${escapeHtml(m.text)}</div>
                        <div class="chat-time">${m.sentAtStr}</div>
                    </div>
                </div>
            `;
        }).join('');

        // Scroll poshtë
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ═══ OPEN CHAT MODAL ═══
    function openChatModal(orderId, otherName) {
        let modal = document.getElementById('modal-chat');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-chat';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title">
                        <i class="fa-solid fa-comments"></i>
                        <h3>Chat me ${otherName || 'përdoruesin'}</h3>
                    </div>
                    <button class="modal-close" onclick="TaxiChat.closeChatModal()">&times;</button>
                </div>
                <div class="modal-body" style="padding:0;">
                    <div id="chat-messages" class="chat-messages"></div>
                </div>
                <div class="modal-footer" style="padding:8px 12px;">
                    <input type="text" id="chat-input" class="input-field" placeholder="Shkruaj mesazh..."
                        style="flex:1;margin-right:8px;" onkeypress="if(event.key==='Enter'){TaxiChat.sendFromInput();}">
                    <button class="btn-primary" onclick="TaxiChat.sendFromInput()" style="padding:9px 14px;">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        setTimeout(() => document.getElementById('chat-input')?.focus(), 200);
    }

    function sendFromInput() {
        const input = document.getElementById('chat-input');
        const text = input?.value.trim();
        if (text) {
            sendMessage(text);
            input.value = '';
        }
    }

    function closeChatModal() {
        closeChat();
        document.getElementById('modal-chat')?.remove();
    }

    return {
        openChat, sendMessage, listenMessages, loadMessages, closeChat,
        renderChatModal, openChatModal, sendFromInput, closeChatModal
    };
})();

console.log('✅ chat.js ngarkuar');
