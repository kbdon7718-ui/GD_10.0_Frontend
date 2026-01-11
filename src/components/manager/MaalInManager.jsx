import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";
import { getApiBaseUrl } from "../../utils/apiBaseUrl";
import { useSubmitOnce } from "../../utils/useSubmitOnce";

const COMPANY_ID = "2f762c5e-5274-4a65-aa66-15a7642a1608";
const GODOWN_ID = "fbf61954-4d32-4cb4-92ea-d0fe3be01311";

export default function MaalInManager() {
  const API_URL = getApiBaseUrl();
  const today = new Date().toISOString().split("T")[0];

  /* =========================
        STATE
  ========================= */

  const [scrapTypes, setScrapTypes] = useState([]);

  const [form, setForm] = useState({
    date: today,
    notes: "",
    scraps: [{ scrap_type_id: "", weight: "", rate: 0, amount: 0 }],
  });

  /* =========================
        LOAD MASTERS
  ========================= */

  useEffect(() => {
    loadScrapTypes();
  }, []);

  const loadScrapTypes = async () => {
    try {
      const res = await fetch(`${API_URL}/api/rates/global`);
      const data = await res.json();
      if (data.success) setScrapTypes(data.materials || []);
    } catch {
      toast.error("Failed to load scrap types");
    }
  };

  /* =========================
        HANDLERS
  ========================= */

  // Manager Maal In is LOCAL only — rates entered manually.

  const onScrapChange = (idx, key, value) => {
    setForm((prev) => {
      const rows = [...prev.scraps];
      rows[idx] = { ...rows[idx], [key]: value };

      // Manual rate / weight -> amount calculation (Local purchase)
      const w = Number(rows[idx].weight || 0);
      const r = Number(rows[idx].rate || 0);
      rows[idx].amount = Number((w * r).toFixed(2));

      return { ...prev, scraps: rows };
    });
  };

  const addRow = () => {
    setForm((p) => ({
      ...p,
      scraps: [...p.scraps, { scrap_type_id: "", weight: "", rate: 0, amount: 0 }],
    }));
  };

  const removeRow = (i) => {
    setForm((p) => ({
      ...p,
      scraps: p.scraps.filter((_, idx) => idx !== i),
    }));
  };

  const totalAmount = form.scraps.reduce(
    (s, r) => s + Number(r.amount || 0),
    0
  );

  /* =========================
        SUBMIT
  ========================= */

  const [isSubmitting, wrap] = useSubmitOnce();

  const handleSubmit = wrap(async () => {
    if (form.scraps.some((s) => !s.scrap_type_id || !s.weight || !s.rate)) {
      return toast.error("Fill all scrap rows and rates");
    }

    try {
      // 1) Create Maal In header (source = local)
      const headerRes = await fetch(`${API_URL}/api/maalin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: COMPANY_ID,
          godown_id: GODOWN_ID,
          date: form.date,
          supplier_name: "Local",
          source: "local",
          vehicle_number: null,
          notes: form.notes,
          created_by: "manager",
        }),
      });

      const headerData = await headerRes.json();
      if (!headerData.success) {
        toast.error(headerData.error || "Failed to create maal in header");
        return;
      }

      const maalId = headerData.maal_in.id;

      // 2) Post items
      const items = form.scraps.map((s) => {
        const material = scrapTypes.find((m) => String(m.id) === String(s.scrap_type_id))?.material_type || "";
        return {
          material,
          weight: Number(s.weight),
          rate: Number(s.rate),
          amount: Number(s.amount),
        };
      });

      const itemsRes = await fetch(`${API_URL}/api/maalin/${maalId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const itemsData = await itemsRes.json();
      if (!itemsData.success) {
        toast.error(itemsData.error || "Failed to save items");
        return;
      }

      toast.success("Local Maal In saved");

      // Reset form
      setForm({
        date: today,
        notes: "",
        scraps: [{ scrap_type_id: "", weight: "", rate: 0, amount: 0 }],
      });
    } catch (err) {
      console.error(err);
      toast.error("Server error");
    }
  });

  /* =========================
        UI
  ========================= */

  // Manager Maal In: Local purchases only (Feriwala/Kabadiwala have separate flows)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-lg">Maal In</CardTitle>
          <CardDescription className="text-sm">
            Purchase entry (Local purchases only)
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-4 sm:px-6">
          {/* NOTE: manager UI simplified — only Local purchases allowed here */}

          {/* DATE */}
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) =>
                setForm((p) => ({ ...p, date: e.target.value }))
              }
            />
          </div>

          {/* SCRAPS */}
          <Label>Scrap Items</Label>

          {form.scraps.map((row, i) => (
            <div key={i} className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 items-center p-2 bg-gray-50 rounded-lg sm:bg-transparent sm:p-0">
              <select
                className="border p-2 rounded"
                value={row.scrap_type_id}
                onChange={(e) =>
                  onScrapChange(i, "scrap_type_id", e.target.value)
                }
              >
                <option value="">Material</option>
                {scrapTypes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.material_type}
                  </option>
                ))}
              </select>

              <Input
                type="number"
                placeholder="Weight"
                value={row.weight}
                onChange={(e) =>
                  onScrapChange(i, "weight", e.target.value)
                }
              />

              {/* Manual rate entry for Local/Factory */}
              <Input
                type="number"
                placeholder="Rate"
                value={row.rate}
                onChange={(e) => onScrapChange(i, "rate", e.target.value)}
                readOnly={false}
              />

              <Input type="number" value={row.amount} readOnly />

              {form.scraps.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => removeRow(i)}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addRow}>
            <Plus className="mr-2" /> Add More
          </Button>

          <div className="text-right font-semibold">
            Total ₹{totalAmount.toLocaleString()}
          </div>

          {/* NOTES */}
          <div>
            <Label>Notes</Label>
            <Input
              value={form.notes}
              onChange={(e) =>
                setForm((p) => ({ ...p, notes: e.target.value }))
              }
            />
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={isSubmitting}>
            <Save className="mr-2" /> {isSubmitting ? 'Saving...' : 'Save Maal In'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
