'use strict';

/**
 * navigation.js — Google Maps / Waze integrime
 */

window.TaxiNavigation = (() => {

    // Hap Google Maps me destinacion
    function openGoogleMaps(lat, lng, label = '') {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        window.open(url, '_blank');
    }

    // Hap Google Maps me adresë tekstuale
    function openGoogleMapsAddress(address) {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
        window.open(url, '_blank');
    }

    // Hap Waze
    function openWaze(lat, lng) {
        const url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
        window.open(url, '_blank');
    }

    // Ndërto link tracking (për SMS)
    function buildTrackingLink(orderId) {
        const base = window.location.origin + window.location.pathname;
        return `${base}?track=${orderId}`;
    }

    // Link i thjeshtë për një adresë
    function buildMapLink(lat, lng) {
        return `https://www.google.com/maps?q=${lat},${lng}`;
    }

    // Navigim me dy pika (nga → në)
    function navigate(fromLat, fromLng, toLat, toLng) {
        const url = `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}`;
        window.open(url, '_blank');
    }

    // Kopjo linkun në clipboard
    async function copyTrackingLink(orderId) {
        const link = buildTrackingLink(orderId);
        if (window.TaxiUtils) {
            await window.TaxiUtils.copy(link);
            if (typeof showToast === 'function') {
                showToast('success', 'Kopjuar', 'Linku u kopjua në clipboard');
            }
        }
        return link;
    }

    return {
        openGoogleMaps,
        openGoogleMapsAddress,
        openWaze,
        buildTrackingLink,
        buildMapLink,
        navigate,
        copyTrackingLink
    };
})();

console.log('✅ navigation.js ngarkuar');
