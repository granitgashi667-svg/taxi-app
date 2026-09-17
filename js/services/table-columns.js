'use strict';

/**
 * js/services/table-columns.js
 * Kolona tabelash: resize, hide, reorder, ruajtje në localStorage
 */

window.TaxiTableColumns = (() => {
    const storageKey = 'taxi.tableColumns';

    function init() {
        console.log('📊 TaxiTableColumns: Init...');
        setupAllTables();
        observeNewTables();
    }

    function setupAllTables() {
        document.querySelectorAll('table.orders-table, table.admin-table').forEach(setupTable);
    }

    function setupTable(table) {
        if (table.dataset.colsReady === 'true') return;
        table.dataset.colsReady = 'true';

        const tableId = table.dataset.tableId || table.id || generateTableId(table);
        table.dataset.tableId = tableId;

        const thead = table.querySelector('thead');
        if (!thead) return;
        const headerRow = thead.querySelector('tr');
        if (!headerRow) return;

        const ths = Array.from(headerRow.querySelectorAll('th'));
        const saved = loadSaved()[tableId] || {};

        // Apliko gjerësitë e ruajtura
        ths.forEach((th, i) => {
            const key = 'col-' + i;
            th.dataset.colKey = key;

            if (saved[key]?.width) {
                th.style.width = saved[key].width + 'px';
                th.style.minWidth = saved[key].width + 'px';
            }

            if (saved[key]?.hidden) {
                th.style.display = 'none';
                // Fshih edhe qelizat
                table.querySelectorAll(`tbody tr`).forEach(tr => {
                    const td = tr.children[i];
                    if (td) td.style.display = 'none';
                });
            }

            // Krijimi i resize handle
            th.style.position = 'relative';
            th.style.cursor = 'pointer';
            th.title = 'Klik i djathtë: menu · Zvarrit: ndrysho gjerësinë · Drag & drop: rirendit';

            const handle = document.createElement('div');
            handle.className = 'col-resize-handle';
            handle.innerHTML = '<div class="col-grip"></div>';
            th.appendChild(handle);

            // Resize
            let startX = 0;
            let startW = 0;
            let dragging = false;

            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                dragging = true;
                startX = e.clientX;
                startW = th.offsetWidth;
                document.body.style.userSelect = 'none';
                document.body.style.cursor = 'col-resize';
            });

            handle.addEventListener('touchstart', (e) => {
                dragging = true;
                startX = e.touches[0].clientX;
                startW = th.offsetWidth;
            });

            const onMove = (e) => {
                if (!dragging) return;
                const x = e.clientX || e.touches?.[0]?.clientX;
                const w = Math.max(40, startW + (x - startX));
                th.style.width = w + 'px';
                th.style.minWidth = w + 'px';
            };

            const onUp = () => {
                if (!dragging) return;
                dragging = false;
                document.body.style.userSelect = '';
                document.body.style.cursor = '';
                saveColumn(tableId, th.dataset.colKey, { width: th.offsetWidth });
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('touchmove', onMove);
            document.addEventListener('mouseup', onUp);
            document.addEventListener('touchend', onUp);

            // Right-click → menu
            th.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                openColumnMenu(table, th, tableId, i);
            });

            // Drag & drop reorder
            th.draggable = true;
            th.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/col', i.toString());
                th.style.opacity = '0.5';
            });
            th.addEventListener('dragend', () => { th.style.opacity = ''; });
            th.addEventListener('dragover', (e) => e.preventDefault());
            th.addEventListener('drop', (e) => {
                e.preventDefault();
                const fromIdx = parseInt(e.dataTransfer.getData('text/col'), 10);
                const toIdx = i;
                if (fromIdx === toIdx || isNaN(fromIdx)) return;
                reorderColumn(table, fromIdx, toIdx);
            });
        });

        // Butoni "Kolona" për të treguar të fshehurat
        if (!table.parentElement.querySelector('.cols-toggle-btn')) {
            const btn = document.createElement('button');
            btn.className = 'cols-toggle-btn';
            btn.innerHTML = '<i class="fa-solid fa-table-columns"></i> Kolona';
            btn.onclick = (e) => { e.stopPropagation(); openColumnManager(table, tableId); };
            table.parentElement.style.position = 'relative';
            table.parentElement.appendChild(btn);
        }
    }

    function reorderColumn(table, fromIdx, toIdx) {
        const thead = table.querySelector('thead tr');
        const ths = Array.from(thead.children);
        const fromTh = ths[fromIdx];
        const toTh = ths[toIdx];

        if (fromIdx < toIdx) {
            toTh.parentNode.insertBefore(fromTh, toTh.nextSibling);
        } else {
            toTh.parentNode.insertBefore(fromTh, toTh);
        }

        // Reorder cells në trup
        table.querySelectorAll('tbody tr').forEach(tr => {
            const cells = Array.from(tr.children);
            const fromCell = cells[fromIdx];
            const toCell = cells[toIdx];
            if (!fromCell || !toCell) return;
            if (fromIdx < toIdx) {
                toCell.parentNode.insertBefore(fromCell, toCell.nextSibling);
            } else {
                toCell.parentNode.insertBefore(fromCell, toCell);
            }
        });

        // Ruaj rendin
        const order = Array.from(table.querySelector('thead tr').children).map(th => th.dataset.colKey);
        saveTableOrder(table.dataset.tableId, order);
    }

    function openColumnMenu(table, th, tableId, colIdx) {
        closeAllMenus();

        const menu = document.createElement('div');
        menu.className = 'col-menu';
        menu.style.position = 'fixed';
        const rect = th.getBoundingClientRect();
        menu.style.top = (rect.bottom + 4) + 'px';
        menu.style.left = rect.left + 'px';

        const colName = th.textContent.trim() || 'Kolona';
        const isHidden = th.style.display === 'none';

        menu.innerHTML = `
            <div class="col-menu-header">
                <i class="fa-solid fa-table-columns"></i> ${colName}
            </div>
            <div class="col-menu-item" onclick="TaxiTableColumns.hideColumn('${tableId}', ${colIdx})">
                <i class="fa-solid fa-eye-slash"></i> Fshih kolonën
            </div>
            <div class="col-menu-item" onclick="TaxiTableColumns.autoFit('${tableId}', ${colIdx})">
                <i class="fa-solid fa-arrows-left-right"></i> Auto-fit
            </div>
            <div class="col-menu-item" onclick="TaxiTableColumns.resetColumn('${tableId}', ${colIdx})">
                <i class="fa-solid fa-rotate"></i> Reset gjerësinë
            </div>
            <div class="col-menu-divider"></div>
            <div class="col-menu-item" onclick="TaxiTableColumns.moveColumnLeft('${tableId}', ${colIdx})">
                <i class="fa-solid fa-arrow-left"></i> Lëviz majtas
            </div>
            <div class="col-menu-item" onclick="TaxiTableColumns.moveColumnRight('${tableId}', ${colIdx})">
                <i class="fa-solid fa-arrow-right"></i> Lëviz djathtas
            </div>
        `;

        document.body.appendChild(menu);
        setTimeout(() => {
            document.addEventListener('click', closeAllMenus, { once: true });
        }, 10);
    }

    function closeAllMenus() {
        document.querySelectorAll('.col-menu').forEach(m => m.remove());
    }

    function openColumnManager(table, tableId) {
        closeAllMenus();
        const ths = Array.from(table.querySelectorAll('thead th'));

        const modal = document.createElement('div');
        modal.className = 'col-manager-overlay';
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

        modal.innerHTML = `
            <div class="col-manager" onclick="event.stopPropagation()">
                <div class="col-manager-header">
                    <i class="fa-solid fa-table-columns"></i>
                    <h3>Menaxho kolonat</h3>
                    <button onclick="this.closest('.col-manager-overlay').remove()">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="col-manager-body">
                    ${ths.map((th, i) => {
                        const name = th.textContent.trim() || 'Kolona';
                        const hidden = th.style.display === 'none';
                        return `
                            <label class="col-manager-item">
                                <input type="checkbox" ${!hidden ? 'checked' : ''}
                                    onchange="TaxiTableColumns.toggleColumn('${tableId}', ${i}, this.checked)">
                                <span>${name}</span>
                            </label>
                        `;
                    }).join('')}
                </div>
                <div class="col-manager-footer">
                    <button class="btn-secondary" onclick="TaxiTableColumns.resetAll('${tableId}'); this.closest('.col-manager-overlay').remove();">
                        <i class="fa-solid fa-rotate"></i> Reset të gjitha
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ═══ API PUBLIKE ═══
    function hideColumn(tableId, colIdx) {
        const table = findTable(tableId);
        if (!table) return;
        const th = table.querySelector(`thead th:nth-child(${colIdx + 1})`);
        if (!th) return;
        th.style.display = 'none';
        table.querySelectorAll('tbody tr').forEach(tr => {
            const td = tr.children[colIdx];
            if (td) td.style.display = 'none';
        });
        saveColumn(tableId, th.dataset.colKey, { hidden: true });
        closeAllMenus();
    }

    function toggleColumn(tableId, colIdx, show) {
        const table = findTable(tableId);
        if (!table) return;
        const th = table.querySelectorAll('thead th')[colIdx];
        if (!th) return;
        th.style.display = show ? '' : 'none';
        table.querySelectorAll('tbody tr').forEach(tr => {
            const td = tr.children[colIdx];
            if (td) td.style.display = show ? '' : 'none';
        });
        saveColumn(tableId, th.dataset.colKey, { hidden: !show });
    }

    function autoFit(tableId, colIdx) {
        const table = findTable(tableId);
        if (!table) return;
        const th = table.querySelectorAll('thead th')[colIdx];
        if (!th) return;
        th.style.width = 'auto';
        th.style.minWidth = 'auto';
        saveColumn(tableId, th.dataset.colKey, { width: th.offsetWidth });
        closeAllMenus();
    }

    function resetColumn(tableId, colIdx) {
        const table = findTable(tableId);
        if (!table) return;
        const th = table.querySelectorAll('thead th')[colIdx];
        if (!th) return;
        th.style.width = '';
        th.style.minWidth = '';
        saveColumn(tableId, th.dataset.colKey, null);
        closeAllMenus();
    }

    function moveColumnLeft(tableId, colIdx) {
        if (colIdx === 0) return;
        reorderColumn(findTable(tableId), colIdx, colIdx - 1);
        closeAllMenus();
    }

    function moveColumnRight(tableId, colIdx) {
        const table = findTable(tableId);
        if (!table) return;
        const total = table.querySelectorAll('thead th').length;
        if (colIdx >= total - 1) return;
        reorderColumn(table, colIdx, colIdx + 1);
        closeAllMenus();
    }

    function resetAll(tableId) {
        const table = findTable(tableId);
        if (!table) return;
        const saved = loadSaved();
        delete saved[tableId];
        saveSaved(saved);
        location.reload();
    }

    function findTable(tableId) {
        return document.querySelector(`table[data-table-id="${tableId}"]`);
    }

    function saveColumn(tableId, colKey, data) {
        const saved = loadSaved();
        if (!saved[tableId]) saved[tableId] = {};
        if (data === null) {
            delete saved[tableId][colKey];
        } else {
            saved[tableId][colKey] = { ...saved[tableId][colKey], ...data };
        }
        saveSaved(saved);
    }

    function saveTableOrder(tableId, order) {
        const saved = loadSaved();
        if (!saved[tableId]) saved[tableId] = {};
        saved[tableId].__order = order;
        saveSaved(saved);
    }

    function loadSaved() {
        try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; }
    }
    function saveSaved(s) {
        try { localStorage.setItem(storageKey, JSON.stringify(s)); } catch {}
    }

    function generateTableId(table) {
        const parent = table.closest('[data-page], .panel, .db-panel');
        const parentId = parent?.dataset?.page || parent?.dataset?.panelId || 'x';
        return parentId + '-table-' + Math.random().toString(36).slice(2, 6);
    }

    function observeNewTables() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.matches?.('table.orders-table, table.admin-table')) setupTable(node);
                        node.querySelectorAll?.('table.orders-table, table.admin-table').forEach(setupTable);
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    return {
        init, setupTable, setupAllTables,
        hideColumn, toggleColumn, autoFit, resetColumn,
        moveColumnLeft, moveColumnRight, resetAll
    };
})();

console.log('✅ services/table-columns.js ngarkuar');
