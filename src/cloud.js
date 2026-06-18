// ===================================================================
// cloud.js — shared-state sync via Supabase RPC (plain fetch, no SDK).
//
// All access goes through passphrase-gated stored procedures (see
// supabase/schema.sql). The publishable key + URL live in config and are
// safe to commit; the only secret is the family passphrase, which the
// user types once and we cache in localStorage on this device.
//
// Sync is poll-based: every few seconds we ask the server "what's the
// latest version?" and only re-download the blob when it actually changed.
// localStorage stays the offline cache; this layer keeps devices in step.
// ===================================================================

import { config } from './constants.js';

const PASS_KEY = 'kingdom_cloud_pass';
const POLL_MS  = 6000;

let _pass        = localStorage.getItem(PASS_KEY) || '';
let _lastVersion = null;   // updated_at we have already applied or written
let _onRemote    = null;   // callback(stateObj) when another device changed it
let _polling     = false;

export function cloudConfigured() { return !!(config.cloudUrl && config.cloudKey); }
export function hasPassphrase()   { return !!_pass; }

// ---- low-level RPC --------------------------------------------------
async function rpc(fn, body) {
    const res = await fetch(`${config.cloudUrl}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: {
            'apikey':        config.cloudKey,
            'Authorization': `Bearer ${config.cloudKey}`,
            'Content-Type':  'application/json',
        },
        body: JSON.stringify(body || {}),
    });
    if (!res.ok) {
        const err = new Error('cloud_error_' + res.status);
        err.status = res.status;   // 401/403 == wrong/expired passphrase
        throw err;
    }
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
}

// ---- passphrase -----------------------------------------------------
// Validates against the server; on success caches it on this device.
export async function setPassphrase(pass) {
    const ok = await rpc('kingdom_check', { p_pass: pass });
    if (ok === true) {
        _pass = pass;
        localStorage.setItem(PASS_KEY, pass);
        return true;
    }
    return false;
}
export function clearPassphrase() {
    _pass = '';
    localStorage.removeItem(PASS_KEY);
}

// ---- read / write ---------------------------------------------------
// Returns { state, version } — state is null when the cloud is empty
// (first run) so the caller can seed it from this device.
export async function cloudLoad() {
    const rows = await rpc('kingdom_load', { p_pass: _pass });
    const row  = Array.isArray(rows) ? rows[0] : rows;
    if (!row) return { state: null, version: null };
    _lastVersion = row.updated_at;
    const st = row.state;
    if (!st || Object.keys(st).length === 0) return { state: null, version: row.updated_at };
    return { state: st, version: row.updated_at };
}

export async function cloudVersion() {
    return await rpc('kingdom_version', { p_pass: _pass });
}

// רישום מנוי Web-Push לשרת (משתמש בסיסמה הקיימת). דורש את ערכת supabase/push.
export async function savePushSubscription(sub) {
    if (!_pass || !cloudConfigured()) return;
    return rpc('save_push_sub', { p_pass: _pass, p_sub: sub });
}

// Debounced, fire-and-forget push of the latest state. Coalesces the
// rapid save+persist bursts the app produces into a single round-trip.
let _pushTimer = null, _pendingState = null;
export function cloudPush(stateObj) {
    if (!_pass || !cloudConfigured()) return;   // not set up -> silent no-op
    _pendingState = stateObj;
    clearTimeout(_pushTimer);
    _pushTimer = setTimeout(_flushPush, 800);
}
async function _flushPush() {
    const st = _pendingState; _pendingState = null;
    if (!st) return;
    try {
        const v = await rpc('kingdom_save', { p_pass: _pass, p_state: st });
        _lastVersion = v;   // remember our own write so polling won't echo it
    } catch (e) { /* offline / transient — next save or poll will recover */ }
}

// ---- polling --------------------------------------------------------
function _pollTick() {
    if (!_pass) return Promise.resolve();
    // Don't yank state out from under someone who's actively typing.
    const ae = document.activeElement;
    if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return Promise.resolve();
    return cloudVersion()
        .then(v => {
            if (!v || v === _lastVersion) return;
            return cloudLoad().then(r => { if (r.state && _onRemote) _onRemote(r.state); });
        })
        .catch(() => { /* offline — try again next tick */ });
}

function _startPolling() {
    if (_polling) return;
    _polling = true;
    setInterval(_pollTick, POLL_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) _pollTick(); });
    window.addEventListener('focus', _pollTick);
}

// ---- bootstrap (called once at startup) -----------------------------
// getLocalState(): current gameState, used to seed an empty cloud.
// onRemote(stateObj): apply a state pushed from another device.
export async function bootstrap({ getLocalState, onRemote }) {
    if (!cloudConfigured()) return;
    _onRemote = onRemote;

    if (!_pass) {
        const ok = await promptPassphrase();
        if (!ok) return;   // user chose to stay offline / local-only
    }

    try {
        const r = await cloudLoad();
        if (r.state) onRemote(r.state);          // adopt the shared state
        else         cloudPush(getLocalState()); // empty cloud -> seed it
        _startPolling();
    } catch (e) {
        if (e.status === 401 || e.status === 403) {
            // cached passphrase no longer valid (e.g. it was changed) — re-ask.
            clearPassphrase();
            const ok = await promptPassphrase();
            if (ok) return bootstrap({ getLocalState, onRemote });
            return;
        }
        _startPolling();   // probably offline; keep trying in the background
    }
}

// ---- passphrase prompt (self-contained modal) -----------------------
function promptPassphrase() {
    return new Promise((resolve) => {
        const wrap = document.createElement('div');
        wrap.dir = 'rtl';
        wrap.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4';
        wrap.innerHTML = `
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div class="text-4xl mb-2">🔐</div>
            <h3 class="text-lg font-bold text-slate-800 mb-1">סיסמת המשפחה</h3>
            <p class="text-xs text-slate-400 mb-4">הזינו את סיסמת המשפחה כדי לסנכרן את הממלכה בין כל המכשירים</p>
            <input id="cloud-pass-input" type="password" autocomplete="current-password"
                   class="w-full bg-white border border-indigo-200 rounded-xl py-2 px-3 text-sm text-center focus:outline-none mb-2" />
            <p id="cloud-pass-err" class="text-xs text-rose-500 h-4 mb-2"></p>
            <button id="cloud-pass-btn" class="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all">כניסה</button>
            <button id="cloud-pass-skip" class="w-full mt-2 py-1 text-xs text-slate-400 hover:text-slate-600">המשך ללא סנכרון</button>
          </div>`;
        document.body.appendChild(wrap);
        const input = wrap.querySelector('#cloud-pass-input');
        const err   = wrap.querySelector('#cloud-pass-err');
        const btn   = wrap.querySelector('#cloud-pass-btn');
        const skip  = wrap.querySelector('#cloud-pass-skip');
        input.focus();

        async function submit() {
            const val = input.value.trim();
            if (!val) return;
            btn.disabled = true; err.textContent = 'בודק...';
            try {
                if (await setPassphrase(val)) { wrap.remove(); resolve(true); }
                else { err.textContent = 'סיסמה שגויה, נסו שוב'; btn.disabled = false; input.select(); }
            } catch (e) {
                err.textContent = 'אין חיבור לשרת'; btn.disabled = false;
            }
        }
        btn.addEventListener('click', submit);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
        skip.addEventListener('click', () => { wrap.remove(); resolve(false); });
    });
}
