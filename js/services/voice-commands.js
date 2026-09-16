'use strict';

/**
 * voice-commands.js — Komanda me zë (Web Speech API)
 */

window.TaxiVoice = (() => {
    let recognition = null;
    let isListening = false;
    let enabled = false;

    // ═══ KOMANDAT ═══
    const COMMANDS = [
        {
            patterns: ['porosi e re', 'porosi re', 'krijo porosi'],
            action: 'new_order',
            handler: () => {
                const btn = document.getElementById('btn-new-order') || document.getElementById('btn-submit-order');
                if (btn) btn.click();
                return 'Porosi e re u hap';
            }
        },
        {
            patterns: ['shfaq hartën', 'hapa hartën', 'harta'],
            action: 'show_map',
            handler: () => {
                if (window.AppState?.map) {
                    AppState.map.invalidateSize();
                    AppState.map.setView([42.6629, 21.1655], 13);
                }
                return 'Harta u hap';
            }
        },
        {
            patterns: ['filtro të lirët', 'vetëm të lirët', 'shfaq të lirët'],
            action: 'filter_free',
            handler: () => {
                if (window.TaxiTvDisplay) {
                    window.TaxiTvDisplay.set('vehicleFilter', 'free');
                    window.TaxiTvDisplay.rerender();
                }
                return 'Filtruar: vetëm të lirët';
            }
        },
        {
            patterns: ['shfaq të gjitha', 'të gjitha veturat', 'pastro filtrat'],
            action: 'filter_all',
            handler: () => {
                if (window.TaxiTvDisplay) {
                    window.TaxiTvDisplay.set('vehicleFilter', 'all');
                    window.TaxiTvDisplay.rerender();
                }
                return 'Filtrat u pastruan';
            }
        },
        {
            patterns: ['cila është ora', 'ora'],
            action: 'time',
            handler: () => {
                const now = new Date();
                return `Ora: ${now.toLocaleTimeString('sq-AL')}`;
            }
        },
        {
            patterns: ['sa porosi sot', 'porositë e sotme', 'statistika'],
            action: 'stats',
            handler: () => {
                const count = window.AppState?.orders?.length || 0;
                return `${count} porosi aktive`;
            }
        },
        {
            patterns: ['sa shoferë online', 'shoferë online', 'shoferët e lirë'],
            action: 'drivers_online',
            handler: () => {
                const drivers = window.AppState?.drivers || [];
                const free = drivers.filter(d => d.mode === 'free').length;
                const busy = drivers.filter(d => d.mode === 'taximeter' || d.mode === 'fixed').length;
                return `${free} të lirë, ${busy} në udhëtim`;
            }
        },
        {
            patterns: ['hyr në login', 'login'],
            action: 'open_login',
            handler: () => {
                const modal = document.getElementById('modal-login');
                if (modal) modal.classList.add('active');
                return 'Login u hap';
            }
        },
        {
            patterns: ['dil', 'logout', 'mbyll sesionin'],
            action: 'logout',
            handler: () => {
                if (confirm('A jeni i sigurt që dëshironi të dilni?')) {
                    if (window.TaxiAuth) window.TaxiAuth.logout();
                }
                return 'Duke dalë...';
            }
        },
        {
            patterns: ['ndihmë', 'komandat', 'çka mund të bësh'],
            action: 'help',
            handler: () => {
                showHelp();
                return 'Komandat e disponueshme u shfaqën';
            }
        },
        {
            patterns: ['pastro mesazhet', 'fsheh mesazhet'],
            action: 'clear_toasts',
            handler: () => {
                const container = document.getElementById('toast-container');
                if (container) container.innerHTML = '';
                return 'Mesazhet u pastruan';
            }
        }
    ];

    // ═══ INIT ═══
    function init() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('⚠️ Voice commands nuk mbështetet në këtë browser');
            return false;
        }

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SR();
        recognition.lang = 'sq-AL';
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            isListening = true;
            console.log('🎤 Voice commands: Duke dëgjuar...');
            updateButton();
        };

        recognition.onend = () => {
            isListening = false;
            console.log('🎤 Voice commands: U ndal');
            updateButton();

            // Rifillo nëse është enabled
            if (enabled) {
                setTimeout(() => {
                    try { recognition.start(); } catch(e) {}
                }, 500);
            }
        };

        recognition.onerror = (e) => {
            console.warn('🎤 Gabim:', e.error);
            if (e.error === 'not-allowed') {
                enabled = false;
                showToast('warning', '🎤 Mikrofoni', 'Leje e refuzuar');
            }
        };

        recognition.onresult = (event) => {
            const last = event.results.length - 1;
            const transcript = event.results[last][0].transcript.toLowerCase().trim();
            console.log('🎤 Dëgjuar:', transcript);
            handleCommand(transcript);
        };

        console.log('✅ Voice commands gati');
        return true;
    }

    // ═══ START / STOP ═══
    function start() {
        if (!recognition) {
            showToast('warning', '🎤 Nuk mbështetet', 'Browseri nuk e suporton');
            return;
        }
        enabled = true;
        try {
            recognition.start();
            showToast('success', '🎤 Aktivizuar', 'Komandat me zë janë aktive');
        } catch (e) { console.warn(e); }
    }

    function stop() {
        enabled = false;
        if (recognition && isListening) {
            try { recognition.stop(); } catch (e) {}
        }
        showToast('info', '🎤 Çaktivizuar', 'Komandat me zë u ndalën');
    }

    function toggle() {
        if (enabled) stop();
        else start();
    }

    // ═══ HANDLE COMMAND ═══
    function handleCommand(transcript) {
        for (const cmd of COMMANDS) {
            for (const pattern of cmd.patterns) {
                if (transcript.includes(pattern)) {
                    const result = cmd.handler();
                    if (result) {
                        showToast('success', '🎤 ' + pattern, result);
                    }
                    return;
                }
            }
        }
        console.log('🎤 Komanda nuk u njoh:', transcript);
    }

    // ═══ HELP ═══
    function showHelp() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-voice-help';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title">
                        <i class="fa-solid fa-microphone"></i>
                        <h3>Komandat me zë</h3>
                    </div>
                    <button class="modal-close" onclick="document.getElementById('modal-voice-help').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        ${COMMANDS.map(c => `
                            <div style="padding:10px 12px;background:var(--bg-tertiary);border-radius:10px;border-left:3px solid var(--accent-purple);">
                                <div style="font-size:12px;font-weight:700;color:var(--accent-purple);margin-bottom:4px;">
                                    <i class="fa-solid fa-microphone"></i> "${c.patterns[0]}"
                                </div>
                                <div style="font-size:11px;color:var(--text-muted);">
                                    Alias: ${c.patterns.slice(1).map(p => `"${p}"`).join(', ') || '—'}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-voice-help').remove()">Mbyll</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ═══ BUTTON ═══
    function updateButton() {
        const btn = document.getElementById('btn-voice-toggle');
        if (!btn) return;
        btn.classList.toggle('active', isListening);
        const icon = btn.querySelector('i');
        if (icon) icon.className = isListening ? 'fa-solid fa-microphone' : 'fa-solid fa-microphone-slash';
    }

    function isEnabled() { return enabled; }
    function isActive() { return isListening; }

    return { init, start, stop, toggle, isEnabled, isActive, showHelp };
})();

console.log('✅ voice-commands.js ngarkuar');
