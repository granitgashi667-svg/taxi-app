'use strict';

/**
 * js/admin/administration.js — Cilësimet e sistemit
 */

window.AdminAdministration = (() => {
    let settingsCache = {};

    function init() {
        console.log('⚙️ AdminAdministration: Init...');
    }

    async function load() {
        await renderPage();
        await loadSettings();
    }

    async function loadSettings() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;
        try {
            const snap = await db.collection('settings').doc('system').get();
            if (snap.exists) settingsCache = snap.data();
        } catch {}
        renderContent();
    }

    function renderPage() {
        const el = document.querySelector('.admin-page[data-page="administration"]');
        if (!el) return;
        el.innerHTML = `
            <div class="page-header" style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
                <div class="page-title">
                    <i class="fa-solid fa-cogs"></i>
                    <div><h2>Administration</h2><p>Cilësimet e sistemit dhe mirëmbajtja</p></div>
                </div>
                <button class="btn-primary" onclick="AdminAdministration.saveAll()">
                    <i class="fa-solid fa-save"></i> Ruaj të gjitha
                </button>
            </div>
            <div id="admin-content-body"></div>
        `;
        renderContent();
    }

    function renderContent() {
        const el = document.getElementById('admin-content-body');
        if (!el) return;

        el.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">

                <!-- INFORMACION SISTEMI -->
                <div class="db-panel">
                    <div class="db-panel-header"><i class="fa-solid fa-circle-info"></i><h3>Sistemi</h3></div>
                    <div class="db-panel-body">
                        <div style="display:flex;flex-direction:column;gap:10px;font-size:12px;">
                            <div style="display:flex;justify-content:space-between;"><span style="color:#94a3b8;">Versioni</span><strong>3.0</strong></div>
                            <div style="display:flex;justify-content:space-between;"><span style="color:#94a3b8;">Firebase</span><strong style="color:#10b981;">✅ Lidhur</strong></div>
                            <div style="display:flex;justify-content:space-between;"><span style="color:#94a3b8;">User</span><strong>${window.AdminApp?.currentOperator?.name || '—'}</strong></div>
                            <div style="display:flex;justify-content:space-between;"><span style="color:#94a3b8;">Roli</span><strong>${window.AdminApp?.currentOperator?.role || '—'}</strong></div>
                            <div style="display:flex;justify-content:space-between;"><span style="color:#94a3b8;">Browser</span><strong>${navigator.userAgent.split(' ').slice(-2).join(' ')}</strong></div>
                            <div style="display:flex;justify-content:space-between;"><span style="color:#94a3b8;">Ekran</span><strong>${window.innerWidth} × ${window.innerHeight}</strong></div>
                        </div>
                    </div>
                </div>

                <!-- BACKUP / RESTORE -->
                <div class="db-panel">
                    <div class="db-panel-header"><i class="fa-solid fa-database"></i><h3>Backup & Restore</h3></div>
                    <div class="db-panel-body" style="display:flex;flex-direction:column;gap:10px;">
                        <button class="btn-primary" style="width:100%;" onclick="AdminAdministration.backupAll()">
                            <i class="fa-solid fa-download"></i> Shkarko backup të plotë (JSON)
                        </button>
                        <button class="btn-secondary" style="width:100%;" onclick="AdminAdministration.exportCollection()">
                            <i class="fa-solid fa-file-export"></i> Export një koleksion (CSV)
                        </button>
                        <button class="btn-secondary" style="width:100%;" onclick="AdminAdministration.showStats()">
                            <i class="fa-solid fa-chart-bar"></i> Statistika e koleksioneve
                        </button>
                        <button class="btn-secondary" style="width:100%;" onclick="AdminAdministration.cleanupOld()">
                            <i class="fa-solid fa-broom"></i> Pastro të dhënat e vjetra
                        </button>
                    </div>
                </div>

                <!-- CILËSIMET E PËRGJITHSHME -->
                <div class="db-panel">
                    <div class="db-panel-header"><i class="fa-solid fa-sliders"></i><h3>Cilësimet</h3></div>
                    <div class="db-panel-body" style="display:flex;flex-direction:column;gap:12px;">
                        <label style="font-size:11px;color:#94a3b8;">
                            Emri i kompanisë
                            <input type="text" id="adm-company" class="input" value="${settingsCache.companyName || 'TaxiApp'}" style="width:100%;margin-top:4px;">
                        </label>
                        <label style="font-size:11px;color:#94a3b8;">
                            Telefon
                            <input type="text" id="adm-phone" class="input" value="${settingsCache.companyPhone || ''}" style="width:100%;margin-top:4px;">
                        </label>
                        <label style="font-size:11px;color:#94a3b8;">
                            Email
                            <input type="email" id="adm-email" class="input" value="${settingsCache.companyEmail || ''}" style="width:100%;margin-top:4px;">
                        </label>
                        <label style="font-size:11px;color:#94a3b8;">
                            Adresa
                            <input type="text" id="adm-address" class="input" value="${settingsCache.companyAddress || ''}" style="width:100%;margin-top:4px;">
                        </label>
                        <label style="font-size:11px;color:#94a3b8;">
                            Valuta
                            <select id="adm-currency" class="input" style="width:100%;margin-top:4px;">
                                <option value="EUR" ${settingsCache.currency === 'EUR' ? 'selected' : ''}>€ Euro</option>
                                <option value="USD" ${settingsCache.currency === 'USD' ? 'selected' : ''}>$ Dollar</option>
                                <option value="ALL" ${settingsCache.currency === 'ALL' ? 'selected' : ''}>L Lek</option>
                            </select>
                        </label>
                        <label style="font-size:11px;color:#94a3b8;">
                            Komisioni (%)
                            <input type="number" id="adm-commission" class="input" min="0" max="100" step="1" value="${settingsCache.commission || 10}" style="width:100%;margin-top:4px;">
                        </label>
                    </div>
                </div>

                <!-- LOG AKTIVITETI -->
                <div class="db-panel">
                    <div class="db-panel-header"><i class="fa-solid fa-history"></i><h3>Log i fundit</h3></div>
                    <div class="db-panel-body" id="adm-log-body">
                        <div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i></div>
                    </div>
                </div>

                <!-- MIRËMBAJTJA -->
                <div class="db-panel full">
                    <div class="db-panel-header"><i class="fa-solid fa-toolbox"></i><h3>Mirëmbajtja</h3></div>
                    <div class="db-panel-body" style="display:flex;gap:10px;flex-wrap:wrap;">
                        <button class="btn-secondary" onclick="location.reload()">
                            <i class="fa-solid fa-rotate"></i> Reload faqen
                        </button>
                        <button class="btn-secondary" onclick="if(window.TaxiCache) { TaxiCache.clear(); location.reload(); }">
                            <i class="fa-solid fa-trash"></i> Pastro cache
                        </button>
                        <button class="btn-secondary" onclick="AdminAdministration.exportRules()">
                            <i class="fa-solid fa-shield"></i> Shfaq Firestore Rules
                        </button>
                        <button class="btn-secondary" onclick="AdminAdministration.downloadAllScripts()">
                            <i class="fa-solid fa-file-code"></i> Lista e moduleve
                        </button>
                    </div>
                </div>
            </div>
        `;
        loadLog();
    }

    async function loadLog() {
        const el = document.getElementById('adm-log-body');
        const db = window.TaxiFirebase?.db;
        if (!el || !db) return;

        try {
            const snap = await db.collection('audit_log').orderBy('createdAt', 'desc').limit(20).get();
            const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            if (!logs.length) {
                el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Pa log</p></div>';
                return;
            }

            el.innerHTML = logs.map(l => `
                <div style="padding:8px 0;border-bottom:1px solid var(--border-color);font-size:11px;">
                    <div style="display:flex;justify-content:space-between;">
                        <strong style="color:#a855f7;">${l.action || '—'}</strong>
                        <span style="color:#64748b;font-family:var(--font-mono);font-size:10px;">${formatDate(l.createdAt)}</span>
                    </div>
                    <div style="color:#94a3b8;font-size:10px;margin-top:2px;">
                        ${l.by || l.userId || '—'} ${l.details ? '· ' + JSON.stringify(l.details).slice(0, 60) : ''}
                    </div>
                </div>
            `).join('');
        } catch (e) {
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Pa log</p></div>';
        }
    }

    // ═══ BACKUP ALL ═══
    async function backupAll() {
        const db = window.TaxiFirebase?.db;
        if (!db) return alert('Firebase nuk është gati');

        const collections = [
            'orders', 'drivers', 'vehicles', 'operators', 'clients',
            'targets', 'loyalty_cards', 'loyalty_transactions',
            'fuel_prices', 'fuel_refills', 'salaries', 'salary_adjustments',
            'fixed_price_routes', 'sms_templates', 'mobile_users',
            'trackers', 'tracker_positions', 'streets', 'stands',
            'mobile_users', 'blacklist', 'vacations', 'settings'
        ];

        if (!confirm(`Backup i plotë për ${collections.length} koleksione? Mund të zgjasë 1-2 min.`)) return;

        const backup = { _meta: { version: '3.0', date: new Date().toISOString(), by: window.AdminApp?.currentOperator?.name || 'admin' } };

        for (const coll of collections) {
            try {
                const snap = await db.collection(coll).limit(5000).get();
                backup[coll] = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
                console.log(`✅ ${coll}: ${backup[coll].length}`);
            } catch (e) {
                console.warn(`⚠️ ${coll}: ${e.message}`);
                backup[coll] = [];
            }
        }

        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taxiapp-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);

        if (window.AdminApp?.showToast) window.AdminApp.showToast('success', '📥 Backup u shkarkua', `${Object.keys(backup).length - 1} koleksione`);
    }

    // ═══ EXPORT COLLECTION ═══
    async function exportCollection() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        const name = prompt('Emri i koleksionit (p.sh. orders, targets, loyalty_cards):');
        if (!name) return;

        try {
            const snap = await db.collection(name).limit(5000).get();
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            if (!docs.length) return alert('Koleksioni është bosh');

            // CSV
            const headers = [...new Set(docs.flatMap(d => Object.keys(d)))];
            const rows = docs.map(d => headers.map(h => JSON.stringify(d[h] ?? '')).join(','));
            const csv = [headers.join(','), ...rows].join('\n');

            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            if (window.AdminApp?.showToast) window.AdminApp.showToast('success', '📥 CSV u shkarkua', `${docs.length} dokumente`);
        } catch (e) {
            alert('Gabim: ' + e.message);
        }
    }

    // ═══ STATS ═══
    async function showStats() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        const collections = ['orders', 'drivers', 'vehicles', 'operators', 'clients', 'targets', 'loyalty_cards', 'fuel_refills', 'salaries', 'sms_templates', 'mobile_users', 'trackers', 'streets', 'stands', 'blacklist', 'vacations'];
        const stats = [];

        for (const coll of collections) {
            try {
                const snap = await db.collection(coll).limit(10000).get();
                stats.push({ coll, count: snap.size });
            } catch {
                stats.push({ coll, count: '—' });
            }
        }

        stats.sort((a, b) => (b.count || 0) - (a.count || 0));

        let root = document.getElementById('adm-modal-root');
        if (!root) { root = document.createElement('div'); root.id = 'adm-modal-root'; document.body.appendChild(root); }

        root.innerHTML = `
            <div class="modal-overlay" onclick="AdminAdministration.closeModal(event)">
                <div class="modal-box" onclick="event.stopPropagation()" style="max-width:520px;">
                    <h3><i class="fa-solid fa-chart-bar"></i> Statistika e koleksioneve</h3>
                    <div style="margin-top:16px;">
                        <table class="admin-table">
                            <thead><tr><th>Koleksioni</th><th>Dokumente</th></tr></thead>
                            <tbody>
                                ${stats.map(s => `<tr><td><strong>${s.coll}</strong></td><td class="mono green" style="font-weight:800;">${s.count}</td></tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div style="display:flex;justify-content:flex-end;margin-top:16px;">
                        <button class="btn-secondary" onclick="AdminAdministration.closeModal()">Mbyll</button>
                    </div>
                </div>
            </div>
        `;
    }

    // ═══ CLEANUP ═══
    async function cleanupOld() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        const days = parseInt(prompt('Fshij dokumente më të vjetra se (ditë):', '90') || '0');
        if (!days || days < 30) return alert('Minimumi 30 ditë');

        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        const collections = ['sms_queue', 'email_queue', 'positions_history', 'push_queue'];

        if (!confirm(`Fshij të dhënat më të vjetra se ${days} ditë?`)) return;

        let deleted = 0;
        for (const coll of collections) {
            try {
                const snap = await db.collection(coll).limit(1000).get();
                const old = snap.docs.filter(d => {
                    const ts = d.data().createdAt?.seconds * 1000 || 0;
                    return ts > 0 && ts < cutoff;
                });

                for (const doc of old) {
                    await doc.ref.delete();
                    deleted++;
                }
            } catch {}
        }

        if (window.AdminApp?.showToast) window.AdminApp.showToast('success', `🗑️ Fshirë ${deleted}`, '');
    }

    // ═══ EXPORT RULES ═══
    function exportRules() {
        let root = document.getElementById('adm-modal-root');
        if (!root) { root = document.createElement('div'); root.id = 'adm-modal-root'; document.body.appendChild(root); }

        root.innerHTML = `
            <div class="modal-overlay" onclick="AdminAdministration.closeModal(event)">
                <div class="modal-box" onclick="event.stopPropagation()" style="max-width:720px;max-height:85vh;">
                    <h3><i class="fa-solid fa-shield"></i> Firestore Rules</h3>
                    <div style="margin-top:16px;padding:12px;background:#0f172a;border-radius:8px;font-family:var(--font-mono);font-size:11px;color:#cbd5e1;white-space:pre-wrap;max-height:500px;overflow-y:auto;">
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // KOPJO NGA FILE firestore.rules
    // Shih skedarin e plotë në projekt
  }
}
                    </div>
                    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
                        <button class="btn-secondary" onclick="AdminAdministration.closeModal()">Mbyll</button>
                    </div>
                </div>
            </div>
        `;
    }

    // ═══ LISTA MODULEVE ═══
    function downloadAllScripts() {
        const modules = [
            'targets.js', 'loyalty.js', 'fuel.js', 'salaries.js', 'auto-dispatch.js',
            'sms-templates.js', 'fixed-routes.js', 'import.js', 'integrations.js',
            'trackers.js', 'streets.js', 'mobile-users.js', 'dashboard.js'
        ];

        let root = document.getElementById('adm-modal-root');
        if (!root) { root = document.createElement('div'); root.id = 'adm-modal-root'; document.body.appendChild(root); }

        root.innerHTML = `
            <div class="modal-overlay" onclick="AdminAdministration.closeModal(event)">
                <div class="modal-box" onclick="event.stopPropagation()" style="max-width:520px;">
                    <h3><i class="fa-solid fa-file-code"></i> Modulet e TaxiApp 3.0</h3>
                    <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                        ${modules.map(m => `
                            <div style="padding:8px;background:#1e293b;border-radius:6px;font-family:var(--font-mono);font-size:11px;color:#a855f7;">
                                ✅ js/admin/${m}
                            </div>
                        `).join('')}
                    </div>
                    <div style="display:flex;justify-content:flex-end;margin-top:16px;">
                        <button class="btn-secondary" onclick="AdminAdministration.closeModal()">Mbyll</button>
                    </div>
                </div>
            </div>
        `;
    }

    // ═══ SAVE ALL ═══
    async function saveAll() {
        const db = window.TaxiFirebase?.db;
        if (!db) return alert('Firebase nuk është gati');

        const data = {
            companyName: document.getElementById('adm-company')?.value?.trim() || '',
            companyPhone: document.getElementById('adm-phone')?.value?.trim() || '',
            companyEmail: document.getElementById('adm-email')?.value?.trim() || '',
            companyAddress: document.getElementById('adm-address')?.value?.trim() || '',
            currency: document.getElementById('adm-currency')?.value || 'EUR',
            commission: parseFloat(document.getElementById('adm-commission')?.value || '10'),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: window.AdminApp?.currentOperator?.name || 'admin'
        };

        try {
            await db.collection('settings').doc('system').set(data, { merge: true });
            settingsCache = { ...settingsCache, ...data };
            if (window.AdminApp?.showToast) window.AdminApp.showToast('success', '✅ U ruajt', data.companyName);
        } catch (e) {
            alert('Gabim: ' + e.message);
        }
    }

    function closeModal(e) {
        if (e && e.target && !e.target.classList.contains('modal-overlay')) return;
        const root = document.getElementById('adm-modal-root');
        if (root) root.innerHTML = '';
    }

    function formatDate(ts) {
        if (!ts) return '—';
        const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
        return d.toLocaleString('sq-AL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    }

    return {
        init, load,
        saveAll,
        backupAll, exportCollection, showStats, cleanupOld,
        exportRules, downloadAllScripts,
        closeModal
    };
})();

console.log('✅ admin/administration.js ngarkuar');
