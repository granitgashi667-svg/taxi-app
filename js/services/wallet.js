'use strict';

/**
 * wallet.js — Portofol digjital për klientët dhe shoferët
 */

window.TaxiWallet = (() => {
    const COLLECTION = 'wallets';

    function db() { return window.TaxiFirebase?.db || null; }

    // ═══ MERR WALLET ═══
    async function getWallet(userId) {
        const database = db();
        if (!database) return null;

        try {
            const doc = await database.collection(COLLECTION).doc(userId).get();
            if (doc.exists) return { id: doc.id, ...doc.data() };

            // Krijo wallet të re
            const newWallet = {
                userId,
                balance: 0,
                totalAdded: 0,
                totalSpent: 0,
                transactions: [],
                currency: 'EUR',
                createdAt: Date.now(),
                createdAtStr: new Date().toLocaleString('sq-AL')
            };
            await database.collection(COLLECTION).doc(userId).set(newWallet);
            return { id: userId, ...newWallet };
        } catch (e) {
            console.error('❌ getWallet:', e);
            return null;
        }
    }

    // ═══ SHTO BALANCË ═══
    async function addBalance(userId, amount, reason = 'Top-up', method = 'manual') {
        if (!userId || amount <= 0) return null;

        const database = db();
        if (!database) return null;

        try {
            const walletRef = database.collection(COLLECTION).doc(userId);

            await database.runTransaction(async (transaction) => {
                const doc = await transaction.get(walletRef);

                let wallet;
                if (!doc.exists) {
                    wallet = {
                        userId,
                        balance: 0,
                        totalAdded: 0,
                        totalSpent: 0,
                        transactions: [],
                        currency: 'EUR',
                        createdAt: Date.now()
                    };
                } else {
                    wallet = doc.data();
                }

                wallet.balance = (wallet.balance || 0) + amount;
                wallet.totalAdded = (wallet.totalAdded || 0) + amount;
                wallet.transactions = wallet.transactions || [];
                wallet.transactions.unshift({
                    id: Date.now(),
                    type: 'credit',
                    amount,
                    reason,
                    method,
                    balanceAfter: wallet.balance,
                    timestamp: Date.now(),
                    timestampStr: new Date().toLocaleString('sq-AL')
                });

                // Limit 100 transaksione
                if (wallet.transactions.length > 100) {
                    wallet.transactions = wallet.transactions.slice(0, 100);
                }

                transaction.set(walletRef, wallet, { merge: true });
            });

            console.log(`💰 +€${amount.toFixed(2)} → ${userId}`);
            return { success: true, amount };

        } catch (e) {
            console.error('❌ addBalance:', e);
            return null;
        }
    }

    // ═══ ZBRITJE NGA BALANCA ═══
    async function deductBalance(userId, amount, reason = 'Order payment') {
        if (!userId || amount <= 0) return null;

        const database = db();
        if (!database) return null;

        try {
            const walletRef = database.collection(COLLECTION).doc(userId);

            let result = null;
            await database.runTransaction(async (transaction) => {
                const doc = await transaction.get(walletRef);
                if (!doc.exists) throw new Error('Wallet nuk ekziston');

                const wallet = doc.data();
                if ((wallet.balance || 0) < amount) {
                    throw new Error('Balanca e pamjaftueshme');
                }

                wallet.balance -= amount;
                wallet.totalSpent = (wallet.totalSpent || 0) + amount;
                wallet.transactions = wallet.transactions || [];
                wallet.transactions.unshift({
                    id: Date.now(),
                    type: 'debit',
                    amount,
                    reason,
                    balanceAfter: wallet.balance,
                    timestamp: Date.now(),
                    timestampStr: new Date().toLocaleString('sq-AL')
                });

                if (wallet.transactions.length > 100) {
                    wallet.transactions = wallet.transactions.slice(0, 100);
                }

                transaction.set(walletRef, wallet, { merge: true });
                result = { success: true, balance: wallet.balance };
            });

            console.log(`💸 -€${amount.toFixed(2)} → ${userId}`);
            return result;

        } catch (e) {
            console.error('❌ deductBalance:', e.message);
            return { success: false, error: e.message };
        }
    }

    // ═══ MERR BALANCËN ═══
    async function getBalance(userId) {
        const wallet = await getWallet(userId);
        return wallet ? wallet.balance : 0;
    }

    // ═══ NDIHMA PËR UI ═══
    function formatBalance(balance) {
        return `€${(balance || 0).toFixed(2)}`;
    }

    function openWalletModal(wallet) {
        if (!wallet) return;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-wallet';
        modal.innerHTML = `
            <div class="modal modal-lg">
                <div class="modal-header">
                    <div class="modal-title">
                        <i class="fa-solid fa-wallet"></i>
                        <h3>Portofoli im</h3>
                    </div>
                    <button class="modal-close" onclick="document.getElementById('modal-wallet').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="background:linear-gradient(135deg,#a855f7,#ec4899);border-radius:16px;padding:24px;color:white;text-align:center;margin-bottom:20px;box-shadow:0 10px 30px rgba(168,85,247,.4);">
                        <div style="font-size:11px;opacity:.8;text-transform:uppercase;letter-spacing:1px;">Balanca aktuale</div>
                        <div style="font-size:42px;font-weight:800;font-family:monospace;margin-top:8px;">€${(wallet.balance || 0).toFixed(2)}</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px;font-size:12px;">
                            <div>
                                <div style="opacity:.7;text-transform:uppercase;">Shtuar</div>
                                <div style="font-weight:800;font-size:16px;">€${(wallet.totalAdded || 0).toFixed(2)}</div>
                            </div>
                            <div>
                                <div style="opacity:.7;text-transform:uppercase;">Shpenzuar</div>
                                <div style="font-weight:800;font-size:16px;">€${(wallet.totalSpent || 0).toFixed(2)}</div>
                            </div>
                        </div>
                    </div>

                    <div style="font-size:11px;font-weight:800;color:var(--accent-purple);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
                        <i class="fa-solid fa-history"></i> Transaksionet
                    </div>
                    <div style="max-height:300px;overflow-y:auto;">
                        ${(wallet.transactions || []).slice(0, 20).map(t => `
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg-tertiary);border-radius:8px;margin-bottom:6px;">
                                <div>
                                    <div style="font-size:12px;font-weight:700;">${t.reason || '—'}</div>
                                    <div style="font-size:10px;color:var(--text-muted);">${t.timestampStr || ''}</div>
                                </div>
                                <div style="font-family:monospace;font-weight:800;font-size:14px;color:${t.type === 'credit' ? '#22c55e' : '#f43f5e'};">
                                    ${t.type === 'credit' ? '+' : '-'}€${t.amount.toFixed(2)}
                                </div>
                            </div>
                        `).join('') || '<div style="text-align:center;padding:30px;color:var(--text-muted);">Nuk ka transaksione</div>'}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-wallet').remove()">Mbyll</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    return {
        getWallet, addBalance, deductBalance, getBalance,
        formatBalance, openWalletModal
    };
})();

console.log('✅ wallet.js ngarkuar');
