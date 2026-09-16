'use strict';

/**
 * call-center.js — Call Center i plotë
 * - Queue (radha)
 * - On Hold (në pritje)
 * - History (A/R/M)
 * - Shkurtesat F1-F4
 */

window.TaxiCallCenter = (() => {
    const state = {
        queue: [],
        onHold: [],
        history: [],
        activeCall: null
    };

    const KEYS = {
        F1: 'pickup',
        F2: 'hangup',
        F3: 'hold',
        F4: 'transfer'
    };

    // ═══ INIT ═══
    function init() {
        setupKeyboard();
        loadHistoryFromFirestore();
        console.log('✅ Call Center aktivizuar');
    }

    function setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            // Vetëm nëse jemi në faqen "calls"
            if (window.AppState?.currentPage !== 'calls') return;

            const action = KEYS[e.key];
            if (action) {
                e.preventDefault();
                runAction(action);
            }
        });
    }

    function runAction(action) {
        switch (action) {
            case 'pickup': pickup(); break;
            case 'hangup': hangup(); break;
            case 'hold': hold(); break;
            case 'transfer': openTransfer(); break;
        }
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

    // ═══ PRANO THIRRJEN E PARË ═══
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

        state.activeCall = {
            ...call,
            startTime: Date.now(),
            answeredAt: Date.now()
        };

        logEvent('call_answered', { phone: call.phone });
        if (window.TaxiSound) window.TaxiSound.beep(1200, 0.15, 0.1);
        showToast('success', '📞 U pranua', call.phone);
        render();
    }

    // ═══ MBYLL THIRRJEN ═══
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

    // ═══ VENDOS NË PRITJE ═══
    function hold() {
        if (!state.activeCall) {
            showToast('info', 'Nuk ka thirrje', 'Nuk ka thirrje aktive');
            return;
        }
        const item = {
            ...state.activeCall,
            holdStart: Date.now()
        };
        state.onHold.push(item);
        state.activeCall = null;
        logEvent('call_hold', { phone: item.phone });
        showToast('info', '⏸️ Në pritje', `${item.phone} u vu në pritje`);
        render();
    }

    // ═══ KTHE NGA PRITJA ═══
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

    // ═══ TRANSFER ═══
    function openTransfer() {
        if (!state.activeCall) {
            showToast('info', 'Nuk ka thirrje', 'Nuk ka thirrje aktive');
            return;
        }
        const target = prompt('Transfero te operatori (emri ose email):');
        if (!target) return;
        logEvent('call_transfer', { phone: state.activeCall.phone, to: target });
        state.history.unshift({
            id: state.activeCall.id,
            phone: state.activeCall.phone,
            name: state.activeCall.name,
            status: 'T',
            statusLabel: 'Transferuar',
            time: state.activeCall.time,
            duration: Math.floor((Date.now() - state.activeCall.startTime) / 1000),
            timestamp: Date.now()
        });
        state.activeCall = null;
        showToast('success', '🔄 U transferua', `Tek ${target}`);
        render();
    }

    // ═══ REFUZO THIRRJEN ═══
    function reject(id) {
        const idx = state.queue.findIndex(c => c.id === id);
        if (idx < 0) return;
        const call = state.queue.splice(idx, 1)[0];
        state.history.unshift({
            id: call.id,
            phone: call.phone,
            name: call.name,
            status: 'R',
            statusLabel: 'Refuzuar',
            time: call.time,
            duration: 0,
            timestamp: Date.now()
        });
        logEvent('call_rejected', { phone: call.phone });
        render();
    }

    // ═══ MBIJ / HUMB ═══
    function missCall(call) {
        state.history.unshift({
            id: call.id || Date.now(),
            phone: call.phone,
            name: call.name || '',
            status: 'M',
            statusLabel: 'Humbur',
            time: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
            duration: 0,
            timestamp: Date.now()
        });
        logEvent('call_missed', { phone: call.phone });
        render();
    }

    // ═══ NGARKO HISTORIKUN ═══
    async function loadHistoryFromFirestore() {
        if (!window.TaxiFirebase?.db) return;
        try {
            const snap = await window.TaxiFirebase.db.collection('calls')
                .orderBy('startedAt', 'desc')
                .limit(50)
                .get();
            state.history = snap.docs.map(doc => {
                const d = doc.data();
                return {
                    id: doc.id,
                    phone: d.phone || '',
                    name: d.clientName || '',
                    status: d.status === 'answered' ? 'A' : d.status === 'missed' ? 'M' : d.status === 'rejected' ? 'R' : 'A',
                    statusLabel: d.status === 'answered' ? 'Pranuar' : d.status === 'missed' ? 'Humbur' : d.status === 'rejected' ? 'Refuzuar' : '—',
                    time: d.startedAt ? new Date(d.startedAt).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }) : '',
                    duration: d.duration || 0,
                    timestamp: d.startedAt || 0
                };
            });
            render();
        } catch (e) { console.warn('History load:', e); }
    }

    // ═══ LOG NË FIRESTORE ═══
    async function logEvent(type, data) {
        if (!window.TaxiFirebase?.db) return;
        try {
            await window.TaxiFirebase.db.collection('calls').add({
                type,
                ...data,
                operatorId: window.TaxiAuth?.currentUser()?.uid || null,
                operatorName: window.TaxiState?.get('currentOperator')?.name || 'Operator',
                startedAt: Date.now()
            });
        } catch (e) { /* silent */ }
    }

    // ═══ FORMAT KOHË ═══
    function formatDuration(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    function formatWait(ms) {
        const sec = Math.floor((Date.now() - ms) / 1000);
        return formatDuration(sec);
    }

    // ═══ RENDER ═══
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
                    <div>
                        <h2>Call Center</h2>
                        <p>Menaxhimi i thirrjeve · ${queueCount} në radhë · ${holdCount} në pritje</p>
                    </div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <div class="shortcut-hint"><kbd>F1</kbd> Prano</div>
                    <div class="shortcut-hint"><kbd>F2</kbd> Mbyll</div>
                    <div class="shortcut-hint"><kbd>F3</kbd> Pritje</div>
                    <div class="shortcut-hint"><kbd>F4</kbd> Transfer</div>
                </div>
            </div>

            <div class="kpi-grid">
                <div class="kpi-card pink">
                    <div class="kpi-label"><i class="fa-solid fa-phone"></i> Në radhë</div>
                    <div class="kpi-value pink">${queueCount}</div>
                    <div class="kpi-sub">Thirrje duke pritur</div>
                </div>
                <div class="kpi-card yellow">
                    <div class="kpi-label"><i class="fa-solid fa-pause"></i> Në pritje</div>
                    <div class="kpi-value yellow">${holdCount}</div>
                    <div class="kpi-sub">Mbahtur aktive</div>
                </div>
                <div class="kpi-card green">
                    <div class="kpi-label"><i class="fa-solid fa-check"></i> Pranuar</div>
                    <div class="kpi-value green">${answered}</div>
                    <div class="kpi-sub">Sot</div>
                </div>
                <div class="kpi-card blue">
                    <div class="kpi-label"><i class="fa-solid fa-phone-slash"></i> Humbur / Refuzuar</div>
                    <div class="kpi-value blue">${missed + rejected}</div>
                    <div class="kpi-sub">${missed} M · ${rejected} R</div>
                </div>
            </div>

            ${state.activeCall ? `
                <div class="active-call-banner">
                    <div class="acb-left">
                        <div class="acb-pulse"></div>
                        <div>
                            <div class="acb-phone">${state.activeCall.phone}</div>
                            <div class="acb-name">${state.activeCall.name || 'Klient'}</div>
                        </div>
                    </div>
                    <div class="acb-center">
                        <div class="acb-timer" id="acb-timer">${formatDuration(Math.floor((Date.now() - state.activeCall.startTime) / 1000))}</div>
                    </div>
                    <div class="acb-right">
                        <button class="btn-warning" onclick="TaxiCallCenter.hold()"><i class="fa-solid fa-pause"></i> Pritje (F3)</button>
                        <button class="btn-primary" onclick="TaxiCallCenter.openTransfer()"><i class="fa-solid fa-share"></i> Transfer (F4)</button>
                        <button class="btn-danger" onclick="TaxiCallCenter.hangup()"><i class="fa-solid fa-phone-slash"></i> Mbyll (F2)</button>
                    </div>
                </div>
            ` : ''}

            <div class="call-center-grid">
                <!-- QUEUE -->
                <div class="cc-panel">
                    <div class="cc-panel-header">
                        <div class="cc-panel-title">
                            <i class="fa-solid fa-list-ol"></i>
                            <h3>Radha e Thirrjeve</h3>
                            <span class="count-badge">${queueCount}</span>
                        </div>
                        <button class="btn-primary" onclick="TaxiCallCenter.pickup()" style="padding:6px 12px;font-size:11px;">
                            <i class="fa-solid fa-phone"></i> Prano (F1)
                        </button>
                    </div>
                    <div class="cc-panel-body">
                        ${queueCount === 0 ? `<div class="empty-state"><i class="fa-solid fa-phone-slash"></i><p>Radha është bosh</p></div>` :
                            state.queue.map((c, idx) => `
                                <div class="queue-item ${idx === 0 ? 'first' : ''}">
                                    <div class="qi-left">
                                        <div class="qi-number">${idx + 1}</div>
                                        <div>
                                            <div class="qi-phone">${c.phone}</div>
                                            <div class="qi-name">${c.name || 'Klient i re'}</div>
                                        </div>
                                    </div>
                                    <div class="qi-middle">
                                        <div class="qi-wait" data-start="${c.waitStart}">${formatWait(c.waitStart)}</div>
                                        ${c.lastAddress ? `<div class="qi-addr">📍 ${c.lastAddress}</div>` : ''}
                                    </div>
                                    <div class="qi-actions">
                                        <button class="action-btn auto" onclick="TaxiCallCenter.pickupSpecific(${c.id})" title="Prano"><i class="fa-solid fa-phone"></i></button>
                                        <button class="action-btn cancel" onclick="TaxiCallCenter.reject(${c.id})" title="Refuzo"><i class="fa-solid fa-xmark"></i></button>
                                    </div>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>

                <!-- ON HOLD -->
                <div class="cc-panel">
                    <div class="cc-panel-header">
                        <div class="cc-panel-title">
                            <i class="fa-solid fa-pause"></i>
                            <h3>Në Pritje</h3>
                            <span class="count-badge warning">${holdCount}</span>
                        </div>
                    </div>
                    <div class="cc-panel-body">
                        ${holdCount === 0 ? `<div class="empty-state"><i class="fa-solid fa-circle-pause"></i><p>Nuk ka thirrje në pritje</p></div>` :
                            state.onHold.map(h => `
                                <div class="hold-item">
                                    <div class="hi-left">
                                        <div class="hi-pulse"></div>
                                        <div>
                                            <div class="hi-phone">${h.phone}</div>
                                            <div class="hi-name">${h.name || 'Klient'}</div>
                                        </div>
                                    </div>
                                    <div class="hi-middle">
                                        <div class="hi-time" data-start="${h.holdStart}">${formatWait(h.holdStart)}</div>
                                    </div>
                                    <div class="hi-actions">
                                        <button class="action-btn auto" onclick="TaxiCallCenter.unhold(${h.id})"><i class="fa-solid fa-play"></i> Kthe</button>
                                        <button class="action-btn cancel" onclick="TaxiCallCenter.dropHold(${h.id})"><i class="fa-solid fa-xmark"></i></button>
                                    </div>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>

                <!-- HISTORY -->
                <div class="cc-panel">
                    <div class="cc-panel-header">
                        <div class="cc-panel-title">
                            <i class="fa-solid fa-clock-rotate-left"></i>
                            <h3>Historiku</h3>
                            <span class="count-badge">${todayTotal}</span>
                        </div>
                    </div>
                    <div class="cc-panel-body">
                        ${todayTotal === 0 ? `<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Nuk ka histori</p></div>` :
                            state.history.slice(0, 30).map(h => `
                                <div class="history-item-call">
                                    <div class="hic-status ${h.status}">${h.status}</div>
                                    <div class="hic-info">
                                        <div class="hic-phone">${h.phone}</div>
                                        <div class="hic-meta">${h.statusLabel} · ${h.time}</div>
                                    </div>
                                    ${h.duration > 0 ? `<div class="hic-duration">${formatDuration(h.duration)}</div>` : ''}
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            </div>
        `;

        startTimers();
    }

    // ═══ PËRDITËSO TIMER-AT ═══
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

    // Prano thirrje specifike
    function pickupSpecific(id) {
        const idx = state.queue.findIndex(c => c.id === id);
        if (idx < 0) return;
        const call = state.queue.splice(idx, 1)[0];
        state.activeCall = { ...call, startTime: Date.now() };
        showToast('success', '📞 U pranua', call.phone);
        render();
    }

    // Fshij nga pritja (pa u kthyer)
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

    return {
        init, render,
        addToQueue, missCall,
        pickup, pickupSpecific,
        hangup, hold, unhold, dropHold,
        openTransfer, reject,
        state
    };
})();

console.log('✅ call-center.js ngarkuar');
