'use strict';

window.AdminIntegrations = (() => {
    let settings = {
        viber: { enabled: false, token: '', senderName: '', webhook: '' },
        twitter: { enabled: false, apiKey: '', apiSecret: '', accessToken: '', accessSecret: '', handle: '' },
        whatsapp: { enabled: false, token: '', phoneId: '' },
        telegram: { enabled: false, botToken: '', chatId: '' }
    };
    let logCache = [];

    function init() { console.log('🔌 AdminIntegrations: Init...'); }
    async function load() { await renderPage(); await loadSettings(); await loadLog(); }

    async function loadSettings() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;
        try {
            const snap = await db.collection('settings').doc('integrations').get();
            if (snap.exists) {
                const data = snap.data();
                Object.keys(settings).forEach(k => {
                    settings[k] = { ...settings[k], ...(data[k] || {}) };
                });
            }
            renderForms();
        } catch (e) { console.error(e); renderForms(); }
    }

    async function loadLog() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;
        try {
            const snap = await db.collection('integration_logs').orderBy('createdAt', 'desc').limit(50).get();
            logCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch {
            try {
                const snap = await db.collection('integration_logs').limit(50).get();
                logCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch {}
        }
        renderLog();
    }

    function renderPage() {
        const el = document.querySelector('.admin-page[data-page="integrations"]');
        if (!el) return;
        el.innerHTML = `
            <div class="page-header" style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
                <div class="page-title"><i class="fa-solid fa-plug"></i>
                    <div><h2>Integrations</h2><p>Viber, Twitter, WhatsApp, Telegram</p></div>
                </div>
                <button class="btn-primary" onclick="AdminIntegrations.save()"><i class="fa-solid fa-save"></i> Ruaj të gjitha</button>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;" id="int-forms"></div>

            <div class="db-panel">
                <div class="db-panel-header"><i class="fa-solid fa-clock-rotate-left"></i><h3>Log i fundit</h3></div>
                <div class="db-panel-body" id="int-log-body"></div>
            </div>
        `;
        renderForms();
    }

    function renderForms() {
        const el = document.getElementById('int-forms');
        if (!el) return;
        el.innerHTML = [
            renderIntCard('viber', '📱 Viber', [
                { key: 'token', label: 'Auth Token', type: 'password' },
                { key: 'senderName', label: 'Sender Name', type: 'text' },
                { key: 'webhook', label: 'Webhook URL', type: 'text' }
            ]),
            renderIntCard('twitter', '🐦 Twitter / X', [
                { key: 'apiKey', label: 'API Key', type: 'text' },
                { key: 'apiSecret', label: 'API Secret', type: 'password' },
                { key: 'accessToken', label: 'Access Token', type: 'password' },
                { key: 'accessSecret', label: 'Access Secret', type: 'password' },
                { key: 'handle', label: '@Handle', type: 'text' }
            ]),
            renderIntCard('whatsapp', '💬 WhatsApp', [
                { key: 'token', label: 'Token', type: 'password' },
                { key: 'phoneId', label: 'Phone ID', type: 'text' }
            ]),
            renderIntCard('telegram', '✈️ Telegram', [
                { key: 'botToken', label: 'Bot Token', type: 'password' },
                { key: 'chatId', label: 'Chat ID', type: 'text' }
            ])
        ].join('');
    }

    function renderIntCard(key, title, fields) {
        const s = settings[key];
        return `
            <div class="db-panel">
                <div class="db-panel-header">
                    <h3>${title}</h3>
                    <label style="margin-left:auto;display:flex;align-items:center;gap:6px;font-size:11px;color:#94a3b8;cursor:pointer;">
                        <input type="checkbox" ${s.enabled ? 'checked' : ''} onchange="AdminIntegrations.set('${key}','enabled',this.checked)">
                        ${s.enabled ? '🟢 Aktiv' : '⚪ Joaktiv'}
                    </label>
                </div>
                <div class="db-panel-body" style="display:flex;flex-direction:column;gap:10px;">
                    ${fields.map(f => `
                        <label style="font-size:11px;color:#94a3b8;">${f.label}
                            <input type="${f.type}" id="int-${key}-${f.key}" class="input" value="${s[f.key] || ''}"
                                style="width:100%;margin-top:4px;" onchange="AdminIntegrations.set('${key}','${f.key}',this.value)">
                        </label>
                    `).join('')}
                    <div style="display:flex;gap:8px;margin-top:6px;">
                        <button class="btn-secondary" style="flex:1;" onclick="AdminIntegrations.test('${key}')">
                            <i class="fa-solid fa-flask"></i> Test
                        </button>
                        ${s.webhook ? `
                            <button class="btn-secondary" style="flex:1;" onclick="AdminIntegrations.copyWebhook('${key}')">
                                <i class="fa-solid fa-copy"></i> Webhook
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    function set(section, key, val) {
        settings[section][key] = val;
        if (key === 'enabled') renderForms();
    }

    async function save() {
        const db = window.TaxiFirebase?.db;
        if (!db) return alert('Firebase nuk është gati');
        try {
            await db.collection('settings').doc('integrations').set({
                ...settings,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: window.TaxiFirebase?.auth?.currentUser?.email || 'admin'
            }, { merge: true });
            if (window.AdminApp?.showToast) window.AdminApp.showToast('success', '✅ U ruajt', '');
        } catch (e) { alert('Gabim: ' + e.message); }
    }

    async function test(key) {
        const db = window.TaxiFirebase?.db;
        if (!db) return;
        const s = settings[key];
        if (!s.enabled) return alert('Aktivizo kanalin së pari');

        try {
            await db.collection('integration_logs').add({
                channel: key,
                action: 'test',
                status: 'sent',
                message: `Test nga admin`,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                by: window.TaxiFirebase?.auth?.currentUser?.email || 'admin'
            });
            if (window.AdminApp?.showToast) window.AdminApp.showToast('success', '🧪 Test u dërgua', key);
            await loadLog();
        } catch (e) { alert('Gabim: ' + e.message); }
    }

    function copyWebhook(key) {
        const url = settings[key].webhook || '';
        navigator.clipboard.writeText(url);
        if (window.AdminApp?.showToast) window.AdminApp.showToast('success', '📋 Kopjuar', '');
    }

    function renderLog() {
        const el = document.getElementById('int-log-body');
        if (!el) return;
        if (!logCache.length) {
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Nuk ka log</p></div>';
            return;
        }
        el.innerHTML = `
            <div class="admin-table-wrap" style="max-height:320px;overflow:auto;">
                <table class="admin-table">
                    <thead><tr><th>Data</th><th>Kanali</th><th>Veprimi</th><th>Statusi</th><th>Mesazhi</th></tr></thead>
                    <tbody>
                        ${logCache.map(l => `
                            <tr>
                                <td class="mono" style="font-size:10px;">${formatDate(l.createdAt)}</td>
                                <td><strong>${l.channel || '—'}</strong></td>
                                <td>${l.action || '—'}</td>
                                <td><span class="status-badge ${l.status === 'sent' ? 'completed' : 'cancelled'}">${l.status || '—'}</span></td>
                                <td style="font-size:11px;">${(l.message || '').slice(0, 60)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function formatDate(ts) {
        if (!ts) return '—';
        const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
        return d.toLocaleString('sq-AL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    }

    return { init, load, set, save, test, copyWebhook };
})();
console.log('✅ admin/integrations.js ngarkuar');
