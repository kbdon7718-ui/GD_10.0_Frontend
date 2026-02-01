import React from "react";

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
  online,
  pending,
  onShowOnMap,
  onDirections,
  onMarkOnTheWay,
  onComplete,
}) {
  const title = mode === "assigned" ? "Assigned pickup" : mode === "offer" ? "Pickup offer" : "Pickup details";

  if (!pickup) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed bg-gray-50 p-3 text-sm text-gray-600">
            No active pickup right now.
          </div>
        </CardContent>
      </Card>
    );
  }

  const scrap = extractScrap(pickup);
  const qty = extractQty(pickup);
  const area = (areaLabel || "Nearby area").trim();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">{title}</CardTitle>
          {mode === "assigned" ? (
            <Badge variant={assignedStatus === "completed" ? "default" : "secondary"}>
              {assignedStatus === "assigned" ? "Assigned" : assignedStatus === "on_the_way" ? "On the way" : "Completed"}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
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

        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" disabled={pending} onClick={onShowOnMap}>
            Show on map
          </Button>
          <Button disabled={pending || !online} onClick={onDirections}>
            Directions
          </Button>

          {mode === "assigned" ? (
            <>
              <Button variant="secondary" disabled={pending} onClick={onMarkOnTheWay}>
                Mark on the way
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
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
