import { useEffect, useMemo, useState } from "react";

function parseExpiryMs(offer) {
  if (!offer) return null;

  const expiresAt = offer.expires_at || offer.expiresAt;
  if (expiresAt) {
    const ms = Date.parse(String(expiresAt));
    if (!Number.isNaN(ms)) return ms;
  }

  const ttlSeconds = offer.ttl_seconds ?? offer.ttlSeconds ?? offer.expires_in ?? offer.expiresIn;
  if (ttlSeconds != null && ttlSeconds !== "") {
    const s = Number(ttlSeconds);
    if (Number.isFinite(s) && s > 0) return Date.now() + s * 1000;
  }

  // UI fallback: if backend doesn't provide expiry, treat offers as a 2-minute decision window
  // based on received_at/receivedAt (does NOT affect backend logic).
  const receivedAt = offer.received_at || offer.receivedAt;
  const receivedMs = receivedAt ? Date.parse(String(receivedAt)) : NaN;
  const base = Number.isNaN(receivedMs) ? Date.now() : receivedMs;
  return base + 120 * 1000;
}

export function useOfferCountdown(offer) {
  const expiryMs = useMemo(() => parseExpiryMs(offer), [offer]);
  const [now, setNow] = useState(Date.now());
  const [initialRemainingMs, setInitialRemainingMs] = useState(null);

  useEffect(() => {
    if (!expiryMs) return;
    setInitialRemainingMs(Math.max(0, expiryMs - Date.now()));
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [expiryMs]);

  if (!expiryMs) return { secondsLeft: null, progress: null };

  const remainingMs = Math.max(0, expiryMs - now);
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const denom = Math.max(1, Number(initialRemainingMs || remainingMs || 1));
  const progress = Math.max(0, Math.min(100, (remainingMs / denom) * 100));
  return { secondsLeft, progress };
}
