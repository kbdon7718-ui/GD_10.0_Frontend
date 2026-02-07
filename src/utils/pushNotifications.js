import axios from 'axios';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export async function ensurePushSubscription({ apiBase, vendorId }) {
  if (typeof window === 'undefined') return { enabled: false, reason: 'no-window' };
  if (!('serviceWorker' in navigator)) return { enabled: false, reason: 'no-service-worker' };
  if (!('PushManager' in window)) return { enabled: false, reason: 'no-push-manager' };
  if (!vendorId) return { enabled: false, reason: 'missing-vendor-id' };

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { enabled: false, reason: 'permission-denied' };

  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const resp = await axios.get(`${apiBase || ''}/api/vendor/push/public-key`);
    const publicKey = resp?.data?.publicKey;
    if (!publicKey) return { enabled: false, reason: 'missing-vapid-public-key' };

    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await axios.post(`${apiBase || ''}/api/vendor/push/subscribe`, {
    vendor_id: vendorId,
    subscription: sub.toJSON ? sub.toJSON() : sub,
  });

  return { enabled: true };
}
