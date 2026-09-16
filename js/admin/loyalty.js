'use strict';

/**
 * js/admin/loyalty.js — Loyalty Cards
 * Kartat e besnikërisë: pikë, nivele, zbritje, historik
 */

window.AdminLoyalty = (() => {
    let cardsCache = [];
    let txCache = [];
    let filters = { search: '', level: 'all', sort: 'points' };
    const POINTS_PER_EURO = 1;      // 1€ = 1 pikë
    const POINTS_REDEEM_RATE = 100; // 100 pikë = €1

    // ═══ INIT ═══
    function init() {
        console.log('💳 AdminLoyalty: Init...');
    }

    async function load() {
        await renderPage();
    }

    // ═══ RENDER FAQJA ═══
    async function renderPage() {
        const el = document.querySelector('.admin-page[data-page="loyalty"]');
        if (!el) return;

        el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Duke ngarkuar kartat...</p></div>';

        try {
            const db = window.TaxiFirebase?.db;
            if (!db) throw new Error('Firebase nuk është gati');

            const snap = await db.collection('loyalty_cards').limit(1000).get();
            cardsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            el.innerHTML = renderLayout();
            renderCardsList();
        } catch (e) {
            console.error('❌ Loyalty render:', e);
            el.innerHTML = errBox('Gabim: ' + e.message);
        }
    }

    // ═══ LAYOUT ═══
    function renderLayout() {
        const stats = calculateStats(cardsCache);

        return `
            <div class="page-header" style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
                <div class="page-title">
                    <i class="fa-solid fa-id-card"></i>
                    <div>
                        <h2>Loyalty Cards</h2>
                        <p>Kartat e besnikërisë dhe pikët e klientëve</p>
                    </div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn-secondary" onclick="AdminLoyalty.exportCsv()">
                        <i class="fa-solid fa-download"></i> CSV
                    </button>
                    <button class="btn-primary" onclick="AdminLoyalty.openNewCardModal()">
                        <i class="fa-solid fa-plus"></i> Kartë e re
                    </button>
                </div>
            </div>

            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card blue">
                    <div class="kpi-label"><i class="fa-solid fa-id-card"></i> Karta totale</div>
                    <div class="kpi-value blue">${stats.total}</div>
                    <div class="kpi-sub">${stats.active} aktive</div>
                </div>
                <div class="kpi-card green">
                    <div class="kpi-label"><i class="fa-solid fa-star"></i> Pikë totale</div>
                    <div class="kpi-value green">${stats.totalPoints.toLocaleString()}</div>
                    <div class="kpi-sub">Vlera: €${(stats.totalPoints / POINTS_REDEEM_RATE).toFixed(2)}</div>
                </div>
                <div class="kpi-card yellow">
                    <div class="kpi-label"><i class="fa-solid fa-crown"></i> Gold + Platinum</div>
                    <div class="kpi-value yellow">${stats.gold + stats.platinum}</div>
                    <div class="kpi-sub">${stats.gold} gold · ${stats.platinum} platinum</div>
                </div>
                <div class="kpi-card pink">
                    <div class="kpi-label"><i class="fa-solid fa-medal"></i> Mesatarja pikëve</div>
                    <div class="kpi-value pink">${stats.avgPoints}</div>
                    <div class="kpi-sub">për çdo kartë</div>
                </div>
            </div>

            <div class="db-panel">
                <div class="db-panel-header">
                    <i class="fa-solid fa-list"></i>
                    <h3>Kartat</h3>
                </div>
                <div class="db-panel-body">
                    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
                        <input type="text" id="loy-search" class="input-sm" placeholder="🔍 Kërko telefon ose emër..."
                            style="flex:1;min-width:200px;" oninput="AdminLoyalty.applyFilters()"
                            value="${filters.search}">
                        <select id="loy-level" class="input-sm" onchange="AdminLoyalty.applyFilters()">
                            <option value="all" ${filters.level === 'all' ? 'selected' : ''}>Të gjitha nivelet</option>
                            <option value="bronze" ${filters.level === 'bronze' ? 'selected' : ''}>🥉 Bronze</option>
                            <option value="silver" ${filters.level === 'silver' ? 'selected' : ''}>🥈 Silver</option>
                            <option value="gold" ${filters.level === 'gold' ? 'selected' : ''}>🥇 Gold</option>
                            <option value="platinum" ${filters.level === 'platinum' ? 'selected' : ''}>💎 Platinum</option>
                        </select>
                        <select id="loy-sort" class="input-sm" onchange="AdminLoyalty.applyFilters()">
                            <option value="points" ${filters.sort === 'points' ? 'selected' : ''}>Pikë (më shumë)</option>
                            <option value="recent" ${filters.sort === 'recent' ? 'selected' : ''}>Më të rejat</option>
                            <option value="name" ${filters.sort === 'name' ? 'selected' : ''}>Emri (A-Z)</option>
                        </select>
                        <button class="btn-secondary" onclick="AdminLoyalty.resetFilters()">
                            <i class="fa-solid fa-rotate"></i>
                        </button>
                    </div>

                    <div id="loyalty-list"></div>
                </div>
            </div>

            <div id="loyalty-modal-root"></div>
        `;
    }

    // ═══ LISTA ═══
    function renderCardsList() {
        const el = document.getElementById('loyalty-list');
        if (!el) return;

        let cards = [...cardsCache];

        if (filters.search) {
            const q = filters.search.toLowerCase();
            cards = cards.filter(c =>
                (c.phone || '').toLowerCase().includes(q) ||
                (c.name || '').toLowerCase().includes(q) ||
                (c.email || '').toLowerCase().includes(q)
            );
        }
        if (filters.level !== 'all') {
            cards = cards.filter(c => getLevel(c.points || 0) === filters.level);
        }
        if (filters.sort === 'points') cards.sort((a, b) => (b.points || 0) - (a.points || 0));
        else if (filters.sort === 'name') cards.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        else if (filters.sort === 'recent') cards.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        if (!cards.length) {
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-id-card"></i><p>Nuk ka karta</p></div>';
            return;
        }

        el.innerHTML = `
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Klienti</th>
                            <th>Telefon</th>
                            <th>Niveli</th>
                            <th>Pikë</th>
                            <th>Vlera €</th>
                            <th>Statusi</th>
                            <th>Krijuar</th>
                            <th>Veprime</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cards.map(c => {
                            const lvl = getLevel(c.points || 0);
                            const meta = LEVEL_META[lvl];
                            return `
                                <tr>
                                    <td><strong>${c.name || 'Klient'}</strong></td>
                                    <td class="phone">${c.phone || '—'}</td>
                                    <td><span style="background:${meta.bg};color:${meta.color};padding:3px 8px;border-radius:6px;font-size:10px;font-weight:800;text-transform:uppercase;">${meta.icon} ${meta.label}</span></td>
                                    <td class="mono" style="font-weight:800;">${(c.points || 0).toLocaleString()}</td>
                                    <td class="green mono">€${((c.points || 0) / POINTS_REDEEM_RATE).toFixed(2)}</td>
                                    <td>
                                        <span class="status-badge ${c.active !== false ? 'completed' : 'cancelled'}">
                                            ${c.active !== false ? 'Aktiv' : 'Joaktiv'}
                                        </span>
                                    </td>
                                    <td class="mono" style="font-size:10px;">${formatDate(c.createdAt)}</td>
                                    <td>
                                        <button class="btn-icon" title="Shto pikë" onclick="AdminLoyalty.openAddPoints('${c.id}')"><i class="fa-solid fa-plus"></i></button>
                                        <button class="btn-icon" title="Zbritje" onclick="AdminLoyalty.openRedeem('${c.id}')"><i class="fa-solid fa-gift"></i></button>
                                        <button class="btn-icon" title="Historiku" onclick="AdminLoyalty.openHistory('${c.id}')"><i class="fa-solid fa-clock-rotate-left"></i></button>
                                        <button class="btn-icon danger" title="Fshij" onclick="AdminLoyalty.deleteCard('${c.id}')"><i class="fa-solid fa-trash"></i></button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // ═══ HELPERS ═══
    const LEVEL_META = {
        bronze: { label: 'Bronze', icon: '🥉', color: '#cd7f32', bg: 'rgba(205,127,50,.15)' },
        silver: { label: 'Silver', icon: '🥈', color: '#94a3b8', bg: 'rgba(148,163,184,.15)' },
        gold: { label: 'Gold', icon: '🥇', color: '#f59e0b', bg: 'rgba(245,158,11,.15)' },
        platinum: { label: 'Platinum', icon: '💎', color: '#a855f7', bg: 'rgba(168,85,247,.15)' }
    };

    function getLevel(points) {
        if (points >= 1000) return 'platinum';
        if (points >= 500) return 'gold';
        if (points >= 100) return 'silver';
        return 'bronze';
    }

    function formatDate(ts) {
        if (!ts) return '—';
        const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
        return d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function calculateStats(cards) {
        const total = cards.length;
        const active = cards.filter(c => c.active !== false).length;
        const totalPoints = cards.reduce((s, c) => s + (c.points || 0), 0);
        let bronze = 0, silver = 0, gold = 0, platinum = 0;
        cards.forEach(c => {
            const l = getLevel(c.points || 0);
            if (l === 'bronze') bronze++;
            else if (l === 'silver') silver++;
            else if (l === 'gold') gold++;
            else platinum++;
        });
        return {
            total, active, totalPoints,
            avgPoints: total ? Math.round(totalPoints / total) : 0,
            bronze, silver, gold, platinum
        };
    }

    // ═══ FILTRA ═══
    function applyFilters() {
        filters.search = document.getElementById('loy-search')?.value || '';
        filters.level = document.getElementById('loy-level')?.value || 'all';
        filters.sort = document.getElementById('loy-sort')?.value || 'points';
        renderCardsList();
    }

    function resetFilters() {
        filters = { search: '', level: 'all', sort: 'points' };
        document.getElementById('loy-search').value = '';
        document.getElementById('loy-level').value = 'all';
        document.getElementById('loy-sort').value = 'points';
        renderCardsList();
    }

    // ═══ MODAL: KARTË E RE ═══
    function openNewCardModal() {
        showModal(`
            <h3><i class="fa-solid fa-id-card"></i> Kartë e re besnikërie</h3>
            <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
                <label style="font-size:11px;color:#94a3b8;">
                    Emri i klientit *
                    <input type="text" id="loy-name" class="input" placeholder="p.sh. Arben Krasniqi" style="width:100%;margin-top:4px;">
                </label>
                <label style="font-size:11px;color:#94a3b8;">
                    Telefoni *
                    <input type="text" id="loy-phone" class="input" placeholder="+383 44 123 456" style="width:100%;margin-top:4px;">
                </label>
                <label style="font-size:11px;color:#94a3b8;">
                    Email (opsional)
                    <input type="email" id="loy-email" class="input" placeholder="klienti@email.com" style="width:100%;margin-top:4px;">
                </label>
                <label style="font-size:11px;color:#94a3b8;">
                    Pikë fillestare
                    <input type="number" id="loy-points" class="input" value="0" min="0" style="width:100%;margin-top:4px;">
                </label>
                <label style="font-size:11px;color:#94a3b8;">
                    Shënime
                    <textarea id="loy-notes" class="input" rows="2" style="width:100%;margin-top:4px;"></textarea>
                </label>
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
                    <button class="btn-secondary" onclick="AdminLoyalty.closeModal()">Anulo</button>
                    <button class="btn-primary" onclick="AdminLoyalty.saveNewCard()"><i class="fa-solid fa-save"></i> Krijo kartë</button>
                </div>
            </div>
        `, 480);
    }

    async function saveNewCard() {
        const db = window.TaxiFirebase?.db;
        if (!db) return alert('Firebase nuk është gati');

        const name = document.getElementById('loy-name')?.value?.trim();
        const phone = document.getElementById('loy-phone')?.value?.trim();
        const email = document.getElementById('loy-email')?.value?.trim() || '';
        const points = parseInt(document.getElementById('loy-points')?.value || '0', 10);
        const notes = document.getElementById('loy-notes')?.value?.trim() || '';

        if (!name) return alert('Shkruaj emrin');
        if (!phone) return alert('Shkruaj telefonin');

        // Kontrollo nëse ekziston
        const existing = cardsCache.find(c => (c.phone || '').replace(/\s/g, '') === phone.replace(/\s/g, ''));
        if (existing) return alert('Kjo kartë ekziston tashmë për ' + phone);

        try {
            await db.collection('loyalty_cards').add({
                name, phone, email, points: points || 0, notes,
                active: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: window.TaxiFirebase?.auth?.currentUser?.email || 'admin'
            });

            if (points > 0) {
                await db.collection('loyalty_transactions').add({
                    cardPhone: phone, cardName: name,
                    type: 'initial', points,
                    reason: 'Pikë fillestare',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    by: window.TaxiFirebase?.auth?.currentUser?.email || 'admin'
                });
            }

            closeModal();
            showToast('success', '✅ Karta u krijua', name);
            await renderPage();
        } catch (e) {
            console.error('❌ saveNewCard:', e);
            alert('Gabim: ' + e.message);
        }
    }

    // ═══ MODAL: SHTO PIKË ═══
    function openAddPoints(cardId) {
        const card = cardsCache.find(c => c.id === cardId);
        if (!card) return;

        showModal(`
            <h3><i class="fa-solid fa-plus"></i> Shto pikë — ${card.name}</h3>
            <div style="padding:12px;background:rgba(59,130,246,.1);border-radius:8px;margin-top:12px;font-size:12px;color:#94a3b8;">
                Pikë aktuale: <strong style="color:#f1f5f9;">${(card.points || 0).toLocaleString()}</strong>
            </div>
            <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
                <label style="font-size:11px;color:#94a3b8;">
                    Pikë për të shtuar *
                    <input type="number" id="loy-add-points" class="input" value="10" min="1" style="width:100%;margin-top:4px;">
                </label>
                <label style="font-size:11px;color:#94a3b8;">
                    Arsyeja
                    <input type="text" id="loy-add-reason" class="input" placeholder="p.sh. Bonus, korrigjim, promovim..." value="Shtim manual" style="width:100%;margin-top:4px;">
                </label>
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
                    <button class="btn-secondary" onclick="AdminLoyalty.closeModal()">Anulo</button>
                    <button class="btn-primary" onclick="AdminLoyalty.confirmAddPoints('${cardId}')"><i class="fa-solid fa-check"></i> Shto</button>
                </div>
            </div>
        `, 460);
    }

    async function confirmAddPoints(cardId) {
        const db = window.TaxiFirebase?.db;
        const card = cardsCache.find(c => c.id === cardId);
        if (!db || !card) return;

        const points = parseInt(document.getElementById('loy-add-points')?.value || '0', 10);
        const reason = document.getElementById('loy-add-reason')?.value?.trim() || 'Shtim manual';

        if (!points || points < 1) return alert('Shkruaj numrin e pikëve');

        try {
            await db.collection('loyalty_cards').doc(cardId).update({
                points: (card.points || 0) + points,
                lastActivity: firebase.firestore.FieldValue.serverTimestamp()
            });

            await db.collection('loyalty_transactions').add({
                cardId, cardPhone: card.phone, cardName: card.name,
                type: 'add', points, reason,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                by: window.TaxiFirebase?.auth?.currentUser?.email || 'admin'
            });

            closeModal();
            showToast('success', `+${points} pikë`, card.name);
            await renderPage();
        } catch (e) {
            console.error('❌ confirmAddPoints:', e);
            alert('Gabim: ' + e.message);
        }
    }

    // ═══ MODAL: ZBRITJE ═══
    function openRedeem(cardId) {
        const card = cardsCache.find(c => c.id === cardId);
        if (!card) return;
        const maxEuros = ((card.points || 0) / POINTS_REDEEM_RATE).toFixed(2);

        showModal(`
            <h3><i class="fa-solid fa-gift"></i> Zbritje pikësh — ${card.name}</h3>
            <div style="padding:12px;background:rgba(16,185,129,.1);border-radius:8px;margin-top:12px;font-size:12px;color:#94a3b8;">
                Pikë: <strong style="color:#f1f5f9;">${(card.points || 0).toLocaleString()}</strong>
                · Mund të zbritet deri: <strong style="color:#10b981;">€${maxEuros}</strong>
                <div style="font-size:10px;margin-top:6px;opacity:.7;">Rate: ${POINTS_REDEEM_RATE} pikë = €1</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
                <label style="font-size:11px;color:#94a3b8;">
                    Pikë për të zbritur *
                    <input type="number" id="loy-redeem-points" class="input" value="${Math.min(100, card.points || 0)}" min="1" max="${card.points || 0}" style="width:100%;margin-top:4px;">
                </label>
                <div style="padding:10px;background:#1e293b;border-radius:8px;text-align:center;">
                    Vlera në €: <strong id="loy-redeem-value" style="color:#10b981;font-size:18px;">€${(Math.min(100, card.points || 0) / POINTS_REDEEM_RATE).toFixed(2)}</strong>
                </div>
                <label style="font-size:11px;color:#94a3b8;">
                    Arsyeja
                    <input type="text" id="loy-redeem-reason" class="input" value="Zbritje në udhëtim" style="width:100%;margin-top:4px;">
                </label>
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
                    <button class="btn-secondary" onclick="AdminLoyalty.closeModal()">Anulo</button>
                    <button class="btn-primary" onclick="AdminLoyalty.confirmRedeem('${cardId}')"><i class="fa-solid fa-check"></i> Zbrit</button>
                </div>
            </div>
        `, 460);

        // Live update
        setTimeout(() => {
            const inp = document.getElementById('loy-redeem-points');
            const val = document.getElementById('loy-redeem-value');
            if (inp && val) {
                inp.addEventListener('input', () => {
                    const p = parseInt(inp.value || '0', 10);
                    val.textContent = '€' + (p / POINTS_REDEEM_RATE).toFixed(2);
                });
            }
        }, 50);
    }

    async function confirmRedeem(cardId) {
        const db = window.TaxiFirebase?.db;
        const card = cardsCache.find(c => c.id === cardId);
        if (!db || !card) return;

        const points = parseInt(document.getElementById('loy-redeem-points')?.value || '0', 10);
        const reason = document.getElementById('loy-redeem-reason')?.value?.trim() || 'Zbritje';

        if (!points || points < 1) return alert('Shkruaj numrin e pikëve');
        if (points > (card.points || 0)) return alert('Nuk ka mjaftueshëm pikë');

        try {
            await db.collection('loyalty_cards').doc(cardId).update({
                points: (card.points || 0) - points,
                lastActivity: firebase.firestore.FieldValue.serverTimestamp()
            });

            await db.collection('loyalty_transactions').add({
                cardId, cardPhone: card.phone, cardName: card.name,
                type: 'redeem', points: -points,
                euros: +(points / POINTS_REDEEM_RATE).toFixed(2),
                reason,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                by: window.TaxiFirebase?.auth?.currentUser?.email || 'admin'
            });

            closeModal();
            showToast('success', `-${points} pikë`, '€' + (points / POINTS_REDEEM_RATE).toFixed(2));
            await renderPage();
        } catch (e) {
            console.error('❌ confirmRedeem:', e);
            alert('Gabim: ' + e.message);
        }
    }

    // ═══ MODAL: HISTORIK ═══
    async function openHistory(cardId) {
        const db = window.TaxiFirebase?.db;
        const card = cardsCache.find(c => c.id === cardId);
        if (!db || !card) return;

        showModal(`
            <h3><i class="fa-solid fa-clock-rotate-left"></i> Historiku — ${card.name}</h3>
            <div id="loy-history-body" style="margin-top:16px;">
                <div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Duke ngarkuar...</p></div>
            </div>
        `, 620);

        try {
            const snap = await db.collection('loyalty_transactions')
                .where('cardId', '==', cardId)
                .limit(200).get()
                .catch(async () => {
                    return await db.collection('loyalty_transactions')
                        .where('cardPhone', '==', card.phone).limit(200).get();
                });

            let txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            txs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            const body = document.getElementById('loy-history-body');
            if (!txs.length) {
                body.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Nuk ka transaksione</p></div>';
                return;
            }

            body.innerHTML = `
                <div style="max-height:400px;overflow-y:auto;">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Tipi</th>
                                <th>Pikë</th>
                                <th>Arsyeja</th>
                                <th>Nga</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${txs.map(t => {
                                const isAdd = t.points > 0;
                                const typeLbl = {
                                    initial: '🎁 Fillestare',
                                    add: '➕ Shtim',
                                    redeem: '🎟️ Zbritje',
                                    adjust: '⚙️ Korrigjim'
                                }[t.type] || t.type;
                                return `
                                    <tr>
                                        <td class="mono" style="font-size:10px;">${formatDate(t.createdAt)}</td>
                                        <td>${typeLbl}</td>
                                        <td class="mono" style="color:${isAdd ? '#10b981' : '#ef4444'};font-weight:800;">
                                            ${isAdd ? '+' : ''}${t.points}
                                        </td>
                                        <td style="font-size:11px;">${t.reason || '—'}${t.euros ? ` (€${t.euros})` : ''}</td>
                                        <td style="font-size:10px;color:#94a3b8;">${t.by || '—'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (e) {
            console.error('❌ openHistory:', e);
            const body = document.getElementById('loy-history-body');
            if (body) body.innerHTML = errBox('Gabim: ' + e.message);
        }
    }

    // ═══ FSHIJ KARTË ═══
    async function deleteCard(cardId) {
        const card = cardsCache.find(c => c.id === cardId);
        if (!card) return;
        if (!confirm(`Fshij kartën e "${card.name}" (${card.phone})?`)) return;

        try {
            await window.TaxiFirebase.db.collection('loyalty_cards').doc(cardId).delete();
            showToast('success', '🗑️ Karta u fshi', card.name);
            await renderPage();
        } catch (e) {
            console.error('❌ deleteCard:', e);
            alert('Gabim: ' + e.message);
        }
    }

    // ═══ EXPORT CSV ═══
    function exportCsv() {
        if (!cardsCache.length) return showToast('warning', 'Nuk ka të dhëna', '');

        const rows = cardsCache.map(c => ({
            'Emri': c.name || '',
            'Telefoni': c.phone || '',
            'Email': c.email || '',
            'Pikë': c.points || 0,
            'Vlera €': ((c.points || 0) / POINTS_REDEEM_RATE).toFixed(2),
            'Niveli': LEVEL_META[getLevel(c.points || 0)].label,
            'Statusi': c.active !== false ? 'Aktiv' : 'Joaktiv',
            'Krijuar': formatDate(c.createdAt),
            'Shënime': c.notes || ''
        }));

        if (window.TaxiExport) {
            window.TaxiExport.toCsv(rows, `loyalty-cards-${new Date().toISOString().slice(0,10)}.csv`);
            showToast('success', '📥 CSV u shkarkua', '');
        }
    }

    // ═══ MODAL HELPERS ═══
    function showModal(html, maxWidth = 520) {
        let root = document.getElementById('loyalty-modal-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'loyalty-modal-root';
            document.body.appendChild(root);
        }
        root.innerHTML = `
            <div class="modal-overlay" onclick="AdminLoyalty.closeModal(event)">
                <div class="modal-box" onclick="event.stopPropagation()" style="max-width:${maxWidth}px;max-height:85vh;overflow-y:auto;">
                    ${html}
                </div>
            </div>
        `;
    }

    function closeModal(e) {
        if (e && e.target && !e.target.classList.contains('modal-overlay')) return;
        const root = document.getElementById('loyalty-modal-root');
        if (root) root.innerHTML = '';
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
        openNewCardModal, saveNewCard,
        openAddPoints, confirmAddPoints,
        openRedeem, confirmRedeem,
        openHistory,
        deleteCard, exportCsv,
        closeModal
    };
})();

console.log('✅ admin/loyalty.js ngarkuar');
