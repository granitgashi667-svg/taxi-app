'use strict';

/**
 * js/admin/vehicles.js — Menaxhimi i veturave
 */

window.AdminVehicles = (() => {
    let cachedVehicles = [];
    let cachedDrivers = [];

    // ═══ INIT ═══
    function init() {
        console.log('🚗 AdminVehicles: Init...');
    }

    // ═══ LOAD ═══
    async function load() {
        console.log('🚗 Duke ngarkuar veturat...');
        await renderAll();
    }

    // ═══ RENDER ALL ═══
    async function renderAll() {
        const el = document.getElementById('vehicles-content');
        if (!el) return;

        el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Duke ngarkuar...</p></div>';

        try {
            const db = window.TaxiFirebase?.db;
            if (!db) throw new Error('Firebase nuk është gati');

            // Merr veturat nga DB lokale + Firestore
            const vehiclesFromDB = window.TaxiData?.vehicles || [];

            // Merr nga Firestore (nëse ka shtesa)
            let vehiclesFromFS = [];
            try {
                const snap = await db.collection('vehicles').get();
                vehiclesFromFS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch (e) { console.warn('Vetura nga FS:', e); }

            // Bashko (DB lokale është baza)
            const vehicles = vehiclesFromDB.map(v => {
                const fromFS = vehiclesFromFS.find(f => String(f.id) === String(v.id));
                return { ...v, ...fromFS };
            });

            // Merr shoferët
            const driversSnap = await db.collection('drivers').get();
            const drivers = driversSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            cachedVehicles = vehicles;
            cachedDrivers = drivers;

            renderKPIs(vehicles, drivers);
            renderTable(vehicles, drivers);

        } catch (e) {
            console.error('❌ renderAll:', e);
            el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Gabim: ${e.message}</p></div>`;
        }
    }

    // ═══ KPI ═══
    function renderKPIs(vehicles, drivers) {
        window.__vehiclesKPI = {
            total: vehicles.length,
            active: vehicles.filter(v => {
                const d = drivers.find(x => x.vehicleId === v.id);
                return d && d.mode !== 'inactive';
            }).length,
            free: vehicles.filter(v => {
                const d = drivers.find(x => x.vehicleId === v.id);
                return d && d.mode === 'free';
            }).length,
            busy: vehicles.filter(v => {
                const d = drivers.find(x => x.vehicleId === v.id);
                return d && (d.mode === 'taximeter' || d.mode === 'fixed');
            }).length
        };
    }

    // ═══ TABLE ═══
    function renderTable(vehicles, drivers) {
        const el = document.getElementById('vehicles-content');
        const kpi = window.__vehiclesKPI || {};

        el.innerHTML = `
            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card green">
                    <div class="kpi-label"><i class="fa-solid fa-car-side"></i> Total</div>
                    <div class="kpi-value green">${kpi.total || 0}</div>
                    <div class="kpi-sub">Vetura të regjistruara</div>
                </div>
                <div class="kpi-card blue">
                    <div class="kpi-label"><i class="fa-solid fa-circle"></i> Të lira</div>
                    <div class="kpi-value blue">${kpi.free || 0}</div>
                    <div class="kpi-sub">Presin porosi</div>
                </div>
                <div class="kpi-card yellow">
                    <div class="kpi-label"><i class="fa-solid fa-route"></i> Në udhëtim</div>
                    <div class="kpi-value yellow">${kpi.busy || 0}</div>
                    <div class="kpi-sub">Me klient</div>
                </div>
                <div class="kpi-card pink">
                    <div class="kpi-label"><i class="fa-solid fa-power-off"></i> Joaktive</div>
                    <div class="kpi-value pink">${(kpi.total || 0) - (kpi.active || 0)}</div>
                    <div class="kpi-sub">Jashtë turnit</div>
                </div>
            </div>

            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Nr.</th>
                            <th>Targa</th>
                            <th>Modeli</th>
                            <th>Shoferi</th>
                            <th>Telefon</th>
                            <th>Statusi</th>
                            <th>Veprime</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${vehicles.length === 0
                            ? '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted);">Nuk ka vetura</td></tr>'
                            : vehicles.map(v => {
                                const d = drivers.find(x => x.vehicleId === v.id);
                                const num = String(v.id).padStart(2, '0');
                                const modeLabel = d ? ({
                                    free: 'Lirë',
                                    taximeter: 'Në udhëtim',
                                    fixed: 'Çmim fiks',
                                    pause: 'Pushim',
                                    inactive: 'Joaktiv'
                                }[d.mode] || 'Joaktiv') : 'Pa shofer';
                                const modeClass = !d ? 'gray' :
                                    d.mode === 'free' ? 'green' :
                                    d.mode === 'pause' ? 'yellow' :
                                    d.mode === 'inactive' ? 'gray' : 'blue';

                                return `
                                    <tr>
                                        <td class="mono" style="font-weight:800;color:var(--accent-purple);">${num}</td>
                                        <td class="mono" style="font-weight:800;">${v.plate}</td>
                                        <td>${v.model}</td>
                                        <td>${d ? d.name : '<span style="color:var(--text-muted);">—</span>'}</td>
                                        <td class="phone">${d ? d.phone : '—'}</td>
                                        <td><span class="admin-badge ${modeClass}">${modeLabel}</span></td>
                                        <td>
                                            ${d ? `
                                                <button class="filter-btn" style="padding:5px 10px;font-size:10px;" onclick="AdminVehicles.openControl('${d.id}')">
                                                    <i class="fa-solid fa-sliders"></i> Kontroll
                                                </button>
                                            ` : ''}
                                        </td>
                                    </tr>
                                `;
                            }).join('')
                        }
                    </tbody>
                </table>
            </div>
        `;
    }

    // ═══ OPEN CONTROL ═══
    function openControl(driverId) {
        if (window.TaxiControlUnit?.openControlModal) {
            window.TaxiControlUnit.openControlModal(driverId);
        } else {
            showToast('warning', 'Kontrolli', 'Control Unit nuk është gati');
        }
    }

    function showToast(type, title, msg) {
        if (window.AdminApp?.showToast) window.AdminApp.showToast(type, title, msg);
    }

    return { init, load, openControl };
})();

console.log('✅ admin/vehicles.js ngarkuar');
