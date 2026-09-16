'use strict';

/**
 * mobile-users.js — Menaxhimi i përdoruesve mobile
 */

window.TaxiMobileUsers = (() => {
    const COLLECTION = 'mobile_clients';

    function db() { return window.TaxiFirebase?.db || null; }

    // ═══ MERR TË GJITHË ═══
    async function getAll(limit = 200) {
        const database = db();
        if (!database) return [];

        try {
            const snap = await database.collection(COLLECTION)
                .orderBy('registeredAt', 'desc')
                .limit(limit)
                .get();
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.error('❌ getAll:', e);
            return [];
        }
    }

    // ═══ STATS ═══
    async function getStats() {
        const users = await getAll(1000);
        const today = new Date().toLocaleDateString('sq-AL');

        return {
            total: users.length,
            active: users.filter(u => u.status === 'active').length,
            blocked: users.filter(u => u.status === 'blocked').length,
            pending: users.filter(u => u.status === 'pending').length,
            today: users.filter(u => (u.registeredAtStr || '').startsWith(today)).length
        };
    }

    // ═══ BLLOKO ═══
    async function block(userId, reason = '') {
        const database = db();
        if (!database) return;

        try {
            await database.collection(COLLECTION).doc(userId).update({
                status: 'blocked',
                blockedReason: reason,
                blockedAt: Date.now(),
                blockedBy: window.TaxiAuth?.currentUser()?.uid || null
            });
            console.log('🚫 User u bllokua:', userId);
        } catch (e) { console.error('❌ block:', e); }
    }

    // ═══ AKTIVIZO ═══
    async function unblock(userId) {
        const database = db();
        if (!database) return;

        try {
            await database.collection(COLLECTION).doc(userId).update({
                status: 'active',
                unblockedAt: Date.now()
            });
            console.log('✅ User u aktivizua:', userId);
        } catch (e) { console.error('❌ unblock:', e); }
    }

    // ═══ FSHIJ ═══
    async function remove(userId) {
        const database = db();
        if (!database) return;

        try {
            await database.collection(COLLECTION).doc(userId).delete();
            console.log('🗑️ User u fshi:', userId);
        } catch (e) { console.error('❌ remove:', e); }
    }

    // ═══ RENDER FAQJA ═══
    async function renderPage() {
        const el = document.querySelector('.page[data-page="mobile-users"]');
        if (!el) return;

        el.innerHTML = `
            <div class="page-header">
                <div class="page-title">
                    <i class="fa-solid fa-mobile-screen"></i>
                    <div><h2>Përdoruesit Mobile</h2><p>Klientët që përdorin app-in</p></div>
                </div>
            </div>
            <div id="mobile-users-content">
                <div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i></div>
            </div>
        `;

        await loadData();
    }

    async function loadData() {
        const el = document.getElementById('mobile-users-content');
        if (!el) return;

        const [users, stats] = await Promise.all([getAll(), getStats()]);

        el.innerHTML = `
            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card blue"><div class="kpi-label"><i class="fa-solid fa-users"></i> Total</div><div class="kpi-value blue">${stats.total}</div></div>
                <div class="kpi-card green"><div class="kpi-label">Aktivë</div><div class="kpi-value green">${stats.active}</div></div>
                <div class="kpi-card red"><div class="kpi-label">Bllokuar</div><div class="kpi-value pink">${stats.blocked}</div></div>
                <div class="kpi-card yellow"><div class="kpi-label">Sot</div><div class="kpi-value yellow">${stats.today}</div></div>
            </div>

            ${users.length === 0
                ? '<div class="empty-state"><i class="fa-solid fa-mobile"></i><p>Nuk ka përdorues mobile</p></div>'
                : `
                    <div class="admin-table-wrap">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Emri</th>
                                    <th>Telefon</th>
                                    <th>Email</th>
                                    <th>Regjistruar</th>
                                    <th>Porosi</th>
                                    <th>Statusi</th>
                                    <th>Veprime</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${users.map((u, idx) => `
                                    <tr>
                                        <td class="mono">${idx + 1}</td>
                                        <td><strong style="color:var(--text-primary);">${u.name || 'Klient'}</strong></td>
                                        <td class="phone">${u.phone}</td>
                                        <td style="font-size:11px;">${u.email || '—'}</td>
                                        <td class="mono" style="font-size:10px;">${u.registeredAtStr || '—'}</td>
                                        <td class="mono" style="font-weight:800;">${u.stats?.totalOrders || 0}</td>
                                        <td>
                                            <span class="admin-badge ${u.status === 'active' ? 'green' : u.status === 'blocked' ? 'red' : 'yellow'}">
                                                ${u.status || 'pending'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style="display:flex;gap:4px;">
                                                ${u.status === 'blocked'
                                                    ? `<button class="filter-btn" style="padding:5px 10px;font-size:10px;background:rgba(34,197,94,.15);border-color:var(--accent-green);color:var(--accent-green);" onclick="TaxiMobileUsers.unblock('${u.id}').then(() => TaxiMobileUsers.loadData())"><i class="fa-solid fa-unlock"></i></button>`
                                                    : `<button class="filter-btn" style="padding:5px 10px;font-size:10px;background:rgba(244,63,94,.15);border-color:var(--accent-red);color:var(--accent-red);" onclick="TaxiMobileUsers.block('${u.id}').then(() => TaxiMobileUsers.loadData())"><i class="fa-solid fa-ban"></i></button>`
                                                }
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `
            }
        `;
    }

    return { getAll, getStats, block, unblock, remove, renderPage, loadData };
})();

console.log('✅ mobile-users.js ngarkuar');
