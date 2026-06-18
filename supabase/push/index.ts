// ===================================================================
// Supabase Edge Function: "push"
// Sends a day-aware daily reminder to every registered device via Web Push.
// Invoked on a schedule by pg_cron (see schema.sql) or manually.
//
// Deploy:  supabase functions deploy push --no-verify-jwt
// Secrets: supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.)
// ===================================================================

import webpush from "npm:web-push@3.6.7";
import { createClient } from "jsr:@supabase/supabase-js@2";

webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT") ?? "mailto:family@example.com",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
);

const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function messageForToday(): { title: string; body: string } {
    const day = new Date().getDay(); // 0=Sun … 5=Fri 6=Sat
    if (day === 5) return { title: "ממלכת הסדר 👑", body: "היום יום שישי — יום החשיפה! מי זכה בפרס השבועי?" };
    if (day === 4) return { title: "ממלכת הסדר ⏳", body: "מחר החשיפה! עוד הזדמנות לסדר ולהעלות את הממוצע השבועי." };
    return { title: "ממלכת הסדר 🧹", body: "בוקר טוב! זמן לסדר את החדרים ולסמן את המשימות היומיות." };
}

Deno.serve(async () => {
    const { data: subs, error } = await supabase.from("push_subscriptions").select("*");
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

    const payload = JSON.stringify({ ...messageForToday(), url: "./index.html" });
    let sent = 0, pruned = 0;
    await Promise.all((subs ?? []).map(async (row) => {
        try {
            await webpush.sendNotification(row.sub, payload);
            sent++;
        } catch (e) {
            // 404/410 = subscription expired/unsubscribed -> clean it up
            const code = (e && (e.statusCode ?? e.status)) as number | undefined;
            if (code === 404 || code === 410) {
                await supabase.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
                pruned++;
            }
        }
    }));
    return new Response(JSON.stringify({ sent, pruned }), { headers: { "Content-Type": "application/json" } });
});
