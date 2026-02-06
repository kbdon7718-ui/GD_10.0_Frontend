import React from "react";

import { Card } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Switch } from "../../ui/switch";

function statusCopy({ mode, online }) {
  if (!online) return { title: "Offline", sub: "Connect to the internet to receive offers and take actions." };
  if (mode === "assigned") return { title: "Pickup assigned", sub: "Navigate to the pickup location and complete the job." };
  if (mode === "offer") return { title: "New pickup offer", sub: "Review and accept or reject." };
  return { title: "Looking for nearby pickups", sub: "Keep this screen open to receive offers." };
}

function sseBadge(sseStatus) {
  if (sseStatus === "connected") return { label: "Live", variant: "default" };
  if (sseStatus === "connecting") return { label: "Connecting", variant: "secondary" };
  return { label: "Reconnecting", variant: "secondary" };
}

export default function VendorPickupHeader({
  mode,
  online,
  sseStatus,
  available,
  activeCount,
  onToggleAvailable,
}) {
  const copy = statusCopy({ mode, online });
  const badge = sseBadge(sseStatus);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900 truncate">{copy.title}</h2>
            <Badge variant={badge.variant}>{badge.label}</Badge>
            {Number(activeCount) > 0 ? <Badge variant="secondary">{Number(activeCount)} active</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-gray-600">{copy.sub}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-xs text-gray-500">Availability</div>
            <div className={`text-sm font-semibold ${available ? "text-emerald-700" : "text-red-700"}`}>
              {available ? "Available" : "Not available"}
            </div>
          </div>
          <Switch
            checked={!!available}
            onCheckedChange={(v) => onToggleAvailable?.(!!v)}
            disabled={!online}
            aria-label="Toggle availability"
          />
        </div>
      </div>
    </Card>
  );
}
