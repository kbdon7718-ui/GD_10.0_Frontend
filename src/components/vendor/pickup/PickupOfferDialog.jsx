import { useEffect, useMemo } from "react";
import { toast } from "sonner";

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
  busy,
  online,
  pending,
  secondsLeft,
  progress,
  onAccept,
  onReject,
  onClose,
}) {
  const scrap = useMemo(() => extractScrapLabel(offer), [offer]);
  const qty = useMemo(() => extractEstimatedQty(offer), [offer]);
  const area = useMemo(() => bestAreaLabel(areaLabel), [areaLabel]);

  useEffect(() => {
    if (!open) return;
    tryAlertNewOffer();
    toast("New pickup offer received");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose?.())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pickup Offer</DialogTitle>
          <DialogDescription>
            Review the details and Accept or Reject.
          </DialogDescription>
        </DialogHeader>

        {typeof secondsLeft === "number" && secondsLeft >= 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Offer expires in</span>
              <span className="font-semibold">{secondsLeft}s</span>
            </div>
            <Progress value={typeof progress === "number" ? progress : 0} />
          </div>
        ) : null}

        <div className="mt-3 space-y-3">
          <div>
            <div className="text-xs text-gray-500">Scrap</div>
            <div className="text-sm font-semibold text-gray-900">{scrap}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Estimated quantity</div>
            <div className="text-sm font-semibold text-gray-900">{qty}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Area</div>
            <div className="text-sm font-semibold text-gray-900">{area}</div>
          </div>
        </div>

        {!online ? (
          <div className="mt-3 rounded-md bg-red-50 p-2 text-xs text-red-700">
            You’re offline. Connect to the internet to accept/reject.
          </div>
        ) : null}

        {busy ? (
          <div className="mt-3 rounded-md bg-amber-50 p-2 text-xs text-amber-700">
            You already have an active pickup. Accept is disabled.
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            variant="destructive"
            disabled={pending || !online}
            onClick={onReject}
          >
            {pending ? "Sending…" : "Reject"}
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={pending || !online || busy}
            onClick={onAccept}
          >
            {pending ? "Sending…" : "Accept"}
          </Button>
        </div>

        <Button
          variant="ghost"
          className="mt-2"
          disabled={pending}
          onClick={onClose}
        >
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
