// ===================================================================
// util.js — pure helpers. Zero imports.
// ===================================================================

// הימלטות תווים לפני הזרקה ל-innerHTML (תוכן textarea / תצוגת לוח)
export function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escapeAttr(s) {
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// מפתח תאריך YYYY-MM-DD (מקומי)
export function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// הקטנת תמונה (≤maxDim px, JPEG) לפני שמירה ל-gameState המסונכרן — משותף
// להוכחת ביצוע (משימות) ולתמונות ימי הולדת, כדי לא לנפח את הבלוב.
export function downscaleImage(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;
            if (width >= height && width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; }
            else if (height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; }
            const c = document.createElement('canvas'); c.width = width; c.height = height;
            c.getContext('2d').drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);
            resolve(c.toDataURL('image/jpeg', quality));
        };
        img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
        img.src = url;
    });
}
