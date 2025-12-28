import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Save, X, IndianRupee } from "lucide-react";
import { getApiBaseUrl } from "../../utils/apiBaseUrl";


export function FeriwalaManager() {
  const API_URL = getApiBaseUrl();
  const [isAdding, setIsAdding] = useState(false);

  const [vendors, setVendors] = useState([]);
  const [scrapTypes, setScrapTypes] = useState([]);

  // PURCHASE FORM
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    vendor_id: "",
    scraps: [{ material: "", rate: "", weight: "", amount: "" }],
  });

  // WITHDRAWAL FORM
  const [withdrawForm, setWithdrawForm] = useState({
    date: new Date().toISOString().split("T")[0],
    vendor_id: "",
    amount: "",
    note: "",
  });

  const company_id = "2f762c5e-5274-4a65-aa66-15a7642a1608";
  const godown_id = "fbf61954-4d32-4cb4-92ea-d0fe3be01311";
  const account_id = "11a59a0a-bd93-41f3-bb45-ce0470a280c1";

  useEffect(() => {
    loadVendors();
    loadMaterials();
  }, []);

  /* ================================
    LOAD DATA
  ================================ */

  const loadVendors = async () => {
    try {
      const res = await fetch(`${API_URL}/api/rates/vendors-with-rates`);
      const data = await res.json();
      if (data.success)
        setVendors(data.vendors.filter((v) => v.type === "feriwala"));
    } catch (err) {
      toast.error("Failed to load vendors");
    }
  };

  const loadMaterials = async () => {
    try {
      const res = await fetch(`${API_URL}/api/rates/global`);
      const data = await res.json();
      if (data.success) setScrapTypes(data.materials);
    } catch (err) {
      toast.error("Failed to load scrap types");
    }
  };

  /* ================================
    PURCHASE FORM HANDLERS
  ================================ */

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      vendor_id: "",
      scraps: [{ material: "", rate: "", weight: "", amount: "" }],
    });
    setIsAdding(false);
  };

  const handleScrapChange = (index, key, value) => {
    const updated = [...formData.scraps];
    updated[index][key] = value;

    if (key === "material") {
      const vendor = vendors.find((v) => v.vendor_id === formData.vendor_id);
      if (vendor) {
        const rateEntry = vendor.rates.find((r) => r.scrap_type_id === value);
        updated[index].rate = rateEntry ? rateEntry.vendor_rate : 0;
      }
    }

    if (key === "weight" || key === "rate") {
      const weight = parseFloat(updated[index].weight || 0);
      const rate = parseFloat(updated[index].rate || 0);
      updated[index].amount = weight * rate;
    }

    setFormData({ ...formData, scraps: updated });
  };

  const addScrapRow = () => {
    setFormData({
      ...formData,
      scraps: [...formData.scraps, { material: "", rate: "", weight: "", amount: "" }],
    });
  };

  const removeScrap = (i) => {
    const updated = formData.scraps.filter((_, idx) => idx !== i);
    setFormData({ ...formData, scraps: updated });
  };

  /* ================================
    SUBMIT PURCHASE
  ================================ */

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API_URL}/api/feriwala/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id,
          godown_id,
          vendor_id: formData.vendor_id,
          scraps: formData.scraps.map((s) => ({
            scrap_type_id: s.material,
            weight: Number(s.weight),
          })),
          account_id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Feriwala purchase added!");
        resetForm();
      } else toast.error(data.error);
    } catch (err) {
      toast.error("Server error");
    }
  };

  /* ================================
    WITHDRAWAL FORM HANDLERS
  ================================ */

  const handleWithdrawChange = (key, value) => {
    setWithdrawForm({ ...withdrawForm, [key]: value });
  };

  const submitWithdrawal = async (e) => {
    e.preventDefault();

    if (!withdrawForm.vendor_id || !withdrawForm.amount) {
      toast.error("Select vendor & enter amount");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/feriwala/withdrawal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id,
          godown_id,
          vendor_id: withdrawForm.vendor_id,
          amount: Number(withdrawForm.amount),
          date: withdrawForm.date,
          note: withdrawForm.note,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Withdrawal recorded!");
        setWithdrawForm({
          date: new Date().toISOString().split("T")[0],
          vendor_id: "",
          amount: "",
          note: "",
        });
      } else toast.error(data.error);
    } catch (err) {
      toast.error("Server error");
    }
  };

  /* ================================
      RETURN UI
  ================================ */

  return (
    <div className="space-y-6">

     
      {/* PURCHASE FORM */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Add Feriwala Purchase</CardTitle>
            {!isAdding && (
              <Button size="sm" onClick={() => setIsAdding(true)}>
                <Plus className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6">
          {isAdding && (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* SELECT FERIWALA */}
              <div>
                <Label>Select Feriwala</Label>
                <select
                  className="border p-2 rounded w-full"
                  value={formData.vendor_id}
                  required
                  onChange={(e) =>
                    setFormData({ ...formData, vendor_id: e.target.value })
                  }
                >
                  <option value="">-- Select Feriwala --</option>
                  {vendors.map((v) => (
                    <option key={v.vendor_id} value={v.vendor_id}>
                      {v.vendor_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* SCRAPS */}
              <Label>Scrap Items</Label>
              {formData.scraps.map((row, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 items-center">
                  <select
                    className="border p-2 rounded"
                    value={row.material}
                    required
                    onChange={(e) =>
                      handleScrapChange(i, "material", e.target.value)
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
                      handleScrapChange(i, "weight", e.target.value)
                    }
                  />

                  <Input type="number" value={row.rate} readOnly />

                  <Input type="number" value={row.amount} readOnly />

                  {formData.scraps.length > 1 && (
                    <Button type="button" onClick={() => removeScrap(i)}>
                      <Trash2 />
                    </Button>
                  )}
                </div>
              ))}

              <Button type="button" variant="outline" onClick={addScrapRow}>
                <Plus /> Add More
              </Button>

              <div className="flex gap-2 mt-4">
                <Button type="submit">
                  <Save /> Save Purchase
                </Button>
                <Button variant="outline" type="button" onClick={resetForm}>
                  <X /> Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
       {/* WITHDRAWAL FORM */}
      <Card>
        <CardHeader>
          <CardTitle>Record Withdrawal</CardTitle>
          <CardDescription>Feriwala takes money from godown</CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={submitWithdrawal}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                className="border p-2 rounded"
                value={withdrawForm.vendor_id}
                required
                onChange={(e) => handleWithdrawChange("vendor_id", e.target.value)}
              >
                <option value="">-- Select Feriwala --</option>
                {vendors.map((v) => (
                  <option key={v.vendor_id} value={v.vendor_id}>
                    {v.vendor_name}
                  </option>
                ))}
              </select>

              <Input
                type="date"
                value={withdrawForm.date}
                onChange={(e) => handleWithdrawChange("date", e.target.value)}
              />

              <Input
                type="number"
                placeholder="Amount"
                value={withdrawForm.amount}
                onChange={(e) => handleWithdrawChange("amount", e.target.value)}
              />

              <Input
                placeholder="Note (optional)"
                value={withdrawForm.note}
                onChange={(e) => handleWithdrawChange("note", e.target.value)}
              />
            </div>

            <Button type="submit" className="mt-2">
              <IndianRupee /> &nbsp; Record Withdrawal
            </Button>
          </form>
        </CardContent>
      </Card>

    </div>
  );
}
