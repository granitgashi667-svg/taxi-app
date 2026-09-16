'use strict';

/**
 * js/admin/sms-templates.js — SMS Templates
 * Template-t e SMS-ve me variabla dinamike
 */

window.AdminSmsTemplates = (() => {
    let templatesCache = [];
    let filters = { search: '', category: 'all', active: 'all' };

    // Kategoritë e gatshme
    const CATEGORIES = {
        general:   { label: 'Të përgjithshme', icon: '📝', color: '#94a3b8' },
        order:     { label: 'Porosi',          icon: '🚕', color: '#3b82f6' },
        driver:    { label: 'Shoferë',         icon: '🚗', color: '#f59e0b' },
        client:    { label: 'Klientë',         icon: '👤', color: '#10b981' },
        marketing: { label: 'Marketing',       icon: '📢', color: '#ec4899' },
        system:    { label: 'Sistem',          icon: '⚙️', color: '#8b5cf6' }
    };

    // Variablat e disponueshme
    const VARIABLES = [
        { key: '{emri}',          desc: 'Emri i klientit' },
        { key: '{telefoni}',      desc: 'Telefoni' },
        { key: '{adresa}',        desc: 'Adresa e marrjes' },
        { key: '{destinacioni}',  desc: 'Destinacioni' },
        { key: '{vetura}',        desc: 'Numri i veturës' },
        { key: '{shoferi}',       desc: 'Emri i shoferit' },
        { key: '{cmimi}',         desc: 'Çmimi' },
        { key: '{koha}',          desc: 'Koha e pritjes (min)' },
        { key: '{data}',          desc: 'Data e porosisë' },
        { key: '{kompania}',      desc: 'Emri i kompanisë' },
        { key: '{pike}',          desc: 'Pikët e besnikërisë' },
        { key: '{link}',          desc: 'Link (p.sh. tracking)' }
    ];

    // ═══ INIT ═══
    function init() {
        console.log('💬 AdminSmsTemplates: Init...');
    }

    async function load() {
        await renderPage();
        await loadTemplates();
    }

    // ═══ LOAD ═══
    async function loadTemplates() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        try {
            const snap = await db.collection('sms_templates').orderBy('createdAt', 'desc').limit(500).get();
            templatesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch {
            const snap = await db.collection('sms_templates').limit(500).get();
            templatesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        renderList();
        renderStatsBlock();
    }

    // ═══ RENDER FAQJA ═══
    function renderPage() {
        const el = document.querySelector('.admin-page[data-page="sms-templates"]');
        if (!el) return;

        el.innerHTML = `
            <div class="page-header" style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
                <div class="page-title">
                    <i class="fa-solid fa-comment-sms"></i>
                    <div>
                        <h2>SMS Templates</h2>
                        <p>Template-t e SMS-ve me variabla dinamike</p>
                    </div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn-secondary" onclick="AdminSmsTemplates.exportCsv()">
                        <i class="fa-solid fa-download"></i> CSV
                    </button>
                    <button class="btn-primary" onclick="AdminSmsTemplates.openModal()">
                        <i class="fa-solid fa-plus"></i> Template i re
                    </button>
                </div>
            </div>

            <div id="sms-stats"></div>

            <div class="db-panel">
                <div class="db-panel-header">
                    <i class="fa-solid fa-list"></i>
                    <h3>Template-t</h3>
                </div>
                <div class="db-panel-body">
                    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
                        <input type="text" id="sms-search" class="input-sm" placeholder="🔍 Kërko..."
                            style="flex:1;min-width:200px;" value="${filters.search}"
                            oninput="AdminSmsTemplates.applyFilters()">
                        <select id="sms-cat" class="input-sm" onchange="AdminSmsTemplates.applyFilters()">
                            <option value="all" ${filters.category === 'all' ? 'selected' : ''}>Të gjitha kategoritë</option>
                            ${Object.entries(CATEGORIES).map(([k, v]) => `
                                <option value="${k}" ${filters.category === k ? 'selected' : ''}>${v.icon} ${v.label}</option>
                            `).join('')}
                        </select>
                        <select id="sms-active" class="input-sm" onchange="AdminSmsTemplates.applyFilters()">
                            <option value="all" ${filters.active === 'all' ? 'selected' : ''}>Të gjitha</option>
                            <option value="active" ${filters.active === 'active' ? 'selected' : ''}>Aktive</option>
                            <option value="inactive" ${filters.active === 'inactive' ? 'selected' : ''}>Joaktive</option>
                        </select>
                        <button class="btn-secondary" onclick="AdminSmsTemplates.resetFilters()">
                            <i class="fa-solid fa-rotate"></i>
                        </button>
                    </div>
                    <div id="sms-list"></div>
                </div>
            </div>

            <div class="db-panel" style="margin-top:16px;">
                <div class="db-panel-header">
                    <i class="fa-solid fa-code"></i>
                    <h3>Variablat e disponueshme</h3>
                </div>
                <div class="db-panel-body">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;">
                        ${VARIABLES.map(v => `
                            <div style="padding:10px;background:#1e293b;border-radius:8px;cursor:pointer;"
                                onclick="navigator.clipboard.writeText('${v.key}'); AdminSmsTemplates.toastCopy('${v.key}')">
                                <code style="color:#a855f7;font-size:12px;font-weight:800;">${v.key}</code>
                                <div style="font-size:10px;color:#94a3b8;margin-top:2px;">${v.desc}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div id="sms-modal-root"></div>
        `;
    }

    // ═══ STATS ═══
    function renderStatsBlock() {
        const el = document.getElementById('sms-stats');
        if (!el) return;

        const total = templatesCache.length;
        const active = templatesCache.filter(t => t.active !== false).length;
        const byCat = {};
        Object.keys(CATEGORIES).forEach(k => byCat[k] = 0);
        templatesCache.forEach(t => { if (byCat[t.category] !== undefined) byCat[t.category]++; });

        const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

        el.innerHTML = `
            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card blue">
                    <div class="kpi-label"><i class="fa-solid fa-comment-sms"></i> Template totale</div>
                    <div class="kpi-value blue">${total}</div>
                    <div class="kpi-sub">${active} aktive</div>
                </div>
                <div class="kpi-card green">
                    <div class="kpi-label"><i class="fa-solid fa-check"></i> Aktive</div>
                    <div class="kpi-value green">${active}</div>
                    <div class="kpi-sub">${total - active} joaktive</div>
                </div>
                <div class="kpi-card yellow">
                    <div class="kpi-label"><i class="fa-solid fa-fire"></i> Kategoria top</div>
                    <div class="kpi-value yellow" style="font-size:16px;">
                        ${topCat && topCat[1] > 0 ? `${CATEGORIES[topCat[0]].icon} ${CATEGORIES[topCat[0]].label}` : '—'}
                    </div>
                    <div class="kpi-sub">${topCat ? topCat[1] + ' template' : ''}</div>
                </div>
                <div class="kpi-card pink">
                    <div class="kpi-label"><i class="fa-solid fa-code"></i> Variabla</div>
                    <div class="kpi-value pink">${VARIABLES.length}</div>
                    <div class="kpi-sub">të disponueshme</div>
                </div>
            </div>
        `;
    }

    // ═══ LISTA ═══
    function renderList() {
        const el = document.getElementById('sms-list');
        if (!el) return;

        let list = [...templatesCache];

        if (filters.search) {
            const q = filters.search.toLowerCase();
            list = list.filter(t =>
                (t.name || '').toLowerCase().includes(q) ||
                (t.content || '').toLowerCase().includes(q)
            );
        }
        if (filters.category !== 'all') list = list.filter(t => t.category === filters.category);
        if (filters.active === 'active') list = list.filter(t => t.active !== false);
        if (filters.active === 'inactive') list = list.filter(t => t.active === false);

        if (!list.length) {
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-comment-sms"></i><p>Nuk ka template</p></div>';
            return;
        }

        el.innerHTML = `
            <div style="display:grid;gap:10px;">
                ${list.map(t => {
                    const cat = CATEGORIES[t.category] || CATEGORIES.general;
                    const isActive = t.active !== false;
                    return `
                        <div style="padding:14px;background:#1e293b;border-radius:10px;border-left:4px solid ${cat.color};">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px;">
                                <div style="flex:1;">
                                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                        <strong style="font-size:14px;">${t.name || '(pa emër)'}</strong>
                                        <span style="padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;
                                            background:${cat.color}22;color:${cat.color};text-transform:uppercase;">
                                            ${cat.icon} ${cat.label}
                                        </span>
                                        ${isActive
                                            ? '<span style="padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;background:rgba(16,185,129,.15);color:#10b981;">● AKTIV</span>'
                                            : '<span style="padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;background:rgba(100,116,139,.15);color:#94a3b8;">○ OFF</span>'
                                        }
                                    </div>
                                </div>
                                <div style="display:flex;gap:4px;">
                                    <button class="btn-icon" title="Kopjo tekstin"
                                        onclick="AdminSmsTemplates.copyText('${t.id}')">
                                        <i class="fa-solid fa-copy"></i>
                                    </button>
                                    <button class="btn-icon" title="Testo"
                                        onclick="AdminSmsTemplates.openTest('${t.id}')">
                                        <i class="fa-solid fa-flask"></i>
                                    </button>
                                    <button class="btn-icon" title="Ndrysho"
                                        onclick="AdminSmsTemplates.openModal('${t.id}')">
                                        <i class="fa-solid fa-pen"></i>
                                    </button>
                                    <button class="btn-icon danger" title="Fshij"
                                        onclick="AdminSmsTemplates.deleteTemplate('${t.id}')">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                            <div style="padding:10px;background:#0f172a;border-radius:6px;font-family:monospace;font-size:12px;color:#cbd5e1;white-space:pre-wrap;word-break:break-word;">
                                ${escapeHtml(t.content || '')}
                            </div>
                            <div style="display:flex;gap:12px;margin-top:8px;font-size:10px;color:#64748b;">
                                <span>${(t.content || '').length} karaktere</span>
                                <span>${Math.ceil((t.content || '').length / 160)} SMS</span>
                                ${t.updatedAt ? `<span>Përditësuar: ${formatDate(t.updatedAt)}</span>` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // ═══ FILTRA ═══
    function applyFilters() {
        filters.search = document.getElementById('sms-search')?.value || '';
        filters.category = document.getElementById('sms-cat')?.value || 'all';
        filters.active = document.getElementById('sms-active')?.value || 'all';
        renderList();
    }

    function resetFilters() {
        filters = { search: '', category: 'all', active: 'all' };
        renderPage();
    }

    // ═══ MODAL: EDIT / NEW ═══
    function openModal(id) {
        const t = id ? templatesCache.find(x => x.id === id) : null;
        const isEdit = !!t;

        let root = document.getElementById('sms-modal-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'sms-modal-root';
            document.body.appendChild(root);
        }

        root.innerHTML = `
            <div class="modal-overlay" onclick="AdminSmsTemplates.closeModal(event)">
                <div class="modal-box" onclick="event.stopPropagation()" style="max-width:640px;max-height:90vh;overflow-y:auto;">
                    <h3><i class="fa-solid fa-comment-sms"></i> ${isEdit ? 'Ndrysho' : 'Template i re'}</h3>
                    <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
                        <label style="font-size:11px;color:#94a3b8;">
                            Emri *
                            <input type="text" id="tmpl-name" class="input" value="${t?.name || ''}"
                                placeholder="p.sh. Konfirmim porosie" style="width:100%;margin-top:4px;">
                        </label>

                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                            <label style="font-size:11px;color:#94a3b8;">
                                Kategoria
                                <select id="tmpl-cat" class="input" style="width:100%;margin-top:4px;">
                                    ${Object.entries(CATEGORIES).map(([k, v]) => `
                                        <option value="${k}" ${t?.category === k ? 'selected' : ''}>
                                            ${v.icon} ${v.label}
                                        </option>
                                    `).join('')}
                                </select>
                            </label>
                            <label style="font-size:11px;color:#94a3b8;">
                                Statusi
                                <select id="tmpl-active" class="input" style="width:100%;margin-top:4px;">
                                    <option value="true" ${t?.active !== false ? 'selected' : ''}>Aktiv</option>
                                    <option value="false" ${t?.active === false ? 'selected' : ''}>Joaktiv</option>
                                </select>
                            </label>
                        </div>

                        <label style="font-size:11px;color:#94a3b8;">
                            Përmbajtja *
                            <textarea id="tmpl-content" class="input" rows="5" style="width:100%;margin-top:4px;font-family:monospace;font-size:12px;"
                                placeholder="Përshëndetje {emri}, porosia juaj u pranua! Vetura {vetura} do të arrijë për {koha} min.">${t?.content || ''}</textarea>
                        </label>

                        <div style="padding:10px;background:#1e293b;border-radius:8px;">
                            <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;margin-bottom:6px;">
                                <i class="fa-solid fa-code"></i> Kliko për të futur variabël
                            </div>
                            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                ${VARIABLES.map(v => `
                                    <button type="button" class="btn-secondary" style="padding:4px 8px;font-size:10px;"
                                        onclick="AdminSmsTemplates.insertVar('${v.key}')">
                                        ${v.key}
                                    </button>
                                `).join('')}
                            </div>
                        </div>

                        <div style="padding:12px;background:#0f172a;border-radius:8px;">
                            <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;margin-bottom:6px;">
                                <i class="fa-solid fa-eye"></i> Preview
                            </div>
                            <div id="tmpl-preview" style="font-family:monospace;font-size:12px;color:#cbd5e1;white-space:pre-wrap;">
                                ${escapeHtml(t?.content || 'Shkruaj tekstin më lart...')}
                            </div>
                        </div>

                        <div id="tmpl-counter" style="font-size:10px;color:#64748b;text-align:right;">
                            ${(t?.content || '').length} karaktere · ${Math.ceil((t?.content || '').length / 160)} SMS
                        </div>

                        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
                            <button class="btn-secondary" onclick="AdminSmsTemplates.closeModal()">Anulo</button>
                            <button class="btn-primary" onclick="AdminSmsTemplates.save('${id || ''}')">
                                <i class="fa-solid fa-save"></i> Ruaj
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            const ta = document.getElementById('tmpl-content');
            if (ta) {
                ta.addEventListener('input', updatePreview);
                updatePreview();
            }
        }, 50);
    }

    function updatePreview() {
        const content = document.getElementById('tmpl-content')?.value || '';
        const preview = document.getElementById('tmpl-preview');
        const counter = document.getElementById('tmpl-counter');

        // Zëvendëso variablat me vlera demo
        const demoValues = {
            '{emri}': 'Arben',
            '{telefoni}': '+38344123456',
            '{adresa}': 'Rr. Nëna Terezë 5',
            '{destinacioni}': 'Aeroporti',
            '{vetura}': 'TX-123',
            '{shoferi}': 'Besnik',
            '{cmimi}': '€7.50',
            '{koha}': '5',
            '{data}': new Date().toLocaleDateString('sq-AL'),
            '{kompania}': 'TaxiApp',
            '{pike}': '250',
            '{link}': 'https://taxi.app/t/abc'
        };

        let demo = content;
        Object.entries(demoValues).forEach(([k, v]) => { demo = demo.split(k).join(v); });

        if (preview) preview.textContent = demo || 'Shkruaj tekstin më lart...';
        if (counter) counter.textContent = `${content.length} karaktere · ${Math.ceil(content.length / 160)} SMS`;
    }

    function insertVar(varKey) {
        const ta = document.getElementById('tmpl-content');
        if (!ta) return;
        const start = ta.selectionStart || 0;
        const end = ta.selectionEnd || 0;
        const text = ta.value;
        ta.value = text.slice(0, start) + varKey + text.slice(end);
        ta.selectionStart = ta.selectionEnd = start + varKey.length;
        ta.focus();
        updatePreview();
    }

    // ═══ SAVE ═══
    async function save(id) {
        const db = window.TaxiFirebase?.db;
        if (!db) return alert('Firebase nuk është gati');

        const name = document.getElementById('tmpl-name')?.value?.trim();
        const category = document.getElementById('tmpl-cat')?.value || 'general';
        const active = document.getElementById('tmpl-active')?.value === 'true';
        const content = document.getElementById('tmpl-content')?.value?.trim();

        if (!name) return alert('Shkruaj emrin');
        if (!content) return alert('Shkruaj përmbajtjen');

        try {
            const data = {
                name, category, active, content,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: window.TaxiFirebase?.auth?.currentUser?.email || 'admin'
            };

            if (id) {
                await db.collection('sms_templates').doc(id).update(data);
            } else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                data.createdBy = window.TaxiFirebase?.auth?.currentUser?.email || 'admin';
                data.usageCount = 0;
                await db.collection('sms_templates').add(data);
            }

            closeModal();
            showToast('success', id ? '✅ U përditësua' : '✅ U krijua', name);
            await loadTemplates();
        } catch (e) {
            console.error('❌ save:', e);
            alert('Gabim: ' + e.message);
        }
    }

    // ═══ MODAL: TEST ═══
    function openTest(id) {
        const t = templatesCache.find(x => x.id === id);
        if (!t) return;

        let root = document.getElementById('sms-modal-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'sms-modal-root';
            document.body.appendChild(root);
        }

        root.innerHTML = `
            <div class="modal-overlay" onclick="AdminSmsTemplates.closeModal(event)">
                <div class="modal-box" onclick="event.stopPropagation()" style="max-width:480px;">
                    <h3><i class="fa-solid fa-flask"></i> Testo — ${t.name}</h3>
                    <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
                        <label style="font-size:11px;color:#94a3b8;">
                            Numri i telefonit *
                            <input type="text" id="test-phone" class="input" value="+38344123456"
                                placeholder="+383..." style="width:100%;margin-top:4px;">
                        </label>
                        <div style="padding:12px;background:#0f172a;border-radius:8px;font-family:monospace;font-size:12px;color:#cbd5e1;white-space:pre-wrap;">
                            ${escapeHtml(t.content || '')}
                        </div>
                        <div style="padding:10px;background:rgba(245,158,11,.1);border-radius:8px;font-size:11px;color:#f59e0b;">
                            <i class="fa-solid fa-info-circle"></i> SMS test do të dërgohet me vlera demo.
                        </div>
                        <div style="display:flex;gap:8px;justify-content:flex-end;">
                            <button class="btn-secondary" onclick="AdminSmsTemplates.closeModal()">Anulo</button>
                            <button class="btn-primary" onclick="AdminSmsTemplates.sendTest('${id}')">
                                <i class="fa-solid fa-paper-plane"></i> Dërgo test
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async function sendTest(id) {
        const db = window.TaxiFirebase?.db;
        const t = templatesCache.find(x => x.id === id);
        const phone = document.getElementById('test-phone')?.value?.trim();
        if (!phone) return alert('Shkruaj numrin');

        // Demo vlera
        const demo = {
            '{emri}': 'Arben', '{telefoni}': phone,
            '{adresa}': 'Rr. Nena Tereze', '{destinacioni}': 'Aeroporti',
            '{vetura}': 'TX-123', '{shoferi}': 'Besnik',
            '{cmimi}': '€7.50', '{koha}': '5',
            '{data}': new Date().toLocaleDateString('sq-AL'),
            '{kompania}': 'TaxiApp', '{pike}': '250',
            '{link}': 'https://taxi.app/t/test'
        };

        let content = t.content;
        Object.entries(demo).forEach(([k, v]) => { content = content.split(k).join(v); });

        try {
            await db.collection('sms_queue').add({
                to: phone,
                message: content,
                templateId: id,
                templateName: t.name,
                type: 'test',
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                by: window.TaxiFirebase?.auth?.currentUser?.email || 'admin'
            });

            // Increment usage
            try {
                await db.collection('sms_templates').doc(id).update({
                    usageCount: firebase.firestore.FieldValue.increment(1),
                    lastUsedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch {}

            closeModal();
            showToast('success', '📤 SMS u dërgua', phone);
        } catch (e) {
            console.error('❌ sendTest:', e);
            alert('Gabim: ' + e.message);
        }
    }

    // ═══ COPY ═══
    function copyText(id) {
        const t = templatesCache.find(x => x.id === id);
        if (!t) return;
        navigator.clipboard.writeText(t.content || '');
        showToast('success', '📋 U kopjua', '');
    }

    function toastCopy(varKey) {
        showToast('success', '📋 U kopjua', varKey);
    }

    // ═══ DELETE ═══
    async function deleteTemplate(id) {
        const t = templatesCache.find(x => x.id === id);
        if (!t) return;
        if (!confirm(`Fshij template-in "${t.name}"?`)) return;

        try {
            await window.TaxiFirebase.db.collection('sms_templates').doc(id).delete();
            showToast('success', '🗑️ U fshi', t.name);
            await loadTemplates();
        } catch (e) {
            console.error('❌ delete:', e);
            alert('Gabim: ' + e.message);
        }
    }

    // ═══ EXPORT CSV ═══
    function exportCsv() {
        if (!templatesCache.length) return showToast('warning', 'Nuk ka të dhëna', '');

        const rows = templatesCache.map(t => ({
            'Emri': t.name || '',
            'Kategoria': CATEGORIES[t.category]?.label || t.category || '',
            'Aktiv': t.active !== false ? 'Po' : 'Jo',
            'Përmbajtja': t.content || '',
            'Karaktere': (t.content || '').length,
            'Përdorur': t.usageCount || 0,
            'Krijuar': formatDate(t.createdAt)
        }));

        if (window.TaxiExport) {
            window.TaxiExport.toCsv(rows, `sms-templates-${new Date().toISOString().slice(0,10)}.csv`);
            showToast('success', '📥 CSV u shkarkua', '');
        }
    }

    // ═══ HELPERS ═══
    function closeModal(e) {
        if (e && e.target && !e.target.classList.contains('modal-overlay')) return;
        const root = document.getElementById('sms-modal-root');
        if (root) root.innerHTML = '';
    }

    function formatDate(ts) {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
        return d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function showToast(type, title, msg) {
        if (window.AdminApp?.showToast) window.AdminApp.showToast(type, title, msg);
    }

    return {
        init, load,
        applyFilters, resetFilters,
        openModal, save, closeModal,
        updatePreview, insertVar,
        openTest, sendTest,
        copyText, toastCopy,
        deleteTemplate, exportCsv
    };
})();

console.log('✅ admin/sms-templates.js ngarkuar');
