'use strict';

/**
 * email-notifications.js — Njoftime me email
 */

window.TaxiEmail = (() => {
    const COLLECTION = 'email_queue';

    function db() { return window.TaxiFirebase?.db || null; }

    // ═══ DËRGO EMAIL ═══
    async function send(to, subject, body, type = 'custom') {
        if (!to || !subject) return null;

        const database = db();
        if (!database) return null;

        try {
            const email = {
                to,
                subject,
                body,
                type,
                status: 'pending',
                createdAt: Date.now(),
                createdAtStr: new Date().toLocaleString('sq-AL'),
                from: window.TaxiAuth?.currentUser()?.uid || null
            };

            const ref = await database.collection(COLLECTION).add(email);
            console.log('📧 Email u vu në queue:', ref.id);

            // Nëse kemi EmailJS ose backend → dërgo menjëherë
            await trySendNow(email, ref.id);

            return { id: ref.id, ...email };

        } catch (e) {
            console.error('❌ sendEmail:', e);
            return null;
        }
    }

    // ═══ DËRGO MENJËHERË (përmes EmailJS ose SendGrid) ═══
    async function trySendNow(email, emailId) {
        // Nëse është konfiguruar EmailJS
        if (window.emailjs && window.TaxiConfig?.EMAILJS?.serviceId) {
            try {
                await window.emailjs.send(
                    window.TaxiConfig.EMAILJS.serviceId,
                    window.TaxiConfig.EMAILJS.templateId,
                    {
                        to_email: email.to,
                        subject: email.subject,
                        message: email.body
                    }
                );

                // Update status
                const database = db();
                await database.collection(COLLECTION).doc(emailId).update({
                    status: 'sent',
                    sentAt: Date.now()
                });

                console.log('✅ Email u dërgua');
            } catch (e) {
                console.warn('EmailJS error:', e);
            }
        }
    }

    // ═══ TEMPLATES ═══
    const TEMPLATES = {
        welcome: (data) => ({
            subject: `Mirë se vjen në ${data.companyName || 'TaxiApp'}`,
            body: `
Përshëndetje ${data.name},

Mirë se vjen në ${data.companyName || 'TaxiApp'}!

Llogaria juaj u krijua me sukses.

Për të porositur taksi:
1. Hap aplikacionin
2. Vendos marrjen dhe destinacionin
3. Kliko "Porosit Taxi"

Faleminderit që zgjodhët shërbimin tonë!

Ekipi i ${data.companyName || 'TaxiApp'}
            `.trim()
        }),

        order_confirmation: (data) => ({
            subject: `Konfirmim porosie #${data.orderId}`,
            body: `
Përshëndetje ${data.name},

Porosia juaj u konfirmua.

📞 Klienti: ${data.phone}
📍 Marrja: ${data.pickup}
🏁 Destinacioni: ${data.destination}
💰 Çmimi: €${data.price}

Faleminderit!
            `.trim()
        }),

        invoice: (data) => ({
            subject: `Fatura e udhëtimit #${data.orderId}`,
            body: `
Fatura e udhëtimit tuaj:

📅 Data: ${data.date}
🚗 Vetura: ${data.vehicle}
👤 Shoferi: ${data.driver}
📍 Nga: ${data.pickup}
🏁 Deri: ${data.destination}
📏 Distanca: ${data.distance} km
⏱️ Koha: ${data.duration} min

💵 Totali: €${data.price}

Faleminderit që udhëtuat me ne!
            `.trim()
        }),

        password_reset: (data) => ({
            subject: 'Rivendosje fjalëkalimi',
            body: `
Përshëndetje ${data.name},

Kliko linkun më poshtë për të rivendosur fjalëkalimin:

${data.resetLink}

Nëse nuk e kërkuat këtë, injoroje këtë email.
            `.trim()
        }),

        daily_report: (data) => ({
            subject: `Raporti ditor - ${data.date}`,
            body: `
RAPORTI DITOR
${data.date}

💰 Të ardhura: €${data.revenue}
📞 Porosi: ${data.orders}
✅ Të kryera: ${data.completed}
❌ Anuluar: ${data.cancelled}
🚗 Shoferë aktivë: ${data.drivers}

Top operatori: ${data.topOperator}
Top shoferi: ${data.topDriver}
            `.trim()
        })
    };

    // ═══ DËRGO ME TEMPLATE ═══
    async function sendTemplate(to, templateName, data) {
        const tpl = TEMPLATES[templateName];
        if (!tpl) {
            console.warn('Template i panjohur:', templateName);
            return null;
        }

        const { subject, body } = tpl(data);
        return await send(to, subject, body, templateName);
    }

    // ═══ DËRGO RAPORT DITOR ═══
    async function sendDailyReport(toEmail, data) {
        return await sendTemplate(toEmail, 'daily_report', {
            ...data,
            date: new Date().toLocaleDateString('sq-AL')
        });
    }

    // ═══ MERR LOGUN ═══
    async function getLog(limit = 50) {
        const database = db();
        if (!database) return [];

        try {
            const snap = await database.collection(COLLECTION)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) { return []; }
    }

    // ═══ STATS ═══
    async function getStats() {
        const log = await getLog(500);
        const sent = log.filter(l => l.status === 'sent').length;
        const pending = log.filter(l => l.status === 'pending').length;
        return { total: log.length, sent, pending };
    }

    function init() {
        console.log('📧 Email notifications gati');
    }

    return { init, send, sendTemplate, sendDailyReport, getLog, getStats, TEMPLATES };
})();

console.log('✅ email-notifications.js ngarkuar');
