'use strict';

window.TaxiPreorderNotes = (() => {
    function init() {
        console.log('📝 TaxiPreorderNotes: Init...');
        setTimeout(injectNoteColumn, 500);
        observePreorders();
    }

    function injectNoteColumn() {
        const table = document.querySelector('#preorders-tbody')?.closest('table');
        if (!table || table.dataset.notesReady === 'true') return;
        table.dataset.notesReady = 'true';

        const thead = table.querySelector('thead tr');
        if (!thead) return;

        // Shto kolonën SHËNIM para fundit
        const th = document.createElement('th');
        th.textContent = 'Shënim';
        th.style.minWidth = '120px';
        thead.appendChild(th);

        // Për çdo rresht, shto qelizën
        document.querySelectorAll('#preorders-tbody tr').forEach(tr => {
            const td = document.createElement('td');
            td.className = 'preorder-note-cell';
            td.innerHTML = `
                <button class="preorder-note-btn" onclick="TaxiPreorderNotes.editNote(this)">
                    <i class="fa-solid fa-pen"></i> Shto
                </button>
            `;
            tr.appendChild(td);
        });
    }

    function observePreorders() {
        const tbody = document.getElementById('preorders-tbody');
        if (!tbody) return;
        const observer = new MutationObserver(() => injectNoteColumn());
        observer.observe(tbody, { childList: true });
    }

    function editNote(btn) {
        const tr = btn.closest('tr');
        const orderId = tr?.querySelector('[data-order-id]')?.dataset?.orderId ||
                        tr?.dataset?.orderId ||
                        tr?.querySelector('.preorder-date')?.dataset?.orderId;

        const current = tr.querySelector('.preorder-note-text')?.textContent || '';
        const note = prompt('Shënim për porosinë:', current);
        if (note === null) return;

        const cell = tr.querySelector('.preorder-note-cell');
        if (cell) {
            cell.innerHTML = `
                <div style="display:flex;align-items:center;gap:6px;">
                    <span class="preorder-note-text" style="flex:1;font-size:11px;color:#f59e0b;">${note || '—'}</span>
                    <button class="preorder-note-btn" onclick="TaxiPreorderNotes.editNote(this)">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                </div>
            `;
        }

        if (orderId && window.TaxiFirebase?.db) {
            window.TaxiFirebase.db.collection('orders').doc(orderId).update({ preorderNote: note }).catch(console.error);
        }
    }

    return { init, editNote };
})();

console.log('✅ services/preorder-notes.js ngarkuar');
