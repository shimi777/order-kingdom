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

// ---------- תצוגה: רשימה / עץ (מועדף נשמר מקומית) ----------
let birthdayView = (typeof localStorage !== 'undefined' && localStorage.getItem('kingdom_birthday_view')) || 'list';

export function setBirthdayView(v) {
    birthdayView = (v === 'tree') ? 'tree' : 'list';
    try { localStorage.setItem('kingdom_birthday_view', birthdayView); } catch (e) {}
    renderBirthdays();
}

// ענפים מקופלים בתצוגת העץ (נשמר מקומית)
let treeCollapsed = new Set();
try {
    const s = JSON.parse(localStorage.getItem('kingdom_tree_collapsed') || '[]');
    if (Array.isArray(s)) treeCollapsed = new Set(s);
} catch (e) {}

// מודל קשרים לצורך הדגשה (בני זוג + הורים→ילדים)
const TREE_COUPLES = [[7,8],[9,10],[4,5],[11,12],[14,15]];
const TREE_PARENTS = [
    [[7,8],[11,4,14,13,16]], [[9,10],[18,5,17,20,19]], [[4,5],[1,2,3,6]],
    [[11,12],[24,25,23]], [[14,15],[26,27,28]], [[22],[15]],
];
function _treeRelated(id) {
    const set = new Set([id]);
    TREE_COUPLES.forEach(c => { if (c.includes(id)) c.forEach(x => set.add(x)); });
    TREE_PARENTS.forEach(([par, ch]) => {
        if (par.includes(id)) ch.forEach(x => set.add(x));
        if (ch.includes(id)) par.forEach(x => set.add(x));
    });
    return set;
}

function _renderViewToggle() {
    const map = { list: 'birthday-view-list', tree: 'birthday-view-tree' };
    Object.entries(map).forEach(([v, id]) => {
        const el = document.getElementById(id);
        if (!el) return;
        const active = (birthdayView === v);
        el.className = `py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${active ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`;
    });
}

// קיבוץ ברירת מחדל לפי הקשר המשפחתי (לרשומות ללא שדה group)
function groupFromRelation(relation, type) {
    if (type === 'anniversary') return 'anniv';
    const r = (relation || '').trim();
    if (/סב(א|תא)|א(מא|בא) של/.test(r)) return 'grand';   // סבים, וגם "אמא/אבא של ..."
    if (/הב(ן|ת)\s+של/.test(r))  return 'cousins';
    if (/דוד|דודה/.test(r))      return 'uncles';
    if (/^(אבא|אמא|בן|בת|כלב)$/.test(r)) return 'home';
    return 'other';
}

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

    _renderViewToggle();

    if (birthdayView === 'tree') {
        // תצוגת עץ: גרף קשרים אינטראקטיבי (גרירה/זום/הקשה/קיפול)
        list.innerHTML = `
            <div id="tree-wrap" class="col-span-full relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-white/70 to-amber-50/30" style="height:72vh; touch-action:none; cursor:grab">
                ${_familyTreeSVG()}
                <div class="absolute top-2 left-2 flex flex-col gap-1.5">
                    <button id="tree-zin"  class="w-9 h-9 rounded-xl bg-white shadow-sm border border-slate-200 text-slate-600 text-xl font-bold flex items-center justify-center hover:bg-slate-50">+</button>
                    <button id="tree-zout" class="w-9 h-9 rounded-xl bg-white shadow-sm border border-slate-200 text-slate-600 text-xl font-bold flex items-center justify-center hover:bg-slate-50">−</button>
                    <button id="tree-zreset" class="w-9 h-9 rounded-xl bg-white shadow-sm border border-slate-200 text-slate-500 text-base flex items-center justify-center hover:bg-slate-50" title="איפוס תצוגה">⟲</button>
                </div>
                <div class="absolute top-2 right-2 text-[10px] text-slate-400 bg-white/70 rounded-lg px-2 py-1 pointer-events-none leading-tight">גררו להזזה · גלגלת/צביטה לזום<br>הקישו על דמות לפרטים · ◯ לקיפול ענף</div>
                <div id="tree-popover" class="hidden absolute z-20 w-44 bg-white rounded-xl shadow-lg border border-slate-200 p-3 text-right"></div>
            </div>`;
        _initTreeInteractions();
    } else {
        // תצוגת רשימה: שטוח, לפי האירוע הקרוב
        list.innerHTML = sorted.map(_cardHTML).join("");
    }

    const view = document.getElementById("view-birthdays");
    if (view && !view.classList.contains("hidden") && sorted.some(isToday)) {
        createSparkles(window.innerWidth / 2, window.innerHeight * 0.3);
    }
}

// קוד כרטיס בודד — משותף לתצוגת הרשימה ולתצוגת העץ
function _cardHTML(b) {
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
    const relLine = b.relation
        ? `<div class="text-[11px] text-slate-400 font-bold mt-0.5">👪 ${escapeHtml(b.relation)}</div>` : "";

    const cardCls = today
        ? `watercolor-card p-5 ${sty.todayBorder} bg-gradient-to-br ${sty.todayBg} ${sty.todayRing} flex flex-col`
        : `watercolor-card p-5 ${sty.border} bg-gradient-to-br ${sty.bg} flex flex-col`;

    const editControls = editMode ? `
        <div class="flex gap-1.5 mt-3 pt-3 border-t border-slate-100">
            <button onclick="openBirthdayEditor(${b.id})" class="flex-1 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 text-[11px] font-bold border border-amber-100">✏️ עריכה</button>
            <button onclick="deleteBirthday(${b.id})" class="flex-1 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold border border-rose-100">🗑️ מחיקה</button>
        </div>` : "";

    return `
        <div class="${cardCls}">
            <div class="flex items-center gap-3">
                ${avatar}
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap mb-0.5">
                        <span class="font-extrabold text-base text-slate-800 truncate">${escapeHtml(b.name)} ${today ? info.emoji : ""}</span>
                        ${badge}
                    </div>
                    <div class="text-[12px] text-slate-500 font-bold mt-0.5">${dateLine}</div>
                    ${relLine}
                    <div class="flex items-center gap-2 mt-1 flex-wrap">
                        ${countLine ? `<span class="text-[11px] font-black ${today ? sty.todayCount : sty.countColor}">${countLine}</span>` : ""}
                        ${ageLine}
                    </div>
                </div>
            </div>
            ${editControls}
        </div>`;
}

// ---------- תצוגת עץ משפחה גרפית (גרף קשרים, SVG) ----------
// הפריסה (קואורדינטות) קבועה ומשקפת את מבנה המשפחה; התוויות (שם/שנה/אווטר)
// נשלפות חיות מ-gameState לפי id, כך שעריכות בלוח משתקפות בעץ.
function _familyTreeSVG() {
    const C = {
        blue:  { f:'#E6F1FB', s:'#185FA5', t:'#042C53' },
        green: { f:'#EAF3DE', s:'#3B6D11', t:'#173404' },
        gray:  { f:'#F1EFE8', s:'#5F5E5A', t:'#2C2C2A' },
        amber: { f:'#FAEEDA', s:'#854F0B', t:'#412402' },
    };
    const L = '#B4B2A9';
    const byId = new Map((gameState.birthdays || []).map(b => [b.id, b]));
    const used = new Set();
    const idCx = {};

    const node = (id, cx, top, w, h, fs, ck, focal) => {
        used.add(id); idCx[id] = cx;
        const p = byId.get(id) || { name: '?', year: null, emoji: '❓' };
        const col = C[ck];
        const x = cx - w / 2, sw = focal ? 2.6 : 1.4;
        const nm = escapeHtml((p.emoji ? p.emoji + ' ' : '') + (p.name || '?'));
        const estW = nm.length * fs * 0.6;
        const tl = estW > (w - 8) ? ` textLength="${w - 8}" lengthAdjust="spacingAndGlyphs"` : '';
        let t;
        if (Number.isInteger(p.year)) {
            t = `<text x="${cx}" y="${(top + h * 0.44).toFixed(1)}" text-anchor="middle" font-size="${fs}" font-weight="500" fill="${col.t}"${tl}>${nm}</text>`
              + `<text x="${cx}" y="${(top + h * 0.8).toFixed(1)}" text-anchor="middle" font-size="9.5" fill="${col.t}" opacity="0.8">${p.year}</text>`;
        } else {
            t = `<text x="${cx}" y="${(top + h * 0.62).toFixed(1)}" text-anchor="middle" font-size="${fs}" font-weight="500" fill="${col.t}"${tl}>${nm}</text>`;
        }
        return `<g class="tree-node" data-id="${id}" style="cursor:pointer"><rect x="${x}" y="${top}" width="${w}" height="${h}" rx="9" fill="${col.f}" stroke="${col.s}" stroke-width="${sw}"/>${t}</g>`;
    };
    const line  = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${L}" stroke-width="1.5"/>`;
    const heart = (x, y) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="12">❤</text>`;
    const txt   = (x, y, s, sz, c, a) => `<text x="${x}" y="${y}" text-anchor="${a || 'middle'}" font-size="${sz}" fill="${c || '#5F5E5A'}">${s}</text>`;
    const toggle = (key, x, y) => `<g class="tree-toggle" data-grp="${key}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="8" fill="#fff" stroke="#B4B2A9" stroke-width="1.2"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="13" font-weight="700" fill="#5F5E5A" data-tgl="${key}">−</text></g>`;

    // ---- מידות ----
    const BW = 116, BH = 42, CG = 12;   // קופסת דור-2 + מרווח פנימי בזוג
    const GW = 120, GH = 42;             // סבים
    const KW = 80,  KH = 40, KP = 92;   // ילדים (רוחב, גובה, מרחק)
    const UG = 30;                       // מרווח בין יחידות
    const yGP = 60, yBus = 170, yG2 = 214, yK = 360;
    const coupleW = 2 * BW + CG;
    const kidsW = n => n ? n * KP - (KP - KW) : 0;

    // יחידות משמאל לימין. couple=[שמאל,ימין]; pat/mat=מי מתחבר לסבים; ckey=מפתח קיפול
    const UNITS = [
        { couple: [11, 12], pat: 11, kids: [24, 25, 23], ckey: 'k_zohar', colors: ['blue', 'gray'] },
        { single: 16, pat: 16, colors: ['blue'] },
        { couple: [14, 15], pat: 14, kids: [26, 27, 28], ckey: 'k_uria', colors: ['blue', 'gray'], ariela: 22 },
        { single: 13, pat: 13, colors: ['blue'] },
        { couple: [4, 5], pat: 4, mat: 5, kids: [1, 2, 3, 6], ckey: 'k_home', colors: ['blue', 'green'], focal: true },
        { single: 18, mat: 18, colors: ['green'] },
        { single: 17, mat: 17, colors: ['green'] },
        { single: 20, mat: 20, colors: ['green'] },
        { single: 19, mat: 19, colors: ['green'] },
    ];

    let cursor = 60;
    UNITS.forEach(u => {
        const uw = u.couple ? coupleW : BW;
        const kw = u.kids ? kidsW(u.kids.length) : 0;
        u.slot = Math.max(uw, kw);
        u.cx = cursor + u.slot / 2;
        cursor += u.slot + UG;
    });
    const totalW = Math.round(cursor - UG + 60);

    let boxes = '', kids = '', toggles = '', d = '';
    const patC = [], matC = [];

    UNITS.forEach(u => {
        if (u.couple) {
            const lx = u.cx - (BW + CG) / 2, rx = u.cx + (BW + CG) / 2;
            const [lid, rid] = u.couple;
            boxes += node(lid, lx, yG2, BW, BH, 12, u.colors[0], u.focal);
            boxes += node(rid, rx, yG2, BW, BH, 12, u.colors[1], u.focal);
            d += line(lx + BW / 2, yG2 + BH / 2, rx - BW / 2, yG2 + BH / 2) + heart(u.cx, yG2 + BH / 2 + 4);
            if (u.pat) patC.push(idCx[u.pat]);
            if (u.mat) matC.push(idCx[u.mat]);
            if (u.kids) {
                const n = u.kids.length, start = u.cx - (n - 1) * KP / 2;
                let g = `<g data-collapse="${u.ckey}">` + line(u.cx, yG2 + BH, u.cx, yK - 12) + line(start, yK - 12, start + (n - 1) * KP, yK - 12);
                u.kids.forEach((kid, i) => { const kx = start + i * KP; g += line(kx, yK - 12, kx, yK) + node(kid, kx, yK, KW, KH, 12, 'amber'); });
                kids += g + `</g>`;
                toggles += toggle(u.ckey, rx + BW / 2 + 14, yG2 + BH / 2);
            }
            if (u.ariela) {
                boxes += node(u.ariela, rx, 116, 124, 36, 11, 'gray');
                d += line(rx, 152, rx, yG2);
            }
        } else {
            boxes += node(u.single, u.cx, yG2, BW, BH, 12, u.colors[0]);
            if (u.pat) patC.push(idCx[u.single]);
            if (u.mat) matC.push(idCx[u.single]);
        }
    });

    // ---- סבים + אוטובוסים מחברים לילדיהם ----
    const gpCouple = (a, b, mid, ck, divorced) => {
        const lx = mid - (GW + CG) / 2, rx = mid + (GW + CG) / 2;
        let s = node(a, lx, yGP, GW, GH, 13, ck) + node(b, rx, yGP, GW, GH, 13, ck);
        s += line(lx + GW / 2, yGP + GH / 2, rx - GW / 2, yGP + GH / 2);
        if (divorced) {
            s += `<line x1="${mid - 3}" y1="${yGP + GH / 2 + 7}" x2="${mid + 3}" y2="${yGP + GH / 2 - 7}" stroke="#A32D2D" stroke-width="1.7"/><line x1="${mid + 1}" y1="${yGP + GH / 2 + 7}" x2="${mid + 7}" y2="${yGP + GH / 2 - 7}" stroke="#A32D2D" stroke-width="1.7"/>`;
        } else {
            s += heart(mid, yGP + GH / 2 + 4);
        }
        return s;
    };
    const bus = (centers, gpMid) => {
        const mn = Math.min(...centers), mx = Math.max(...centers);
        let s = line(mn, yBus, mx, yBus) + line(gpMid, yGP + GH, gpMid, yBus);
        centers.forEach(x => s += line(x, yBus, x, yG2));
        return s;
    };
    const patMid = (Math.min(...patC) + Math.max(...patC)) / 2;
    const matMid = (Math.min(...matC) + Math.max(...matC)) / 2;
    boxes += gpCouple(7, 8, patMid, 'blue', false);
    boxes += gpCouple(9, 10, matMid, 'green', true);
    d += bus(patC, patMid) + bus(matC, matMid);
    d = txt(patMid, yGP - 13, 'סבא וסבתא · צד אבא', 10, '#185FA5')
      + txt(matMid, yGP - 13, 'סבא וסבתא · צד אמא (גרושים)', 10, '#3B6D11') + d;
    d = txt(totalW / 2, 30, 'עץ משפחה — ממלכת הסדר', 18, '#2C2C2A') + d;
    if (idCx[24] !== undefined && idCx[25] !== undefined) d += txt((idCx[24] + idCx[25]) / 2, yK + KH + 13, 'שרה ונועה — תאומות', 9.5, '#854F0B');

    // ---- משפחה נוספת + מקרא ----
    let bottom = yK + KH + 28;
    const extras = (gameState.birthdays || []).filter(b => !used.has(b.id) && (b.type || 'birthday') !== 'anniversary');
    let extraStr = '';
    if (extras.length) {
        extraStr += txt(totalW / 2, bottom + 12, '👪 משפחה נוספת', 13, '#2C2C2A');
        const w = 100, gap = 12, cy = bottom + 24;
        const totW = extras.length * w + (extras.length - 1) * gap;
        const sx = totalW / 2 - totW / 2 + w / 2;
        extras.forEach((b, i) => extraStr += node(b.id, sx + i * (w + gap), cy, w, 36, 12, 'gray'));
        bottom = cy + 36 + 8;
    }

    const legendY = bottom + 12;
    const legendItems = [['blue', 'צד אבא (שימי)'], ['green', 'צד אמא (נעמי)'], ['gray', 'בני/בנות זוג'], ['amber', 'ילדים ונכדים']];
    let legend = '', lx = 60;
    legendItems.forEach(([ck, lab]) => {
        const c = C[ck];
        legend += `<rect x="${lx}" y="${legendY}" width="14" height="14" rx="3" fill="${c.f}" stroke="${c.s}" stroke-width="1.4"/>` + txt(lx + 20, legendY + 11, lab, 11, '#444441', 'start');
        lx += 170;
    });

    const H = legendY + 28;
    return `<svg id="family-tree-svg" width="100%" height="100%" viewBox="0 0 ${totalW} ${H}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" font-family="ui-sans-serif, system-ui, sans-serif"><title>עץ משפחה</title><desc>גרף קשרים משפחתי אינטראקטיבי המראה סבים, הורים, אחים, בני זוג וילדים.</desc><g class="tree-vp">${d}${boxes}${kids}${toggles}${extraStr}${legend}</g></svg>`;
}

// ---------- אינטראקציות לעץ: גרירה, זום, הדגשה, עריכה, קיפול ----------
function _initTreeInteractions() {
    const svg  = document.getElementById('family-tree-svg');
    const wrap = document.getElementById('tree-wrap');
    if (!svg || !wrap) return;
    const vp  = svg.querySelector('.tree-vp');
    const pop = document.getElementById('tree-popover');
    const st  = { x: 0, y: 0, k: 1 };
    const apply = () => vp.setAttribute('transform', `translate(${st.x} ${st.y}) scale(${st.k})`);

    const toSvg = (cx, cy) => {
        const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy;
        const ctm = svg.getScreenCTM();
        return ctm ? pt.matrixTransform(ctm.inverse()) : { x: cx, y: cy };
    };
    const zoomTo = (nk, m) => {
        nk = Math.min(4, Math.max(0.4, nk));
        st.x = m.x - (m.x - st.x) * (nk / st.k);
        st.y = m.y - (m.y - st.y) * (nk / st.k);
        st.k = nk; apply();
    };
    const centerPt = () => { const r = wrap.getBoundingClientRect(); return toSvg(r.left + r.width / 2, r.top + r.height / 2); };

    // ----- קיפול ענפים -----
    const KEYS = ['k_home', 'k_zohar', 'k_uria'];
    const applyCollapsed = () => KEYS.forEach(key => {
        const hidden = treeCollapsed.has(key);
        svg.querySelectorAll(`[data-collapse="${key}"]`).forEach(el => el.style.display = hidden ? 'none' : '');
        const t = svg.querySelector(`[data-tgl="${key}"]`); if (t) t.textContent = hidden ? '+' : '−';
    });
    const toggleCollapse = (key) => {
        if (treeCollapsed.has(key)) treeCollapsed.delete(key); else treeCollapsed.add(key);
        try { localStorage.setItem('kingdom_tree_collapsed', JSON.stringify([...treeCollapsed])); } catch (e) {}
        applyCollapsed();
    };
    applyCollapsed();

    // ----- הדגשה + חלונית פרטים -----
    const clearHi = () => svg.querySelectorAll('.tree-node').forEach(g => g.style.opacity = '');
    const closePop = () => { pop.classList.add('hidden'); clearHi(); };
    const selectNode = (id, el) => {
        const rel = _treeRelated(id);
        svg.querySelectorAll('.tree-node').forEach(g => { g.style.opacity = rel.has(parseInt(g.getAttribute('data-id'), 10)) ? '1' : '0.18'; });
        const p = (gameState.birthdays || []).find(b => b.id === id);
        if (!p) return;
        const type = p.type || 'birthday';
        const dateStr = (Number.isInteger(p.day) && Number.isInteger(p.month)) ? `${p.day} ב${HEB_MONTHS[p.month - 1]}${p.year ? ' ' + p.year : ''}` : 'ללא תאריך';
        const age = nextAge(p.year, p.day, p.month);
        const ageStr = (age !== null) ? ageLabel(type, age) : '';
        const editBtn = editMode ? `<button id="tree-pop-edit" class="mt-2 w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold">✏️ עריכה</button>` : '';
        pop.innerHTML = `
            <div class="flex items-center justify-between gap-2 mb-1">
                <span class="font-extrabold text-sm text-slate-800">${escapeHtml((p.emoji ? p.emoji + ' ' : '') + p.name)}</span>
                <button id="tree-pop-close" class="text-slate-300 hover:text-slate-500 text-base leading-none">✕</button>
            </div>
            ${p.relation ? `<div class="text-[11px] text-slate-400 font-bold mb-1">👪 ${escapeHtml(p.relation)}</div>` : ''}
            <div class="text-[11px] text-slate-500 font-bold">🗓️ ${dateStr}</div>
            ${ageStr ? `<div class="mt-1">${ageStr}</div>` : ''}
            ${editBtn}`;
        const r = el.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
        let left = r.left - wr.left + r.width / 2 - 88;
        left = Math.max(6, Math.min(left, wr.width - 182));
        let top = r.bottom - wr.top + 6;
        if (top > wr.height - 120) top = r.top - wr.top - 130;
        pop.style.left = left + 'px'; pop.style.top = Math.max(6, top) + 'px';
        pop.classList.remove('hidden');
        const cb = document.getElementById('tree-pop-close'); if (cb) cb.onclick = (ev) => { ev.stopPropagation(); closePop(); };
        const eb = document.getElementById('tree-pop-edit');  if (eb) eb.onclick = (ev) => { ev.stopPropagation(); closePop(); openBirthdayEditor(id); };
    };

    // ----- גרירה / זום -----
    const pts = new Map(); let last = null, moved = false, downTarget = null, pinch = 0;
    const dist2 = () => { const a = [...pts.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); };
    const mid2  = () => { const a = [...pts.values()]; return toSvg((a[0].x + a[1].x) / 2, (a[0].y + a[1].y) / 2); };

    svg.addEventListener('pointerdown', e => {
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        try { svg.setPointerCapture(e.pointerId); } catch (_) {}
        if (pts.size === 1) { last = toSvg(e.clientX, e.clientY); moved = false; downTarget = e.target; wrap.style.cursor = 'grabbing'; }
        else if (pts.size === 2) { pinch = dist2(); }
    });
    svg.addEventListener('pointermove', e => {
        if (!pts.has(e.pointerId)) return;
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size >= 2) { const nd = dist2(); if (pinch) zoomTo(st.k * (nd / pinch), mid2()); pinch = nd; moved = true; return; }
        const cur = toSvg(e.clientX, e.clientY);
        if (last) { const dx = cur.x - last.x, dy = cur.y - last.y; if (Math.abs(dx) + Math.abs(dy) > 1) moved = true; st.x += dx; st.y += dy; last = cur; apply(); }
    });
    const up = e => {
        if (pts.has(e.pointerId)) pts.delete(e.pointerId);
        if (pts.size < 2) pinch = 0;
        if (pts.size === 0) {
            wrap.style.cursor = 'grab';
            if (!moved && downTarget && downTarget.closest) {
                const tgl = downTarget.closest('.tree-toggle');
                const nd  = downTarget.closest('.tree-node');
                if (tgl) toggleCollapse(tgl.getAttribute('data-grp'));
                else if (nd) selectNode(parseInt(nd.getAttribute('data-id'), 10), nd);
                else closePop();
            }
            last = null; downTarget = null;
        }
    };
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);
    svg.addEventListener('wheel', e => { e.preventDefault(); zoomTo(st.k * (e.deltaY < 0 ? 1.12 : 0.89), toSvg(e.clientX, e.clientY)); }, { passive: false });

    const zin = document.getElementById('tree-zin'), zout = document.getElementById('tree-zout'), zr = document.getElementById('tree-zreset');
    if (zin)  zin.onclick  = () => zoomTo(st.k * 1.25, centerPt());
    if (zout) zout.onclick = () => zoomTo(st.k * 0.8,  centerPt());
    if (zr)   zr.onclick   = () => { st.x = 0; st.y = 0; st.k = 1; apply(); closePop(); };
    apply();
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
    document.getElementById("birthday-edit-relation").value = (b && b.relation) ? b.relation : "";
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
    const relation = document.getElementById("birthday-edit-relation").value.trim();
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
        if (b) {
            b.name = name; b.type = type; b.relation = relation;
            b.group = groupFromRelation(relation, type);
            b.day = day; b.month = month; b.year = cleanYear;
            b.emoji = st.emoji || "🎂"; b.photo = st.photo || null;
        }
    } else {
        gameState.birthdays.push({ id: Date.now(), name, type, relation, group: groupFromRelation(relation, type), day, month, year: cleanYear, emoji: st.emoji || "🎂", photo: st.photo || null });
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
        let col = { name: 0, relation: -1, type: 1, day: 2, month: 3, year: 4, emoji: 5 };
        if (hasHeader) {
            col = { name: -1, relation: -1, type: -1, day: -1, month: -1, year: -1, emoji: -1 };
            header.forEach((h, i) => {
                if (col.name  < 0 && /שם|name/.test(h))            col.name  = i;
                else if (col.relation < 0 && /קשר|relation/.test(h)) col.relation = i;
                else if (col.type  < 0 && /סוג|type/.test(h))      col.type  = i;
                else if (col.day   < 0 && /^יום$|^day$/.test(h))   col.day = i;
                else if (col.month < 0 && /חודש|month/.test(h))    col.month = i;
                else if (col.year  < 0 && /שנה|year/.test(h))      col.year  = i;
                else if (col.emoji < 0 && /אימוג|emoji/.test(h))   col.emoji = i;
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
            const relation = at(cols, col.relation);
            const type  = mapEventType(at(cols, col.type));
            const day   = parseInt(at(cols, col.day),   10) || null;
            const month = parseInt(at(cols, col.month), 10) || null;
            const year  = parseInt(at(cols, col.year),  10) || null;
            const emoji = at(cols, col.emoji) || typeInfo(type).emoji;
            // דלג על כפילויות (שם + טיפוס)
            if (gameState.birthdays.some(b => b.name === name && (b.type || 'birthday') === type)) { skipped++; continue; }
            gameState.birthdays.push({ id: Date.now() + i, name, type, relation, group: groupFromRelation(relation, type), day, month, year, emoji, photo: null });
            added++;
        }
        if (added > 0) { saveGameState("ייבוא מועדים מ-CSV"); renderMonth(); }
        showToast("📤 ייבוא CSV", `נוספו ${added} מועדים${skipped > 0 ? `, ${skipped} דולגו` : ''}.`);
    };
    input.click();
}
