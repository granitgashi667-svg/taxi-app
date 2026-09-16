'use strict';

/**
 * blacklist.js — Bllokimi i numrave problematikë
 */

window.TaxiBlacklist = (() => {
    const COLLECTION = 'blacklist';
    let cache = new Map();
    let cacheLoaded = false;

    function db() { return window.TaxiFirebase?.db || null; }

    // ═══ NGARKO CACHE ═══
    async function loadCache() {
        const database = db();
        if (!database) return;
        try {
            const snap = await database.collection(COLLECTION).where('status', '==', 'active').get();
            cache.clear();
            snap.docs.forEach(doc => {
                const data = doc.data();
                cache.set(data.phone, { id: doc.id, ...data });
            });
            cacheLoaded = true;
            console.log('✅ Blacklist u ngarkua:', cache.size, 'numra');
        } catch (e) { console.error('❌ loadCache:', e); }
    }

    // ═══ KONTROLLO A ËSHTË BLLOKUAR ═══
    function isBlocked(phone) {
        if (!phone) return false;
        const clean = phone.trim();
        return cache.has(clean);
    }

    function get(phone) {
        if (!phone) return null;
        return cache.get(phone.trim()) || null;
    }

    // ═══ BLLOKO NUMRIN ═══
    async function block(phone, reason, operatorName, expiresInDays = null) {
        const database = db();
        if (!database) return null;
        if (!phone) return null;

        try {
            const item = {
                phone: phone.trim(),
                reason: reason || 'Nuk specifikuar',
                blockedBy: window.TaxiAuth?.currentUser()?.uid || null,
                blockedByName: operatorName || window.TaxiState?.get('currentOperator')?.name || 'Operator',
                blockedAt: new Date().getTime(),
                blockedAtStr: new Date().toLocaleString('sq-AL'),
                expiresAt: expiresInDays ? new Date().getTime() + (expiresInDays * 86400000) : null,
                status: 'active',
                notes: ''
            };
            const ref = await database.collection(COLLECTION).add(item);
            cache.set(item.phone, { id: ref.id, ...item });
            console.log('🚫 Numri u bllokua:', item.phone);

            if (window.TaxiAuditLog) {
                window.TaxiAuditLog.log('blacklist_add', { phone: item.phone, reason });
            }

            return { id: ref.id, ...item };
        } catch (e) { console.error('❌ block:', e); return null; }
    }

    // ═══ ZHBLLOKO NUMRIN ═══
    async function unblock(phone) {
        const database = db();
        if (!database) return;
        try {
            const item = cache.get(phone);
            if (!item) return;
            await database.collection(COLLECTION).doc(item.id).update({
                status: 'removed',
                removedAt: new Date().getTime(),
                removedBy: window.TaxiAuth?.currentUser()?.uid || null
            });
            cache.delete(phone);
            console.log('✅ Numri u zhbllokua:', phone);

            if (window.TaxiAuditLog) {
                window.TaxiAuditLog.log('blacklist_remove', { phone });
            }
        } catch (e) { console.error('❌ unblock:', e); }
    }

    // ═══ MERR TË GJITHË ═══
    async function getAll() {
        const database = db();
        if (!database) return [];
        try {
            const snap = await database.collection(COLLECTION)
                .where('status', '==', 'active')
                .orderBy('blockedAt', 'desc')
                .get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
            console.error('❌ getAll:', e);
            return [];
        }
    }

    // ═══ AUTO-BLLOKIM PAS ANULIMEVE ═══
    async function checkAutoBlock(phone, threshold = 5) {
        const database = db();
        if (!database) return;
        if (isBlocked(phone)) return;

        try {
            const snap = await database.collection('orders')
                .where('phone', '==', phone)
                .where('status', '==', 'cancelled')
                .get();
            const cancelled = snap.size;

            if (cancelled >= threshold) {
                await block(phone, `Auto-bllokim: ${cancelled} anulime`, 'Sistemi', 30);
                console.log('🚫 Auto-bllokim:', phone, cancelled, 'anulime');
            }
        } catch (e) { console.error('❌ checkAutoBlock:', e); }
    }

    // ═══ STATISTIKAT E KLIENTIT ═══
    async function getStats(phone) {
        const database = db();
        if (!database) return null;
        try {
            const snap = await database.collection('orders')
                .where('phone', '==', phone)
                .get();
            const orders = snap.docs.map(d => d.data());
            const total = orders.length;
            const completed = orders.filter(o => o.status === 'completed').length;
            const cancelled = orders.filter(o => o.status === 'cancelled').length;

            return {
                total,
                completed,
                cancelled,
                successRate: total ? ((completed / total) * 100).toFixed(1) : 0
            };
        } catch (e) { return null; }
    }

    // ═══ RENDER FAQJA ═══
    function renderPage() {
        const el = document.querySelector('.page[data-page="blacklist"]');
        if (!el) return;

        const items = Array.from(cache.values());

        el.innerHTML = `
            <div class="page-header">
                <div class="page-title">
                    <i class="fa-solid fa-ban"></i>
                    <div>
                        <h2>Blacklist</h2>
                        <p>Numrat e bllokuar · ${items.length} total</p>
                    </div>
                </div>
                <button class="btn-danger" onclick="TaxiBlacklist.openAddModal()">
                    <i class="fa-solid fa-plus"></i> Blloko numër
                </button>
            </div>

            <div class="kpi-grid">
                <div class="kpi-card pink">
                    <div class="kpi-label"><i class="fa-solid fa-ban"></i> Bllokuar</div>
                    <div class="kpi-value pink">${items.length}</div>
                    <div class="kpi-sub">Numra aktivë</div>
                </div>
                <div class="kpi-card yellow">
                    <div class="kpi-label"><i class="fa-solid fa-clock"></i> Sot</div>
                    <div class="kpi-value yellow">${items.filter(i => i.blockedAtStr && i.blockedAtStr.startsWith(new Date().toLocaleDateString('sq-AL'))).length}</div>
                    <div class="kpi-sub">U bllokuan sot</div>
                </div>
            </div>

            <div class="page-table-wrap">
                <table class="orders-table">
                    <thead>
                        <tr><th>Numri</th><th>Arsyeja</th><th>Bllokuar nga</th><th>Data</th><th>Veprime</th></tr>
                    </thead>
                    <tbody>
                        ${items.length === 0
                            ? `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted);">Nuk ka numra të bllokuar</td></tr>`
                            : items.map(i => `
                                <tr>
                                    <td class="phone">${i.phone}</td>
                                    <td>${i.reason}</td>
                                    <td>${i.blockedByName}</td>
                                    <td class="time">${i.blockedAtStr}</td>
                                    <td>
                                        <button class="row-btn danger" onclick="TaxiBlacklist.unblock('${i.phone}')" title="Zhblloko">
                                            <i class="fa-solid fa-unlock"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // ═══ MODAL SHTO ═══
    function openAddModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-blacklist-add';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title"><i class="fa-solid fa-ban"></i><h3>Blloko numrin</h3></div>
                    <button class="modal-close" onclick="document.getElementById('modal-blacklist-add').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label><i class="fa-solid fa-phone"></i> Numri i telefonit</label>
                        <input type="tel" id="bl-phone" class="input-field" placeholder="+383 44 123 456">
                    </div>
                    <div class="form-group">
                        <label><i class="fa-solid fa-comment"></i> Arsyeja</label>
                        <input type="text" id="bl-reason" class="input-field" placeholder="P.sh. Anulon gjithmonë">
                    </div>
                    <div class="form-group">
                        <label><i class="fa-solid fa-calendar"></i> Skadon pas (ditë, bosh=përgjithmonë)</label>
                        <input type="number" id="bl-expires" class="input-field" placeholder="30" min="1">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-blacklist-add').remove()">Anulo</button>
                    <button class="btn-danger" onclick="TaxiBlacklist.confirmAdd()"><i class="fa-solid fa-ban"></i> Blloko</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async function confirmAdd() {
        const phone = document.getElementById('bl-phone')?.value.trim();
        const reason = document.getElementById('bl-reason')?.value.trim();
        const expires = parseInt(document.getElementById('bl-expires')?.value) || null;

        if (!phone) {
            if (typeof showToast === 'function') showToast('error', 'Gabim', 'Shkruaj numrin');
            return;
        }

        await block(phone, reason, null, expires);
        document.getElementById('modal-blacklist-add')?.remove();
        renderPage();
        if (typeof showToast === 'function') showToast('success', '🚫 U bllokua', phone);
    }

    // ═══ INIT ═══
    async function init() {
        await loadCache();
        console.log('✅ Blacklist aktivizuar');
    }

    return {
        init, loadCache, isBlocked, get, block, unblock, getAll,
        checkAutoBlock, getStats,
        renderPage, openAddModal, confirmAdd,
        get cache() { return cache; }
    };
})();

console.log('✅ blacklist.js ngarkuar');
