'use strict';

/**
 * js/director/users.js — Menaxhimi i përdoruesve
 */

window.DirectorUsers = (() => {
    let cachedUsers = [];

    // ═══ INIT ═══
    function init() {
        console.log('👥 DirectorUsers: Init...');
    }

    // ═══ LOAD ═══
    async function load() {
        console.log('👥 Duke ngarkuar përdoruesit...');
        await renderAll();
    }

    // ═══ RENDER ALL ═══
    async function renderAll() {
        const el = document.getElementById('users-content');
        if (!el) return;

        el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Duke ngarkuar...</p></div>';

        try {
            const db = window.TaxiFirebase?.db;
            if (!db) throw new Error('Firebase nuk është gati');

            const snap = await db.collection('operators').get();
            const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            cachedUsers = users;
            renderStats(users);
            renderTable(users);

        } catch (e) {
            console.error('❌ renderAll:', e);
            el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Gabim: ${e.message}</p></div>`;
        }
    }

    // ═══ STATS ═══
    function renderStats(users) {
        const el = document.getElementById('users-content');

        const dispatchers = users.filter(u => u.role === 'dispatcher' || !u.role).length;
        const supervisors = users.filter(u => u.role === 'supervisor').length;
        const managers = users.filter(u => u.role === 'manager').length;
        const directors = users.filter(u => u.role === 'director' || u.role === 'admin').length;

        el.innerHTML = `
            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card green">
                    <div class="kpi-label"><i class="fa-solid fa-headset"></i> Dispeçerë</div>
                    <div class="kpi-value green">${dispatchers}</div>
                    <div class="kpi-sub">Niveli 1</div>
                </div>
                <div class="kpi-card blue">
                    <div class="kpi-label"><i class="fa-solid fa-user-tie"></i> Supervizorë</div>
                    <div class="kpi-value blue">${supervisors}</div>
                    <div class="kpi-sub">Niveli 2</div>
                </div>
                <div class="kpi-card purple">
                    <div class="kpi-label"><i class="fa-solid fa-users-gear"></i> Menagjerë</div>
                    <div class="kpi-value" style="color:var(--accent-purple);">${managers}</div>
                    <div class="kpi-sub">Niveli 3</div>
                </div>
                <div class="kpi-card yellow">
                    <div class="kpi-label"><i class="fa-solid fa-crown"></i> Drejtorë/Admin</div>
                    <div class="kpi-value yellow">${directors}</div>
                    <div class="kpi-sub">Niveli 4-5</div>
                </div>
            </div>

            <div class="page-actions" style="margin-bottom:16px;">
                <div></div>
                <button class="btn-primary" style="padding:10px 18px;" onclick="DirectorUsers.openAddModal()">
                    <i class="fa-solid fa-plus"></i> Shto përdorues
                </button>
            </div>

            <div class="admin-table-wrap" id="users-table"></div>
        `;
    }

    // ═══ TABLE ═══
    function renderTable(users) {
        const wrap = document.getElementById('users-table');
        if (!wrap) return;

        if (!users.length) {
            wrap.innerHTML = '<div class="empty-state" style="padding:60px;"><i class="fa-solid fa-user-slash"></i><p>Nuk ka përdorues</p></div>';
            return;
        }

        const roleColors = {
            dispatcher: 'green',
            supervisor: 'blue',
            manager: 'purple',
            director: 'yellow',
            admin: 'red'
        };

        wrap.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Përdoruesi</th>
                        <th>Email</th>
                        <th>Roli</th>
                        <th>Statusi</th>
                        <th>Hyrja e fundit</th>
                        <th>Veprime</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map((u, idx) => {
                        const avatar = u.avatar || (u.name || 'OP').slice(0, 2).toUpperCase();
                        const roleColor = roleColors[u.role] || 'green';
                        const active = u.active !== false;

                        return `
                            <tr>
                                <td class="mono">${idx + 1}</td>
                                <td>
                                    <div style="display:flex;align-items:center;gap:10px;">
                                        <div style="width:34px;height:34px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;color:white;font-family:var(--font-mono);flex-shrink:0;">${avatar}</div>
                                        <div>
                                            <div style="font-weight:700;color:var(--text-primary);">${u.name || 'I panjohur'}</div>
                                            <div style="font-size:10px;color:var(--text-muted);">ID: ${u.id.slice(0, 8)}...</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="phone">${u.email || '—'}</td>
                                <td><span class="admin-badge ${roleColor}">${u.role || 'dispatcher'}</span></td>
                                <td>
                                    <span class="admin-badge ${active ? 'green' : 'red'}">
                                        ${active ? '✅ Aktiv' : '❌ Joaktiv'}
                                    </span>
                                </td>
                                <td class="mono" style="font-size:10px;">${u.lastLoginDate || '—'}</td>
                                <td>
                                    <div style="display:flex;gap:4px;">
                                        <button class="filter-btn" style="padding:5px 8px;font-size:10px;" onclick="DirectorUsers.editUser('${u.id}')" title="Edito">
                                            <i class="fa-solid fa-pen"></i>
                                        </button>
                                        <button class="filter-btn" style="padding:5px 8px;font-size:10px;" onclick="DirectorUsers.changeRole('${u.id}')" title="Ndrysho rolin">
                                            <i class="fa-solid fa-user-shield"></i>
                                        </button>
                                        ${u.id !== window.DirectorApp?.currentOperator?.id ? `
                                            <button class="filter-btn" style="padding:5px 8px;font-size:10px;background:rgba(244,63,94,.15);border-color:var(--accent-red);color:var(--accent-red);" onclick="DirectorUsers.toggleActive('${u.id}', ${active})" title="${active ? 'Çaktivizo' : 'Aktivizo'}">
                                                <i class="fa-solid fa-${active ? 'ban' : 'check'}"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    // ═══ TOGGLE ACTIVE ═══
    async function toggleActive(userId, currentActive) {
        if (!confirm(currentActive ? 'Çaktivizo këtë përdorues?' : 'Aktivizo këtë përdorues?')) return;

        try {
            const db = window.TaxiFirebase?.db;
            if (!db) return;

            await db.collection('operators').doc(userId).update({
                active: !currentActive,
                updatedAt: Date.now()
            });

            if (window.TaxiAuditLog) {
                window.TaxiAuditLog.log(currentActive ? 'user_deactivated' : 'user_activated', { userId });
            }

            showToast('success', currentActive ? '❌ Çaktivizuar' : '✅ Aktivizuar', '');
            renderAll();

        } catch (e) {
            console.error('❌ toggleActive:', e);
            showToast('error', 'Gabim', '');
        }
    }

    // ═══ CHANGE ROLE ═══
    async function changeRole(userId) {
        const user = cachedUsers.find(u => u.id === userId);
        if (!user) return;

        const newRole = prompt(`Ndrysho rolin për ${user.name}\n\nOpsionet:\n- dispatcher\n- supervisor\n- manager\n- director\n- admin`, user.role || 'dispatcher');

        if (!newRole) return;

        const validRoles = ['dispatcher', 'supervisor', 'manager', 'director', 'admin'];
        if (!validRoles.includes(newRole.toLowerCase())) {
            showToast('error', 'Rol i pavlefshëm', 'Provo një nga opsionet');
            return;
        }

        try {
            const db = window.TaxiFirebase?.db;
            if (!db) return;

            await db.collection('operators').doc(userId).update({
                role: newRole.toLowerCase(),
                updatedAt: Date.now()
            });

            if (window.TaxiAuditLog) {
                window.TaxiAuditLog.log('user_role_changed', { userId, newRole });
            }

            showToast('success', '✅ Roli u ndryshua', `${user.name} → ${newRole}`);
            renderAll();

        } catch (e) {
            console.error('❌ changeRole:', e);
            showToast('error', 'Gabim', '');
        }
    }

    // ═══ EDIT USER ═══
    function editUser(userId) {
        const user = cachedUsers.find(u => u.id === userId);
        if (!user) return;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-edit-user';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title">
                        <i class="fa-solid fa-user-pen"></i>
                        <h3>Edito përdoruesin</h3>
                    </div>
                    <button class="modal-close" onclick="document.getElementById('modal-edit-user').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label><i class="fa-solid fa-user"></i> Emri</label>
                        <input type="text" id="edit-user-name" class="input-field" value="${user.name || ''}">
                    </div>
                    <div class="form-group">
                        <label><i class="fa-solid fa-envelope"></i> Email</label>
                        <input type="email" id="edit-user-email" class="input-field" value="${user.email || ''}" readonly>
                    </div>
                    <div class="form-group">
                        <label><i class="fa-solid fa-phone"></i> Telefon</label>
                        <input type="tel" id="edit-user-phone" class="input-field" value="${user.phone || ''}">
                    </div>
                    <div class="form-group">
                        <label><i class="fa-solid fa-money-bill"></i> Paga bazë (€)</label>
                        <input type="number" id="edit-user-salary" class="input-field" value="${user.baseSalary || 300}" min="0">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-edit-user').remove()">Anulo</button>
                    <button class="btn-primary" onclick="DirectorUsers.saveUser('${userId}')">
                        <i class="fa-solid fa-save"></i> Ruaj
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ═══ SAVE USER ═══
    async function saveUser(userId) {
        const name = document.getElementById('edit-user-name')?.value.trim();
        const phone = document.getElementById('edit-user-phone')?.value.trim();
        const baseSalary = parseFloat(document.getElementById('edit-user-salary')?.value) || 0;

        if (!name) {
            showToast('error', 'Gabim', 'Shkruaj emrin');
            return;
        }

        try {
            const db = window.TaxiFirebase?.db;
            if (!db) return;

            await db.collection('operators').doc(userId).update({
                name,
                phone,
                baseSalary,
                updatedAt: Date.now()
            });

            if (window.TaxiAuditLog) {
                window.TaxiAuditLog.log('user_updated', { userId });
            }

            document.getElementById('modal-edit-user')?.remove();
            showToast('success', '✅ U ruajt', name);
            renderAll();

        } catch (e) {
            console.error('❌ saveUser:', e);
            showToast('error', 'Gabim', '');
        }
    }

    // ═══ ADD MODAL ═══
    function openAddModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-add-user';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title">
                        <i class="fa-solid fa-user-plus"></i>
                        <h3>Shto përdorues</h3>
                    </div>
                    <button class="modal-close" onclick="document.getElementById('modal-add-user').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="padding:12px 14px;background:rgba(168,85,247,.1);border-radius:10px;font-size:12px;color:var(--text-secondary);margin-bottom:16px;">
                        <i class="fa-solid fa-info-circle" style="color:var(--accent-purple);"></i>
                        Përdoruesi duhet të krijohet fillimisht në <strong>Firebase Authentication</strong> me të njëjtin email.
                    </div>
                    <div class="form-group">
                        <label><i class="fa-solid fa-user"></i> Emri *</label>
                        <input type="text" id="new-user-name" class="input-field" placeholder="Granit Gashi">
                    </div>
                    <div class="form-group">
                        <label><i class="fa-solid fa-envelope"></i> Email *</label>
                        <input type="email" id="new-user-email" class="input-field" placeholder="granit@taxi.com">
                    </div>
                    <div class="form-group">
                        <label><i class="fa-solid fa-phone"></i> Telefon</label>
                        <input type="tel" id="new-user-phone" class="input-field" placeholder="+383 44 123 456">
                    </div>
                    <div class="form-group">
                        <label><i class="fa-solid fa-user-shield"></i> Roli *</label>
                        <select id="new-user-role" class="input-field">
                            <option value="dispatcher">Dispeçer (Niveli 1)</option>
                            <option value="supervisor">Supervizor (Niveli 2)</option>
                            <option value="manager">Menagjer (Niveli 3)</option>
                            <option value="director">Drejtor (Niveli 4)</option>
                            <option value="admin">Admin (Niveli 5)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label><i class="fa-solid fa-money-bill"></i> Paga bazë (€)</label>
                        <input type="number" id="new-user-salary" class="input-field" placeholder="300" min="0">
                    </div>
                    <div id="new-user-error" style="display:none;color:var(--accent-red);font-size:12px;padding:8px;background:rgba(244,63,94,.1);border-radius:6px;"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-add-user').remove()">Anulo</button>
                    <button class="btn-primary" onclick="DirectorUsers.confirmAdd()">
                        <i class="fa-solid fa-plus"></i> Shto
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ═══ CONFIRM ADD ═══
    async function confirmAdd() {
        const name = document.getElementById('new-user-name')?.value.trim();
        const email = document.getElementById('new-user-email')?.value.trim().toLowerCase();
        const phone = document.getElementById('new-user-phone')?.value.trim();
        const role = document.getElementById('new-user-role')?.value;
        const baseSalary = parseFloat(document.getElementById('new-user-salary')?.value) || 300;
        const errBox = document.getElementById('new-user-error');

        if (!name || !email || !role) {
            errBox.textContent = 'Plotëso emrin, email dhe rolin';
            errBox.style.display = 'block';
            return;
        }

        try {
            const db = window.TaxiFirebase?.db;
            if (!db) return;

            // Kontrollo nëse ekziston
            const existing = await db.collection('operators').where('email', '==', email).limit(1).get();
            if (!existing.empty) {
                errBox.textContent = 'Ky email ekziston tashmë';
                errBox.style.display = 'block';
                return;
            }

            const newUser = {
                name,
                email,
                phone,
                role,
                baseSalary,
                active: true,
                avatar: name.slice(0, 2).toUpperCase(),
                createdAt: Date.now(),
                createdAtStr: new Date().toLocaleString('sq-AL'),
                createdBy: window.DirectorApp?.currentOperator?.id || null,
                stats: {
                    totalMinutes: 0,
                    callsTaken: 0,
                    callsCancelled: 0,
                    trips: 0,
                    revenue: 0
                },
                vacations: {
                    totalDays: 22,
                    usedDays: 0,
                    remainingDays: 22
                }
            };

            await db.collection('operators').add(newUser);

            if (window.TaxiAuditLog) {
                window.TaxiAuditLog.log('user_created', { email, role });
            }

            document.getElementById('modal-add-user')?.remove();
            showToast('success', '✅ U shtua', `${name} (${role})`);
            renderAll();

        } catch (e) {
            console.error('❌ confirmAdd:', e);
            errBox.textContent = 'Gabim: ' + e.message;
            errBox.style.display = 'block';
        }
    }

    function showToast(type, title, msg) {
        if (window.DirectorApp?.showToast) window.DirectorApp.showToast(type, title, msg);
    }

    return { init, load, editUser, saveUser, changeRole, toggleActive, openAddModal, confirmAdd };
})();

console.log('✅ director/users.js ngarkuar');
