'use strict';

/**
 * feedback.js — Feedback + Raportim bug-esh
 */

window.TaxiFeedback = (() => {
    const COLLECTION = 'feedback';

    function db() { return window.TaxiFirebase?.db || null; }

    // ═══ SHFAQ MODAL ═══
    function open() {
        const existing = document.getElementById('modal-feedback');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-feedback';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title">
                        <i class="fa-solid fa-comment-dots"></i>
                        <h3>Feedback / Raportim</h3>
                    </div>
                    <button class="modal-close" onclick="document.getElementById('modal-feedback').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label><i class="fa-solid fa-tag"></i> Lloji</label>
                        <select id="fb-type" class="input-field">
                            <option value="bug">🐛 Raportim Bug</option>
                            <option value="feature">💡 Sugjerim Feature</option>
                            <option value="improvement">⚡ Përmirësim</option>
                            <option value="compliment">👏 Kompliment</option>
                            <option value="other">📝 Tjetër</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label><i class="fa-solid fa-heading"></i> Titulli *</label>
                        <input type="text" id="fb-title" class="input-field" placeholder="Përmbledhje e shkurtër" maxlength="80">
                    </div>
                    <div class="form-group">
                        <label><i class="fa-solid fa-comment"></i> Përshkrimi *</label>
                        <textarea id="fb-description" class="input-field" rows="5" placeholder="Përshkruaj me detaje..." maxlength="1000"></textarea>
                    </div>
                    <div class="form-group">
                        <label><i class="fa-solid fa-star"></i> Prioriteti</label>
                        <select id="fb-priority" class="input-field">
                            <option value="low">🟢 I ulët</option>
                            <option value="medium" selected>🟡 Mesatar</option>
                            <option value="high">🟠 I lartë</option>
                            <option value="critical">🔴 Kritik</option>
                        </select>
                    </div>
                    <div id="fb-error" style="display:none;color:var(--accent-red);font-size:12px;padding:8px;background:rgba(244,63,94,.1);border-radius:6px;"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-feedback').remove()">Anulo</button>
                    <button class="btn-primary" onclick="TaxiFeedback.submit()">
                        <i class="fa-solid fa-paper-plane"></i> Dërgo
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ═══ DËRGO ═══
    async function submit() {
        const type = document.getElementById('fb-type')?.value;
        const title = document.getElementById('fb-title')?.value.trim();
        const description = document.getElementById('fb-description')?.value.trim();
        const priority = document.getElementById('fb-priority')?.value;
        const errBox = document.getElementById('fb-error');

        if (!title || !description) {
            errBox.textContent = 'Plotëso titullin dhe përshkrimin';
            errBox.style.display = 'block';
            return;
        }

        const database = db();
        if (!database) {
            errBox.textContent = 'Firebase nuk është gati';
            errBox.style.display = 'block';
            return;
        }

        try {
            const user = window.TaxiAuth?.currentUser();
            const operator = window.TaxiState?.get('currentOperator');

            const feedback = {
                type,
                title,
                description,
                priority,
                userId: user?.uid || null,
                userEmail: user?.email || null,
                userName: operator?.name || 'Anonim',
                userRole: operator?.role || null,
                page: window.AppState?.currentPage || 'unknown',
                url: window.location.pathname,
                userAgent: navigator.userAgent.slice(0, 200),
                screenSize: `${window.innerWidth}x${window.innerHeight}`,
                status: 'new',
                createdAt: Date.now(),
                createdAtStr: new Date().toLocaleString('sq-AL')
            };

            await database.collection(COLLECTION).add(feedback);

            if (window.TaxiAuditLog) {
                window.TaxiAuditLog.log('feedback_sent', { type, title });
            }

            document.getElementById('modal-feedback')?.remove();

            if (typeof showToast === 'function') {
                showToast('success', '✅ Faleminderit!', 'Feedback u dërgua');
            }

        } catch (e) {
            console.error('❌ submitFeedback:', e);
            errBox.textContent = 'Gabim: ' + e.message;
            errBox.style.display = 'block';
        }
    }

    // ═══ MERR TË GJITHA (për admin) ═══
    async function getAll(limit = 100) {
        const database = db();
        if (!database) return [];

        try {
            const snap = await database.collection(COLLECTION)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.error('❌ getAllFeedback:', e);
            return [];
        }
    }

    // ═══ STATS ═══
    async function getStats() {
        const all = await getAll(500);
        return {
            total: all.length,
            new: all.filter(f => f.status === 'new').length,
            bugs: all.filter(f => f.type === 'bug').length,
            features: all.filter(f => f.type === 'feature').length,
            critical: all.filter(f => f.priority === 'critical').length
        };
    }

    // ═══ UPDATE STATUS ═══
    async function updateStatus(feedbackId, status) {
        const database = db();
        if (!database) return;

        try {
            await database.collection(COLLECTION).doc(feedbackId).update({
                status,
                updatedAt: Date.now()
            });
            console.log('✅ Feedback status u përditësua:', status);
        } catch (e) {
            console.error('❌ updateStatus:', e);
        }
    }

    return { open, submit, getAll, getStats, updateStatus };
})();

console.log('✅ feedback.js ngarkuar');
