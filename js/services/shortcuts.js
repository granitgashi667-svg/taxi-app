'use strict';

/**
 * shortcuts.js — Tastierat e shkurtesave globale
 */

window.TaxiShortcuts = (() => {
    const SHORTCUTS = [
        { keys: ['Ctrl', 'K'], action: 'search', desc: 'Kërko' },
        { keys: ['Ctrl', 'N'], action: 'new_order', desc: 'Porosi e re' },
        { keys: ['Ctrl', 'H'], action: 'help', desc: 'Ndihmë' },
        { keys: ['Ctrl', 'Shift', 'D'], action: 'toggle_theme', desc: 'Dark/Light mode' },
        { keys: ['Ctrl', 'Shift', 'F'], action: 'toggle_fullscreen', desc: 'Fullscreen' },
        { keys: ['Ctrl', 'Shift', 'S'], action: 'toggle_sound', desc: 'Zëri' },
        { keys: ['Esc'], action: 'close_modal', desc: 'Mbyll modalin' },
        { keys: ['Ctrl', '1'], action: 'page_dashboard', desc: 'Dashboard' },
        { keys: ['Ctrl', '2'], action: 'page_operators', desc: 'Operatorët' },
        { keys: ['Ctrl', '3'], action: 'page_drivers', desc: 'Shoferët' },
        { keys: ['Ctrl', '4'], action: 'page_orders', desc: 'Porositë' },
        { keys: ['Ctrl', '5'], action: 'page_reports', desc: 'Raporte' }
    ];

    // ═══ INIT ═══
    function init() {
        document.addEventListener('keydown', handleKeydown);
        console.log('⌨️ Shortcuts aktivizuar');
    }

    // ═══ HANDLE ═══
    function handleKeydown(e) {
        // Mos aktivizo në input/textarea
        if (isInputField(e.target)) {
            // Vetëm Esc lejohet
            if (e.key === 'Escape') {
                const modal = document.querySelector('.modal-overlay.active');
                if (modal) {
                    modal.classList.remove('active');
                    e.preventDefault();
                }
            }
            return;
        }

        // Esc për mbylljen e modalit
        if (e.key === 'Escape') {
            const modal = document.querySelector('.modal-overlay.active');
            if (modal) {
                modal.classList.remove('active');
                e.preventDefault();
            }
            return;
        }

        // Ctrl + K — Kërko
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            focusSearch();
            return;
        }

        // Ctrl + N — Porosi e re
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
            e.preventDefault();
            newOrder();
            return;
        }

        // Ctrl + H — Ndihmë
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
            e.preventDefault();
            showHelp();
            return;
        }

        // Ctrl + Shift + F — Fullscreen
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
            else document.exitFullscreen?.();
            return;
        }

        // Ctrl + Shift + S — Zëri
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
            e.preventDefault();
            const btn = document.getElementById('btn-sound-toggle');
            if (btn) btn.click();
            return;
        }

        // Ctrl + 1/2/3/4/5 — Navigim
        if ((e.ctrlKey || e.metaKey) && /^[1-5]$/.test(e.key)) {
            e.preventDefault();
            const pages = ['dashboard', 'operators', 'drivers', 'orders', 'reports'];
            const page = pages[parseInt(e.key) - 1];
            if (page && window.AdminApp) window.AdminApp.switchPage(page);
            else if (page && window.TaxiApp) {
                const el = document.querySelector(`[data-nav="${page}"], [data-page="${page}"]`);
                if (el) el.click();
            }
            return;
        }
    }

    function isInputField(el) {
        if (!el) return false;
        const tag = el.tagName.toLowerCase();
        return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
    }

    // ═══ AKTIVITETET ═══
    function focusSearch() {
        const search = document.querySelector('.mini-search, #order-search, #orders-search');
        if (search) {
            search.focus();
            search.select();
        } else {
            showToast('info', '🔍 Kërko', 'Nuk ka fushë kërkimi');
        }
    }

    function newOrder() {
        const btn = document.getElementById('btn-new-order') || document.querySelector('[data-nav="orders"]');
        if (btn) btn.click();
        else showToast('info', '➕ Porosi e re', 'Kaloni te faqja e porosive');
    }

    function showHelp() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-shortcuts-help';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title">
                        <i class="fa-solid fa-keyboard"></i>
                        <h3>Tastierat e Shkurtesave</h3>
                    </div>
                    <button class="modal-close" onclick="document.getElementById('modal-shortcuts-help').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        ${SHORTCUTS.map(s => `
                            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--bg-tertiary);border-radius:10px;">
                                <span style="font-size:12px;color:var(--text-secondary);">${s.desc}</span>
                                <span style="display:flex;gap:4px;">
                                    ${s.keys.map(k => `<kbd style="padding:4px 8px;background:var(--bg-primary);border:1px solid var(--border-hover);border-radius:6px;font-family:var(--font-mono);font-size:11px;font-weight:700;color:var(--accent-purple);">${k}</kbd>`).join('')}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-shortcuts-help').remove()">Mbyll</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    function showToast(type, title, msg) {
        if (typeof window.showToast === 'function') window.showToast(type, title, msg);
    }

    function getList() { return SHORTCUTS; }

    return { init, showHelp, getList };
})();

console.log('✅ shortcuts.js ngarkuar');
