// ===================================================================
// tasks.js — edit-mode (parent password), task editor, character editor.
// Owns `editMode` (reassigned only here → exported live binding).
// charEditStaging lives on window: it is reassigned here AND mutated by an
// inline oninput handler, so window is the single shared store both can see.
// ===================================================================

import { CHARACTERS, EDIT_PW_KEY, EDITABLE_CHARS, AVATAR_CHOICES } from './constants.js';
import { gameState, saveGameState, isDaily, nextTaskId, getRoomFreshnessPct } from './state.js';
import { showToast, updateEditButtons, renderTasks, renderDeedsWall, createSparkles } from './render.js';
import { downscaleImage } from './util.js';

export function toggleTask(taskId, event) {
    let t = null, room = null;
    gameState.rooms.forEach(r => r.tasks.forEach(tk => { if (tk.id === taskId) { t = tk; room = r; } }));
    if (!t) return;
    t.completed = !t.completed;
    t.completedAt = t.completed ? Date.now() : null;
    if (event && t.completed) createSparkles(event.clientX, event.clientY);
    if (t.completed) {
        celebrateCompletion(t, room);
    } else {
        saveGameState(`משימה: ${t.title} בוטלה`);
    }
}

// משוב מסוגלות (לא "תשלום" יבש): אומר לילד כמה החדר נקי עכשיו, ומדגיש שיא אישי.
// בנוסף — תגמול משתנה: לפעמים "קוסם הסדר" שולח כוכב הפתעה (delight, לא נקודות).
function celebrateCompletion(t, room) {
    const pct = getRoomFreshnessPct(room);
    if (!gameState.roomBest) gameState.roomBest = {};
    const prevBest = gameState.roomBest[room.id] || 0;
    const isRecord = pct > prevBest && pct > 0;
    if (isRecord) gameState.roomBest[room.id] = pct;

    const roomName = room.name.split(' ').slice(1).join(' ') || room.name;
    let title, msg;
    if (pct >= 100)      { title = "👑 חדר מושלם!"; msg = `${roomName} נקי ב-100%! עבודה מלכותית.`; }
    else if (isRecord)   { title = "🏆 שיא חדש!";   msg = `${roomName} עכשיו ${pct}% נקי — הכי גבוה שהיה!`; }
    else                 { title = "✨ כל הכבוד!";  msg = `${roomName} עכשיו ${pct}% נקי.`; }

    const surprise = Math.random() < 0.18;
    if (surprise) gameState.surpriseStars = (gameState.surpriseStars || 0) + 1;

    saveGameState(`השלמת משימה: ${t.title}`);
    showToast(title, msg);
    if (surprise) {
        setTimeout(() => {
            showToast("🎁 כוכב הפתעה!", `קוסם הסדר התרשם — אספת ${gameState.surpriseStars} כוכבי הפתעה ✨`);
            createSparkles(window.innerWidth / 2, window.innerHeight * 0.35);
        }, 1400);
    }
}

// יעד אישי שבועי לכל ילד (אוטונומיה). ריק/0 = ביטול היעד.
export function setPersonalGoal(char) {
    const name = (CHARACTERS[char] && CHARACTERS[char].name) || char;
    const cur = (gameState.personalGoals && gameState.personalGoals[char]) || "";
    const val = prompt(`🎯 מהו יעד הנקודות האישי של ${name} לשבוע?\n(השאירו ריק כדי לבטל את היעד)`, cur);
    if (val === null) return;
    if (!gameState.personalGoals) gameState.personalGoals = {};
    const n = parseInt(val);
    if (!val.trim() || isNaN(n) || n <= 0) {
        delete gameState.personalGoals[char];
        showToast("🎯 היעד בוטל", `אין כרגע יעד אישי ל${name}.`);
    } else {
        gameState.personalGoals[char] = n;
        showToast("🎯 יעד נקבע!", `${name}: יעד של ${n} נקודות השבוע. אפשר לעשות את זה! 💪`);
    }
    saveGameState("עדכון יעד אישי");
}

export function markAllRoomTasksCompleted() {
    const activeRoom = gameState.rooms.find(r => r.id === gameState.selectedRoomId);
    if (activeRoom) {
        const now = Date.now();
        activeRoom.tasks.forEach(t => { t.completed = true; t.completedAt = now; });
        saveGameState(`ניקוי מלא של חדר ${activeRoom.name}`);
    }
}

// ===== הוכחת ביצוע בתמונה + אישור הורה =====
// (downscaleImage עבר ל-util.js — משותף עם תמונות ימי הולדת)
function findTask(taskId) {
    let t = null;
    gameState.rooms.forEach(r => r.tasks.forEach(x => { if (x.id === taskId) t = x; }));
    return t;
}
export function attachProof(taskId) {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment';
    input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        try {
            const dataUrl = await downscaleImage(file, 360, 0.5);
            const t = findTask(taskId);
            if (!t) return;
            t.proofPhoto = dataUrl; t.proofApproved = false;
            saveGameState(`הוכחת ביצוע: ${t.title}`);
            showToast('📷 הצילום נשלח', 'ההורים יאשרו את הביצוע — כל הכבוד!');
        } catch (e) { showToast('❌ שגיאה', 'לא ניתן לטעון את התמונה.'); }
    };
    input.click();
}
export function approveProof(taskId) {
    const t = findTask(taskId);
    if (!t) return;
    t.proofApproved = true;
    if (!t.completed) { t.completed = true; t.completedAt = Date.now(); }
    saveGameState(`אישור הוכחה: ${t.title}`);
    showToast('✅ אושר', `"${t.title}" אושרה על ידי ההורים.`);
}
export function rejectProof(taskId) {
    const t = findTask(taskId);
    if (!t) return;
    t.proofPhoto = null; t.proofApproved = false;
    saveGameState(`דחיית הוכחה: ${t.title}`);
    showToast('↩️ נדחתה', `יש לצלם שוב את "${t.title}".`);
}
// הסרה עצמית של התמונה (לפני אישור הורה) כדי לצלם חדשה
export function removeProof(taskId) {
    const t = findTask(taskId);
    if (!t || t.proofApproved) return;
    t.proofPhoto = null; t.proofApproved = false;
    saveGameState(`הסרת הוכחה: ${t.title}`);
    showToast('🗑️ התמונה הוסרה', `אפשר לצלם תמונה חדשה ל"${t.title}".`);
}

// ===== מצב עריכה גלובלי (מוגן בסיסמת הורים) =====
export let editMode = false;

export function requestEditAccess() {
    const stored = localStorage.getItem(EDIT_PW_KEY);
    if (!stored) {
        const np = prompt("👑 הגדרת סיסמת הורים חדשה (תישמר במכשיר זה):");
        if (np && np.trim()) { localStorage.setItem(EDIT_PW_KEY, np.trim()); showToast("🔑 סיסמה נשמרה", "מעכשיו רק עם הסיסמה אפשר לערוך."); return true; }
        return false;
    }
    const entered = prompt("🔒 הזינו סיסמת הורים כדי לערוך:");
    if (entered === stored) return true;
    if (entered !== null) showToast("❌ סיסמה שגויה", "אין הרשאת עריכה.");
    return false;
}

export function changeEditPassword() {
    const stored = localStorage.getItem(EDIT_PW_KEY);
    const cur = prompt("הזינו את הסיסמה הנוכחית:");
    if (cur !== stored) { showToast("❌ סיסמה שגויה", "לא ניתן לשנות סיסמה."); return; }
    const np = prompt("הזינו סיסמה חדשה:");
    if (np && np.trim()) { localStorage.setItem(EDIT_PW_KEY, np.trim()); showToast("🔑 הסיסמה עודכנה", "הסיסמה החדשה נשמרה."); }
}

export function toggleGlobalEdit() {
    if (!editMode) {
        if (!requestEditAccess()) return;
        editMode = true;
    } else {
        editMode = false;
    }
    updateEditButtons();
    renderTasks();
    renderDeedsWall();
}

export function openTaskEditor(taskId) {
    let task = null;
    if (taskId !== null) gameState.rooms.forEach(r => r.tasks.forEach(t => { if (t.id === taskId) task = t; }));
    document.getElementById("task-editor-title").innerText = task ? "✏️ עריכת משימה" : "➕ משימה חדשה";
    document.getElementById("task-edit-id").value     = task ? task.id : "";
    document.getElementById("task-edit-title").value  = task ? task.title : "";
    document.getElementById("task-edit-desc").value   = task ? task.desc : "";
    document.getElementById("task-edit-char").value   = task ? (task.rotate ? "__rotate__" : task.char) : "כולם";
    document.getElementById("task-edit-points").value = task ? task.points : 10;
    document.getElementById("task-edit-family").value = task ? String(!!task.isFamily) : "false";
    document.getElementById("task-edit-freq").value   = task ? (isDaily(task) ? "daily" : "weekly") : "weekly";
    document.getElementById("task-editor-modal").classList.remove("hidden");
}

export function closeTaskEditor() { document.getElementById("task-editor-modal").classList.add("hidden"); }

export function saveTaskEditor() {
    const idVal  = document.getElementById("task-edit-id").value;
    const title  = document.getElementById("task-edit-title").value.trim();
    const desc   = document.getElementById("task-edit-desc").value.trim();
    const charSel = document.getElementById("task-edit-char").value;
    const isRotate = charSel === "__rotate__";
    const char = isRotate ? "כולם" : charSel;   // סבב: דמות בפועל נקבעת שבועית ב-effectiveChar
    const points = Math.max(1, parseInt(document.getElementById("task-edit-points").value) || 1);
    const isFamily = document.getElementById("task-edit-family").value === "true";
    const freq   = document.getElementById("task-edit-freq").value;

    if (!title) { showToast("⚠️ חסרה כותרת", "יש להזין שם למשימה לפני השמירה."); return; }

    const activeRoom = gameState.rooms.find(r => r.id === gameState.selectedRoomId);
    if (!activeRoom) return;

    if (idVal) {
        // עריכת משימה קיימת
        const t = activeRoom.tasks.find(x => x.id === parseInt(idVal));
        if (t) { t.title = title; t.desc = desc; t.char = char; t.rotate = isRotate; t.points = points; t.isFamily = isFamily; t.freq = freq; }
        showToast("✏️ המשימה עודכנה", `"${title}" נשמרה בהצלחה.`);
    } else {
        // משימה חדשה
        activeRoom.tasks.push({ id: nextTaskId(), title, desc, char, rotate: isRotate, points, isFamily, freq, completed: false, completedAt: null });
        showToast("➕ משימה נוספה", `"${title}" נוספה לחדר ${activeRoom.name}.`);
    }
    closeTaskEditor();
    saveGameState(`עריכת משימות בחדר ${activeRoom.name}`);
}

export function deleteTask(taskId) {
    const activeRoom = gameState.rooms.find(r => r.id === gameState.selectedRoomId);
    if (!activeRoom) return;
    const t = activeRoom.tasks.find(x => x.id === taskId);
    if (!t) return;
    if (!confirm(`למחוק את המשימה "${t.title}"?`)) return;
    activeRoom.tasks = activeRoom.tasks.filter(x => x.id !== taskId);
    showToast("🗑️ המשימה נמחקה", `"${t.title}" הוסרה מהחדר.`);
    saveGameState(`מחיקת משימה בחדר ${activeRoom.name}`);
}

export function toggleHideTask(taskId) {
    const activeRoom = gameState.rooms.find(r => r.id === gameState.selectedRoomId);
    if (!activeRoom) return;
    const t = activeRoom.tasks.find(x => x.id === taskId);
    if (!t) return;
    t.hidden = !t.hidden;
    if (t.hidden) { t.completed = false; t.completedAt = null; } // משימה מוסתרת לא משפיעה על הניקוד
    showToast(t.hidden ? "🙈 המשימה הוסתרה" : "👁️ המשימה הוצגה", `"${t.title}" ${t.hidden ? 'לא תופיע לילדים' : 'חזרה לרשימה'}.`);
    saveGameState(`הסתרת/הצגת משימה בחדר ${activeRoom.name}`);
}

// ===== עריכת דמויות (אווטאר ושם) =====
export function applyCharacterOverrides() {
    const ov = gameState.characterOverrides || {};
    Object.keys(ov).forEach(k => {
        if (CHARACTERS[k]) {
            if (ov[k].emoji) CHARACTERS[k].emoji = ov[k].emoji;
            if (ov[k].name)  CHARACTERS[k].name  = ov[k].name;
        }
    });
}

export function openCharacterEditor() {
    window.charEditStaging = {};
    EDITABLE_CHARS.forEach(k => window.charEditStaging[k] = { emoji: CHARACTERS[k].emoji, name: CHARACTERS[k].name });
    renderCharacterEditor();
    document.getElementById("char-editor-modal").classList.remove("hidden");
}

export function renderCharacterEditor() {
    const body = document.getElementById("char-editor-body");
    body.innerHTML = "";
    EDITABLE_CHARS.forEach(k => {
        const st = window.charEditStaging[k];
        const c = CHARACTERS[k];
        const grid = AVATAR_CHOICES.map(e =>
            `<button onclick="pickAvatar('${k}','${e}')" class="w-8 h-8 rounded-lg text-lg flex items-center justify-center ${st.emoji===e?'bg-amber-200 ring-2 ring-amber-400':'bg-slate-50 hover:bg-slate-100'}">${e}</button>`
        ).join("");
        const wrap = document.createElement("div");
        wrap.className = "rounded-2xl border border-slate-200 p-3 bg-white";
        wrap.innerHTML = `
            <div class="flex items-center gap-3 mb-2">
                <div class="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-gradient-to-br ${c.color} border border-white shadow-sm" id="char-preview-${k}">${st.emoji}</div>
                <div class="flex-1">
                    <label class="block text-[10px] font-bold text-slate-400 mb-0.5">${c.role}</label>
                    <input id="char-name-${k}" type="text" value="${st.name}" oninput="charEditStaging['${k}'].name=this.value" class="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-sm focus:outline-none focus:border-amber-300">
                </div>
            </div>
            <div class="grid grid-cols-8 gap-1">${grid}</div>
        `;
        body.appendChild(wrap);
    });
}

export function pickAvatar(k, e) {
    window.charEditStaging[k].emoji = e;
    const prev = document.getElementById("char-preview-" + k);
    if (prev) prev.innerText = e;
    renderCharacterEditor();
}

export function closeCharacterEditor() { document.getElementById("char-editor-modal").classList.add("hidden"); }

export function saveCharacterEditor() {
    if (!gameState.characterOverrides) gameState.characterOverrides = {};
    EDITABLE_CHARS.forEach(k => {
        const st = window.charEditStaging[k];
        const nameInput = document.getElementById("char-name-" + k);
        const name = (nameInput && nameInput.value.trim()) || CHARACTERS[k].name;
        CHARACTERS[k].emoji = st.emoji;
        CHARACTERS[k].name  = name;
        gameState.characterOverrides[k] = { emoji: st.emoji, name: name };
    });
    closeCharacterEditor();
    saveGameState("עריכת דמויות");
    showToast("🎭 הדמויות עודכנו", "האווטארים והשמות נשמרו.");
}
