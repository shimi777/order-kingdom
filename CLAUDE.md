# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Kingdom of Order" (ממלכת הסדר) — a Hebrew, right-to-left **family chore gamification web app**. It is a **static single-page app** (no backend server of its own, no build step, no npm) served from GitHub Pages, with an optional Supabase backend bolted on for cross-device sync and push reminders. This repo is the family's **live/prod** app (GitHub `shimi777/order-kingdom`); a separate public template fork (`order-kingdom-dev`) keeps customizable data in `src/config.js` instead of `src/constants.js`.

## Run / develop

There is no build, no bundler, and (currently) no test suite. The app uses **native ES modules**, which do **not** load over `file://` — opening `index.html` by double-click shows a blank page. You must serve over http:

```bash
py -m http.server 8000      # then open http://localhost:8000/
```

Tailwind is loaded from the CDN (the production warning in the console is expected and harmless). To verify a change, serve and load the page; for headless QA the `/browse` skill works against `http://localhost:<port>/index.html`.

## Deploy

Push to `master` → GitHub Pages rebuilds and serves the live app at `https://shimi777.github.io/order-kingdom/`. Direct-to-`master` is the established workflow (every release commit is on `master`). The heavy room images are served from the same Pages site (`BASE_URL` in `constants.js`). After a deploy the **service worker (`sw.js`) serves a cached copy first**, so a change often needs a *second* refresh to appear.

## Architecture

### Module layout and the `window` bridge
`index.html` loads one entry module, `src/main.js`. The body's interactive elements use inline `on*=` handlers (e.g. `onclick="toggleTask(...)"`), so `main.js` re-attaches ~50 module functions onto `window` so those inline handlers resolve. **When you add a function that an inline handler (or an `innerHTML` template string) calls, you must add it to the `Object.assign(window, {...})` block in `main.js`** or it will be undefined at runtime.

`init()` in `main.js` is the startup sequence: load local state → apply character overrides → compute scores → render → start the schedule → kick off `cloud.bootstrap` → set a 5-minute refresh interval.

### State model
`src/state.js` owns `gameState`, the single source of truth. The exported `gameState` binding is **reassigned only inside state.js** (`loadGameState` / `resetToInitial` / `ingestRemoteState`); every other module imports the live binding and **mutates its properties only**, then calls `saveGameState()`. Persistence cache key is `localStorage["kingdom_of_order_save_v4"]`.

- **`score` and `personalScores` are derived**, recomputed from completed tasks + good deeds by `calculateAllScores()`. Do not set them by hand expecting them to stick — they get overwritten on the next recompute (this is why a cloud-synced blob with a hand-edited score is ignored).
- Known preserved quirk: `saveGameState` writes localStorage *before* `calculateAllScores`, so the persisted `score` is one step stale. Harmless (recomputed on load); don't "fix" without care.
- Tasks expire via `decayTasks()` (daily tasks after 1 day, weekly after 1 week); `isDaily()` prefers a task's `freq` field, falling back to the historical `DAILY_TASK_IDS` set.
- `resetToInitial()` is the weekly reset: it keeps parent-defined config (rooms/tasks/prizes/schedule/shopping/characters) and only clears completions/scores.

### Customizable data
All family-specific content (title, `CHARACTERS`, `INITIAL_STATE` rooms+tasks, prizes, dinners, image URLs) lives in `src/constants.js` (this prod repo) — there is no separate data file here. `config` at the bottom of `constants.js` holds runtime keys (`scriptUrl`, `geminiKey`, `cloudUrl`/`cloudKey`, `vapidPublicKey`); the Supabase URL + anon key there are **public by design** (protected by Row Level Security, not secrecy).

### Cloud sync (`src/cloud.js` + `supabase/schema.sql`)
Cross-device sync stores the whole `gameState` as one JSON blob in Supabase. The client uses **plain `fetch` to passphrase-gated Postgres RPCs** (no supabase-js SDK): `kingdom_check / kingdom_load / kingdom_version / kingdom_save`. The tables have RLS on with no policies, so the anon key can't touch them directly — the only way in is the RPCs, each of which verifies a family passphrase (bcrypt hash stored server-side; the passphrase itself is never committed, cached per-device in `localStorage["kingdom_cloud_pass"]`). Sync is **poll-based** (`kingdom_version` every 6s + on focus/visibility), **last-write-wins**, and localStorage stays the offline cache. Remote changes arrive via `state.ingestRemoteState` → repaint in `main.js`. `saveGameState`/`persistGame` push to the cloud (debounced, fire-and-forget, no-op when not configured).

### Push reminders (`src/push.js`, `src/reminders.js`, `supabase/push/`)
Closed-app notifications: a PWA service worker subscribes via the Web Push API (`config.vapidPublicKey`), the subscription is saved through the `save_push_sub` RPC, and a Supabase Edge Function (deployed under the auto-generated name **`smooth-responder`**, not `push`) sends daily pushes driven by `pg_cron`. `src/reminders.js` also renders an in-app reminder banner and does local (app-open) notifications. The deploy steps live in `supabase/push/README.md`.

## Module map (non-obvious roles)

- `render.js` — all DOM rendering, view switching, toasts, sparkles. `renderAll()` repaints the chores view.
- `tasks.js` — task completion + competence-framed celebration, parent edit mode (password-gated, owns `editMode`), task/character editors, photo-proof handlers.
- `prizes.js` — Friday "reveal" weekly bonus, 100% family rewards, prize editors, weekly reset.
- `schedule.js` — weekly schedule grid, monthly calendar, shopping list, dinner menu (the "schedule" view).
- `rooms.js` — room filter + good-deeds log.
- `sync.js` — one-way Google Apps Script CSV log + Google Calendar read (separate from cloud sync; the Apps Script is `google_apps_script_calendar.gs`).
- `daily-saying.js` / `sayings.js` — daily "wise saying" card.

## Conventions

- UI text and comments are in Hebrew; keep new user-facing strings Hebrew and RTL-aware.
- Commit messages end with a `Co-Authored-By: Claude ...` trailer; releases have been tagged "Wave N" in messages for the gamification feature batches.
