// ===================================================================
// reminders.js — in-app reminder banner + optional local notification.
//
// Fully client-side: works whenever the app is open, no backend needed.
// (Closed-app push is a separate, optional backend — see supabase/push/.)
// ===================================================================

import { gameState, isDaily } from './state.js';
import { showToast } from './render.js';
import { subscribePush } from './push.js';

const TONES = {
    amber:   'from-amber-100 to-amber-50 border-amber-200 text-amber-800',
    indigo:  'from-indigo-100 to-indigo-50 border-indigo-200 text-indigo-800',
    emerald: 'from-emerald-100 to-emerald-50 border-emerald-200 text-emerald-800',
};

// בונה את ההודעה לפי מצב היום: חשיפת שישי, משימות יומיות פתוחות, או "הכול נקי".
function buildReminder() {
    let dailyLeft = 0;
    (gameState.rooms || []).forEach(r => (r.tasks || []).forEach(t => {
        if (!t.hidden && isDaily(t) && !t.completed) dailyLeft++;
    }));
    const day = new Date().getDay(); // 0=ראשון … 5=שישי 6=שבת

    if (day === 5) {
        return { tone: 'amber', actionable: true,
            text: 'היום יום שישי — יום החשיפה! פתחו את הכתר 👑 כדי לגלות מי זכה בפרס השבועי.',
            html: '🎉 היום יום שישי — יום החשיפה! לחצו על הכתר 👑 לגלות מי זכה בפרס השבועי.' };
    }
    if (day === 4) {
        return { tone: 'indigo', actionable: true,
            text: 'מחר החשיפה הגדולה! עוד הזדמנות לסדר את החדרים ולהעלות את הממוצע השבועי.',
            html: '⏳ מחר החשיפה הגדולה! עוד הזדמנות לסדר את החדרים ולהעלות את הממוצע השבועי.' };
    }
    if (dailyLeft > 0) {
        return { tone: 'emerald', actionable: true,
            text: `נשארו ${dailyLeft} משימות יומיות לסמן היום. קדימה לסדר!`,
            html: `🧹 נשארו <b>${dailyLeft}</b> משימות יומיות לסמן היום. אתם אלופים — קדימה לסדר!` };
    }
    return { tone: 'emerald', actionable: false,
        text: 'כל המשימות היומיות סומנו — הממלכה מבריקה!',
        html: '🌟 כל המשימות היומיות סומנו — הממלכה מבריקה! כל הכבוד.' };
}

export function renderReminder() {
    const el = document.getElementById('reminder-banner');
    if (!el) return;
    const r = buildReminder();

    let bell = '';
    if ('Notification' in window && Notification.permission !== 'granted') {
        bell = `<button onclick="enableReminders()" class="shrink-0 text-[10px] bg-white/70 hover:bg-white border border-white/80 rounded-lg px-2 py-1 transition-all">🔔 הפעל תזכורות</button>`;
    }
    el.className = `rounded-2xl border bg-gradient-to-br ${TONES[r.tone]} px-4 py-3 text-sm font-bold flex items-center gap-3 shadow-sm`;
    el.innerHTML = `<span class="flex-1">${r.html}</span>${bell}`;
    el.classList.remove('hidden');

    maybeNotify(r.actionable, r.text);
}

// התראת מערכת מקומית — לכל היותר פעם ביום, ורק אם יש משהו לעשות.
function maybeNotify(actionable, text) {
    if (!actionable) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem('kingdom_last_notif') === today) return;
    localStorage.setItem('kingdom_last_notif', today);
    const opts = { body: text, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', dir: 'rtl', lang: 'he', tag: 'kingdom-daily' };
    try {
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready
                .then(reg => reg.showNotification('ממלכת הסדר', opts))
                .catch(() => { try { new Notification('ממלכת הסדר', opts); } catch (e) {} });
        } else {
            new Notification('ממלכת הסדר', opts);
        }
    } catch (e) { /* notifications unavailable */ }
}

export function enableReminders() {
    if (!('Notification' in window)) {
        showToast('🔔 לא נתמך', 'הדפדפן הזה לא תומך בהתראות.');
        return;
    }
    Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
            showToast('🔔 תזכורות הופעלו', 'נשלח לכם תזכורת עדינה כשיש משימות פתוחות.');
            localStorage.removeItem('kingdom_last_notif'); // allow today's reminder now
            subscribePush(); // רישום לדחיפה (פעיל רק אם הוגדר vapidPublicKey)
        } else {
            showToast('🔕 ההתראות בוטלו', 'אפשר להפעיל שוב בכל עת מהכפתור בראש המסך.');
        }
        renderReminder();
    });
}
