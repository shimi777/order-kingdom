// ===================================================================
// today.js — 📅 "מבט יומי": רצועת מידע בראש מסך המשימות.
// מציגה במבט אחד את מה שכבר נאסף במקומות אחרים באפליקציה:
//   • האירוע המשפחתי הקרוב (יום הולדת / נישואין / פטירה)
//   • פריטי מלאי שעומדים להיגמר
//   • ארוחת הערב (ובשבת גם הבוקר) מהלו״ז
// הרצועה מתרוקנת לגמרי כשאין מה להציג, כדי לא להציג כרטיס ריק.
// ===================================================================

import { gameState } from './state.js';
import { EVENT_TYPES, HEB_MONTHS, DAY_NAMES } from './constants.js';
import { escapeHtml } from './util.js';
import { daysUntilNext, nextAge, hasDate } from './birthdays.js';

// חלון תצוגה לאירוע הקרוב הבא (אירועי "היום" מוצגים תמיד)
const UPCOMING_WINDOW_DAYS = 45;

function typeInfo(type) {
    return EVENT_TYPES.find(t => t.id === type) || EVENT_TYPES[0];
}

// כרטיס-שבב קומפקטי. onclick אופציונלי הופך אותו ללחיץ (ניווט בין מסכים).
function chip({ emoji, label, sub, cls, onclick }) {
    const clickAttrs = onclick ? ` onclick="${onclick}" role="button" tabindex="0"` : '';
    const clickCls = onclick ? ' cursor-pointer hover:shadow-sm active:scale-[0.98]' : '';
    return `<div class="flex items-center gap-2 px-3 py-2 rounded-2xl border ${cls}${clickCls} transition-all"${clickAttrs}>
        <span class="text-xl leading-none shrink-0">${escapeHtml(emoji)}</span>
        <div class="leading-tight text-right min-w-0">
            <div class="text-[11px] font-extrabold text-slate-700 truncate">${label}</div>
            ${sub ? `<div class="text-[10px] text-slate-500 font-bold truncate">${sub}</div>` : ''}
        </div>
    </div>`;
}

// ---- שבב אירוע משפחתי קרוב ----
function eventChip(b, d) {
    const info  = typeInfo(b.type);
    const today = d === 0;
    const emoji = b.emoji || info.emoji;
    const when  = today ? 'היום! 🎉' : d === 1 ? 'מחר 🎈' : `בעוד ${d} ימים`;

    const age = nextAge(b.year, b.day, b.month);
    let ageTxt = '';
    if (age !== null) {
        if (b.type === 'anniversary' || b.type === 'memorial') ageTxt = ` · ${age} שנים`;
        else ageTxt = ` · ימלאו ${age}`;
    }

    const base = b.type === 'anniversary' ? 'bg-rose-50 border-rose-200'
               : b.type === 'memorial'    ? 'bg-slate-50 border-slate-200'
               :                            'bg-amber-50 border-amber-200';
    const ring = b.type === 'anniversary' ? 'ring-2 ring-rose-300'
               : b.type === 'memorial'    ? 'ring-2 ring-slate-300'
               :                            'ring-2 ring-amber-300';
    const cls = today ? `${base} ${ring}` : base;

    return chip({ emoji, label: escapeHtml(b.name), sub: `${when}${ageTxt}`, cls, onclick: "switchView('birthdays')" });
}

// ---- שבב מלאי שעומד להיגמר ----
function lowStockChip() {
    const items = gameState.inventory || [];
    const low = items.filter(it => (Number(it.qty) || 0) <= (Number(it.threshold) || 0));
    if (!low.length) return '';
    const outCount = low.filter(it => (Number(it.qty) || 0) <= 0).length;
    const names = low.slice(0, 2).map(it => escapeHtml(it.name)).join(', ');
    const extra = low.length > 2 ? ` +${low.length - 2}` : '';
    // אם משהו כבר נגמר לגמרי — צבע אדום דחוף, אחרת כתום אזהרה
    const cls = outCount ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200';
    const label = outCount
        ? `${low.length} חסרים · ${outCount} נגמרו`
        : `${low.length} עומדים להיגמר`;
    return chip({ emoji: '🛒', label, sub: names + extra, cls, onclick: "switchView('pantry')" });
}

// ---- שבבי ארוחות היום (ערב; בשבת גם בוקר) ----
function mealChips(dayIdx) {
    const ws = gameState.weeklySchedule || {};
    const out = [];
    const breakfast = dayIdx === 6 ? ((ws.breakfasts || {})[6] || '').trim() : '';
    if (breakfast) {
        out.push(chip({ emoji: '🥐', label: escapeHtml(breakfast), sub: 'ארוחת בוקר', cls: 'bg-amber-50 border-amber-100', onclick: "switchView('schedule')" }));
    }
    const dinner = ((ws.dinners || {})[dayIdx] || '').trim();
    if (dinner) {
        out.push(chip({ emoji: '🍽️', label: escapeHtml(dinner), sub: 'ארוחת הערב', cls: 'bg-rose-50 border-rose-100', onclick: "switchView('schedule')" }));
    }
    return out;
}

export function renderToday() {
    const el = document.getElementById('today-strip');
    if (!el) return;
    // renderToday רץ ראשון ב-renderAll ומושך נתונים משלוש מערכות (אירועים/מלאי/לו״ז);
    // עוטפים ב-try כדי שתקלה כאן לא תפיל את שאר הרינדור — במקרה כזה הרצועה פשוט תתרוקן.
    try {
        const now = new Date();
        const dayIdx = now.getDay();
        const chips = [];

        // --- אירועים: כל מי שהיום (עד 2) + האירוע הקרוב הבא בתוך החלון ---
        const evs = (gameState.birthdays || [])
            .filter(hasDate)
            .map(b => ({ b, d: daysUntilNext(b.day, b.month) }))
            .sort((a, z) => a.d - z.d);
        const todays = evs.filter(e => e.d === 0).slice(0, 2);
        const upcoming = evs.find(e => e.d > 0 && e.d <= UPCOMING_WINDOW_DAYS);
        [...todays, ...(upcoming ? [upcoming] : [])].forEach(e => chips.push(eventChip(e.b, e.d)));

        // --- מלאי שעומד להיגמר ---
        const stock = lowStockChip();
        if (stock) chips.push(stock);

        // --- ארוחות היום ---
        chips.push(...mealChips(dayIdx));

        // אין מה להציג — משאירים את הרצועה ריקה (ללא כרטיס)
        if (chips.length === 0) { el.innerHTML = ''; return; }

        const dateLabel = `יום ${DAY_NAMES[dayIdx]}, ${now.getDate()} ב${HEB_MONTHS[now.getMonth()]}`;
        el.innerHTML = `
            <div class="watercolor-card p-4 border-amber-200/50 bg-gradient-to-br from-white/80 to-amber-50/30">
                <div class="flex items-center gap-2 mb-3">
                    <span class="text-lg">📅</span>
                    <h3 class="text-sm font-bold text-slate-800">מבט יומי</h3>
                    <span class="text-[11px] text-slate-400 font-bold">· ${dateLabel}</span>
                </div>
                <div class="flex flex-wrap gap-2">${chips.join('')}</div>
            </div>`;
    } catch (e) {
        console.warn('renderToday failed', e);
        el.innerHTML = '';
    }
}
