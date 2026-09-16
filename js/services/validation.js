'use strict';

window.TaxiValidation = (() => {
    function phone(str) {
        if (!str) return { valid: false, error: 'Numri mungon' };
        const clean = str.replace(/\s/g, '');
        if (!/^[+]?[\d]{6,20}$/.test(clean)) return { valid: false, error: 'Numri nuk është valid' };
        return { valid: true };
    }

    function email(str) {
        if (!str) return { valid: false, error: 'Email mungon' };
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) return { valid: false, error: 'Email nuk është valid' };
        return { valid: true };
    }

    function required(str) {
        if (!str || !str.trim()) return { valid: false, error: 'Fusha është e detyrueshme' };
        return { valid: true };
    }

    function minLength(str, len) {
        if (!str || str.length < len) return { valid: false, error: `Minimumi ${len} karaktere` };
        return { valid: true };
    }

    function number(val, min = -Infinity, max = Infinity) {
        const n = parseFloat(val);
        if (isNaN(n)) return { valid: false, error: 'Nuk është numër' };
        if (n < min) return { valid: false, error: `Minimumi ${min}` };
        if (n > max) return { valid: false, error: `Maksimumi ${max}` };
        return { valid: true };
    }

    function date(val, notPast = true) {
        if (!val) return { valid: false, error: 'Data mungon' };
        const d = new Date(val);
        if (isNaN(d.getTime())) return { valid: false, error: 'Data nuk është valid' };
        if (notPast && d < new Date()) return { valid: false, error: 'Data është në të kaluarën' };
        return { valid: true };
    }

    function form(input) {
        const errors = {};
        Object.keys(input).forEach(key => {
            const rule = input[key];
            if (rule.required) {
                const r = required(rule.value);
                if (!r.valid) errors[key] = r.error;
            }
        });
        return { valid: Object.keys(errors).length === 0, errors };
    }

    return { phone, email, required, minLength, number, date, form };
})();

console.log('✅ validation.js ngarkuar');
