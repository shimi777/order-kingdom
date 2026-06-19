// ===================================================================
// birthdays.js — 🗓️ מסך מועדים מיוחדים + עורך.
// תומך בשלושה טיפוסים: birthday (🎂) / anniversary (💍) / memorial (🕯️)
// birthdayEditStaging חי על window (מאותחל כאן, נקרא ע"י מטפלים inline).
// ===================================================================

import { gameState, saveGameState } from './state.js';
import { showToast, createSparkles } from './render.js';
import { editMode } from './tasks.js';
import { renderMonth } from './schedule.js';
import { escapeHtml, escapeAttr, downscaleImage } from './util.js';
import { AVATAR_CHOICES, HEB_MONTHS, EVENT_TYPES } from './constants.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------- עזרי תאריך ----------
export function hasDate(b) { return Number.isInteger(b.day) && Number.isInteger(b.month); }

// ימים עד האירוע הבא (0 = היום). Infinity אם חסר תאריך.
export function daysUntilNext(day, month) {
    if (!Number.isInteger(day) || !Number.isInteger(month)) return Infinity;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let next = new Date(today.getFullYear(), month - 1, day);
    if (next < today) next = new Date(today.getFullYear() + 1, month - 1, day);
    return Math.round((next - today) / DAY_MS);
}

// מספר השנים שימלאו ביום הבא (null אם אין שנה)
export function nextAge(year, day, month) {
    if (!Number.isInteger(year) || !Number.isInteger(day) || !Number.isInteger(month)) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let nextYear = today.getFullYear();
    if (new Date(today.getFullYear(), month - 1, day) < today) nextYear += 1;
    return nextYear - year;
}

export function isToday(b) {
    if (!hasDate(b)) return false;
    const now = new Date();
    return now.getDate() === b.day && (now.getMonth() + 1) === b.month;
}

function typeInfo(type) {
    return EVENT_TYPES.find(t => t.id === type) || EVENT_TYPES[0];
}

function typeStyle(type) {
    if (type === 'anniversary') return {
        border: 'border-rose-200/50',  bg: 'from-white/90 to-rose-50/30',
        todayBorder: 'border-rose-300',  todayBg: 'from-rose-50 to-pink-50',   todayRing: 'ring-2 ring-rose-300',
        countColor: 'text-rose-700',     todayCount: 'text-rose-500',
    };
    if (type === 'memorial') return {
        border: 'border-slate-200/50', bg: 'from-white/90 to-slate-50/30',
        todayBorder: 'border-slate-300', todayBg: 'from-slate-50 to-gray-50',  todayRing: 'ring-2 ring-slate-300',
        countColor: 'text-slate-500',    todayCount: 'text-slate-600',
    };
    // birthday (default)
    return {
        border: 'border-amber-200/50', bg: 'from-white/90 to-amber-50/40',
        todayBorder: 'border-amber-300', todayBg: 'from-amber-50 to-pink-50',  todayRing: 'ring-2 ring-amber-300',
        countColor: 'text-amber-700',    todayCount: 'text-rose-500',
    };
}

function ageLabel(type, age) {
    if (age === null) return "";
    if (type === 'anniversary') return `<span class="text-[11px] font-bold text-rose-600">💍 ${age} שנות נישואין</span>`;
    if (type === 'memorial')    return `<span class="text-[11px] font-bold text-slate-500">🕯️ ${age} שנים</span>`;
    return `<span class="text-[11px] font-bold text-amber-600">🎈 ימלאו ${age}</span>`;
}

// ---------- רינדור הרשימה ----------
export function renderBirthdays() {
    const list = document.getElementById("birthdays-list");
    if (!list) return;

    // כפתור ייבוא CSV — גלוי רק במצב עריכה
    const importBtn = document.getElementById('birthday-import-csv-btn');
    if (importBtn) importBtn.classList.toggle('hidden', !editMode);

    const bdays = gameState.birthdays || [];

    if (bdays.length === 0) {
        list.innerHTML = `<div class="col-span-full text-center py-12">
            <div class="text-5xl mb-3">🗓️</div>
            <p class="text-slate-400 text-sm font-bold">עדיין לא נוספו מועדים.</p>
            <p class="text-slate-300 text-xs mt-1">לחצו על "➕ הוסף מועד" כדי להתחיל! ✨</p>
        </div>`;
        return;
    }

    const sorted = [...bdays].sort((a, b) => daysUntilNext(a.day, a.month) - daysUntilNext(b.day, b.month));

    list.innerHTML = "";
    sorted.forEach(b => {
        const today = isToday(b);
        const dleft = daysUntilNext(b.day, b.month);
        const age   = nextAge(b.year, b.day, b.month);
        const type  = b.type || 'birthday';
        const info  = typeInfo(type);
        const sty   = typeStyle(type);

        const avatar = b.photo
            ? `<img src="${b.photo}" class="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm shrink-0" alt="${escapeAttr(b.name)}">`
            : `<div class="w-14 h-14 rounded-full flex items-center justify-center text-3xl bg-gradient-to-br from-amber-100 to-pink-100 border-2 border-white shadow-sm shrink-0">${b.emoji || info.emoji}</div>`;

        let dateLine, countLine;
        if (hasDate(b)) {
            dateLine  = `🗓️ ${b.day} ב${HEB_MONTHS[b.month - 1]}`;
            countLine = today ? "🎉 היום!" : dleft === 1 ? "מחר! 🎈" : `בעוד ${dleft} ימים`;
        } else {
            dateLine  = "🗓️ — ללא תאריך";
            countLine = editMode ? "✏️ הוסיפו תאריך" : "";
        }

        const ageLine = (age !== null && hasDate(b)) ? ageLabel(type, age) : "";
        const badge   = `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/60 border border-slate-100 text-slate-400">${info.emoji} ${info.label}</span>`;

        const cardCls = today
            ? `watercolor-card p-5 ${sty.todayBorder} bg-gradient-to-br ${sty.todayBg} ${sty.todayRing} flex flex-col`
            : `watercolor-card p-5 ${sty.border} bg-gradient-to-br ${sty.bg} flex flex-col`;

        const editControls = editMode ? `
            <div class="flex gap-1.5 mt-3 pt-3 border-t border-slate-100">
                <button onclick="openBirthdayEditor(${b.id})" class="flex-1 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 text-[11px] font-bold border border-amber-100">✏️ עריכה</button>
                <button onclick="deleteBirthday(${b.id})" class="flex-1 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold border border-rose-100">🗑️ מחיקה</button>
            </div>` : "";

        list.innerHTML += `
            <div class="${cardCls}">
                <div class="flex items-center gap-3">
                    ${avatar}
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 flex-wrap mb-0.5">
                            <span class="font-extrabold text-base text-slate-800 truncate">${escapeHtml(b.name)} ${today ? info.emoji : ""}</span>
                            ${badge}
                        </div>
                        <div class="text-[12px] text-slate-500 font-bold mt-0.5">${dateLine}</div>
                        <div class="flex items-center gap-2 mt-1 flex-wrap">
                            ${countLine ? `<span class="text-[11px] font-black ${today ? sty.todayCount : sty.countColor}">${countLine}</span>` : ""}
                            ${ageLine}
                        </div>
                    </div>
                </div>
                ${editControls}
            </div>`;
    });

    const view = document.getElementById("view-birthdays");
    if (view && !view.classList.contains("hidden") && sorted.some(isToday)) {
        createSparkles(window.innerWidth / 2, window.innerHeight * 0.3);
    }
}

// ---------- סלקטור טיפוס ----------
function _renderTypeSelector() {
    const cont = document.getElementById("birthday-edit-type");
    if (!cont) return;
    const cur = (window.birthdayEditStaging || {}).type || 'birthday';
    cont.innerHTML = EVENT_TYPES.map(t =>
        `<button type="button" onclick="setBirthdayType('${t.id}')"
            class="flex-1 py-1.5 px-2 rounded-lg border text-xs font-bold transition-all ${cur === t.id ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}">${t.emoji} ${t.label}</button>`
    ).join("");
}

export function setBirthdayType(type) {
    if (!window.birthdayEditStaging) window.birthdayEditStaging = {};
    window.birthdayEditStaging.type = type;
    _renderTypeSelector();
}

// ---------- העורך ----------
export function openBirthdayEditor(id) {
    const b = (id !== null && id !== undefined) ? (gameState.birthdays || []).find(x => x.id === id) : null;
    window.birthdayEditStaging = {
        emoji: (b && b.emoji) || "🎂",
        photo: (b && b.photo) || null,
        type:  (b && b.type) || 'birthday',
    };
    document.getElementById("birthday-edit-id").value   = b ? b.id : "";
    document.getElementById("birthday-edit-name").value = b ? b.name : "";
    document.getElementById("birthday-edit-day").value  = (b && Number.isInteger(b.day)) ? b.day : "";
    document.getElementById("birthday-edit-year").value = (b && Number.isInteger(b.year)) ? b.year : "";

    const monthSel = document.getElementById("birthday-edit-month");
    monthSel.innerHTML = '<option value="">חודש</option>' +
        HEB_MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join("");
    monthSel.value = (b && Number.isInteger(b.month)) ? b.month : "";

    document.getElementById("birthday-editor-title").innerText = b ? "✏️ עריכת מועד" : "➕ מועד חדש";
    _renderTypeSelector();
    _renderBirthdayAvatars();
    _renderBirthdayPreview();
    document.getElementById("birthday-editor-modal").classList.remove("hidden");
}

function _renderBirthdayAvatars() {
    const cont = document.getElementById("birthday-edit-avatars");
    if (!cont) return;
    const st = window.birthdayEditStaging;
    cont.innerHTML = AVATAR_CHOICES.map(e =>
        `<button type="button" onclick="pickBirthdayAvatar('${e}')" class="w-8 h-8 rounded-lg text-lg flex items-center justify-center ${(st.emoji === e && !st.photo) ? 'bg-amber-200 ring-2 ring-amber-400' : 'bg-slate-50 hover:bg-slate-100'}">${e}</button>`
    ).join("");
}

function _renderBirthdayPreview() {
    const prev = document.getElementById("birthday-edit-preview");
    if (!prev) return;
    const st = window.birthdayEditStaging;
    if (st.photo) {
        prev.innerHTML = `
            <img src="${st.photo}" class="w-16 h-16 rounded-full object-cover border-2 border-amber-300 shadow-sm">
            <button type="button" onclick="pickBirthdayAvatar('${st.emoji || "🎂"}')" class="block mx-auto mt-1 text-[10px] text-rose-500 font-bold hover:underline">הסר תמונה</button>`;
    } else {
        prev.innerHTML = `<div class="w-16 h-16 rounded-full flex items-center justify-center text-3xl bg-gradient-to-br from-amber-100 to-pink-100 border-2 border-white shadow-sm">${st.emoji || "🎂"}</div>`;
    }
}

export function pickBirthdayAvatar(e) {
    window.birthdayEditStaging.emoji = e;
    window.birthdayEditStaging.photo = null;
    _renderBirthdayAvatars();
    _renderBirthdayPreview();
}

export function pickBirthdayPhoto() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        try {
            window.birthdayEditStaging.photo = await downscaleImage(file, 360, 0.6);
            _renderBirthdayAvatars();
            _renderBirthdayPreview();
        } catch (err) { showToast('❌ שגיאה', 'לא ניתן לטעון את התמונה.'); }
    };
    input.click();
}

export function closeBirthdayEditor() {
    document.getElementById("birthday-editor-modal").classList.add("hidden");
}

export function saveBirthdayEditor() {
    const idRaw  = document.getElementById("birthday-edit-id").value;
    const name   = document.getElementById("birthday-edit-name").value.trim();
    const day    = parseInt(document.getElementById("birthday-edit-day").value, 10);
    const month  = parseInt(document.getElementById("birthday-edit-month").value, 10);
    const yearRaw = document.getElementById("birthday-edit-year").value.trim();
    const year   = yearRaw ? parseInt(yearRaw, 10) : null;
    const st     = window.birthdayEditStaging || { emoji: "🎂", photo: null, type: 'birthday' };
    const type   = st.type || 'birthday';

    if (!name) { showToast("⚠️ חסר שם", "יש להזין שם לפני השמירה."); return; }
    if (!(day >= 1 && day <= 31) || !(month >= 1 && month <= 12)) {
        showToast("⚠️ תאריך שגוי", "בחרו יום (1–31) וחודש תקינים."); return;
    }
    const cleanYear = Number.isInteger(year) ? year : null;
    if (!gameState.birthdays) gameState.birthdays = [];

    if (idRaw) {
        const b = gameState.birthdays.find(x => x.id === parseInt(idRaw, 10));
        if (b) { b.name = name; b.type = type; b.day = day; b.month = month; b.year = cleanYear; b.emoji = st.emoji || "🎂"; b.photo = st.photo || null; }
    } else {
        gameState.birthdays.push({ id: Date.now(), name, type, day, month, year: cleanYear, emoji: st.emoji || "🎂", photo: st.photo || null });
    }
    closeBirthdayEditor();
    const label = typeInfo(type).label;
    saveGameState(`${label}: ${name}`);
    renderMonth();   // רענון סימוני הלוח החודשי
    showToast("✅ נשמר", `${label} של ${name} נשמר בהצלחה.`);
}

export function deleteBirthday(id) {
    const b = (gameState.birthdays || []).find(x => x.id === id);
    if (!b) return;
    const label = typeInfo(b.type || 'birthday').label;
    if (!confirm(`למחוק את ${label} של ${b.name}?`)) return;
    gameState.birthdays = gameState.birthdays.filter(x => x.id !== id);
    closeBirthdayEditor();
    saveGameState("מחיקת מועד");
    renderMonth();   // רענון סימוני הלוח החודשי
    showToast("🗑️ נמחק", `${label} של ${b.name} הוסר.`);
}

// ---------- ייבוא CSV ----------
// תומך בשני פורמטים:
//  1) עם שורת כותרת (עברית/אנגלית) — מזהה עמודות לפי שם:
//     שם / קשר משפחתי / סוג האירוע / יום / חודש / שנה / ... / אימוג'י
//  2) בלי כותרת — מיקום קבוע: name,type,day,month,year,emoji
// סוג האירוע מתורגם מעברית: "יום הולדת"→birthday, "יום נישואין/נישואים"→anniversary,
//   "יום פטירה/אזכרה/זיכרון"→memorial. דילוג על כפילויות (שם + טיפוס זהים).

// מיפוי מחרוזת סוג אירוע (עברית/אנגלית/מזהה) → מזהה טיפוס תקין
function mapEventType(s) {
    const v = (s || '').trim().toLowerCase();
    if (/נישוא|anniversary/.test(v)) return 'anniversary';
    if (/פטיר|אזכר|זיכר|memorial/.test(v)) return 'memorial';
    if (v === 'anniversary' || v === 'memorial' || v === 'birthday') return v;
    return 'birthday'; // ברירת מחדל (כולל "יום הולדת")
}

export async function importBirthdaysFromCSV() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.csv,text/csv';
    input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const text = await file.text();
        const rows = text.trim().split(/\r?\n/).map(line => line.split(',').map(s => s.trim().replace(/^"|"$/g, '')));
        if (!rows.length) return;

        // זיהוי שורת כותרת ומיפוי עמודות לפי שם; אחרת — מיקום קבוע
        const header = rows[0].map(h => h.toLowerCase());
        const hasHeader = header.some(h => /שם|name/.test(h));
        let col = { name: 0, type: 1, day: 2, month: 3, year: 4, emoji: 5 };
        if (hasHeader) {
            col = { name: -1, type: -1, day: -1, month: -1, year: -1, emoji: -1 };
            header.forEach((h, i) => {
                if (col.name  < 0 && /שם|name/.test(h))        col.name  = i;
                else if (col.type  < 0 && /סוג|type/.test(h))  col.type  = i;
                else if (col.day   < 0 && /^יום$|^day$/.test(h)) col.day = i;
                else if (col.month < 0 && /חודש|month/.test(h)) col.month = i;
                else if (col.year  < 0 && /שנה|year/.test(h))   col.year  = i;
                else if (col.emoji < 0 && /אימוג|emoji/.test(h)) col.emoji = i;
            });
            if (col.name < 0) col.name = 0;
        }
        const at = (cols, idx) => (idx >= 0 && idx < cols.length) ? cols[idx] : '';

        if (!gameState.birthdays) gameState.birthdays = [];
        let added = 0, skipped = 0;
        for (let i = hasHeader ? 1 : 0; i < rows.length; i++) {
            const cols = rows[i];
            const name = at(cols, col.name);
            if (!name) { skipped++; continue; }
            const type  = mapEventType(at(cols, col.type));
            const day   = parseInt(at(cols, col.day),   10) || null;
            const month = parseInt(at(cols, col.month), 10) || null;
            const year  = parseInt(at(cols, col.year),  10) || null;
            const emoji = at(cols, col.emoji) || typeInfo(type).emoji;
            // דלג על כפילויות (שם + טיפוס)
            if (gameState.birthdays.some(b => b.name === name && (b.type || 'birthday') === type)) { skipped++; continue; }
            gameState.birthdays.push({ id: Date.now() + i, name, type, day, month, year, emoji, photo: null });
            added++;
        }
        if (added > 0) { saveGameState("ייבוא מועדים מ-CSV"); renderMonth(); }
        showToast("📤 ייבוא CSV", `נוספו ${added} מועדים${skipped > 0 ? `, ${skipped} דולגו` : ''}.`);
    };
    input.click();
}
