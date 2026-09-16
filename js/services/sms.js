'use strict';

/**
 * sms.js — SMS Automatike (#1 me link tracking, #2 kur 20m larg)
 */

window.TaxiSms = (() => {
    const COLLECTION = 'sms_log';
    const QUEUE_COLLECTION = 'sms_queue';

    // ═══ TEMPLATES ═══
    const TEMPLATES = {
        // SMS #1 — Kur shoferi pranon porosinë
        assigned: (d) => `Taxi ju njofton se vetura ${d.vehicle} është nisur drejt jush.\nNdjekeni live: ${d.trackingLink}\nUdhetim te kendshem!`,

        // SMS #2 — Kur shoferi është 20m larg
        arrived: (d) => `Taxi ju njofton se vetura ${d.vehicle} me targa ${d.plate} eshte duke ju pritur.\nJu deshirojme udhetim te kendshem dhe te rehatshem.`,

        // Fatura
        invoice: (d) => `Fatura e udhetimit tuaj: €${d.price}.\nFaleminderit qe zgjodhet Taxi!`,

        custom: (d) => d.text
    };

    function db() { return window.TaxiFirebase?.db || null; }

    // ═══ DËRGO SMS (nëpërmjet queue → Android Gateway) ═══
    async function send(to, text, type = 'custom', orderId = null) {
        if (!to || !text) return null;

        console.log('📱 SMS →', to, ':', text.slice(0, 60) + '...');

        // Ruaj në log
        const log = await logSms({ to, text, type, orderId });

        // Shto në queue për Android Gateway
        await queueSms({ to, text, type, orderId });

        return log;
    }

    // ═══ QUEUE PËR ANDROID GATEWAY ═══
    async function queueSms(data) {
        const database = db();
        if (!database) return;

        try {
            await database.collection(QUEUE_COLLECTION).add({
                to: data.to,
                text: data.text,
                type: data.type || 'custom',
                orderId: data.orderId || null,
                status: 'pending',
                createdAt: Date.now(),
                createdBy: window.TaxiAuth?.currentUser()?.uid || null
            });
            console.log('📤 SMS u vu në queue');
        } catch (e) { console.warn('Queue error:', e); }
    }

    // ═══ LOG SMS ═══
    async function logSms(data) {
        const database = db();
        if (!database) return null;
        try {
            const log = {
                to: data.to,
                text: data.text,
                type: data.type || 'custom',
                orderId: data.orderId || null,
                sentAt: Date.now(),
                sentAtStr: new Date().toLocaleString('sq-AL'),
                status: 'queued',
                cost: 0.03,
                operatorId: window.TaxiAuth?.currentUser()?.uid || null,
                operatorName: window.TaxiState?.get('currentOperator')?.name || 'Sistemi'
            };
            const ref = await database.collection(COLLECTION).add(log);
            return { id: ref.id, ...log };
        } catch (e) { console.error('❌ logSms:', e); return null; }
    }

    // ═══ SMS #1 — KUR POROSIA CAKTOHET ═══
    async function sendAssigned(order) {
        if (!order.phone) return null;

        // Ndërto link tracking
        const trackingLink = buildTrackingLink(order.id || order.firestoreId);

        const vehicle = order.vehicleNum || order.vehicle || '—';

        return await sendTemplate(order.phone, 'assigned', {
            vehicle: vehicle,
            trackingLink: trackingLink,
            orderId: order.id || order.firestoreId
        });
    }

    // ═══ SMS #2 — KUR SHOFERI ËSHTË 20M LARG ═══
    async function sendArrived(order) {
        if (!order.phone) return null;

        const driver = window.AppState?.drivers?.find(d => d.id === order.driverId);
        const vehicle = window.AppState?.vehicles?.find(v => v.id === driver?.vehicleId);

        const vehicleNum = order.vehicleNum || order.vehicle || (vehicle ? String(vehicle.id).padStart(2, '0') : '—');
        const plate = vehicle ? vehicle.plate : '—';

        return await sendTemplate(order.phone, 'arrived', {
            vehicle: vehicleNum,
            plate: plate,
            orderId: order.id || order.firestoreId
        });
    }

    // ═══ DËRGO ME TEMPLATE ═══
    async function sendTemplate(to, templateName, data) {
        const tpl = TEMPLATES[templateName];
        if (!tpl) {
            console.warn('⚠️ Template i panjohur:', templateName);
            return null;
        }
        const text = tpl(data);
        return await send(to, text, templateName, data.orderId);
    }

    // ═══ NDIHMA: Ndërto link tracking ═══
    function buildTrackingLink(orderId) {
        if (!orderId) return 'https://taxi.app';
        const base = window.location.origin + window.location.pathname;
        return `${base}?track=${orderId}`;
    }

    // ═══ MERR LOGUN ═══
    async function getLog(limit = 50) {
        const database = db();
        if (!database) return [];
        try {
            const snap = await database.collection(COLLECTION)
                .orderBy('sentAt', 'desc')
                .limit(limit)
                .get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) { return []; }
    }

    // ═══ STATISTIKA ═══
    async function getStats() {
        const log = await getLog(1000);
        const total = log.length;
        const today = log.filter(l => l.sentAtStr?.startsWith(new Date().toLocaleDateString('sq-AL'))).length;
        const cost = log.reduce((s, l) => s + (l.cost || 0), 0);
        return { total, today, cost: +cost.toFixed(2) };
    }

    // ═══ FSHIJ QUEUE (nga Android pas dërgimit) ═══
    async function markSent(queueId) {
        const database = db();
        if (!database) return;
        try {
            await database.collection(QUEUE_COLLECTION).doc(queueId).update({
                status: 'sent',
                sentAt: Date.now()
            });
        } catch (e) {}
    }

    function init() {
        console.log('✅ SMS aktivizuar');
    }

    return {
        init, send, sendTemplate, sendAssigned, sendArrived,
        logSms, queueSms, getLog, getStats, markSent,
        buildTrackingLink, TEMPLATES
    };
})();

console.log('✅ sms.js ngarkuar');
