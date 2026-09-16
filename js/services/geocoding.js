'use strict';

/**
 * geocoding.js — Kërkim adresash + koordinata
 */

window.TaxiGeocoding = (() => {

    // Kërko adresë në DB lokale
    function searchLocal(query) {
        if (!window.TaxiData?.searchAddresses) return [];
        return window.TaxiData.searchAddresses(query);
    }

    // Merr koordinatat e një adrese
    function getCoordinates(addressName) {
        const addr = window.TaxiData?.addresses?.find(a => a.name === addressName);
        if (addr) return { lat: addr.lat, lng: addr.lng, found: true };
        return { lat: 42.6629, lng: 21.1655, found: false }; // Prishtina default
    }

    // Gjej zonën sipas koordinatave
    function getZoneByCoords(lat, lng) {
        const zones = window.TaxiData?.zones || [];
        // Thjeshtë: zona më e afërt me qendër
        // (Për precision, do të duhej point-in-polygon)
        for (const z of zones) {
            if (z.polygon && z.polygon.length >= 3) {
                if (isPointInPolygon([lat, lng], z.polygon)) return z.id;
            }
        }
        return 'zona1';
    }

    // Point-in-polygon (ray casting)
    function isPointInPolygon(point, polygon) {
        const [x, y] = point;
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const [xi, yi] = polygon[i];
            const [xj, yj] = polygon[j];
            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    // Distanca midis 2 pikave (km)
    function distance(lat1, lng1, lat2, lng2) {
        return window.TaxiUtils?.distanceKm(lat1, lng1, lat2, lng2) || 0;
    }

    // Shto lokacion të re (ruaj në Firestore)
    async function addLocation(data) {
        const database = window.TaxiFirebase?.db;
        if (!database) return null;
        try {
            const loc = {
                name: data.name,
                category: data.category || 'other',
                address: data.address || '',
                lat: data.lat,
                lng: data.lng,
                zone: data.zone || 'zona1',
                phone: data.phone || '',
                notes: data.notes || '',
                createdBy: window.TaxiAuth?.currentUser()?.uid || null,
                createdAt: new Date().getTime(),
                isPublic: true,
                usageCount: 0
            };
            const ref = await database.collection('locations').add(loc);
            return { id: ref.id, ...loc };
        } catch (e) { console.error('❌ addLocation:', e); return null; }
    }

    return { searchLocal, getCoordinates, getZoneByCoords, distance, addLocation, isPointInPolygon };
})();

console.log('✅ geocoding.js ngarkuar');
