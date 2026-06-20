// ===================================================================
// inventory.js — ניהול מלאי ביתי (מזון + חומרי ניקוי).
// מודל: כמות מספרית + סף התראה לכל פריט. כמות<=סף ⇒ "עומד להיגמר",
// כמות 0 ⇒ "נגמר". פריט חסר אפשר להוסיף לרשימת הקניות בלחיצה.
// המצב חי על gameState.inventory ומסונכרן ככל שאר ה-state.
// ===================================================================

import { gameState, persistGame } from './state.js';
import { showToast } from './render.js';
import { renderShoppingList } from './schedule.js';
import { escapeHtml, escapeAttr } from './util.js';

const CATEGORIES = [
    { key: 'food',     label: 'מזון',         emoji: '🍎' },
    { key: 'cleaning', label: 'חומרי ניקוי',  emoji: '🧴' },
];

// סטטוס פריט לפי הכמות מול הסף
function statusOf(it) {
    const qty = Number(it.qty) || 0, th = Number(it.threshold) || 0;
    if (qty <= 0)  return { key: 'out', label: 'נגמר',          dot: '🔴', badge: 'bg-rose-50 text-rose-600 border-rose-200' };
    if (qty <= th) return { key: 'low', label: 'עומד להיגמר',   dot: '🟡', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
    return                { key: 'ok',  label: 'יש',            dot: '🟢', badge: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
}

export function renderInventory() {
    const cont = document.getElementById('inventory-sections');
    if (!cont) return;
    const items = gameState.inventory || [];
    cont.innerHTML = CATEGORIES.map(cat => {
        const catItems = items.filter(x => x.category === cat.key);
        const lowCount = catItems.filter(x => statusOf(x).key !== 'ok').length;
        const rows = catItems.length
            ? catItems.map(_itemRow).join('')
            : `<p class="text-center text-slate-400 text-xs py-3">אין פריטים בקטגוריה זו עדיין — הוסיפו פריט ראשון 👇</p>`;
        return `
        <div class="watercolor-card p-5">
            <div class="flex items-center justify-between mb-3">
                <h4 class="text-lg font-bold text-slate-800 flex items-center gap-2"><span class="text-xl">${cat.emoji}</span> ${cat.label}</h4>
                ${lowCount ? `<span class="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">⚠️ ${lowCount} חסרים</span>` : ''}
            </div>
            <div class="space-y-2 mb-3">${rows}</div>
            <div class="flex flex-wrap gap-2 items-center border-t border-slate-100 pt-3">
                <input id="inv-name-${cat.key}" type="text" placeholder="הוסיפו ${cat.label}..." onkeydown="if(event.key==='Enter')addInventoryItem('${cat.key}')" class="flex-1 min-w-[120px] bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-amber-300">
                <label class="text-[11px] text-slate-400 font-bold">כמות</label>
                <input id="inv-qty-${cat.key}" type="number" min="0" value="1" class="w-16 bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-sm focus:outline-none focus:border-amber-300">
                <label class="text-[11px] text-slate-400 font-bold">סף</label>
                <input id="inv-th-${cat.key}" type="number" min="0" value="1" class="w-16 bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-sm focus:outline-none focus:border-amber-300">
                <button onclick="addInventoryItem('${cat.key}')" class="py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm whitespace-nowrap">➕ הוסף</button>
            </div>
        </div>`;
    }).join('');
}

function _itemRow(it) {
    const s = statusOf(it);
    const needsRestock = s.key !== 'ok';
    const id = escapeAttr(it.id);
    return `
    <div class="flex items-center gap-2 bg-white/70 border border-slate-100 rounded-xl px-3 py-2 flex-wrap">
        <span class="flex-1 min-w-[90px] text-sm font-bold text-slate-700">${escapeHtml(it.name)}</span>
        <span class="text-[11px] font-bold px-2 py-0.5 rounded-full border ${s.badge}">${s.dot} ${s.label}</span>
        <div class="flex items-center gap-1">
            <button onclick="changeInventoryQty('${id}',-1)" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold leading-none">−</button>
            <span class="w-8 text-center text-sm font-bold text-slate-800">${Number(it.qty) || 0}</span>
            <button onclick="changeInventoryQty('${id}',1)" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold leading-none">+</button>
        </div>
        <label class="text-[10px] text-slate-400 font-bold">סף</label>
        <input type="number" min="0" value="${Number(it.threshold) || 0}" onchange="setInventoryThreshold('${id}',this.value)" class="w-14 bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 text-xs focus:outline-none focus:border-amber-300">
        ${needsRestock ? `<button onclick="addInventoryToShopping('${id}')" class="py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold whitespace-nowrap">➕ לרשימת קניות</button>` : ''}
        <button onclick="deleteInventoryItem('${id}')" class="text-rose-400 hover:text-rose-600 text-sm shrink-0">🗑️</button>
    </div>`;
}

export function addInventoryItem(category) {
    const nameEl = document.getElementById('inv-name-' + category);
    const qtyEl  = document.getElementById('inv-qty-' + category);
    const thEl   = document.getElementById('inv-th-' + category);
    const name = (nameEl && nameEl.value || '').trim();
    if (!name) return;
    const qty = Math.max(0, parseInt(qtyEl && qtyEl.value, 10) || 0);
    const threshold = Math.max(0, parseInt(thEl && thEl.value, 10) || 0);
    if (!gameState.inventory) gameState.inventory = [];
    gameState.inventory.push({ id: 'inv-' + Date.now(), name, category, qty, threshold });
    if (nameEl) nameEl.value = '';
    persistGame();
    renderInventory();
}

export function changeInventoryQty(id, delta) {
    const it = (gameState.inventory || []).find(x => x.id === id);
    if (!it) return;
    it.qty = Math.max(0, (Number(it.qty) || 0) + delta);
    persistGame();
    renderInventory();
}

export function setInventoryThreshold(id, val) {
    const it = (gameState.inventory || []).find(x => x.id === id);
    if (!it) return;
    it.threshold = Math.max(0, parseInt(val, 10) || 0);
    persistGame();
    renderInventory();
}

export function deleteInventoryItem(id) {
    gameState.inventory = (gameState.inventory || []).filter(x => x.id !== id);
    persistGame();
    renderInventory();
}

// הוספת פריט חסר לרשימת הקניות (מדלג אם כבר קיים שם זהה שלא נקנה)
export function addInventoryToShopping(id) {
    const it = (gameState.inventory || []).find(x => x.id === id);
    if (!it) return;
    if (!gameState.shoppingList) gameState.shoppingList = [];
    if (gameState.shoppingList.some(s => !s.done && s.text === it.name)) {
        showToast('🛒 כבר ברשימה', `${it.name} כבר נמצא ברשימת הקניות.`);
        return;
    }
    gameState.shoppingList.push({ id: 's' + Date.now(), text: it.name, done: false });
    persistGame();
    renderShoppingList();
    showToast('🛒 נוסף לקניות', `${it.name} נוסף לרשימת הקניות.`);
}
