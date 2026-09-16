'use strict';

/**
 * messages.js — Mesazhet mes operatorit dhe shoferëve
 */

window.TaxiMessages = (() => {
    const COLLECTION = 'messages';
    let unsubscribe = null;
    let messages = [];

    function db() { return window.TaxiFirebase?.db || null; }

    async function send(driverId, driverName, text, type = 'custom') {
        const database = db();
        if (!database) return null;
        try {
            const msg = {
                driverId: driverId,
                driverName: driverName || '',
                text: text || '',
                type: type,
                from: 'operator',
                fromId: window.TaxiAuth?.currentUser()?.uid || null,
                fromName: window.TaxiState?.get('currentOperator')?.name || 'Operator',
                sentAt: new Date().getTime(),
                sentAtStr: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
                read: false
            };
            const ref = await database.collection(COLLECTION).add(msg);
            window.TaxiEvents?.emit('message:sent', { id: ref.id, ...msg });
            return { id: ref.id, ...msg };
        } catch (e) { console.error('❌ sendMessage:', e); return null; }
    }

    async function sendToAll(text, type = 'broadcast') {
        const drivers = window.TaxiState?.get('drivers') || [];
        const results = [];
        for (const d of drivers) {
            const r = await send(d.id, d.name, text, type);
            if (r) results.push(r);
        }
        return results;
    }

    async function markRead(msgId) {
        const database = db();
        if (!database) return;
        try {
            await database.collection(COLLECTION).doc(msgId).update({ read: true });
        } catch (e) {}
    }

    function subscribe() {
        const database = db();
        if (!database) return;
        if (unsubscribe) unsubscribe();
        unsubscribe = database.collection(COLLECTION)
            .orderBy('sentAt', 'desc')
            .limit(100)
            .onSnapshot((snap) => {
                messages = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                window.TaxiEvents?.emit('messages:updated', messages);
            });
    }

    function getAll() { return messages; }
    function unreadCount() { return messages.filter(m => !m.read).length; }

    return { send, sendToAll, markRead, subscribe, getAll, unreadCount };
})();

console.log('✅ messages.js ngarkuar');
