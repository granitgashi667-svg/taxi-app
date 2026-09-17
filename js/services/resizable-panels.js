'use strict';

/**
 * js/services/resizable-panels.js
 * Panels të zvarritshëm vertikalisht (drag në cep)
 */

window.TaxiResizablePanels = (() => {
    const storageKey = 'taxi.panelHeights';

    function init() {
        console.log('📐 TaxiResizablePanels: Init...');
        setupAll();
        observeNewPanels();
    }

    function setupAll() {
        document.querySelectorAll('.panel, .db-panel').forEach(setupPanel);
    }

    function setupPanel(panel) {
        if (panel.dataset.resizable === 'true') return;
        panel.dataset.resizable = 'true';

        const id = panel.dataset.panelId || panel.id || 'panel-' + Math.random().toString(36).slice(2, 8);
        panel.dataset.panelId = id;

        // Rikthe lartësinë e ruajtur
        const stored = loadHeights();
        if (stored[id]) {
            panel.style.height = stored[id] + 'px';
            panel.style.flex = '0 0 auto';
        }

        // Krijo handle-in
        const handle = document.createElement('div');
        handle.className = 'panel-resize-handle';
        handle.innerHTML = '<i class="fa-solid fa-grip-lines"></i>';
        handle.title = 'Zvarrit për të ndryshuar lartësinë';
        panel.appendChild(handle);

        // Event për drag
        let startY = 0;
        let startHeight = 0;
        let dragging = false;

        const onMouseDown = (e) => {
            e.preventDefault();
            dragging = true;
            startY = e.clientY || e.touches?.[0]?.clientY;
            startHeight = panel.offsetHeight;
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'ns-resize';
        };

        const onMouseMove = (e) => {
            if (!dragging) return;
            const y = e.clientY || e.touches?.[0]?.clientY;
            const delta = y - startY;
            const newHeight = Math.max(100, Math.min(window.innerHeight - 100, startHeight + delta));
            panel.style.height = newHeight + 'px';
            panel.style.flex = '0 0 auto';
        };

        const onMouseUp = () => {
            if (!dragging) return;
            dragging = false;
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            // Ruaj
            const stored = loadHeights();
            stored[panel.dataset.panelId] = panel.offsetHeight;
            saveHeights(stored);
            // Rifresko hartën nëse është
            if (window.AppState?.map) setTimeout(() => window.AppState.map.invalidateSize(), 100);
        };

        handle.addEventListener('mousedown', onMouseDown);
        handle.addEventListener('touchstart', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('touchmove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('touchend', onMouseUp);

        // Double-click → reset
        handle.addEventListener('dblclick', () => {
            panel.style.height = '';
            panel.style.flex = '';
            const stored = loadHeights();
            delete stored[panel.dataset.panelId];
            saveHeights(stored);
            if (window.AppState?.map) setTimeout(() => window.AppState.map.invalidateSize(), 100);
        });
    }

    function observeNewPanels() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.matches?.('.panel, .db-panel')) setupPanel(node);
                        node.querySelectorAll?.('.panel, .db-panel').forEach(setupPanel);
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function loadHeights() {
        try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; }
    }
    function saveHeights(h) {
        try { localStorage.setItem(storageKey, JSON.stringify(h)); } catch {}
    }

    function injectStyles() {
        if (document.getElementById('resizable-styles')) return;
        const s = document.createElement('style');
        s.id = 'resizable-styles';
        s.textContent = `
            .panel, .db-panel { position: relative; }
            .panel-resize-handle {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 8px;
                background: transparent;
                cursor: ns-resize;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
                transition: background .15s;
            }
            .panel-resize-handle i {
                color: #475569;
                font-size: 10px;
                opacity: 0;
                transition: opacity .15s;
            }
            .panel-resize-handle:hover { background: rgba(168,85,247,.15); }
            .panel-resize-handle:hover i { opacity: 1; color: #a855f7; }
            .panel.maximized .panel-resize-handle { display: none; }
        `;
        document.head.appendChild(s);
    }

    return { init, setupAll, setupPanel };
})();

console.log('✅ services/resizable-panels.js ngarkuar');
