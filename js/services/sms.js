'use strict';

/**
 * sms.js — Dërgimi i SMS-ve (Twilio ose Gateway lokal)
 */

window.TaxiSms = (() => {
    const COLLECTION = 'sms_log';
    const TEMPLATES = {
        assigned: (d) => `TaxiApp ju njofton se vetura ${d.vehicle} është nisur drejt jush. Ndjekeni live: ${d.link}`,
        arrived:  (d) => `TaxiApp ju njofton se vetura ${d.vehicle} me targa ${d.plate} është duke ju pritur. Udhetim te kendshem!`,
        custom:   (d) => d.text
    };

    function db() { return window.TaxiFirebase?.db || null; }

    // Regjistro në log (gjithmonë)
    async function logSms(data) {
        const database = db();
        if (!database) return null;
        try {
            const log = {
                to: data.to,
                text: data.text,
                type: data.type || 'custom',
                orderId: data.orderId || null,
                sentAt: new Date().getTime(),
                sentAtStr: new Date().toLocaleString('sq-AL'),
                status: data.status || 'pending',
                cost: data.cost || 0.03
            };
            const ref = await database.collection(COLLECTION).add(log);
            return { id: ref.id, ...log };
        } catch (e) { console.error('❌ logSms:', e); return null; }
    }

    // Dërgo SMS (përdor Cloud Function ose Gateway)
    async function send(to, text, type = 'custom', orderId = null) {
        console.log('📱 SMS →', to, ':', text);

        // Log në Firestore (që Gateway-i Android ta lexojë)
        const log = await logSms({ to, text, type, orderId, status: 'queued' });

        // Nëse ka Cloud Function, do e dërgonte direkt
        // Për tani, ruajmë në Firestore → Gateway Android e lexon
        return log;
    }

    // Dërgo SMS nga template
    async function sendTemplate(to, templateName, data) {
        const tpl = TEMPLATES[templateName];
        if (!tpl) return null;
        const text = tpl(data);
        return await send(to, text, templateName, data.orderId);
    }

    return { send, sendTemplate, logSms, TEMPLATES };
})();

console.log('✅ sms.js ngarkuar');
