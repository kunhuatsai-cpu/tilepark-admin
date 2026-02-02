import { REGEX_DIMENSION, REGEX_PARENTHESES, REGEX_HEAD_NOISE, REGEX_TAIL_NOISE } from './constants';

export const Utils = {
    safeStr: (v) => String(v || '').trim(),
    safeDate: (v) => { const s = Utils.safeStr(v); return s.includes('T') ? s.split('T')[0] : s; },
    parseQty: (v) => { const s = Utils.safeStr(v).replace(/,/g, ''); const num = parseFloat(s); return isNaN(num) ? 0 : num; },
    cleanFuzzy: (v) => { return Utils.safeStr(v).normalize('NFKC').toLowerCase().replace(/[^\w\u4e00-\u9fa5]/g, ''); },
    formatBatch: (v) => { const s = Utils.safeStr(v); if (s.toUpperCase().includes('E+')) { const num = parseFloat(s); return isNaN(num) ? s : String(num); } return s; },
    formatDateShort: (dateStr) => {
        if (!dateStr || dateStr === 'undefined') return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            return d.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
        } catch (e) { return ''; }
    },
    getTodayStr: () => {
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(d - offset)).toISOString().slice(0, 10);
        return localISOTime;
    },
    parseItemsStr: (str) => {
        if (!str) return [];
        try {
            return str.split('\n').filter(l => l.trim() !== "").map(line => {
                let originalLine = line;
                let s = Utils.safeStr(line).replace(/\u3000/g, ' ').replace(/^["']|["']$/g, '').trim();
                s = s.replace(/^(\d{1,3}[\.\s])\s*/, '');

                // 1. Extract leading [ID]
                let productId = '';
                const idMatch = s.match(/^\[([^\]]+)\]/);
                if (idMatch) {
                    productId = idMatch[1];
                    s = s.substring(idMatch[0].length).trim();
                }

                // 2. Parse quantity
                let qty = '?', unit = '', name = s;
                const match = s.match(/^(.*)[\sxX\*＊\u00d7]+([0-9,\.]+)\s*([^\[\n]*)(?:\s*\[(.*)\])?$/);

                if (match && match[2]) {
                    name = (match[1] || s).trim();
                    qty = match[2].trim();
                    unit = (match[3] || '').trim();
                }

                const rawName = name;

                // 3. Smart Cleaning
                let cleanName = name;

                // A. Remove dimensions
                cleanName = cleanName.replace(REGEX_DIMENSION, '');

                // B. Remove parentheses
                cleanName = cleanName.replace(REGEX_PARENTHESES, '');

                // C. Remove noise
                cleanName = cleanName.replace(REGEX_HEAD_NOISE, '').replace(REGEX_TAIL_NOISE, '').replace(/\s{2,}/g, ' ').trim();

                // D. Remove ID from name if redundant
                if (productId) {
                    const cleanID = Utils.cleanFuzzy(productId);
                    const currentCleanName = Utils.cleanFuzzy(cleanName);
                    let nameWithoutID = cleanName;
                    if (currentCleanName.startsWith(cleanID)) {
                        const fuzzyRegex = new RegExp("^" + productId.split('').join('.?') + "[-_\\s]*", "i");
                        nameWithoutID = cleanName.replace(fuzzyRegex, '').trim();
                    }
                    if (nameWithoutID.length > 1 || /[\u4e00-\u9fa5]/.test(nameWithoutID)) {
                        cleanName = nameWithoutID;
                    }
                }

                // E. Final fallback
                if (cleanName.length < 1) cleanName = rawName;

                return {
                    id: productId,
                    name: cleanName,
                    rawName: rawName,
                    originalName: originalLine,
                    qty: qty,
                    unit: unit
                };
            });
        } catch (e) { return []; }
    }
};

export const compressImage = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image(); img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas'); let w = img.width, h = img.height;
                if (w > h) { if (w > 1000) { h *= 1000 / w; w = 1000 } } else { if (h > 1000) { w *= 1000 / h; h = 1000 } }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h); resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        }; reader.onerror = reject;
    });
};

export const groupMatches = (rawMatches) => {
    const groups = rawMatches.reduce((acc, curr) => {
        const key = `${curr.id}-${curr.name}`;
        const qty = Utils.parseQty(curr.qty);
        if (!acc[key]) acc[key] = { id: curr.id, name: curr.name, spec: curr.spec, total: 0, lots: [] };
        acc[key].total += qty;
        if (qty > 0) acc[key].lots.push(curr);
        return acc;
    }, {});
    return Object.values(groups);
};
