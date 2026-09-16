'use strict';

/**
 * calls.js — Menaxhimi i thirrjeve (Call Center)
 */

window.TaxiCalls = (() => {
    const COLLECTION = 'calls';
    const queue = [];
    const onHold = [];

    function db() { return window.TaxiFirebase?.db || null; }

    async function logCall(callData) {
        const database = db();
        if (!database) return null;
        try {
            const call = {
                phone: callData.phone || '',
                clientName: callData.clientName || '',
                operatorId: window.TaxiAuth?.currentUser()?.uid || null,
                operatorName: callData.operatorName || '',
                status: callData.status || 'queued',
                startedAt: new Date().getTime(),
                answeredAt: callData.answeredAt || null,
                endedAt: callData.endedAt || null,
                duration: callData.duration || 0,
                holdDuration: callData.holdDuration || 0,
                transferredTo: callData.transferredTo || null,
                notes: callData.notes || ''
            };
            const ref = await database.collection(COLLECTION).add(call);
            return { id: ref.id, ...call };
        } catch (e) { console.error('❌ logCall:', e); return null; }
    }

    async function updateCall(callId, changes) {
        const database = db();
        if (!database) return;
        try {
            await database.collection(COLLECTION).doc(callId).update({
                ...changes,
                updatedAt: new Date().getTime()
            });
        } catch (e) { console.error('❌ updateCall:', e); }
    }

    async function getRecent(limit = 50) {
        const database = db();
        if (!database) return [];
        try {
            const snap = await database.collection(COLLECTION)
                .orderBy('startedAt', 'desc')
                .limit(limit)
                .get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) { console.error('❌ getRecent:', e); return []; }
    }

    return { logCall, updateCall, getRecent, queue, onHold };
})();

console.log('✅ calls.js ngarkuar');
