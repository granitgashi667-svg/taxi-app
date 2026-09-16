'use strict';

/**
 * js/director/backup.js — Backup & Restore
 */

window.DirectorBackup = (() => {
    let lastBackups = [];

    // ═══ INIT ═══
    function init() {
        console.log('💾 DirectorBackup: Init...');
    }

    // ═══ LOAD ═══
    async function load() {
        console.log('💾 Duke ngarkuar backup...');
        await loadHistory();
        renderLayout();
    }

    // ═══ LOAD HISTORY ═══
    async function loadHistory() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        try {
            const snap = await db.collection('backups')
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get();
            lastBackups = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.warn('Backup history:', e);
            lastBackups = [];
        }
    }

    // ═══ LAYOUT ═══
    function renderLayout() {
        const el = document.getElementById('backup-content');
        if (!el) return;

        el.innerHTML = `
            <div class="page-header" style="margin-bottom:20px;">
                <div class="page-title">
                    <i class="fa-solid fa-database"></i>
                    <div>
                        <h2>Backup & Restore</h2>
                        <p>Kopje rezervë e të dhënave</p>
                    </div>
                </div>
            </div>

            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card green">
                    <div class="kpi-label"><i class="fa-solid fa-database"></i> Backup të fundit</div>
                    <div class="kpi-value green">${lastBackups.length}</div>
                    <div class="kpi-sub">Të ruajtur</div>
                </div>
                <div class="kpi-card blue">
                    <div class="kpi-label"><i class="fa-solid fa-cloud"></i> Cloud</div>
                    <div class="kpi-value blue">Firebase</div>
                    <div class="kpi-sub">Automik</div>
                </div>
                <div class="kpi-card yellow">
                    <div class="kpi-label"><i class="fa-solid fa-clock"></i> Frekuenca</div>
                    <div class="kpi-value yellow">Ditore</div>
                    <div class="kpi-sub">Sugjerohet</div>
                </div>
                <div class="kpi-card purple">
                    <div class="kpi-label"><i class="fa-solid fa-shield"></i> Statusi</div>
                    <div class="kpi-value" style="color:var(--accent-purple);">I sigurt</div>
                    <div class="kpi-sub">Auto-backup aktiv</div>
                </div>
            </div>

            <div class="cards-grid" style="margin-bottom:20px;">
                <div class="info-card">
                    <div class="info-card-header">
                        <div class="info-card-avatar" style="background:linear-gradient(135deg,#22c55e,#16a34a);"><i class="fa-solid fa-download"></i></div>
                        <div>
                            <div class="info-card-name">Krijo Backup</div>
                            <div class="info-card-sub">Shkarko të gjitha të dhënat</div>
                        </div>
                    </div>
                    <div class="info-card-body">
                        <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;line-height:1.5;">
                            Shkarkon një file JSON me të gjitha të dhënat:
                            porosi, shoferë, klientë, operatorë, mesazhe, etj.
                        </p>
                        <button class="btn-primary" style="width:100%;" onclick="DirectorBackup.createBackup()">
                            <i class="fa-solid fa-download"></i> Krijo Backup
                        </button>
                    </div>
                </div>

                <div class="info-card">
                    <div class="info-card-header">
                        <div class="info-card-avatar" style="background:linear-gradient(135deg,#f59e0b,#d97706);"><i class="fa-solid fa-upload"></i></div>
                        <div>
                            <div class="info-card-name">Restore</div>
                            <div class="info-card-sub">Ngarko nga file backup</div>
                        </div>
                    </div>
                    <div class="info-card-body">
                        <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;line-height:1.5;">
                            Ngarko një file backup për të rikthyer të dhënat.
                            <strong style="color:var(--accent-yellow);">Kujdes:</strong> mund të mbishkruajë të dhënat!
                        </p>
                        <input type="file" id="restore-file" accept=".json" style="display:none;" onchange="DirectorBackup.handleFile(event)">
                        <button class="btn-primary" style="width:100%;background:linear-gradient(135deg,#f59e0b,#d97706);" onclick="document.getElementById('restore-file').click()">
                            <i class="fa-solid fa-upload"></i> Zgjedh File
                        </button>
                    </div>
                </div>

                <div class="info-card">
                    <div class="info-card-header">
                        <div class="info-card-avatar" style="background:linear-gradient(135deg,#a855f7,#ec4899);"><i class="fa-solid fa-file-excel"></i></div>
                        <div>
                            <div class="info-card-name">Eksport CSV</div>
                            <div class="info-card-sub">Për Excel</div>
                        </div>
                    </div>
                    <div class="info-card-body">
                        <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;line-height:1.5;">
                            Eksporto porositë në format CSV për t'i hapur me Excel ose Google Sheets.
                        </p>
                        <button class="btn-primary" style="width:100%;" onclick="DirectorBackup.exportOrdersCsv()">
                            <i class="fa-solid fa-file-excel"></i> Eksporto Porositë
                        </button>
                    </div>
                </div>

                <div class="info-card" style="border-color:rgba(244,63,94,.3);">
                    <div class="info-card-header">
                        <div class="info-card-avatar" style="background:linear-gradient(135deg,#f43f5e,#be123c);"><i class="fa-solid fa-broom"></i></div>
                        <div>
                            <div class="info-card-name">Pastrim i të Dhënave</div>
                            <div class="info-card-sub">Fshin të dhëna të vjetra</div>
                        </div>
                    </div>
                    <div class="info-card-body">
                        <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;line-height:1.5;">
                            Fshin porositë e vjetra (më shumë se 1 vit) për të kursyer hapësirë.
                        </p>
                        <button class="btn-primary" style="width:100%;background:linear-gradient(135deg,#f43f5e,#be123c);" onclick="DirectorBackup.cleanupOldData()">
                            <i class="fa-solid fa-trash"></i> Pastro të dhënat e vjetra
                        </button>
                    </div>
                </div>
            </div>

            <div class="admin-table-wrap">
                <div style="padding:14px 18px;background:var(--bg-tertiary);border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;">
                    <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--accent-purple);">
                        <i class="fa-solid fa-history"></i> Historiku i Backup-ve
                    </div>
                    <button class="filter-btn" style="padding:6px 12px;font-size:11px;" onclick="DirectorBackup.load()">
                        <i class="fa-solid fa-rotate"></i> Rifresko
                    </button>
                </div>
                <div id="backup-history-table"></div>
            </div>
        `;

        renderHistory();
    }

    // ═══ HISTORY TABLE ═══
    function renderHistory() {
        const wrap = document.getElementById('backup-history-table');
        if (!wrap) return;

        if (!lastBackups.length) {
            wrap.innerHTML = '<div class="empty-state" style="padding:40px;"><i class="fa-solid fa-database"></i><p>Nuk ka backup të ruajtur</p></div>';
            return;
        }

        wrap.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Madhësia</th>
                        <th>Krijuar nga</th>
                        <th>Koleksionet</th>
                        <th>Veprime</th>
                    </tr>
                </thead>
                <tbody>
                    ${lastBackups.map(b => `
                        <tr>
                            <td class="mono" style="font-size:11px;">${b.createdAtStr || '—'}</td>
                            <td class="mono">${b.size || '—'} KB</td>
                            <td>${b.createdByName || '—'}</td>
                            <td><span class="admin-badge blue">${b.collections || 0} koleksione</span></td>
                            <td>
                                <button class="filter-btn" style="padding:5px 10px;font-size:10px;" onclick="DirectorBackup.downloadStored('${b.id}')">
                                    <i class="fa-solid fa-download"></i> Shkarko
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // ═══ KRIJO BACKUP ═══
    async function createBackup() {
        showToast('info', '⏳ Duke u krijuar...', 'Kjo mund të zgjasë pak');

        try {
            const data = await window.TaxiBackup.exportAll();
            if (!data) throw new Error('Dështoi eksportimi');

            // Shkarko file
            const filename = `taxiapp-backup-${new Date().toISOString().slice(0, 10)}.json`;
            if (window.TaxiExport) {
                window.TaxiExport.toJson(data, filename);
            }

            // Regjistro në Firestore
            const db = window.TaxiFirebase?.db;
            if (db) {
                const collections = Object.keys(data).filter(k => Array.isArray(data[k]));
                const totalRecords = collections.reduce((s, k) => s + data[k].length, 0);

                await db.collection('backups').add({
                    createdAt: Date.now(),
                    createdAtStr: new Date().toLocaleString('sq-AL'),
                    createdBy: window.TaxiAuth?.currentUser()?.uid || null,
                    createdByName: window.DirectorApp?.currentOperator?.name || 'Drejtori',
                    collections: collections.length,
                    totalRecords: totalRecords,
                    size: Math.round(JSON.stringify(data).length / 1024),
                    filename: filename
                });
            }

            if (window.TaxiAuditLog) {
                window.TaxiAuditLog.log('backup_created', { filename });
            }

            showToast('success', '✅ Backup u krijua', filename);
            await load();

        } catch (e) {
            console.error('❌ createBackup:', e);
            showToast('error', 'Gabim', 'Nuk mund të krijohet backup');
        }
    }

    // ═══ HANDLE FILE ═══
    async function handleFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!confirm(`A jeni i sigurt që dëshironi të restauoni nga:\n\n${file.name}\n\nKjo mund të mbishkruajë të dhënat!`)) {
            event.target.value = '';
            return;
        }

        showToast('info', '⏳ Duke u restauruar...', 'Kjo mund të zgjasë');

        try {
            const ok = await window.TaxiBackup.importFromFile(file);
            if (ok) {
                if (window.TaxiAuditLog) {
                    window.TaxiAuditLog.log('backup_restored', { filename: file.name });
                }
                showToast('success', '✅ Restore OK', file.name);
            } else {
                showToast('error', 'Gabim', 'Restore dështoi');
            }
        } catch (e) {
            console.error('❌ restore:', e);
            showToast('error', 'Gabim', e.message);
        }

        event.target.value = '';
    }

    // ═══ EKSPORTO CSV ═══
    async function exportOrdersCsv() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        try {
            showToast('info', '⏳ Duke u eksportuar...', '');

            const snap = await db.collection('orders').orderBy('createdAtLocal', 'desc').limit(5000).get();
            const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            const rows = orders.map(o => ({
                'Data': o.createdDateStr || '',
                'Ora': o.createdTimeStr || '',
                'Statusi': o.status || '',
                'Vetura': o.vehicleNum || '',
                'Telefon': o.phone || '',
                'Klienti': o.name || '',
                'Marrja': o.pickup || '',
                'Destinacioni': o.destination || '',
                'Shoferi': o.driverName || '',
                'Operatori': o.operatorName || '',
                'Tarifa': o.tariff || '',
                'Shënim': o.remark || '',
                'Çmimi (€)': o.price || 0
            }));

            if (window.TaxiExport) {
                window.TaxiExport.toCsv(rows, `porosite-${Date.now()}.csv`);
                showToast('success', '📥 U shkarkua', `${orders.length} porosi`);
            }

        } catch (e) {
            console.error('❌ exportOrdersCsv:', e);
            showToast('error', 'Gabim', '');
        }
    }

    // ═══ CLEANUP OLD DATA ═══
    async function cleanupOldData() {
        if (!confirm('Fshi porositë më të vjetra se 1 vit?\n\nKjo nuk mund të kthehet!')) return;

        try {
            const db = window.TaxiFirebase?.db;
            if (!db) return;

            const oneYearAgo = Date.now() - (365 * 86400000);

            const snap = await db.collection('orders')
                .where('createdAtLocal', '<', oneYearAgo)
                .limit(500)
                .get();

            if (snap.empty) {
                showToast('info', 'Nuk ka të dhëna', 'Asnjë porosi më e vjetër se 1 vit');
                return;
            }

            if (!confirm(`U gjetën ${snap.size} porosi të vjetra. Vazhdojmë?`)) return;

            const batch = db.batch();
            snap.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();

            if (window.TaxiAuditLog) {
                window.TaxiAuditLog.log('old_data_cleaned', { count: snap.size });
            }

            showToast('success', '✅ U fshinë', `${snap.size} porosi të vjetra`);

        } catch (e) {
            console.error('❌ cleanupOldData:', e);
            showToast('error', 'Gabim', '');
        }
    }

    // ═══ DOWNLOAD STORED ═══
    async function downloadStored(backupId) {
        showToast('info', 'ℹ️', 'Backup i ruajtur nuk ka file direkt - eksporto sërish');
    }

    function showToast(type, title, msg) {
        if (window.DirectorApp?.showToast) window.DirectorApp.showToast(type, title, msg);
    }

    return { init, load, createBackup, handleFile, exportOrdersCsv, cleanupOldData, downloadStored };
})();

console.log('✅ director/backup.js ngarkuar');
