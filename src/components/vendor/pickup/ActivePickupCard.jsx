import React from "react";
import { CheckCircle2, Navigation, Package, Timer } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";

function extractScrap(offer) {
  if (!offer) return "Unknown";
  const multi = offer.scrap_types || offer.scrapTypes || offer.scraps;
  if (Array.isArray(multi) && multi.length) return multi.map((s) => String(s)).join(", ");
  return String(offer.scrap_type || offer.scrapType || "Unknown");
}

function extractQty(offer) {
  if (!offer) return "N/A";
  const v = offer.estimated_quantity ?? offer.estimated_qty ?? offer.estimated_weight ?? offer.estimatedWeight;
  return v == null || v === "" ? "N/A" : String(v);
}

export default function ActivePickupCard({
  mode,
  pickup,
  areaLabel,
  assignedStatus,
  sseStatus,
  online,
  pending,
  onShowOnMap,
  onDirections,
  onMarkOnTheWay,
  onComplete,
}) {
  const title = mode === "assigned" ? "Assigned pickup" : mode === "offer" ? "Pickup offer" : "Pickup details";

  if (!pickup) {
    const isWaiting = mode === "idle";
    const showShimmer = isWaiting && (sseStatus === "connecting" || sseStatus === "reconnecting");
    return (
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">{isWaiting ? "Waiting for pickup request" : title}</CardTitle>
            {isWaiting ? (
              <Badge variant="secondary" className="text-[11px]">
                <span className="scrapco-ellipsis">Live</span>
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border bg-white p-3 shadow-sm">
            <div className="text-sm font-semibold text-gray-900">
              {isWaiting ? "Waiting for pickup request" : "No active pickup"}
            </div>
            <div className="mt-1 text-xs text-gray-600">
              {isWaiting
                ? "Keep this screen open. We'll alert you as soon as a request arrives."
                : "You'll see pickup details here when assigned."}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className={`h-11 rounded-lg ${showShimmer ? "scrapco-shimmer" : "bg-gray-100"}`} />
              <div className={`h-11 rounded-lg ${showShimmer ? "scrapco-shimmer" : "bg-gray-100"}`} />
              <div className={`h-11 rounded-lg ${showShimmer ? "scrapco-shimmer" : "bg-gray-100"}`} />
            </div>

            <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-500">
              <Timer className="h-3.5 w-3.5" />
              <span className="scrapco-ellipsis">Listening for offers</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const scrap = extractScrap(pickup);
  const qty = extractQty(pickup);
  const area = (areaLabel || "Nearby area").trim();

  const statusMeta = (() => {
    const s = assignedStatus || "assigned";
    if (s === "completed") return { label: "Completed", variant: "default", icon: <CheckCircle2 className="h-3.5 w-3.5" /> };
    if (s === "on_the_way") return { label: "On the way", variant: "secondary", icon: <Navigation className="h-3.5 w-3.5" /> };
    return { label: "Assigned", variant: "secondary", icon: <Package className="h-3.5 w-3.5" /> };
  })();

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">{title}</CardTitle>
          {mode === "assigned" ? (
            <Badge variant={statusMeta.variant} className="gap-1">
              {statusMeta.icon}
              {statusMeta.label}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <div className="text-xs text-gray-500">Scrap</div>
              <div className="text-sm font-semibold text-gray-900 truncate">{scrap}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-gray-500">Estimated quantity</div>
                <div className="text-sm font-semibold text-gray-900">{qty}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Area</div>
                <div className="text-sm font-semibold text-gray-900 truncate">{area}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" className="h-11 rounded-xl active:scale-[0.98] transition-transform" disabled={pending} onClick={onShowOnMap}>
            Show on map
          </Button>
          <Button className="h-11 rounded-xl active:scale-[0.98] transition-transform" disabled={pending || !online} onClick={onDirections}>
            Directions
          </Button>

          {mode === "assigned" ? (
            <>
              <Button variant="secondary" className="h-11 rounded-xl active:scale-[0.98] transition-transform" disabled={pending} onClick={onMarkOnTheWay}>
                Mark on the way
              </Button>
              <Button
                className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-transform"
                disabled={pending || !online}
                onClick={onComplete}
              >
                Mark pickup completed
              </Button>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
