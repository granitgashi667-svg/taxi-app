'use strict';

/**
 * js/admin/salaries.js — Salaries Management
 * Pagat e punëtorëve: bazë + bonuse - zbritje, kalkulim automatik
 */

window.AdminSalaries = (() => {
    let salariesCache = [];    // salaries
    let workersCache = [];     // workers
    let adjustmentsCache = []; // salary_adjustments (bonuse/zbritje)
    let filters = { month: '', workerId: 'all', status: 'all' };

    // ═══ INIT ═══
    function init() {
        console.log('💰 AdminSalaries: Init...');
        // Default: muaji aktual
        const now = new Date();
        filters.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    async function load() {
        await renderPage();
    }

    // ═══ RENDER FAQJA ═══
    async function renderPage() {
        const el = document.querySelector('.admin-page[data-page="salaries"]');
        if (!el) return;

        el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Duke ngarkuar...</p></div>';

        try {
            const db = window.TaxiFirebase?.db;
            if (!db) throw new Error('Firebase nuk është gati');

            await Promise.all([
                loadWorkers(db),
                loadSalaries(db),
                loadAdjustments(db)
            ]);

            el.innerHTML = renderLayout();
            renderStatsBlock();
            renderSalariesTable();
        } catch (e) {
            console.error('❌ Salaries render:', e);
            el.innerHTML = errBox('Gabim: ' + e.message);
        }
    }

    async function loadWorkers(db) {
        try {
            const snap = await db.collection('workers').limit(500).get();
            workersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch {
            try {
                const snap = await db.collection('users').where('role', 'in', ['operator', 'dispatcher', 'driver']).limit(500).get();
                workersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch { workersCache = []; }
        }
    }

    async function loadSalaries(db) {
        try {
            const snap = await db.collection('salaries').orderBy('month', 'desc').limit(500).get();
            salariesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch {
            const snap = await db.collection('salaries').limit(500).get();
            salariesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
    }

    async function loadAdjustments(db) {
        try {
            const snap = await db.collection('salary_adjustments').limit(1000).get();
            adjustmentsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch { adjustmentsCache = []; }
    }

    // ═══ LAYOUT ═══
    function renderLayout() {
        return `
            <div class="page-header" style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
                <div class="page-title">
                    <i class="fa-solid fa-money-bill-wave"></i>
                    <div>
                        <h2>Salaries</h2>
                        <p>Menaxhimi i pagave, bonuseve dhe zbritjeve</p>
                    </div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn-secondary" onclick="AdminSalaries.exportCsv()">
                        <i class="fa-solid fa-download"></i> CSV
                    </button>
                    <button class="btn-secondary" onclick="AdminSalaries.openAdjustmentModal()">
                        <i class="fa-solid fa-plus"></i> Bonus / Zbritje
                    </button>
                    <button class="btn-primary" onclick="AdminSalaries.openSalaryModal()">
                        <i class="fa-solid fa-money-bill"></i> Pagë e re
                    </button>
                </div>
            </div>

            <div id="sal-stats"></div>

            <div class="db-panel" style="margin-bottom:20px;">
                <div class="db-panel-header">
                    <i class="fa-solid fa-filter"></i>
                    <h3>Filtra</h3>
                </div>
                <div class="db-panel-body" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
                    <label style="font-size:11px;color:#94a3b8;">
                        Muaji
                        <input type="month" id="sal-month" class="input-sm" style="width:100%;margin-top:4px;"
                            value="${filters.month}" onchange="AdminSalaries.applyFilters()">
                    </label>
                    <label style="font-size:11px;color:#94a3b8;">
                        Punëtori
                        <select id="sal-worker" class="input-sm" style="width:100%;margin-top:4px;"
                            onchange="AdminSalaries.applyFilters()">
                            <option value="all">Të gjithë</option>
                            ${workersCache.map(w => `
                                <option value="${w.id}" ${filters.workerId === w.id ? 'selected' : ''}>
                                    ${w.name || w.email || w.id}
                                </option>
                            `).join('')}
                        </select>
                    </label>
                    <label style="font-size:11px;color:#94a3b8;">
                        Statusi
                        <select id="sal-status" class="input-sm" style="width:100%;margin-top:4px;"
                            onchange="AdminSalaries.applyFilters()">
                            <option value="all" ${filters.status === 'all' ? 'selected' : ''}>Të gjitha</option>
                            <option value="pending" ${filters.status === 'pending' ? 'selected' : ''}>Në pritje</option>
                            <option value="paid" ${filters.status === 'paid' ? 'selected' : ''}>Paguar</option>
                        </select>
                    </label>
                    <div style="display:flex;align-items:flex-end;">
                        <button class="btn-secondary" style="width:100%;" onclick="AdminSalaries.resetFilters()">
                            <i class="fa-solid fa-rotate"></i> Reset
                        </button>
                    </div>
                </div>
            </div>

            <div class="db-panel">
                <div class="db-panel-header">
                    <i class="fa-solid fa-list"></i>
                    <h3>Pagat</h3>
                </div>
                <div class="db-panel-body" style="padding:0;">
                    <div id="sal-table"></div>
                </div>
            </div>

            <div id="sal-modal-root"></div>
        `;
    }

    // ═══ STATS ═══
    function renderStatsBlock() {
        const el = document.getElementById('sal-stats');
        if (!el) return;

        const filtered = applyFiltersToSalaries();
        const totalBase = filtered.reduce((s, x) => s + (parseFloat(x.baseSalary) || 0), 0);
        const totalBonus = filtered.reduce((s, x) => s + (parseFloat(x.bonus) || 0), 0);
        const totalDeduct = filtered.reduce((s, x) => s + (parseFloat(x.deductions) || 0), 0);
        const totalNet = filtered.reduce((s, x) => s + (parseFloat(x.net) || 0), 0);
        const paid = filtered.filter(x => x.status === 'paid').length;

        el.innerHTML = `
            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card blue">
                    <div class="kpi-label"><i class="fa-solid fa-money-bill"></i> Paga bazë</div>
                    <div class="kpi-value blue">€${totalBase.toFixed(2)}</div>
                    <div class="kpi-sub">${filtered.length} punëtorë</div>
                </div>
                <div class="kpi-card green">
                    <div class="kpi-label"><i class="fa-solid fa-gift"></i> Bonuse</div>
                    <div class="kpi-value green">+€${totalBonus.toFixed(2)}</div>
                    <div class="kpi-sub">Shtesa</div>
                </div>
                <div class="kpi-card pink">
                    <div class="kpi-label"><i class="fa-solid fa-minus"></i> Zbritje</div>
                    <div class="kpi-value pink">-€${totalDeduct.toFixed(2)}</div>
                    <div class="kpi-sub">Nga paga</div>
                </div>
                <div class="kpi-card yellow">
                    <div class="kpi-label"><i class="fa-solid fa-hand-holding-dollar"></i> Neto total</div>
                    <div class="kpi-value yellow">€${totalNet.toFixed(2)}</div>
                    <div class="kpi-sub">${paid} të paguar</div>
                </div>
            </div>
        `;
    }

    // ═══ TABELA ═══
    function renderSalariesTable() {
        const el = document.getElementById('sal-table');
        if (!el) return;

        const filtered = applyFiltersToSalaries();

        if (!filtered.length) {
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-money-bill"></i><p>Nuk ka paga për këtë muaj</p></div>';
            return;
        }

        el.innerHTML = `
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Punëtori</th>
                            <th>Roli</th>
                            <th>Baza €</th>
                            <th>Bonuse</th>
                            <th>Zbritje</th>
                            <th>Neto €</th>
                            <th>Statusi</th>
                            <th>Paguar</th>
                            <th>Veprime</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.map(s => {
                            const bonus = parseFloat(s.bonus) || 0;
                            const deduct = parseFloat(s.deductions) || 0;
                            const net = parseFloat(s.net) || 0;
                            const isPaid = s.status === 'paid';
                            return `
                                <tr>
                                    <td><strong>${s.workerName || '—'}</strong></td>
                                    <td><span style="font-size:10px;color:#94a3b8;text-transform:uppercase;">${s.role || '—'}</span></td>
                                    <td class="mono">€${(parseFloat(s.baseSalary) || 0).toFixed(2)}</td>
                                    <td class="mono green">${bonus > 0 ? '+€' + bonus.toFixed(2) : '—'}</td>
                                    <td class="mono" style="color:#ef4444;">${deduct > 0 ? '-€' + deduct.toFixed(2) : '—'}</td>
                                    <td class="mono" style="font-weight:800;color:${isPaid ? '#10b981' : '#f59e0b'};">
                                        €${net.toFixed(2)}
                                    </td>
                                    <td>
                                        <span class="status-badge ${isPaid ? 'completed' : 'pending'}">
                                            ${isPaid ? 'Paguar' : 'Në pritje'}
                                        </span>
                                    </td>
                                    <td class="mono" style="font-size:10px;">${formatDate(s.paidAt) || '—'}</td>
                                    <td>
                                        ${!isPaid ? `
                                            <button class="btn-icon" title="Paguaj" onclick="AdminSalaries.markPaid('${s.id}')">
                                                <i class="fa-solid fa-check"></i>
                                            </button>
                                        ` : ''}
                                        <button class="btn-icon" title="Detaje" onclick="AdminSalaries.openDetail('${s.id}')">
                                            <i class="fa-solid fa-eye"></i>
                                        </button>
                                        <button class="btn-icon danger" title="Fshij" onclick="AdminSalaries.deleteSalary('${s.id}')">
                                            <i class="fa-solid fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // ═══ FILTRA ═══
    function applyFiltersToSalaries() {
        let out = [...salariesCache];

        if (filters.month) {
            out = out.filter(s => s.month === filters.month);
        }
        if (filters.workerId !== 'all') {
            out = out.filter(s => s.workerId === filters.workerId);
        }
        if (filters.status !== 'all') {
            out = out.filter(s => s.status === filters.status);
        }

        return out.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    }

    function applyFilters() {
        filters.month = document.getElementById('sal-month')?.value || '';
        filters.workerId = document.getElementById('sal-worker')?.value || 'all';
        filters.status = document.getElementById('sal-status')?.value || 'all';
        renderStatsBlock();
        renderSalariesTable();
    }

    function resetFilters() {
        const now = new Date();
        filters = {
            month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
            workerId: 'all',
            status: 'all'
        };
        renderPage();
    }

    // ═══ ADJUSTMENTS HELPERS ═══
    function getAdjustmentsFor(workerId, month) {
        return adjustmentsCache.filter(a => a.workerId === workerId && a.month === month);
    }

    function calcBonuses(workerId, month) {
        return getAdjustmentsFor(workerId, month)
            .filter(a => a.type === 'bonus')
            .reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
    }

    function calcDeductions(workerId, month) {
        return getAdjustmentsFor(workerId, month)
            .filter(a => a.type === 'deduction')
            .reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
    }

    // ═══ MODAL: PAGË E RE ═══
    function openSalaryModal() {
        showModal(`
            <h3><i class="fa-solid fa-money-bill"></i> Pagë e re</h3>
            <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
                <label style="font-size:11px;color:#94a3b8;">
                    Punëtori *
                    <select id="s-worker" class="input" style="width:100%;margin-top:4px;" onchange="AdminSalaries.previewSalary()">
                        <option value="">— Zgjidh —</option>
                        ${workersCache.map(w => `
                            <option value="${w.id}" data-name="${w.name || w.email || ''}" data-role="${w.role || ''}" data-base="${w.baseSalary || 0}">
                                ${w.name || w.email || w.id} ${w.role ? '· ' + w.role : ''}
                            </option>
                        `).join('')}
                    </select>
                </label>
                <label style="font-size:11px;color:#94a3b8;">
                    Muaji *
                    <input type="month" id="s-month" class="input" value="${filters.month}" style="width:100%;margin-top:4px;"
                        onchange="AdminSalaries.previewSalary()">
                </label>
                <label style="font-size:11px;color:#94a3b8;">
                    Paga bazë (€) *
                    <input type="number" id="s-base" class="input" step="0.01" min="0" value="500"
                        style="width:100%;margin-top:4px;" oninput="AdminSalaries.previewSalary()">
                </label>
                <div style="padding:12px;background:#1e293b;border-radius:8px;font-size:12px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                        <span style="color:#94a3b8;">Bonuse (auto):</span>
                        <strong id="s-preview-bonus" style="color:#10b981;">+€0.00</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                        <span style="color:#94a3b8;">Zbritje (auto):</span>
                        <strong id="s-preview-deduct" style="color:#ef4444;">-€0.00</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;border-top:1px solid #334155;padding-top:6px;margin-top:6px;">
                        <span style="color:#94a3b8;">Neto:</span>
                        <strong id="s-preview-net" style="color:#f1f5f9;font-size:16px;">€0.00</strong>
                    </div>
                </div>
                <label style="font-size:11px;color:#94a3b8;">
                    Shënime
                    <textarea id="s-notes" class="input" rows="2" style="width:100%;margin-top:4px;"></textarea>
                </label>
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
                    <button class="btn-secondary" onclick="AdminSalaries.closeModal()">Anulo</button>
                    <button class="btn-primary" onclick="AdminSalaries.saveSalary()"><i class="fa-solid fa-save"></i> Ruaj</button>
                </div>
            </div>
        `, 480);
    }

    function previewSalary() {
        const workerSel = document.getElementById('s-worker');
        const workerId = workerSel?.value;
        const month = document.getElementById('s-month')?.value;
        const base = parseFloat(document.getElementById('s-base')?.value || '0');

        if (!workerId || !month) return;

        const bonus = calcBonuses(workerId, month);
        const deduct = calcDeductions(workerId, month);
        const net = base + bonus - deduct;

        document.getElementById('s-preview-bonus').textContent = '+€' + bonus.toFixed(2);
        document.getElementById('s-preview-deduct').textContent = '-€' + deduct.toFixed(2);
        document.getElementById('s-preview-net').textContent = '€' + net.toFixed(2);
    }

    async function saveSalary() {
        const db = window.TaxiFirebase?.db;
        if (!db) return alert('Firebase nuk është gati');

        const workerSel = document.getElementById('s-worker');
        const workerId = workerSel?.value;
        const opt = workerSel?.options[workerSel.selectedIndex];
        const workerName = opt?.getAttribute('data-name') || '';
        const role = opt?.getAttribute('data-role') || '';

        const month = document.getElementById('s-month')?.value;
        const baseSalary = parseFloat(document.getElementById('s-base')?.value || '0');
        const notes = document.getElementById('s-notes')?.value?.trim() || '';

        if (!workerId) return alert('Zgjidh punëtorin');
        if (!month) return alert('Zgjidh muajin');
        if (baseSalary < 0) return alert('Paga bazë e pavlefshme');

        const bonus = calcBonuses(workerId, month);
        const deductions = calcDeductions(workerId, month);
        const net = +(baseSalary + bonus - deductions).toFixed(2);

        // Kontrollo nëse ekziston tashmë
        const existing = salariesCache.find(s => s.workerId === workerId && s.month === month);
        if (existing) {
            if (!confirm(`Paga për ${workerName} në ${month} ekziston. Përditëso?`)) return;
        }

        try {
            const data = {
                workerId, workerName, role, month,
                baseSalary, bonus, deductions, net, notes,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: window.TaxiFirebase?.auth?.currentUser?.email || 'admin'
            };

            if (existing) {
                await db.collection('salaries').doc(existing.id).update(data);
            } else {
                await db.collection('salaries').add(data);
            }

            closeModal();
            showToast('success', '✅ Paga u ruajt', `Neto: €${net}`);
            await renderPage();
        } catch (e) {
            console.error('❌ saveSalary:', e);
            alert('Gabim: ' + e.message);
        }
    }

    // ═══ MODAL: BONUS / ZBRITJE ═══
    function openAdjustmentModal() {
        showModal(`
            <h3><i class="fa-solid fa-sliders"></i> Bonus / Zbritje</h3>
            <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
                <label style="font-size:11px;color:#94a3b8;">
                    Punëtori *
                    <select id="adj-worker" class="input" style="width:100%;margin-top:4px;">
                        <option value="">— Zgjidh —</option>
                        ${workersCache.map(w => `
                            <option value="${w.id}" data-name="${w.name || w.email || ''}">
                                ${w.name || w.email || w.id}
                            </option>
                        `).join('')}
                    </select>
                </label>
                <label style="font-size:11px;color:#94a3b8;">
                    Muaji *
                    <input type="month" id="adj-month" class="input" value="${filters.month}" style="width:100%;margin-top:4px;">
                </label>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <label style="font-size:11px;color:#94a3b8;">
                        Tipi *
                        <select id="adj-type" class="input" style="width:100%;margin-top:4px;">
                            <option value="bonus">➕ Bonus</option>
                            <option value="deduction">➖ Zbritje</option>
                        </select>
                    </label>
                    <label style="font-size:11px;color:#94a3b8;">
                        Vlera (€) *
                        <input type="number" id="adj-amount" class="input" step="0.01" min="0" value="0"
                            style="width:100%;margin-top:4px;">
                    </label>
                </div>
                <label style="font-size:11px;color:#94a3b8;">
                    Arsyeja *
                    <input type="text" id="adj-reason" class="input" placeholder="p.sh. Performancë, vonesë..." style="width:100%;margin-top:4px;">
                </label>
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
                    <button class="btn-secondary" onclick="AdminSalaries.closeModal()">Anulo</button>
                    <button class="btn-primary" onclick="AdminSalaries.saveAdjustment()"><i class="fa-solid fa-save"></i> Ruaj</button>
                </div>
            </div>
        `, 460);
    }

    async function saveAdjustment() {
        const db = window.TaxiFirebase?.db;
        if (!db) return alert('Firebase nuk është gati');

        const workerSel = document.getElementById('adj-worker');
        const workerId = workerSel?.value;
        const workerName = workerSel?.options[workerSel.selectedIndex]?.getAttribute('data-name') || '';

        const month = document.getElementById('adj-month')?.value;
        const type = document.getElementById('adj-type')?.value;
        const amount = parseFloat(document.getElementById('adj-amount')?.value || '0');
        const reason = document.getElementById('adj-reason')?.value?.trim();

        if (!workerId) return alert('Zgjidh punëtorin');
        if (!month) return alert('Zgjidh muajin');
        if (!amount || amount <= 0) return alert('Shkruaj vlerën');
        if (!reason) return alert('Shkruaj arsyen');

        try {
            await db.collection('salary_adjustments').add({
                workerId, workerName, month, type, amount, reason,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                by: window.TaxiFirebase?.auth?.currentUser?.email || 'admin'
            });

            closeModal();
            showToast('success', type === 'bonus' ? '➕ Bonus u shtua' : '➖ Zbritje u shtua', `€${amount}`);
            await renderPage();
        } catch (e) {
            console.error('❌ saveAdjustment:', e);
            alert('Gabim: ' + e.message);
        }
    }

    // ═══ MODAL: DETAJE ═══
    function openDetail(salaryId) {
        const s = salariesCache.find(x => x.id === salaryId);
        if (!s) return;

        const adjs = getAdjustmentsFor(s.workerId, s.month);

        showModal(`
            <h3><i class="fa-solid fa-receipt"></i> Detajet e pagës</h3>
            <div style="margin-top:16px;">
                <div style="padding:14px;background:rgba(59,130,246,.1);border-radius:8px;margin-bottom:14px;">
                    <div style="font-size:16px;font-weight:800;">${s.workerName}</div>
                    <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;margin-top:4px;">
                        ${s.role || '—'} · ${s.month}
                    </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:8px;font-size:12px;">
                    <div style="display:flex;justify-content:space-between;padding:8px;background:#1e293b;border-radius:6px;">
                        <span>Paga bazë</span>
                        <strong class="mono">€${(parseFloat(s.baseSalary) || 0).toFixed(2)}</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:8px;background:#1e293b;border-radius:6px;">
                        <span>Bonuse</span>
                        <strong class="mono green">+€${(parseFloat(s.bonus) || 0).toFixed(2)}</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:8px;background:#1e293b;border-radius:6px;">
                        <span>Zbritje</span>
                        <strong class="mono" style="color:#ef4444;">-€${(parseFloat(s.deductions) || 0).toFixed(2)}</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:10px;background:rgba(16,185,129,.15);border-radius:6px;margin-top:4px;">
                        <strong>NETO</strong>
                        <strong class="mono" style="color:#10b981;font-size:16px;">€${(parseFloat(s.net) || 0).toFixed(2)}</strong>
                    </div>
                </div>

                ${adjs.length ? `
                    <h4 style="margin-top:20px;margin-bottom:10px;font-size:12px;color:#94a3b8;text-transform:uppercase;">
                        <i class="fa-solid fa-sliders"></i> Rregullime (${adjs.length})
                    </h4>
                    <div style="max-height:220px;overflow-y:auto;">
                        <table class="admin-table" style="font-size:11px;">
                            <thead><tr><th>Data</th><th>Tipi</th><th>Vlera</th><th>Arsyeja</th></tr></thead>
                            <tbody>
                                ${adjs.map(a => `
                                    <tr>
                                        <td class="mono" style="font-size:10px;">${formatDate(a.createdAt)}</td>
                                        <td>${a.type === 'bonus' ? '➕ Bonus' : '➖ Zbritje'}</td>
                                        <td class="mono" style="color:${a.type === 'bonus' ? '#10b981' : '#ef4444'};font-weight:800;">
                                            ${a.type === 'bonus' ? '+' : '-'}€${(parseFloat(a.amount) || 0).toFixed(2)}
                                        </td>
                                        <td style="font-size:11px;">${a.reason || '—'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}

                ${s.notes ? `
                    <div style="margin-top:14px;padding:10px;background:#1e293b;border-radius:6px;font-size:11px;color:#94a3b8;">
                        <strong>Shënime:</strong> ${s.notes}
                    </div>
                ` : ''}

                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
                    <button class="btn-secondary" onclick="AdminSalaries.closeModal()">Mbyll</button>
                    <button class="btn-primary" onclick="window.print()"><i class="fa-solid fa-print"></i> Printo</button>
                </div>
            </div>
        `, 560);
    }

    // ═══ PAGUAJ ═══
    async function markPaid(salaryId) {
        const s = salariesCache.find(x => x.id === salaryId);
        if (!s) return;
        if (!confirm(`Shëno si të paguar për ${s.workerName} (€${s.net})?`)) return;

        try {
            await window.TaxiFirebase.db.collection('salaries').doc(salaryId).update({
                status: 'paid',
                paidAt: firebase.firestore.FieldValue.serverTimestamp(),
                paidBy: window.TaxiFirebase?.auth?.currentUser?.email || 'admin'
            });
            showToast('success', '✅ U shënua si paguar', s.workerName);
            await renderPage();
        } catch (e) {
            console.error('❌ markPaid:', e);
            alert('Gabim: ' + e.message);
        }
    }

    async function deleteSalary(salaryId) {
        if (!confirm('Fshij këtë pagë?')) return;
        try {
            await window.TaxiFirebase.db.collection('salaries').doc(salaryId).delete();
            await renderPage();
        } catch (e) { alert('Gabim: ' + e.message); }
    }

    // ═══ EXPORT CSV ═══
    function exportCsv() {
        const filtered = applyFiltersToSalaries();
        if (!filtered.length) return showToast('warning', 'Nuk ka të dhëna', '');

        const rows = filtered.map(s => ({
            'Punëtori': s.workerName || '',
            'Roli': s.role || '',
            'Muaji': s.month || '',
            'Baza €': parseFloat(s.baseSalary || 0).toFixed(2),
            'Bonuse €': parseFloat(s.bonus || 0).toFixed(2),
            'Zbritje €': parseFloat(s.deductions || 0).toFixed(2),
            'Neto €': parseFloat(s.net || 0).toFixed(2),
            'Statusi': s.status === 'paid' ? 'Paguar' : 'Në pritje',
            'Paguar': formatDate(s.paidAt),
            'Shënime': s.notes || ''
        }));

        if (window.TaxiExport) {
            window.TaxiExport.toCsv(rows, `salaries-${filters.month || 'all'}.csv`);
            showToast('success', '📥 CSV u shkarkua', '');
        }
    }

    // ═══ MODAL HELPERS ═══
    function showModal(html, maxWidth = 520) {
        let root = document.getElementById('sal-modal-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'sal-modal-root';
            document.body.appendChild(root);
        }
        root.innerHTML = `
            <div class="modal-overlay" onclick="AdminSalaries.closeModal(event)">
                <div class="modal-box" onclick="event.stopPropagation()" style="max-width:${maxWidth}px;max-height:85vh;overflow-y:auto;">
                    ${html}
                </div>
            </div>
        `;
    }

    function closeModal(e) {
        if (e && e.target && !e.target.classList.contains('modal-overlay')) return;
        const root = document.getElementById('sal-modal-root');
        if (root) root.innerHTML = '';
    }

    function formatDate(ts) {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
        return d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function showToast(type, title, msg) {
        if (window.AdminApp?.showToast) window.AdminApp.showToast(type, title, msg);
    }

    function errBox(msg) {
        return `<div class="empty-state" style="color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i><p>${msg}</p></div>`;
    }

    return {
        init, load,
        applyFilters, resetFilters,
        openSalaryModal, saveSalary, previewSalary,
        openAdjustmentModal, saveAdjustment,
        openDetail, markPaid, deleteSalary,
        exportCsv, closeModal
    };
})();

console.log('✅ admin/salaries.js ngarkuar');
