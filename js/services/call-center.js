'use strict';

/**
 * call-center.js — Call Center i plotë
 */

window.TaxiCallCenter = (() => {
    const state = {
        queue: [],
        onHold: [],
        history: [],
        activeCall: null
    };
    const pendingTransfers = new Map();
    const operatorsBusy = new Set();

    const KEYS = {
        F1: 'pickup',
        F2: 'hangup',
        F3: 'hold',
        F4: 'transfer'
    };

    function getAppState() {
        // Provo të dyja mënyrat
        return window.AppState || (typeof AppState !== 'undefined' ? AppState : null);
    }

    function getCurrentPage() {
        const s = getAppState();
        return s?.currentPage || 'dispatch';
    }

    // ═══ INIT ═══
    function init() {
        setupKeyboard();
        loadHistoryFromFirestore();
        setTimeout(() => listenIncomingTransfers(), 2000);
        console.log('✅ Call Center aktivizuar');
    }

    // ═══ KEYBOARD F1-F4 ═══
    function setupKeyboard() {
        const handler = (e) => {
            const action = KEYS[e.key];
            if (!action) return;

            console.log('⌨️ Tast:', e.key, '| Page:', getCurrentPage());

            // BLLOKO CHROME HELP
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            const page = getCurrentPage();

            // FAQJA DISPATCH
            if (page === 'dispatch') {
                if (action === 'pickup')   { console.log('→ F1'); acceptIncomingCallFromDispatch(); }
                if (action === 'hangup')   { console.log('→ F2'); rejectIncomingCallFromDispatch(); }
                if (action === 'hold')     { console.log('→ F3'); holdIncomingCallFromDispatch(); }
                if (action === 'transfer') { console.log('→ F4'); transferIncomingCallFromDispatch(); }
                return false;
            }

            // FAQJA CALL CENTER
            if (page === 'calls') {
                runAction(action);
                return false;
            }

            return false;
        };

        window.addEventListener('keydown', handler, true);
        document.addEventListener('keydown', handler, true);

        const keyupHandler = (e) => {
            if (KEYS[e.key]) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        };
        window.addEventListener('keyup', keyupHandler, true);
        document.addEventListener('keyup', keyupHandler, true);

        console.log('⌨️ Shkurtesat F1-F4 të aktivizuara');
    }

    function runAction(action) {
        switch (action) {
            case 'pickup': pickup(); break;
            case 'hangup': hangup(); break;
            case 'hold': hold(); break;
            case 'transfer': openTransfer(); break;
        }
    }

       // ═══ F1 — PRANO NGA DISPATCH ═══
    function acceptIncomingCallFromDispatch() {
        const s = getAppState();
        const calls = s?.incomingCalls || [];

        // Nëse ka thirrje aktive → F1 nuk bën gjë
        if (state.activeCall) {
            showToast('warning', 'Thirrje aktive', 'Mbyll thirrjen aktuale me F2 së pari');
            return;
        }

        if (!calls.length) {
            showToast('info', 'Nuk ka thirrje', 'Nuk ka thirrje hyrëse');
            return;
        }

        const call = calls[0];

        // Plotëso formën
        const phoneField = document.getElementById('client-phone');
        const nameField = document.getElementById('client-name');
        const pickupField = document.getElementById('pickup-address');

        if (phoneField) phoneField.value = call.phone || '';
        if (nameField && call.name) nameField.value = call.name;
        if (pickupField && call.lastAddress) pickupField.value = call.lastAddress;

        // Bëje thirrjen aktive
        state.activeCall = {
            id: call.id,
            phone: call.phone,
            name: call.name || 'Klient',
            lastAddress: call.lastAddress || '',
            time: call.time,
            startTime: Date.now(),
            answeredAt: Date.now()
        };

        // Fshi nga lista hyrëse
        if (s) s.incomingCalls = calls.filter(c => c.id !== call.id);
        if (typeof renderIncomingCalls === 'function') renderIncomingCalls();

        // Ndal zilen
        if (typeof stopRing === 'function') stopRing();
        if (window.TaxiSound) window.TaxiSound.stopRing();

        logEvent('call_answered', { phone: call.phone });

        if (phoneField) {
            phoneField.focus();
            phoneField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        showToast('success', '📞 Thirrja u pranua', `${call.phone} — plotëso porosinë (F2=Mbyll, F3=Pritje, F4=Transfer)`);
        if (window.TaxiSound) window.TaxiSound.beep(1200, 0.15, 0.1);
    }

    // ═══ F2 — REFUZO NGA DISPATCH ═══
    function rejectIncomingCallFromDispatch() {
        const s = getAppState();
        const calls = s?.incomingCalls || [];
        if (!calls.length) {
            showToast('info', 'Nuk ka thirrje', 'Nuk ka thirrje hyrëse');
            return;
        }

        const call = calls[0];
        if (!confirm(`A jeni i sigurt që dëshironi të REFUZONI thirrjen nga ${call.phone}?`)) return;

        missCall(call);

        if (s) s.incomingCalls = calls.filter(c => c.id !== call.id);
        if (typeof renderIncomingCalls === 'function') renderIncomingCalls();

        if (typeof stopRing === 'function') stopRing();
        if (window.TaxiSound) window.TaxiSound.stopRing();

        if (window.TaxiEvents) window.TaxiEvents.emit('operator:cancelled');

        showToast('info', '📵 U refuzua', call.phone);
    }

    // ═══ F3 — NË PRITJE NGA DISPATCH ═══
    function holdIncomingCallFromDispatch() {
        const s = getAppState();
        const calls = s?.incomingCalls || [];
        if (!calls.length) {
            showToast('info', 'Nuk ka thirrje', 'Nuk ka thirrje hyrëse');
            return;
        }

        const call = calls[0];

        state.onHold.push({
            id: call.id,
            phone: call.phone,
            name: call.name || 'Klient',
            lastAddress: call.lastAddress || '',
            time: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
            holdStart: Date.now()
        });

        if (s) s.incomingCalls = calls.filter(c => c.id !== call.id);
        if (typeof renderIncomingCalls === 'function') renderIncomingCalls();

        if (typeof stopRing === 'function') stopRing();
        if (window.TaxiSound) window.TaxiSound.stopRing();

        render();

        logEvent('call_hold_from_dispatch', { phone: call.phone });
        showToast('warning', '⏸️ Në pritje', `${call.phone} u vu në pritje`);
    }

    // ═══ F4 — TRANSFER NGA DISPATCH ═══
    function transferIncomingCallFromDispatch() {
        const s = getAppState();
        const calls = s?.incomingCalls || [];
        if (!calls.length) {
            showToast('info', 'Nuk ka thirrje', 'Nuk ka thirrje hyrëse');
            return;
        }

        const call = calls[0];

        state.activeCall = {
            id: call.id,
            phone: call.phone,
            name: call.name || 'Klient',
            lastAddress: call.lastAddress || '',
            time: call.time,
            startTime: Date.now()
        };

        if (s) s.incomingCalls = calls.filter(c => c.id !== call.id);
        if (typeof renderIncomingCalls === 'function') renderIncomingCalls();

        if (typeof stopRing === 'function') stopRing();
        if (window.TaxiSound) window.TaxiSound.stopRing();

        openTransferModal();

        showToast('info', '🔄 Transfer', `Duke transferuar ${call.phone}`);
    }

    // ═══ KRIJO THIRRJE TË RE ═══
    function addToQueue(call) {
        const item = {
            id: call.id || Date.now(),
            phone: call.phone,
            name: call.name || '',
            lastAddress: call.lastAddress || '',
            waitStart: Date.now(),
            time: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })
        };
        state.queue.push(item);
        logEvent('call_in_queue', { phone: item.phone });
        render();
        return item;
    }

    function pickup() {
        if (state.activeCall) {
            showToast('warning', 'Thirrje aktive', 'Mbyll thirrjen aktuale së pari');
            return;
        }
        const call = state.queue.shift();
        if (!call) {
            showToast('info', 'Nuk ka thirrje', 'Radha është bosh');
            return;
        }

        state.activeCall = { ...call, startTime: Date.now(), answeredAt: Date.now() };

        logEvent('call_answered', { phone: call.phone });
        if (window.TaxiSound) window.TaxiSound.beep(1200, 0.15, 0.1);
        showToast('success', '📞 U pranua', call.phone);
        render();
    }

    function pickupSpecific(id) {
        const idx = state.queue.findIndex(c => c.id === id);
        if (idx < 0) return;
        if (state.activeCall) {
            showToast('warning', 'Thirrje aktive', 'Mbyll thirrjen aktuale së pari');
            return;
        }
        const call = state.queue.splice(idx, 1)[0];
        state.activeCall = { ...call, startTime: Date.now() };
        showToast('success', '📞 U pranua', call.phone);
        render();
    }

    function hangup() {
        if (!state.activeCall) {
            showToast('info', 'Nuk ka thirrje', 'Nuk ka thirrje aktive');
            return;
        }
        const duration = Math.floor((Date.now() - state.activeCall.startTime) / 1000);
        state.history.unshift({
            id: state.activeCall.id,
            phone: state.activeCall.phone,
            name: state.activeCall.name,
            status: 'A',
            statusLabel: 'Pranuar',
            time: state.activeCall.time,
            duration,
            timestamp: Date.now()
        });
        logEvent('call_hangup', { phone: state.activeCall.phone, duration });
        state.activeCall = null;
        showToast('info', '📵 U mbyll', `Kohëzgjatja: ${formatDuration(duration)}`);
        render();
    }

    function hold() {
        if (!state.activeCall) {
            showToast('info', 'Nuk ka thirrje', 'Nuk ka thirrje aktive');
            return;
        }
        const item = { ...state.activeCall, holdStart: Date.now() };
        state.onHold.push(item);
        state.activeCall = null;
        logEvent('call_hold', { phone: item.phone });
        showToast('info', '⏸️ Në pritje', `${item.phone} u vu në pritje`);
        render();
    }

    function unhold(id) {
        const idx = state.onHold.findIndex(h => h.id === id);
        if (idx < 0) return;
        const item = state.onHold.splice(idx, 1)[0];
        if (state.activeCall) {
            state.queue.unshift(item);
            showToast('warning', 'Radhë', `${item.phone} u kthye në radhë`);
        } else {
            state.activeCall = { ...item, startTime: Date.now() };
            showToast('success', '▶️ U kthye', item.phone);
        }
        render();
    }

    function dropHold(id) {
        const idx = state.onHold.findIndex(h => h.id === id);
        if (idx < 0) return;
        const item = state.onHold.splice(idx, 1)[0];
        state.history.unshift({
            id: item.id, phone: item.phone, name: item.name,
            status: 'M', statusLabel: 'Humbur', time: item.time,
            duration: 0, timestamp: Date.now()
        });
        render();
    }

    function openTransfer() {
        if (!state.activeCall) {
            showToast('info', 'Nuk ka thirrje', 'Nuk ka thirrje aktive');
            return;
        }
        openTransferModal();
    }

    async function openTransferModal() {
        const existing = document.getElementById('modal-transfer-call');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-transfer-call';

        let operators = [];
        try {
            const db = window.TaxiFirebase?.db;
            if (db) {
                const snap = await db.collection('operators').get();
                operators = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }
        } catch (e) { console.warn('Operators load:', e); }

        const myUid = window.TaxiAuth?.currentUser()?.uid;
        operators = operators.filter(o => o.uid !== myUid);
        operators = operators.map(op => ({ ...op, busy: isOperatorBusy(op.uid) }));

        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title"><i class="fa-solid fa-share"></i><h3>Transfero thirrjen</h3></div>
                    <button class="modal-close" onclick="document.getElementById('modal-transfer-call').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="transfer-call-info">
                        <i class="fa-solid fa-phone"></i>
                        <div>
                            <div style="font-weight:700;font-size:13px;">${state.activeCall.phone}</div>
                            <div style="font-size:11px;color:var(--text-muted);">${state.activeCall.name || 'Klient'}</div>
                        </div>
                    </div>
                    <div class="detail-section-title" style="margin-top:16px;"><i class="fa-solid fa-users"></i> Zgjedh operatorin</div>
                    <div class="operator-list">
                        ${operators.length === 0 ? `<div style="text-align:center;padding:30px;color:var(--text-muted);font-size:12px;"><i class="fa-solid fa-user-slash" style="font-size:32px;opacity:0.3;display:block;margin-bottom:12px;"></i>Nuk ka operatorë të tjerë</div>` :
                            operators.map(op => `
                                <div class="operator-item ${op.busy ? 'busy' : 'free'}" onclick="TaxiCallCenter.transferToOperator('${op.uid}', '${(op.name || op.email || 'Operator').replace(/'/g, "\\'")}')">
                                    <div class="op-avatar">${(op.name || op.email || 'OP').slice(0, 2).toUpperCase()}</div>
                                    <div class="op-info">
                                        <div class="op-name">${op.name || op.email}</div>
                                        <div class="op-role">${op.role || 'Dispatcher'}</div>
                                    </div>
                                    <div class="op-status ${op.busy ? 'busy' : 'free'}">
                                        ${op.busy ? '<i class="fa-solid fa-circle"></i> I ZËNË' : '<i class="fa-solid fa-circle"></i> I LIRË'}
                                    </div>
                                </div>
                            `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-transfer-call').remove()">Anulo</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    function isOperatorBusy(uid) {
        if (!uid) return false;
        for (const [targetUid, calls] of pendingTransfers.entries()) {
            if (targetUid === uid && calls.length > 0) return true;
        }
        if (operatorsBusy.has(uid)) return true;
        return false;
    }

    function transferToOperator(targetUid, targetName) {
        if (!state.activeCall) return;
        const call = state.activeCall;

        state.history.unshift({
            id: call.id, phone: call.phone, name: call.name,
            status: 'T', statusLabel: `Transferuar → ${targetName}`,
            time: call.time, duration: Math.floor((Date.now() - call.startTime) / 1000),
            timestamp: Date.now()
        });

        saveTransferToFirestore(call, targetUid, targetName);

        state.activeCall = null;
        document.getElementById('modal-transfer-call')?.remove();

        showToast('success', '🔄 U transferua', `Tek ${targetName}`);
        logEvent('call_transfer', { phone: call.phone, to: targetName, targetUid });
        render();
    }

    async function saveTransferToFirestore(call, targetUid, targetName) {
        const db = window.TaxiFirebase?.db;
        if (!db) return;
        try {
            await db.collection('transfers').add({
                callId: call.id, phone: call.phone, name: call.name,
                targetUid, targetName,
                fromUid: window.TaxiAuth?.currentUser()?.uid || null,
                fromName: window.TaxiState?.get('currentOperator')?.name || 'Operator',
                createdAt: Date.now(), status: 'pending'
            });
        } catch (e) { console.warn('Transfer save:', e); }
    }

    function listenIncomingTransfers() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;
        const myUid = window.TaxiAuth?.currentUser()?.uid;
        if (!myUid) return;

        db.collection('transfers')
            .where('targetUid', '==', myUid)
            .where('status', '==', 'pending')
            .onSnapshot((snap) => {
                snap.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const t = { id: change.doc.id, ...change.doc.data() };
                        showTransferNotification(t);
                    }
                });
            });
    }

    function showTransferNotification(transfer) {
        if (window.TaxiSound) window.TaxiSound.playNotification();

        const c = document.getElementById('toast-container');
        if (!c) return;

        const t = document.createElement('div');
        t.className = 'toast warning';
        t.style.minWidth = '320px';
        t.innerHTML = `
            <i class="fa-solid fa-share"></i>
            <div class="toast-content" style="flex:1;">
                <div class="toast-title">🔄 Transferim i re</div>
                <div class="toast-message">${transfer.fromName} → ${transfer.phone}</div>
                <div style="display:flex;gap:6px;margin-top:8px;">
                    <button class="btn-primary" style="padding:5px 12px;font-size:11px;" onclick="TaxiCallCenter.acceptTransfer('${transfer.id}', '${transfer.phone}', '${(transfer.name || '').replace(/'/g, "\\'")}')">
                        <i class="fa-solid fa-check"></i> Prano
                    </button>
                    <button class="btn-ghost" style="padding:5px 12px;font-size:11px;" onclick="TaxiCallCenter.rejectTransfer('${transfer.id}')">
                        Refuzo
                    </button>
                </div>
            </div>
        `;
        c.appendChild(t);
    }

    async function acceptTransfer(transferId, phone, name) {
        const db = window.TaxiFirebase?.db;
        if (db) {
            try {
                await db.collection('transfers').doc(transferId).update({ status: 'accepted', acceptedAt: Date.now() });
            } catch (e) {}
        }
        if (!state.activeCall) {
            state.activeCall = { id: Date.now(), phone, name: name || 'Transferuar', time: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }), startTime: Date.now() };
            showToast('success', '📞 Thirrje e re', phone);
            render();
        } else {
            state.queue.unshift({ id: Date.now(), phone, name: name + ' (transferuar)', time: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }), waitStart: Date.now() });
            showToast('info', '⏸️ Në radhë', 'Thirrja u vu në radhë');
            render();
        }
    }

    async function rejectTransfer(transferId) {
        const db = window.TaxiFirebase?.db;
        if (db) {
            try { await db.collection('transfers').doc(transferId).update({ status: 'rejected', rejectedAt: Date.now() }); } catch (e) {}
        }
        showToast('info', 'Refuzuar', 'Transferimi u refuzua');
    }

    function reject(id) {
        const idx = state.queue.findIndex(c => c.id === id);
        if (idx < 0) return;
        const call = state.queue.splice(idx, 1)[0];
        state.history.unshift({ id: call.id, phone: call.phone, name: call.name, status: 'R', statusLabel: 'Refuzuar', time: call.time, duration: 0, timestamp: Date.now() });
        logEvent('call_rejected', { phone: call.phone });
        render();
    }

    function missCall(call) {
        state.history.unshift({
            id: call.id || Date.now(), phone: call.phone, name: call.name || '',
            status: 'M', statusLabel: 'Humbur',
            time: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
            duration: 0, timestamp: Date.now()
        });
        logEvent('call_missed', { phone: call.phone });
        render();
    }

    async function loadHistoryFromFirestore() {
        if (!window.TaxiFirebase?.db) return;
        try {
            const snap = await window.TaxiFirebase.db.collection('calls').orderBy('startedAt', 'desc').limit(50).get();
            state.history = snap.docs.map(doc => {
                const d = doc.data();
                return {
                    id: doc.id, phone: d.phone || '', name: d.clientName || '',
                    status: d.status === 'answered' ? 'A' : d.status === 'missed' ? 'M' : d.status === 'rejected' ? 'R' : 'A',
                    statusLabel: d.status === 'answered' ? 'Pranuar' : d.status === 'missed' ? 'Humbur' : d.status === 'rejected' ? 'Refuzuar' : '—',
                    time: d.startedAt ? new Date(d.startedAt).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }) : '',
                    duration: d.duration || 0, timestamp: d.startedAt || 0
                };
            });
            render();
        } catch (e) { console.warn('History load:', e); }
    }

    async function logEvent(type, data) {
        if (!window.TaxiFirebase?.db) return;
        try {
            await window.TaxiFirebase.db.collection('calls').add({
                type, ...data,
                operatorId: window.TaxiAuth?.currentUser()?.uid || null,
                operatorName: window.TaxiState?.get('currentOperator')?.name || 'Operator',
                startedAt: Date.now()
            });
        } catch (e) {}
    }

    function formatDuration(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    function formatWait(ms) {
        return formatDuration(Math.floor((Date.now() - ms) / 1000));
    }

    function render() {
        const el = document.querySelector('.page[data-page="calls"]');
        if (!el) return;

        const queueCount = state.queue.length;
        const holdCount = state.onHold.length;
        const todayTotal = state.history.length;
        const answered = state.history.filter(h => h.status === 'A').length;
        const missed = state.history.filter(h => h.status === 'M').length;
        const rejected = state.history.filter(h => h.status === 'R').length;

        el.innerHTML = `
            <div class="page-header">
                <div class="page-title">
                    <i class="fa-solid fa-phone-volume"></i>
                    <div><h2>Call Center</h2><p>Menaxhimi i thirrjeve · ${queueCount} në radhë · ${holdCount} në pritje</p></div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <div class="shortcut-hint"><kbd>F1</kbd> Prano</div>
                    <div class="shortcut-hint"><kbd>F2</kbd> Mbyll</div>
                    <div class="shortcut-hint"><kbd>F3</kbd> Pritje</div>
                    <div class="shortcut-hint"><kbd>F4</kbd> Transfer</div>
                </div>
            </div>

            <div class="kpi-grid">
                <div class="kpi-card pink"><div class="kpi-label"><i class="fa-solid fa-phone"></i> Në radhë</div><div class="kpi-value pink">${queueCount}</div><div class="kpi-sub">Thirrje duke pritur</div></div>
                <div class="kpi-card yellow"><div class="kpi-label"><i class="fa-solid fa-pause"></i> Në pritje</div><div class="kpi-value yellow">${holdCount}</div><div class="kpi-sub">Mbahtur aktive</div></div>
                <div class="kpi-card green"><div class="kpi-label"><i class="fa-solid fa-check"></i> Pranuar</div><div class="kpi-value green">${answered}</div><div class="kpi-sub">Sot</div></div>
                <div class="kpi-card blue"><div class="kpi-label"><i class="fa-solid fa-phone-slash"></i> Humbur / Refuzuar</div><div class="kpi-value blue">${missed + rejected}</div><div class="kpi-sub">${missed} M · ${rejected} R</div></div>
            </div>

            ${state.activeCall ? `
                <div class="active-call-banner">
                    <div class="acb-left"><div class="acb-pulse"></div><div><div class="acb-phone">${state.activeCall.phone}</div><div class="acb-name">${state.activeCall.name || 'Klient'}</div></div></div>
                    <div class="acb-center"><div class="acb-timer" id="acb-timer">${formatDuration(Math.floor((Date.now() - state.activeCall.startTime) / 1000))}</div></div>
                    <div class="acb-right">
                        <button class="btn-warning" onclick="TaxiCallCenter.hold()"><i class="fa-solid fa-pause"></i> Pritje (F3)</button>
                        <button class="btn-primary" onclick="TaxiCallCenter.openTransfer()"><i class="fa-solid fa-share"></i> Transfer (F4)</button>
                        <button class="btn-danger" onclick="TaxiCallCenter.hangup()"><i class="fa-solid fa-phone-slash"></i> Mbyll (F2)</button>
                    </div>
                </div>
            ` : ''}

            <div class="call-center-grid">
                <div class="cc-panel">
                    <div class="cc-panel-header">
                        <div class="cc-panel-title"><i class="fa-solid fa-list-ol"></i><h3>Radha e Thirrjeve</h3><span class="count-badge">${queueCount}</span></div>
                        <button class="btn-primary" onclick="TaxiCallCenter.pickup()" style="padding:6px 12px;font-size:11px;"><i class="fa-solid fa-phone"></i> Prano (F1)</button>
                    </div>
                    <div class="cc-panel-body">
                        ${queueCount === 0 ? `<div class="empty-state"><i class="fa-solid fa-phone-slash"></i><p>Radha është bosh</p></div>` :
                            state.queue.map((c, idx) => `
                                <div class="queue-item ${idx === 0 ? 'first' : ''}">
                                    <div class="qi-left"><div class="qi-number">${idx + 1}</div><div><div class="qi-phone">${c.phone}</div><div class="qi-name">${c.name || 'Klient i re'}</div></div></div>
                                    <div class="qi-middle"><div class="qi-wait" data-start="${c.waitStart}">${formatWait(c.waitStart)}</div>${c.lastAddress ? `<div class="qi-addr">📍 ${c.lastAddress}</div>` : ''}</div>
                                    <div class="qi-actions">
                                        <button class="action-btn auto" onclick="TaxiCallCenter.pickupSpecific(${c.id})"><i class="fa-solid fa-phone"></i></button>
                                        <button class="action-btn cancel" onclick="TaxiCallCenter.reject(${c.id})"><i class="fa-solid fa-xmark"></i></button>
                                    </div>
                                </div>
                            `).join('')}
                    </div>
                </div>

                <div class="cc-panel">
                    <div class="cc-panel-header"><div class="cc-panel-title"><i class="fa-solid fa-pause"></i><h3>Në Pritje</h3><span class="count-badge warning">${holdCount}</span></div></div>
                    <div class="cc-panel-body">
                        ${holdCount === 0 ? `<div class="empty-state"><i class="fa-solid fa-circle-pause"></i><p>Nuk ka thirrje në pritje</p></div>` :
                            state.onHold.map(h => `
                                <div class="hold-item">
                                    <div class="hi-left"><div class="hi-pulse"></div><div><div class="hi-phone">${h.phone}</div><div class="hi-name">${h.name || 'Klient'}</div></div></div>
                                    <div class="hi-middle"><div class="hi-time" data-start="${h.holdStart}">${formatWait(h.holdStart)}</div></div>
                                    <div class="hi-actions">
                                        <button class="action-btn auto" onclick="TaxiCallCenter.unhold(${h.id})"><i class="fa-solid fa-play"></i> Kthe</button>
                                        <button class="action-btn cancel" onclick="TaxiCallCenter.dropHold(${h.id})"><i class="fa-solid fa-xmark"></i></button>
                                    </div>
                                </div>
                            `).join('')}
                    </div>
                </div>

                <div class="cc-panel">
                    <div class="cc-panel-header"><div class="cc-panel-title"><i class="fa-solid fa-clock-rotate-left"></i><h3>Historiku</h3><span class="count-badge">${todayTotal}</span></div></div>
                    <div class="cc-panel-body">
                        ${todayTotal === 0 ? `<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Nuk ka histori</p></div>` :
                            state.history.slice(0, 30).map(h => `
                                <div class="history-item-call">
                                    <div class="hic-status ${h.status}">${h.status}</div>
                                    <div class="hic-info"><div class="hic-phone">${h.phone}</div><div class="hic-meta">${h.statusLabel} · ${h.time}</div></div>
                                    ${h.duration > 0 ? `<div class="hic-duration">${formatDuration(h.duration)}</div>` : ''}
                                </div>
                            `).join('')}
                    </div>
                </div>
            </div>
        `;
        startTimers();
    }

    let timerInterval = null;
    function startTimers() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            document.querySelectorAll('[data-start]').forEach(el => {
                const start = parseInt(el.dataset.start);
                if (start) el.textContent = formatWait(start);
            });
            const acbTimer = document.getElementById('acb-timer');
            if (acbTimer && state.activeCall) {
                acbTimer.textContent = formatDuration(Math.floor((Date.now() - state.activeCall.startTime) / 1000));
            }
        }, 1000);
    }

    return {
        init, render,
        addToQueue, missCall,
        pickup, pickupSpecific,
        hangup, hold, unhold, dropHold,
        openTransfer, reject,
        transferToOperator, acceptTransfer, rejectTransfer,
        state, operatorsBusy
    };
})();

console.log('✅ call-center.js ngarkuar');
