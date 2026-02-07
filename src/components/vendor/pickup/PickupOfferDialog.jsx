import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock3, MapPin, Weight } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Progress } from "../../ui/progress";

function safeText(v) {
  if (v == null) return "";
  return String(v);
}

function extractScrapLabel(offer) {
  if (!offer) return "Unknown";
  const multi = offer.scrap_types || offer.scrapTypes || offer.scraps;
  if (Array.isArray(multi) && multi.length > 0) return multi.map((s) => safeText(s)).join(", ");
  return safeText(offer.scrap_type || offer.scrapType || "Unknown");
}

function extractEstimatedQty(offer) {
  if (!offer) return "N/A";
  const v = offer.estimated_quantity ?? offer.estimated_qty ?? offer.estimated_weight ?? offer.estimatedWeight;
  return v == null || v === "" ? "N/A" : String(v);
}

function extractDistanceKm(offer) {
  if (!offer) return null;
  const v = offer.distance_km ?? offer.distanceKm ?? offer.distance;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatMmSs(totalSeconds) {
  const s = Math.max(0, Number(totalSeconds) || 0);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(Math.floor(s % 60)).padStart(2, "0");
  return `${mm}:${ss}`;
}

function formatDistance(distanceKm) {
  if (distanceKm == null) return "—";
  const n = Number(distanceKm);
  if (!Number.isFinite(n)) return "—";
  if (n < 1) return `${Math.round(n * 1000)} m`;
  return `${n.toFixed(1)} km`;
}

function formatQty(qty) {
  if (qty == null || qty === "" || qty === "N/A") return "N/A";
  const n = Number(qty);
  if (Number.isFinite(n)) return `${n} kg`;
  return String(qty);
}

function CountdownRing({ value, urgent, label, sub }) {
  const v = Math.max(0, Math.min(100, Number(value ?? 0)));
  const radius = 22;
  const stroke = 5;
  const c = 2 * Math.PI * radius;
  const dash = (v / 100) * c;
  const color = urgent ? "var(--scrapco-warn)" : "var(--scrapco-brand)";

  return (
    <div className="flex items-center gap-3">
      <div className="relative grid place-items-center">
        <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="transparent"
            stroke="rgba(0,0,0,0.08)"
            strokeWidth={stroke}
          />
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
          />
        </svg>
        <div className="absolute text-center">
          <div className="text-xs font-semibold text-gray-900">{label}</div>
          <div className="text-[11px] text-gray-600">{sub}</div>
        </div>
      </div>
    </div>
  );
}

function bestAreaLabel(areaLabel) {
  const cleaned = safeText(areaLabel).trim();
  return cleaned ? cleaned : "Location available on map";
}

function tryAlertNewOffer() {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([150, 60, 150]);
    }
  } catch (_e) {}

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.03;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => {
      try {
        o.stop();
        ctx.close();
      } catch (_e) {}
    }, 180);
  } catch (_e) {
    // Autoplay restrictions may block audio; ignore.
  }
}

export default function PickupOfferDialog({
  open,
  offer,
  areaLabel,
  vendorLoc,
  online,
  pending,
  secondsLeft,
  progress,
  onAccept,
  onReject,
  onClose,
  visualState,
}) {
  const scrap = useMemo(() => extractScrapLabel(offer), [offer]);
  const qty = useMemo(() => extractEstimatedQty(offer), [offer]);
  const area = useMemo(() => bestAreaLabel(areaLabel), [areaLabel]);
  const upstreamDistance = useMemo(() => extractDistanceKm(offer), [offer]);

  const computedDistance = useMemo(() => {
    if (upstreamDistance != null) return upstreamDistance;
    const lat = Number(offer?.latitude ?? offer?.lat);
    const lng = Number(offer?.longitude ?? offer?.lng);
    const vlat = Number(vendorLoc?.lat);
    const vlng = Number(vendorLoc?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(vlat) || !Number.isFinite(vlng)) return null;

    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat - vlat);
    const dLng = toRad(lng - vlng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(vlat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const km = R * c;
    return Number.isFinite(km) ? km : null;
  }, [offer, vendorLoc, upstreamDistance]);

  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!open) {
      setExpired(false);
      return;
    }
    setExpired(false);
  }, [open, offer]);

  useEffect(() => {
    if (!open) return;
    tryAlertNewOffer();
    toast("New pickup offer received");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (pending) return;
    if (typeof secondsLeft !== "number") return;
    if (secondsLeft > 0) return;

    setExpired(true);
    const t = setTimeout(() => {
      try {
        onClose?.();
      } catch (_e) {}
    }, 650);
    return () => clearTimeout(t);
  }, [open, secondsLeft, pending, onClose]);

  const urgent = typeof secondsLeft === "number" ? secondsLeft <= 25 : false;
  const timeLabel = typeof secondsLeft === "number" ? formatMmSs(secondsLeft) : "02:00";

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose?.())}>
      <DialogContent className={`sm:max-w-md p-0 overflow-hidden data-[state=open]:slide-in-from-bottom-6 data-[state=closed]:slide-out-to-bottom-6 ${visualState === "rejected" || visualState === "expired" ? "scrapco-shake" : ""}`}>
        <div className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
          <DialogHeader className="text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg">Pickup Offer</DialogTitle>
                <DialogDescription className="mt-1">
                  Confirm within 2 minutes to accept.
                </DialogDescription>
              </div>
              <CountdownRing
                value={typeof progress === "number" ? progress : 0}
                urgent={urgent}
                label={timeLabel}
                sub={urgent ? "Hurry" : "Remaining"}
              />
            </div>
          </DialogHeader>

          <div className="mt-4 rounded-xl border bg-white/80 p-3 shadow-sm">
            <div className="text-xs text-gray-500">Scrap type</div>
            <div className="mt-0.5 text-sm font-semibold text-gray-900 truncate">{scrap}</div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-gray-50 p-2">
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <Weight className="h-3.5 w-3.5" /> Est. weight
                </div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{formatQty(qty)}</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-2">
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <MapPin className="h-3.5 w-3.5" /> Distance
                </div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{formatDistance(computedDistance)}</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-2">
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <Clock3 className="h-3.5 w-3.5" /> Respond
                </div>
                <div className={`mt-1 text-sm font-semibold ${urgent ? "text-amber-600" : "text-gray-900"}`}>{timeLabel}</div>
              </div>
            </div>

            <div className="mt-3">
              <div className="text-xs text-gray-500">Area</div>
              <div className="mt-0.5 text-sm font-semibold text-gray-900 truncate">{area}</div>
            </div>
          </div>

          {typeof secondsLeft === "number" && secondsLeft >= 0 ? (
            <div className="mt-3 space-y-2">
              <Progress value={typeof progress === "number" ? progress : 0} />
              <div className="text-[11px] text-gray-600">
                {expired ? "Offer expired." : urgent ? "Time is running out." : "Review details and respond."}
              </div>
            </div>
          ) : null}

          {!online ? (
            <div className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">
              You’re offline. Connect to accept/reject.
            </div>
          ) : null}
        </div>

        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              className="h-11 rounded-xl active:scale-[0.98] transition-transform"
              disabled={pending || !online || expired || visualState === "accepted"}
              onClick={onReject}
            >
              {pending ? "Sending…" : expired ? "Expired" : "Reject"}
            </Button>
            <Button
              className={`h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-transform ${!pending && online && !expired ? "scrapco-pulse-glow" : ""}`}
              disabled={pending || !online || expired || visualState === "accepted"}
              onClick={onAccept}
            >
              {pending ? "Accepting…" : expired ? "Expired" : "Accept"}
            </Button>
          </div>

          <Button
            variant="ghost"
            className="mt-2 w-full rounded-xl active:scale-[0.98] transition-transform"
            disabled={pending}
            onClick={onClose}
          >
            Close
          </Button>
        </div>

        {visualState === "accepted" ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-white/80">
            <div className="scrapco-pop flex flex-col items-center gap-2 rounded-2xl border bg-white p-4 shadow-lg">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              <div className="text-sm font-semibold text-gray-900">Pickup Assigned</div>
              <div className="text-xs text-gray-600">You can start now.</div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
