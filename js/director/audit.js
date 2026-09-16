'use strict';

/**
 * js/director/audit.js — Audit Log (të gjitha veprimet)
 */

window.DirectorAuditLog = (() => {
    let cachedLogs = [];
    let currentFilter = 'today';
    let currentAction = '';

    // ═══ INIT ═══
    function init() {
        console.log('🛡️ DirectorAuditLog: Init...');
    }

    // ═══ LOAD ═══
    async function load() {
        console.log('🛡️ Duke ngarkuar audit log...');
        await renderAll();
    }

    // ═══ FILTER ═══
    function filter(f, btn) {
        currentFilter = f;
        document.querySelectorAll('.filter-btn[data-afilter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderAll();
    }

    // ═══ RENDER ALL ═══
    async function renderAll() {
        const el = document.getElementById('audit-content');
        if (!el) return;

        el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Duke ngarkuar...</p></div>';

        try {
            const db = window.TaxiFirebase?.db;
            if (!db) throw new Error('Firebase nuk është gati');

            const range = getDateRange(currentFilter);

            let q = db.collection('audit_log')
                .where('timestamp', '>=', range.from)
                .where('timestamp', '<=', range.to)
                .orderBy('timestamp', 'desc')
                .limit(500);

            const snap = await q.get();
            let logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Filter action
            if (currentAction) {
                logs = logs.filter(l => l.action === currentAction);
            }

            cachedLogs = logs;
            renderStats(logs);
            renderTable(logs);

        } catch (e) {
            console.error('❌ renderAll:', e);
            if (e.message.includes('index')) {
                el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-info-circle"></i><p>Koleksioni audit_log është bosh ose indeksi mungon</p></div>`;
            } else {
                el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Gabim: ${e.message}</p></div>`;
            }
        }
    }

    // ═══ RANGE ═══
    function getDateRange(filter) {
        const now = new Date();
        const start = new Date(now);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);

        switch (filter) {
            case 'today': start.setHours(0, 0, 0, 0); break;
            case 'week':
                start.setDate(start.getDate() - 7);
                start.setHours(0, 0, 0, 0);
                break;
            case 'month':
                start.setDate(start.getDate() - 30);
                start.setHours(0, 0, 0, 0);
                break;
            case 'all':
                start.setFullYear(2020, 0, 1);
                break;
        }
        return { from: start.getTime(), to: end.getTime() };
    }

    // ═══ STATS ═══
    function renderStats(logs) {
        const el = document.getElementById('audit-content');

        const total = logs.length;

        // Grupim sipas llojit
        const byLevel = { info: 0, success: 0, warn: 0, error: 0 };
        logs.forEach(l => { if (byLevel[l.level] !== undefined) byLevel[l.level]++; });

        // Aktivitete
        const orderActions = logs.filter(l => l.action?.startsWith('order_')).length;
        const driverActions = logs.filter(l => l.action?.startsWith('driver_')).length;
        const clientActions = logs.filter(l => l.action?.startsWith('client_')).length;

        el.innerHTML = `
            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card blue">
                    <div class="kpi-label"><i class="fa-solid fa-list"></i> Total veprime</div>
                    <div class="kpi-value blue">${total}</div>
                    <div class="kpi-sub">Të regjistruara</div>
                </div>
                <div class="kpi-card green">
                    <div class="kpi-label"><i class="fa-solid fa-clipboard-list"></i> Porosi</div>
                    <div class="kpi-value green">${orderActions}</div>
                    <div class="kpi-sub">Veprime porosish</div>
                </div>
                <div class="kpi-card purple">
                    <div class="kpi-label"><i class="fa-solid fa-car"></i> Shoferë</div>
                    <div class="kpi-value" style="color:var(--accent-purple);">${driverActions}</div>
                    <div class="kpi-sub">Veprime shoferësh</div>
                </div>
                <div class="kpi-card yellow">
                    <div class="kpi-label"><i class="fa-solid fa-user"></i> Klientë</div>
                    <div class="kpi-value yellow">${clientActions}</div>
                    <div class="kpi-sub">Veprime klientësh</div>
                </div>
            </div>

            <div class="page-actions" style="margin-bottom:16px;flex-wrap:wrap;">
                <div class="filter-bar">
                    <button class="filter-btn ${currentFilter === 'today' ? 'active' : ''}" data-afilter="today" onclick="DirectorAuditLog.filter('today', this)">Sot</button>
                    <button class="filter-btn ${currentFilter === 'week' ? 'active' : ''}" data-afilter="week" onclick="DirectorAuditLog.filter('week', this)">7 ditë</button>
                    <button class="filter-btn ${currentFilter === 'month' ? 'active' : ''}" data-afilter="month" onclick="DirectorAuditLog.filter('month', this)">30 ditë</button>
                    <button class="filter-btn ${currentFilter === 'all' ? 'active' : ''}" data-afilter="all" onclick="DirectorAuditLog.filter('all', this)">Të gjitha</button>
                </div>
                <div style="display:flex;gap:8px;">
                    <select id="audit-action-filter" class="input-field" style="min-width:180px;padding:9px 14px;font-size:12px;" onchange="DirectorAuditLog.applyActionFilter(this.value)">
                        <option value="">Të gjitha veprimet</option>
                        <option value="admin_login">Login admin</option>
                        <option value="admin_logout">Logout admin</option>
                        <option value="order_created">Porosi të reja</option>
                        <option value="order_cancelled">Porosi të anuluara</option>
                        <option value="order_assigned">Porosi të caktuara</option>
                        <option value="order_completed">Porosi të kryera</option>
                        <option value="driver_login">Login shoferi</option>
                        <option value="driver_accepted_order">Pranim nga shoferi</option>
                        <option value="client_login">Login klienti</option>
                        <option value="client_created_order">Porosi nga klient</option>
                        <option value="blacklist_add">Blacklist</option>
                        <option value="commission_changed">Komisioni</option>
                    </select>
                    <button class="filter-btn" style="padding:9px 14px;" onclick="DirectorAuditLog.exportCsv()">
                        <i class="fa-solid fa-download"></i> Eksporto
                    </button>
                </div>
            </div>

            <div class="admin-table-wrap" id="audit-table-wrap"></div>
        `;
    }

    // ═══ TABLE ═══
    function renderTable(logs) {
        const wrap = document.getElementById('audit-table-wrap');
        if (!wrap) return;

        if (!logs.length) {
            wrap.innerHTML = '<div class="empty-state" style="padding:60px;"><i class="fa-solid fa-inbox"></i><p>Nuk ka aktivitet</p></div>';
            return;
        }

        const levelColors = {
            info: 'blue',
            success: 'green',
            warn: 'yellow',
            error: 'red'
        };

        const actionLabels = {
            'order_created': 'Porosi e re',
            'order_cancelled': 'Porosi u anulua',
            'order_deleted': 'Porosi u fshi',
            'order_assigned': 'Porosi u caktua',
            'order_completed': 'Porosi përfundoi',
            'order_arrived': 'Shoferi arriti',
            'client_login': 'Login klienti',
            'client_created_order': 'Porosi nga klient',
            'client_cancelled_order': 'Klient anuloi',
            'driver_login': 'Login shoferi',
            'driver_accepted_order': 'Shofer pranoi',
            'driver_rejected_order': 'Shofer refuzoi',
            'driver_status_change': 'Shofer ndryshoi status',
            'driver_completed_order': 'Shofer përfundoi',
            'admin_login': 'Login panel',
            'admin_logout': 'Logout panel',
            'director_login': 'Login drejtori',
            'director_logout': 'Logout drejtori',
            'blacklist_add': 'U bllokua numër',
            'blacklist_remove': 'U zhbllokua numër',
            'broadcast_sent': 'Broadcast',
            'commission_changed': 'Komisioni ndryshoi',
            'user_created': 'Përdorues i re',
            'user_updated': 'Përdorues u përditësua',
            'user_role_changed': 'Roli u ndryshua',
            'user_activated': 'Përdorues u aktivizua',
            'user_deactivated': 'Përdorues u çaktivizua',
            'settings_general_changed': 'Cilësimet ndryshuan',
            'tariffs_changed': 'Tarifat ndryshuan',
            'vacation_approved': 'Pushim u aprovua',
            'vacation_rejected': 'Pushim u refuzua',
            'backup_created': 'Backup u krijua',
            'backup_restored': 'Backup u restaurua'
        };

        wrap.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Ora</th>
                        <th>Niveli</th>
                        <th>Veprimi</th>
                        <th>Përdoruesi</th>
                        <th>Roli</th>
                        <th>Detaje</th>
                    </tr>
                </thead>
                <tbody>
                    ${logs.map(l => {
                        const label = actionLabels[l.action] || l.action;
                        const levelColor = levelColors[l.level] || 'blue';
                        const details = formatDetails(l);

                        return `
                            <tr>
                                <td class="mono" style="font-size:10px;">${l.timestampStr || '—'}</td>
                                <td><span class="admin-badge ${levelColor}">${l.level || 'info'}</span></td>
                                <td style="font-weight:600;color:var(--text-primary);">${label}</td>
                                <td>${l.userName || '—'}</td>
                                <td><span class="admin-badge gray">${l.userRole || '—'}</span></td>
                                <td style="font-size:11px;color:var(--text-muted);max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${details}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    // ═══ FORMAT DETAILS ═══
    function formatDetails(log) {
        const d = log.details || {};
        const parts = [];

        if (d.phone) parts.push(`📞 ${d.phone}`);
        if (d.orderId) parts.push(`#${String(d.orderId).slice(-6)}`);
        if (d.driverId) parts.push(`🚗 ${d.driverId.slice(0, 6)}...`);
        if (d.price) parts.push(`€${d.price}`);
        if (d.status) parts.push(d.status);
        if (d.reason) parts.push(d.reason);
        if (d.value) parts.push(`${d.value}%`);
        if (d.role) parts.push(d.role);
        if (d.email) parts.push(d.email);
        if (d.message) parts.push(d.message);

        return parts.length ? parts.join(' · ') : '—';
    }

    // ═══ APPLY ACTION FILTER ═══
    function applyActionFilter(action) {
        currentAction = action;
        renderAll();
    }

    // ═══ EXPORT CSV ═══
    function exportCsv() {
        if (!cachedLogs.length) {
            showToast('warning', 'Nuk ka të dhëna', '');
            return;
        }

        const rows = cachedLogs.map(l => ({
            'Data': l.timestampStr || '',
            'Niveli': l.level || '',
            'Veprimi': l.action || '',
            'Përdoruesi': l.userName || '',
            'Roli': l.userRole || '',
            'Email': l.userEmail || '',
            'Detaje': JSON.stringify(l.details || {})
        }));

        if (window.TaxiExport) {
            window.TaxiExport.toCsv(rows, `audit-${currentFilter}-${Date.now()}.csv`);
            showToast('success', '📥 U shkarkua', '');
        }
    }

    function showToast(type, title, msg) {
        if (window.DirectorApp?.showToast) window.DirectorApp.showToast(type, title, msg);
    }

    return { init, load, filter, applyActionFilter, exportCsv };
})();

console.log('✅ director/audit.js ngarkuar');
