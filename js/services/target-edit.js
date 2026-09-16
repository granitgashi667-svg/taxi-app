'use strict';

/**
 * target-edit.js — Editimi i plotë i porosisë + panel çmimi
 */

window.TaxiTargetEdit = (() => {
    let currentOrder = null;

    // Hap modalin e editimit
    function open(order) {
        if (!order) return;
        currentOrder = order;

        const body = document.getElementById('order-detail-body');
        if (!body) return;

        const statusLabels = {
            new: 'E Re', waiting: 'Në Pritje', pending: 'Në Pritje',
            assigned: 'E Caktuar', onroute: 'Në Rrugë', arrived: 'Në Vend',
            taximeter: 'Taksimetër', fixed: 'Çmim Fiks',
            completed: 'Përfunduar', cancelled: 'Anuluar', preorder: 'Me Termin'
        };

        body.innerHTML = `
            <div class="edit-tabs">
                <button class="edit-tab active" data-tab="info"><i class="fa-solid fa-circle-info"></i> Informacioni</button>
                <button class="edit-tab" data-tab="price"><i class="fa-solid fa-money-bill"></i> Çmimi</button>
                <button class="edit-tab" data-tab="timeline"><i class="fa-solid fa-clock"></i> Kohët</button>
                <button class="edit-tab" data-tab="history"><i class="fa-solid fa-clock-rotate-left"></i> Historiku</button>
            </div>

            <div class="edit-panel active" data-panel="info">
                <div class="edit-section-title"><i class="fa-solid fa-user"></i> KLIENTI</div>
                <div class="edit-grid">
                    <div class="edit-field">
                        <label>Telefon</label>
                        <input type="tel" id="edit-phone" value="${order.phone || ''}" class="input-field">
                    </div>
                    <div class="edit-field">
                        <label>Emri</label>
                        <input type="text" id="edit-name" value="${order.name || ''}" class="input-field">
                    </div>
                </div>

                <div class="edit-section-title"><i class="fa-solid fa-route"></i> RRUGËTIMI</div>
                <div class="edit-grid">
                    <div class="edit-field full">
                        <label>Marrja</label>
                        <input type="text" id="edit-pickup" value="${order.pickup || ''}" class="input-field">
                    </div>
                    <div class="edit-field full">
                        <label>Destinacioni</label>
                        <input type="text" id="edit-destination" value="${order.destination || ''}" class="input-field">
                    </div>
                    <div class="edit-field">
                        <label>Zona</label>
                        <select id="edit-zone" class="input-field">
                            <option value="zona1" ${order.zone==='zona1'?'selected':''}>Zona 1</option>
                            <option value="zona2" ${order.zone==='zona2'?'selected':''}>Zona 2</option>
                            <option value="zona3" ${order.zone==='zona3'?'selected':''}>Zona 3</option>
                            <option value="zona4" ${order.zone==='zona4'?'selected':''}>Zona 4</option>
                            <option value="zona5" ${order.zone==='zona5'?'selected':''}>Zona 5</option>
                        </select>
                    </div>
                    <div class="edit-field">
                        <label>Tarifa</label>
                        <select id="edit-tariff" class="input-field">
                            <option value="standard" ${order.tariff==='standard'?'selected':''}>Standard</option>
                            <option value="vip" ${order.tariff==='vip'?'selected':''}>VIP</option>
                            <option value="airport" ${order.tariff==='airport'?'selected':''}>Aeroport</option>
                            <option value="night" ${order.tariff==='night'?'selected':''}>Natë</option>
                            <option value="van" ${order.tariff==='van'?'selected':''}>Van</option>
                        </select>
                    </div>
                </div>

                <div class="edit-section-title"><i class="fa-solid fa-comment"></i> SHËNIM</div>
                <div class="edit-grid">
                    <div class="edit-field full">
                        <textarea id="edit-remark" class="input-field" rows="2">${order.remark || ''}</textarea>
                    </div>
                </div>

                <div class="edit-section-title"><i class="fa-solid fa-tag"></i> STATUSI</div>
                <div class="edit-grid">
                    <div class="edit-field full">
                        <select id="edit-status" class="input-field">
                            <option value="waiting" ${order.status==='waiting'?'selected':''}>Në Pritje</option>
                            <option value="assigned" ${order.status==='assigned'?'selected':''}>E Caktuar</option>
                            <option value="onroute" ${order.status==='onroute'?'selected':''}>Në Rrugë</option>
                            <option value="arrived" ${order.status==='arrived'?'selected':''}>Në Vend</option>
                            <option value="taximeter" ${order.status==='taximeter'?'selected':''}>Taksimetër</option>
                            <option value="fixed" ${order.status==='fixed'?'selected':''}>Çmim Fiks</option>
                            <option value="completed" ${order.status==='completed'?'selected':''}>Përfunduar</option>
                            <option value="cancelled" ${order.status==='cancelled'?'selected':''}>Anuluar</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="edit-panel" data-panel="price">
                <div class="edit-section-title"><i class="fa-solid fa-money-bill-wave"></i> LLOJI I ÇMIMIT</div>
                <div class="price-type-buttons">
                    <button class="price-type-btn ${!order.priceType || order.priceType==='auto'?'active':''}" data-type="auto">
                        <i class="fa-solid fa-robot"></i>
                        <span>Automatik</span>
                        <small>Nga taksimetri</small>
                    </button>
                    <button class="price-type-btn ${order.priceType==='fixed'?'active':''}" data-type="fixed">
                        <i class="fa-solid fa-lock"></i>
                        <span>Fiks</span>
                        <small>Operatori</small>
                    </button>
                    <button class="price-type-btn ${order.priceType==='manual'?'active':''}" data-type="manual">
                        <i class="fa-solid fa-hand-pointer"></i>
                        <span>Manual</span>
                        <small>Shkruaj</small>
                    </button>
                </div>

                <div class="edit-section-title"><i class="fa-solid fa-calculator"></i> LLOGARITJA</div>
                <div class="edit-grid">
                    <div class="edit-field">
                        <label>Distanca (km)</label>
                        <input type="number" id="edit-distance" value="${order.distance || 0}" class="input-field" step="0.1">
                    </div>
                    <div class="edit-field">
                        <label>Koha (min)</label>
                        <input type="number" id="edit-duration" value="${order.duration || 0}" class="input-field">
                    </div>
                </div>

                <div class="edit-grid">
                    <div class="edit-field full">
                        <label>Çmimi Final (€)</label>
                        <input type="number" id="edit-price" value="${order.price || 0}" class="input-field price-input" step="0.01" style="font-size:20px;font-weight:800;text-align:center;color:var(--accent-green);">
                    </div>
                </div>

                <div class="price-breakdown">
                    <div class="price-row">
                        <span>Tarifa bazë</span>
                        <strong id="price-base">€2.00</strong>
                    </div>
                    <div class="price-row">
                        <span>Nga distanca</span>
                        <strong id="price-distance">€0.00</strong>
                    </div>
                    <div class="price-row">
                        <span>Nga koha</span>
                        <strong id="price-time">€0.00</strong>
                    </div>
                    <div class="price-row total">
                        <span>TOTAL</span>
                        <strong id="price-total">€0.00</strong>
                    </div>
                </div>

                <button type="button" class="btn-recalc" id="btn-recalc">
                    <i class="fa-solid fa-calculator"></i> RILLOGARIT
                </button>
            </div>

            <div class="edit-panel" data-panel="timeline">
                <div class="edit-section-title"><i class="fa-solid fa-clock"></i> KOHËT E POROSISË</div>
                <div class="timeline">
                    <div class="timeline-item">
                        <span class="timeline-time">${order.createdTimeStr || order.time || '—'}</span>
                        <span class="timeline-label">📞 U regjistrua</span>
                    </div>
                    ${order.assignedAt ? `
                    <div class="timeline-item">
                        <span class="timeline-time">${new Date(order.assignedAt).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'})}</span>
                        <span class="timeline-label">🚗 U caktua</span>
                    </div>` : ''}
                    ${order.completedAt ? `
                    <div class="timeline-item">
                        <span class="timeline-time">${new Date(order.completedAt).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'})}</span>
                        <span class="timeline-label">✅ U përfundua</span>
                    </div>` : ''}
                </div>
            </div>

            <div class="edit-panel" data-panel="history">
                <div class="edit-section-title"><i class="fa-solid fa-clock-rotate-left"></i> HISTORIKU I NDRYSHIMEVE</div>
                <div class="history-list" id="history-list">
                    <div class="history-item">
                        <span class="history-time">${order.createdTimeStr || '—'}</span>
                        <span class="history-text">U krijua nga <strong>${order.operatorName || order.operator || 'Operator'}</strong></span>
                    </div>
                </div>
            </div>
        `;

        // Aktivizo tab-et
        setupTabs();

        // Aktivizo butonat e çmimit
        setupPriceButtons();

        // Aktivizo rillogaritjen
        setupRecalc();

        document.getElementById('modal-order-detail')?.classList.add('active');
    }

    function setupTabs() {
        document.querySelectorAll('.edit-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.edit-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.edit-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.querySelector(`.edit-panel[data-panel="${tab.dataset.tab}"]`)?.classList.add('active');
            });
        });
    }

    function setupPriceButtons() {
        document.querySelectorAll('.price-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.price-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentOrder.priceType = btn.dataset.type;
            });
        });
    }

    function setupRecalc() {
        const btn = document.getElementById('btn-recalc');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const distance = parseFloat(document.getElementById('edit-distance')?.value) || 0;
            const duration = parseFloat(document.getElementById('edit-duration')?.value) || 0;
            const tariff = document.getElementById('edit-tariff')?.value || 'standard';

            if (window.TaxiPricing) {
                const calc = window.TaxiPricing.calculate(tariff, distance, duration);

                document.getElementById('price-base').textContent = `€${calc.base.toFixed(2)}`;
                document.getElementById('price-distance').textContent = `€${calc.fromKm.toFixed(2)}`;
                document.getElementById('price-time').textContent = `€${calc.fromMin.toFixed(2)}`;
                document.getElementById('price-total').textContent = `€${calc.total.toFixed(2)}`;
                document.getElementById('edit-price').value = calc.total.toFixed(2);
            }
        });
    }

    // Ruaj ndryshimet
    async function save() {
        if (!currentOrder) return;

        const changes = {
            phone: document.getElementById('edit-phone')?.value.trim(),
            name: document.getElementById('edit-name')?.value.trim(),
            pickup: document.getElementById('edit-pickup')?.value.trim(),
            destination: document.getElementById('edit-destination')?.value.trim(),
            zone: document.getElementById('edit-zone')?.value,
            tariff: document.getElementById('edit-tariff')?.value,
            remark: document.getElementById('edit-remark')?.value.trim(),
            status: document.getElementById('edit-status')?.value,
            price: parseFloat(document.getElementById('edit-price')?.value) || 0,
            distance: parseFloat(document.getElementById('edit-distance')?.value) || 0,
            duration: parseFloat(document.getElementById('edit-duration')?.value) || 0,
            priceType: currentOrder.priceType || 'auto'
        };

        if (window.TaxiOrders) {
            await window.TaxiOrders.update(currentOrder.firestoreId, changes);
        }

        if (typeof showToast === 'function') {
            showToast('success', 'U ruajt', 'Ndryshimet u ruajtën me sukses');
        }

        document.getElementById('modal-order-detail')?.classList.remove('active');
    }

    // Fshij porosinë
    async function remove() {
        if (!currentOrder) return;
        if (!confirm('A jeni i sigurt që dëshironi të fshini porosinë?')) return;

        if (window.TaxiOrders) {
            await window.TaxiOrders.remove(currentOrder.firestoreId);
        }

        if (typeof showToast === 'function') {
            showToast('info', 'U fshi', 'Porosia u fshi me sukses');
        }

        document.getElementById('modal-order-detail')?.classList.remove('active');
    }

    return { open, save, remove };
})();

console.log('✅ target-edit.js ngarkuar');
