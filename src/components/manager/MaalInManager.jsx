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

const COMPANY_ID = "2f762c5e-5274-4a65-aa66-15a7642a1608";
const GODOWN_ID = "fbf61954-4d32-4cb4-92ea-d0fe3be01311";

export default function MaalInManager() {
  const API_URL = getApiBaseUrl();
  const today = new Date().toISOString().split("T")[0];

  /* =========================
        STATE
  ========================= */

  const [vendorType, setVendorType] = useState("");
  const [vendors, setVendors] = useState([]);
  const [scrapTypes, setScrapTypes] = useState([]);

  const [form, setForm] = useState({
    date: today,
    vendor_id: "",
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

  const loadVendorsByType = async (type) => {
    try {
      if (type === "local" || type === "factory") {
        setVendors([]);
        return;
      }

      const res = await fetch(`${API_URL}/api/rates/vendors-with-rates`);
      const data = await res.json();
      if (data.success) {
        setVendors(data.vendors.filter((v) => v.type === type));
      }
    } catch {
      toast.error("Failed to load vendors");
    }
  };

  /* =========================
        HANDLERS
  ========================= */

  const onVendorTypeChange = (type) => {
    setVendorType(type);
    setForm({
      date: today,
      vendor_id: "",
      notes: "",
      scraps: [{ scrap_type_id: "", weight: "", rate: 0, amount: 0 }],
    });
    loadVendorsByType(type);
  };

  const onVendorChange = (vendor_id) => {
    setForm((p) => ({ ...p, vendor_id }));

    const vendor = vendors.find((v) => v.vendor_id === vendor_id);
    if (!vendor) return;

    setForm((p) => ({
      ...p,
      scraps: p.scraps.map((row) => {
        if (!row.scrap_type_id) return row;
        const rateObj = vendor.rates.find(
          (r) => r.scrap_type_id === row.scrap_type_id
        );
        const rate = rateObj ? Number(rateObj.vendor_rate) : 0;
        return {
          ...row,
          rate,
          amount: Number(row.weight || 0) * rate,
        };
      }),
    }));
  };

  const onScrapChange = (idx, key, value) => {
    setForm((prev) => {
      const rows = [...prev.scraps];
      rows[idx] = { ...rows[idx], [key]: value };

      const vendor = vendors.find((v) => v.vendor_id === prev.vendor_id);

      if (key === "scrap_type_id" && vendor) {
        const rateObj = vendor.rates.find(
          (r) => r.scrap_type_id === value
        );
        rows[idx].rate = rateObj ? Number(rateObj.vendor_rate) : 0;
      }

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

  const handleSubmit = async () => {
    if (!vendorType) return toast.error("Select vendor type");

    if (
      (vendorType === "feriwala" || vendorType === "kabadiwala") &&
      !form.vendor_id
    ) {
      return toast.error("Select vendor");
    }

    if (form.scraps.some((s) => !s.scrap_type_id || !s.weight)) {
      return toast.error("Fill all scrap rows");
    }

    const payload = {
      company_id: COMPANY_ID,
      godown_id: GODOWN_ID,
      vendor_type: vendorType,
      vendor_id: form.vendor_id || null,
      date: form.date,
      scraps: form.scraps.map((s) => ({
        scrap_type_id: s.scrap_type_id,
        weight: Number(s.weight),
      })),
      note: form.notes,
    };

    // backend will route (feriwala / kabadiwala / maal_in)
    console.log("MAAL IN PAYLOAD:", payload);

    toast.success("Maal In saved (frontend ready)");
  };

  /* =========================
        UI
  ========================= */

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-lg">Maal In</CardTitle>
          <CardDescription className="text-sm">
            Purchase entry (Feriwala / Kabadiwala / Local / Factory)
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-4 sm:px-6">
          {/* VENDOR TYPE */}
          <div>
            <Label>Vendor Type *</Label>
            <select
              className="border p-2 rounded w-full"
              value={vendorType}
              onChange={(e) => onVendorTypeChange(e.target.value)}
            >
              <option value="">-- select --</option>
              <option value="feriwala">Feriwala</option>
              <option value="kabadiwala">Kabadiwala</option>
              <option value="local">Local</option>
              <option value="factory">Factory</option>
            </select>
          </div>

          {/* VENDOR */}
          {(vendorType === "feriwala" || vendorType === "kabadiwala") && (
            <div>
              <Label>Vendor *</Label>
              <select
                className="border p-2 rounded w-full"
                value={form.vendor_id}
                onChange={(e) => onVendorChange(e.target.value)}
              >
                <option value="">-- select vendor --</option>
                {vendors.map((v) => (
                  <option key={v.vendor_id} value={v.vendor_id}>
                    {v.vendor_name}
                  </option>
                ))}
              </select>
            </div>
          )}

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

              <Input type="number" value={row.rate} readOnly />

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

          <Button onClick={handleSubmit} className="w-full">
            <Save className="mr-2" /> Save Maal In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
