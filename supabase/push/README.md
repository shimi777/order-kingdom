# Closed-app push reminders (optional)

The app already shows **in-app** reminders and can fire a **local** notification
while it's open (no setup needed). This add-on adds **closed-app** push — a daily
nudge even when nobody has the app open. It needs a one-time setup because a
static site can't send push by itself; Supabase does the sending.

## One-time setup (~10 min, needs the Supabase CLI logged in)

1. **Generate VAPID keys** (the push signing keys):
   ```
   npx web-push generate-vapid-keys
   ```
   Copy the **Public Key** and **Private Key**.

2. **Run the SQL**: paste `supabase/push/schema.sql` into the Supabase SQL Editor and run it.

3. **Deploy the Edge Function** (put `index.ts` at `supabase/functions/push/index.ts`):
   ```
   supabase functions deploy push --no-verify-jwt
   ```

4. **Set the secrets**:
   ```
   supabase secrets set VAPID_PUBLIC_KEY=<public>  VAPID_PRIVATE_KEY=<private>  VAPID_SUBJECT=mailto:you@example.com
   ```

5. **Tell the app the public key**: paste the **Public Key** into
   `src/constants.js` → `config.vapidPublicKey`. Commit + deploy the site.
   Now when a family member taps "🔔 הפעל תזכורות", their device is registered.

6. **Schedule the daily send**: enable the `pg_cron` and `pg_net` extensions
   (Database → Extensions), then run the `cron.schedule(...)` snippet at the
   bottom of `schema.sql` (adjust the time; cron is in UTC).

## Notes
- iOS only delivers web push if the app is **installed to the home screen**
  (Add to Home Screen) — which the PWA already supports.
- Test the function once manually from the dashboard (Functions → push → Invoke),
  or `curl -X POST <function-url>`; it returns `{sent, pruned}`.
- Without step 5 (no `vapidPublicKey` in config), the client push code is a
  silent no-op — the in-app + local reminders keep working regardless.
