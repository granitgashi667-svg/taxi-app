'use strict';

/**
 * js/admin/blacklist.js — Menaxhimi i blacklist
 */

window.AdminBlacklist = (() => {
    let cachedItems = [];

    // ═══ INIT ═══
    function init() {
        console.log('🚫 AdminBlacklist: Init...');
    }

    // ═══ LOAD ═══
    async function load() {
        console.log('🚫 Duke ngarkuar blacklist...');
        await renderAll();
    }

    // ═══ RENDER ALL ═══
    async function renderAll() {
        const el = document.getElementById('blacklist-content');
        if (!el) return;

        el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Duke ngarkuar...</p></div>';

        try {
            const db = window.TaxiFirebase?.db;
            if (!db) throw new Error('Firebase nuk është gati');

            const snap = await db.collection('blacklist')
                .where('status', '==', 'active')
                .get();

            let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            items.sort((a, b) => (b.blockedAt || 0) - (a.blockedAt || 0));

            cachedItems = items;
            renderStats(items);
            renderTable(items);

        } catch (e) {
            console.error('❌ renderAll:', e);
            el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Gabim: ${e.message}</p></div>`;
        }
    }

    // ═══ STATS ═══
    function renderStats(items) {
        const el = document.getElementById('blacklist-content');

        const today = new Date().toLocaleDateString('sq-AL');
        const blockedToday = items.filter(i => (i.blockedAtStr || '').startsWith(today)).length;

        el.innerHTML = `
            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card pink">
                    <div class="kpi-label"><i class="fa-solid fa-ban"></i> Total</div>
                    <div class="kpi-value pink">${items.length}</div>
                    <div class="kpi-sub">Numra të bllokuar</div>
                </div>
                <div class="kpi-card yellow">
                    <div class="kpi-label"><i class="fa-solid fa-calendar-day"></i> Sot</div>
                    <div class="kpi-value yellow">${blockedToday}</div>
                    <div class="kpi-sub">U bllokuan sot</div>
                </div>
            </div>

            <div class="page-actions" style="margin-bottom:16px;">
                <div></div>
                <button class="btn-primary" style="padding:10px 18px;" onclick="AdminBlacklist.openAddModal()">
                    <i class="fa-solid fa-plus"></i> Blloko numër
                </button>
            </div>

            <div class="admin-table-wrap" id="blacklist-table"></div>
        `;
    }

    // ═══ TABLE ═══
    function renderTable(items) {
        const wrap = document.getElementById('blacklist-table');
        if (!wrap) return;

        if (!items.length) {
            wrap.innerHTML = '<div class="empty-state" style="padding:60px;"><i class="fa-solid fa-ban"></i><p>Nuk ka numra të bllokuar</p></div>';
            return;
        }

        wrap.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Numri</th>
                        <th>Arsyeja</th>
                        <th>Bllokuar nga</th>
                        <th>Data</th>
                        <th>Skadon</th>
                        <th>Veprime</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(i => {
                        const expires = i.expiresAt
                            ? new Date(i.expiresAt).toLocaleDateString('sq-AL')
                            : 'Përgjithmonë';
                        const expiresColor = i.expiresAt ? 'var(--accent-yellow)' : 'var(--accent-red)';

                        return `
                            <tr>
                                <td class="phone" style="font-weight:800;color:var(--text-primary);">${i.phone}</td>
                                <td>${i.reason || '—'}</td>
                                <td>${i.blockedByName || '—'}</td>
                                <td class="mono" style="font-size:10px;">${i.blockedAtStr || '—'}</td>
                                <td style="color:${expiresColor};font-weight:700;">${expires}</td>
                                <td>
                                    <button class="filter-btn" style="padding:5px 10px;font-size:10px;background:rgba(34,197,94,.15);border-color:var(--accent-green);color:var(--accent-green);" onclick="AdminBlacklist.unblock('${i.id}')">
                                        <i class="fa-solid fa-unlock"></i> Zhblloko
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    // ═══ ADD MODAL ═══
    function openAddModal() {
        const existing = document.getElementById('modal-admin-blacklist-add');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-admin-blacklist-add';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title">
                        <i class="fa-solid fa-ban"></i>
                        <h3>Blloko numrin</h3>
                    </div>
                    <button class="modal-close" onclick="document.getElementById('modal-admin-blacklist-add').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label><i class="fa-solid fa-phone"></i> Numri i telefonit *</label>
                        <input type="tel" id="admin-bl-phone" class="input-field" placeholder="+383 44 123 456">
                    </div>
                    <div class="form-group">
                        <label><i class="fa-solid fa-comment"></i> Arsyeja</label>
                        <input type="text" id="admin-bl-reason" class="input-field" placeholder="P.sh. Deshton shumë porosi">
                    </div>
                    <div class="form-group">
                        <label><i class="fa-solid fa-calendar"></i> Skadon pas (ditë, bosh = përgjithmonë)</label>
                        <input type="number" id="admin-bl-expires" class="input-field" placeholder="30" min="1">
                    </div>
                    <div id="admin-bl-error" style="display:none;color:var(--accent-red);font-size:12px;padding:8px;background:rgba(244,63,94,.1);border-radius:6px;"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-admin-blacklist-add').remove()">Anulo</button>
                    <button class="btn-primary" onclick="AdminBlacklist.confirmAdd()">
                        <i class="fa-solid fa-ban"></i> Blloko
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ═══ CONFIRM ADD ═══
    async function confirmAdd() {
        const phone = document.getElementById('admin-bl-phone')?.value.trim();
        const reason = document.getElementById('admin-bl-reason')?.value.trim();
        const expires = parseInt(document.getElementById('admin-bl-expires')?.value) || null;
        const errBox = document.getElementById('admin-bl-error');

        if (!phone) {
            errBox.textContent = 'Shkruaj numrin';
            errBox.style.display = 'block';
            return;
        }

        try {
            const db = window.TaxiFirebase?.db;
            if (!db) return;

            const item = {
                phone: phone,
                reason: reason || 'Nuk specifikuar',
                blockedBy: window.TaxiAuth?.currentUser()?.uid || null,
                blockedByName: window.AdminApp?.currentOperator?.name || 'Menagjer',
                blockedAt: Date.now(),
                blockedAtStr: new Date().toLocaleString('sq-AL'),
                expiresAt: expires ? Date.now() + (expires * 86400000) : null,
                status: 'active',
                notes: ''
            };

            await db.collection('blacklist').add(item);

            if (window.TaxiAuditLog) {
                window.TaxiAuditLog.log('blacklist_add', { phone, reason });
            }

            document.getElementById('modal-admin-blacklist-add')?.remove();
            showToast('success', '🚫 U bllokua', phone);
            renderAll();

        } catch (e) {
            console.error('❌ confirmAdd:', e);
            errBox.textContent = 'Gabim: ' + e.message;
            errBox.style.display = 'block';
        }
    }

    // ═══ UNBLOCK ═══
    async function unblock(itemId) {
        if (!confirm('A jeni i sigurt që dëshironi të zhbllokoni këtë numër?')) return;

        try {
            const db = window.TaxiFirebase?.db;
            if (!db) return;

            const item = cachedItems.find(x => x.id === itemId);

            await db.collection('blacklist').doc(itemId).update({
                status: 'removed',
                removedAt: Date.now(),
                removedBy: window.TaxiAuth?.currentUser()?.uid || null,
                removedByName: window.AdminApp?.currentOperator?.name || 'Menagjer'
            });

            if (window.TaxiAuditLog) {
                window.TaxiAuditLog.log('blacklist_remove', { phone: item?.phone });
            }

            showToast('success', '✅ U zhbllokua', item?.phone || '');
            renderAll();

        } catch (e) {
            console.error('❌ unblock:', e);
            showToast('error', 'Gabim', 'Nuk mund të zhbllokohet');
        }
    }

    function showToast(type, title, msg) {
        if (window.AdminApp?.showToast) window.AdminApp.showToast(type, title, msg);
    }

    return { init, load, openAddModal, confirmAdd, unblock };
})();

console.log('✅ admin/blacklist.js ngarkuar');
