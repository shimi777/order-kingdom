// ===================================================================
// push.js — client side of closed-app Web Push (optional).
// Dormant unless config.vapidPublicKey is set AND the supabase/push
// backend is deployed. See supabase/push/README.md.
// ===================================================================

import { config } from './constants.js';
import { savePushSubscription } from './cloud.js';

function urlBase64ToUint8Array(base64) {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
}

// נקרא אחרי שהמשתמש אישר התראות. ללא vapidPublicKey — no-op שקט.
export async function subscribePush() {
    if (!config.vapidPublicKey) return false;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    try {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(config.vapidPublicKey),
            });
        }
        await savePushSubscription(sub.toJSON());
        return true;
    } catch (e) {
        console.warn('push subscribe failed', e);
        return false;
    }
}
