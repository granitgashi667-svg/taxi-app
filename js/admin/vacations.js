'use strict';

/**
 * js/admin/vacations.js — Kërkesat për pushim
 */

window.AdminVacations = (() => {
    let cachedVacations = [];
    let currentFilter = 'pending';

    // ═══ INIT ═══
    function init() {
        console.log('🏖️ AdminVacations: Init...');
    }

    // ═══ LOAD ═══
    async function load() {
        console.log('🏖️ Duke ngarkuar pushimet...');
        await renderAll();
    }

    // ═══ FILTER ═══
    function filter(f, btn) {
        currentFilter = f;
        document.querySelectorAll('.filter-btn[data-vfilter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderAll();
    }

    // ═══ RENDER ALL ═══
    async function renderAll() {
        const el = document.getElementById('vacations-content');
        if (!el) return;

        el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Duke ngarkuar...</p></div>';

        try {
            const db = window.TaxiFirebase?.db;
            if (!db) throw new Error('Firebase nuk është gati');

            let q = db.collection('vacations').orderBy('requestedAt', 'desc').limit(200);
            const snap = await q.get();

            let vacations = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Filter
            if (currentFilter !== 'all') {
                vacations = vacations.filter(v => v.status === currentFilter);
            }

            cachedVacations = vacations;
            renderStats(vacations);
            renderTable(vacations);

        } catch (e) {
            console.error('❌ renderAll:', e);
            // Nëse s'ka koleksion vacations ende, shfaq bosh
            if (e.code === 'failed-precondition' || e.message.includes('index')) {
                el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Nuk ka kërkesa për pushim</p></div>`;
            } else {
                el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Gabim: ${e.message}</p></div>`;
            }
        }
    }

    // ═══ STATS ═══
    function renderStats(vacations) {
        const el = document.getElementById('vacations-content');

        const pending = vacations.filter(v => v.status === 'pending').length;
        const approved = vacations.filter(v => v.status === 'approved').length;
        const rejected = vacations.filter(v => v.status === 'rejected').length;

        el.innerHTML = `
            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card yellow">
                    <div class="kpi-label"><i class="fa-solid fa-clock"></i> Në pritje</div>
                    <div class="kpi-value yellow">${pending}</div>
                    <div class="kpi-sub">Kërkesa pa aprovim</div>
                </div>
                <div class="kpi-card green">
                    <div class="kpi-label"><i class="fa-solid fa-check"></i> Aprovuar</div>
                    <div class="kpi-value green">${approved}</div>
                    <div class="kpi-sub">Pushime aktive</div>
                </div>
                <div class="kpi-card pink">
                    <div class="kpi-label"><i class="fa-solid fa-xmark"></i> Refuzuar</div>
                    <div class="kpi-value pink">${rejected}</div>
                    <div class="kpi-sub">Kërkesa të refuzuara</div>
                </div>
                <div class="kpi-card blue">
                    <div class="kpi-label"><i class="fa-solid fa-list"></i> Total</div>
                    <div class="kpi-value blue">${vacations.length}</div>
                    <div class="kpi-sub">Të gjitha kërkesat</div>
                </div>
            </div>

            <div class="page-actions" style="margin-bottom:16px;">
                <div class="filter-bar">
                    <button class="filter-btn ${currentFilter === 'all' ? 'active' : ''}" data-vfilter="all" onclick="AdminVacations.filter('all', this)">Të gjitha</button>
                    <button class="filter-btn ${currentFilter === 'pending' ? 'active' : ''}" data-vfilter="pending" onclick="AdminVacations.filter('pending', this)">Në pritje</button>
                    <button class="filter-btn ${currentFilter === 'approved' ? 'active' : ''}" data-vfilter="approved" onclick="AdminVacations.filter('approved', this)">Aprovuar</button>
                    <button class="filter-btn ${currentFilter === 'rejected' ? 'active' : ''}" data-vfilter="rejected" onclick="AdminVacations.filter('rejected', this)">Refuzuar</button>
                </div>
            </div>

            <div class="admin-table-wrap" id="vacations-table"></div>
        `;
    }

    // ═══ TABLE ═══
    function renderTable(vacations) {
        const wrap = document.getElementById('vacations-table');
        if (!wrap) return;

        if (!vacations.length) {
            wrap.innerHTML = '<div class="empty-state" style="padding:60px;"><i class="fa-solid fa-umbrella-beach"></i><p>Nuk ka kërkesa për pushim</p></div>';
            return;
        }

        wrap.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Operatori</th>
                        <th>Nga</th>
                        <th>Deri</th>
                        <th>Ditë</th>
                        <th>Arsyeja</th>
                        <th>Statusi</th>
                        <th>Kërkuar</th>
                        <th>Veprime</th>
                    </tr>
                </thead>
                <tbody>
                    ${vacations.map(v => {
                        const statusBadge = {
                            pending: '<span class="admin-badge yellow">Në pritje</span>',
                            approved: '<span class="admin-badge green">Aprovuar</span>',
                            rejected: '<span class="admin-badge red">Refuzuar</span>'
                        }[v.status] || '<span class="admin-badge gray">?</span>';

                        const actions = v.status === 'pending'
                            ? `<div style="display:flex;gap:4px;">
                                <button class="filter-btn" style="padding:5px 10px;font-size:10px;background:rgba(34,197,94,.15);border-color:var(--accent-green);color:var(--accent-green);" onclick="AdminVacations.approve('${v.id}', true)">
                                    <i class="fa-solid fa-check"></i>
                                </button>
                                <button class="filter-btn" style="padding:5px 10px;font-size:10px;background:rgba(244,63,94,.15);border-color:var(--accent-red);color:var(--accent-red);" onclick="AdminVacations.approve('${v.id}', false)">
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            </div>`
                            : '<span style="color:var(--text-muted);font-size:11px;">—</span>';

                        return `
                            <tr>
                                <td><strong style="color:var(--text-primary);">${v.operatorName || '—'}</strong></td>
                                <td class="mono">${v.dateFrom || '—'}</td>
                                <td class="mono">${v.dateTo || '—'}</td>
                                <td class="mono" style="font-weight:800;color:var(--accent-purple);">${v.days || '—'}</td>
                                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${v.reason || '—'}</td>
                                <td>${statusBadge}</td>
                                <td class="mono" style="font-size:10px;">${v.requestedAtStr || '—'}</td>
                                <td>${actions}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    // ═══ APPROVE / REJECT ═══
    async function approve(vacationId, isApproved) {
        if (!confirm(isApproved ? 'Aprovo këtë pushim?' : 'Refuzo këtë pushim?')) return;

        try {
            const db = window.TaxiFirebase?.db;
            if (!db) return;

            const update = {
                status: isApproved ? 'approved' : 'rejected',
                approvedBy: window.TaxiAuth?.currentUser()?.uid || null,
                approvedByName: window.AdminApp?.currentOperator?.name || 'Menagjer',
                approvedAt: Date.now(),
                approvedAtStr: new Date().toLocaleString('sq-AL')
            };

            await db.collection('vacations').doc(vacationId).update(update);

            if (window.TaxiAuditLog) {
                window.TaxiAuditLog.log(isApproved ? 'vacation_approved' : 'vacation_rejected', { vacationId });
            }

            showToast('success', isApproved ? '✅ Aprovuar' : '❌ Refuzuar', 'Kërkesa u përditësua');
            renderAll();

        } catch (e) {
            console.error('❌ approve:', e);
            showToast('error', 'Gabim', 'Nuk mund të përditësohet');
        }
    }

    function showToast(type, title, msg) {
        if (window.AdminApp?.showToast) window.AdminApp.showToast(type, title, msg);
    }

    return { init, load, filter, approve };
})();

console.log('✅ admin/vacations.js ngarkuar');
