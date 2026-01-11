// UPDATED FULL WORKING FILE: KabadiwalaManager.jsx

/* eslint-disable no-unused-vars */

import React, { useEffect, useState } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Save, X, IndianRupee } from "lucide-react";
import { formatDate } from "../../utils/dateFormat";
import { getApiBaseUrl } from "../../utils/apiBaseUrl";
import { usePageRefresh } from "../../utils/pageRefreshContext";
const COMPANY_ID = "2f762c5e-5274-4a65-aa66-15a7642a1608";
const GODOWN_ID = "fbf61954-4d32-4cb4-92ea-d0fe3be01311";

export function KabadiwalaManager() {
  const API_URL = getApiBaseUrl();
  const [vendors, setVendors] = useState([]);
  const [scrapTypes, setScrapTypes] = useState([]);
  const [records, setRecords] = useState([]);
  const [activeForm, setActiveForm] = useState("purchase");
  const { setRefreshHandler } = usePageRefresh();

  // NEW: daily balance info
  const [balanceInfo, setBalanceInfo] = useState({
    previous_balance: 0,
    today_purchase: 0,
    today_paid: 0,
    current_balance: 0
  });

  // NEW: payment form
  const [payForm, setPayForm] = useState({
    vendor_id: "",
    amount: "",
    mode: "cash",
    note: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    vendor_id: "",
    vehicle_number: "",
    scraps: [{ scrap_type_id: "", weight: "", rate: 0, amount: 0, isNew: false, material: "" }],
  });

  useEffect(() => {
    loadVendors();
    loadScrapTypes();
    fetchList();
  }, []);

  useEffect(() => {
    setRefreshHandler(() => {
      loadVendors();
      loadScrapTypes();
      fetchList();
      if (form.vendor_id) fetchBalanceForVendor(form.vendor_id, form.date);
    });

    return () => setRefreshHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.vendor_id, form.date]);

  // Fetch vendors
  const loadVendors = async () => {
    try {
      const res = await fetch(`${API_URL}/api/rates/vendors-with-rates`);
      const data = await res.json();
      if (data.success) {
        const filtered = data.vendors.filter(v => v.type === "kabadiwala");
        setVendors(filtered);
      }
    } catch (err) {
      toast.error("Failed to load vendors");
    }
  };

  const loadScrapTypes = async () => {
    try {
      const res = await fetch(`${API_URL}/api/rates/global`);
      const data = await res.json();
      if (data.success) setScrapTypes(data.materials || []);
    } catch (err) {
      toast.error("Failed to load materials");
    }
  };

  const fetchList = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/kabadiwala/list?company_id=${COMPANY_ID}&godown_id=${GODOWN_ID}`
      );
      const data = await res.json();
      if (data.success) setRecords(data.kabadiwala || []);
    } catch {
      toast.error("Failed to load kabadiwala records");
    }
  };

  // NEW: Fetch DAILY BALANCE for selected vendor
  const fetchBalanceForVendor = async (vendor_id, date) => {
    try {
      const res = await fetch(
        `${API_URL}/api/kabadiwala/balances?company_id=${COMPANY_ID}&godown_id=${GODOWN_ID}&date=${date}`
      );
      const data = await res.json();

      if (!data.success) return;

      const row = data.balances.find(b => b.vendor_id === vendor_id);
      if (row) {
        setBalanceInfo({
          previous_balance: row.previous_balance,
          today_purchase: row.today_purchase,
          today_paid: row.today_paid,
          current_balance: row.balance,
        });
      } else {
        setBalanceInfo({
          previous_balance: 0,
          today_purchase: 0,
          today_paid: 0,
          current_balance: 0,
        });
      }

    } catch {
      toast.error("Balance fetch failed");
    }
  };

  // Vendor Change
  const onVendorChange = (vendor_id) => {
    setForm(prev => ({ ...prev, vendor_id }));

    // also update payment vendor
    setPayForm(prev => ({ ...prev, vendor_id }));

    const vendor = vendors.find(v => v.vendor_id === vendor_id);
    if (!vendor) return;

    setForm(prev => ({
      ...prev,
      scraps: prev.scraps.map(row => {
        if (!row.scrap_type_id) return row;
        const r = vendor.rates.find(rr => rr.scrap_type_id === row.scrap_type_id);
        const rate = r ? Number(r.vendor_rate) : 0;
        const amount = Number(row.weight || 0) * rate;
        return { ...row, rate, amount };
      })
    }));

    // new: update balances
    fetchBalanceForVendor(vendor_id, form.date);
  };

  const addScrapRow = () => {
    setForm(prev => ({
      ...prev,
      scraps: [...prev.scraps, { scrap_type_id: "", weight: "", rate: 0, amount: 0, isNew: false, material: "" }]
    }));
  };

  const removeScrapRow = (idx) => {
    setForm(prev => ({
      ...prev,
      scraps: prev.scraps.filter((_, i) => i !== idx)
    }));
  };

  const onScrapChange = (idx, key, val) => {
    setForm(prev => {
      const rows = [...prev.scraps];
      // update key
      if (key === "scrap_type_id") {
        // selecting an existing scrap type or switching to 'new'
        if (val === "__new__") {
          rows[idx] = { ...rows[idx], scrap_type_id: "", isNew: true, material: "", rate: "" };
        } else {
          rows[idx] = { ...rows[idx], scrap_type_id: val, isNew: false, material: "" };
        }
      } else {
        rows[idx] = { ...rows[idx], [key]: val };
      }

      const vendor = vendors.find(v => v.vendor_id === prev.vendor_id);

      // Only auto-fill rate when material selection changes.
      // If user edits rate manually, don't overwrite it.
      if (key === "scrap_type_id" && !rows[idx].isNew && rows[idx].scrap_type_id && vendor) {
        const rateEntry = vendor.rates.find(r => r.scrap_type_id === rows[idx].scrap_type_id);
        rows[idx].rate = rateEntry ? Number(rateEntry.vendor_rate) : rows[idx].rate || 0;
      }

      // recalc amount
      const w = Number(rows[idx].weight || 0);
      const r = Number(rows[idx].rate || 0);
      rows[idx].amount = Number((w * r).toFixed(2));

      return { ...prev, scraps: rows };
    });
  };

  const totalAmountForm = form.scraps.reduce(
    (s, it) => s + Number(it.amount || 0),
    0
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Submit Purchase
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!form.vendor_id) {
      toast.error("Select kabadiwala vendor");
      setIsSubmitting(false);
      return;
    }
    if (
      form.scraps.some((s) =>
        !s.weight ||
        (!s.isNew && !s.scrap_type_id) ||
        (s.isNew && (!String(s.material || "").trim() || String(s.rate || "").trim() === ""))
      )
    ) {
      toast.error("Fill all scrap rows");
      setIsSubmitting(false);
      return;
    }

    try {
      const body = {
        company_id: COMPANY_ID,
        godown_id: GODOWN_ID,
        vendor_id: form.vendor_id,
        scraps: form.scraps.map((s) => ({
          scrap_type_id: s.scrap_type_id || undefined,
          material: s.isNew ? s.material : undefined,
          weight: Number(s.weight),
          rate: s.rate !== undefined && s.rate !== null && s.rate !== '' ? Number(s.rate) : undefined,
        })),
        date: form.date,
      };

      const res = await fetch(`${API_URL}/api/kabadiwala/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Saved");
        fetchList();
        fetchBalanceForVendor(form.vendor_id, form.date);

        setForm({
          date: new Date().toISOString().split("T")[0],
          vendor_id: "",
          vehicle_number: "",
          scraps: [{ scrap_type_id: "", weight: "", rate: 0, amount: 0, isNew: false, material: "" }],
        });
      } else toast.error(data.error);
    } catch (err) {
      toast.error("Server error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit PAYMENT to kabadiwala
  const submitPayment = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!payForm.vendor_id || !payForm.amount) return toast.error("Vendor & amount required");
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/kabadiwala/withdrawal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: COMPANY_ID,
          godown_id: GODOWN_ID,
          vendor_id: payForm.vendor_id,
          amount: Number(payForm.amount),
          mode: payForm.mode,
          note: payForm.note,
          date: payForm.date,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Payment recorded");
        fetchList();
        fetchBalanceForVendor(payForm.vendor_id, payForm.date);

        const vendor = vendors.find((v) => v.vendor_id === payForm.vendor_id);
        try {
          await fetch(`${API_URL}/api/expenses`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              company_id: COMPANY_ID,
              godown_id: GODOWN_ID,
              date: payForm.date,
              category: "Kabadiwala",
              description: payForm.note || "",
              amount: Number(payForm.amount),
              payment_mode: payForm.mode === "bank" ? "Bank" : "Cash",
              paid_to: vendor?.vendor_name || "",
              labour_id: null,
              vendor_id: payForm.vendor_id,
              vendor_type: "kabadiwala",
            }),
          });
        } catch {
          toast.error("Payment saved, but expense entry failed");
        }

        setPayForm({
          vendor_id: "",
          amount: "",
          mode: "cash",
          note: "",
          date: new Date().toISOString().split("T")[0],
        });
        setActiveForm("purchase");
      } else toast.error(data.error || "Payment failed");
    } catch (err) {
      toast.error("Server error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* BALANCE CARD 
      <Card>
        <CardHeader>
          <CardTitle>Kabadiwala Daily Balance</CardTitle>
          <CardDescription>
            Same logic as feriwala → previous + purchase - paid = current
          </CardDescription>
        </CardHeader>

        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Select Vendor</Label>
            <select
              className="border p-2 rounded w-full"
              value={form.vendor_id}
              onChange={(e) => onVendorChange(e.target.value)}
            >
              <option value="">--select--</option>
              {vendors.map(v => (
                <option key={v.vendor_id} value={v.vendor_id}>
                  {v.vendor_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => {
                setForm(prev => ({ ...prev, date: e.target.value }));
                if (form.vendor_id) {
                  fetchBalanceForVendor(form.vendor_id, e.target.value);
                }
              }}
            />
          </div>

          <div>
            <Label>Previous Balance</Label>
            <div className="font-semibold p-2">
              ₹{Number(balanceInfo.previous_balance).toLocaleString()}
            </div>
          </div>

          <div>
            <Label>Current Balance</Label>
            <div className={`font-semibold p-2 ${balanceInfo.current_balance >= 0 ? "text-green-600" : "text-red-600"}`}>
              ₹{Number(balanceInfo.current_balance).toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>
*/}
   {activeForm === "purchase" ? (
<Card>
  <CardHeader className="px-4 sm:px-6">
    <div className="flex justify-between items-center">
      <CardTitle className="text-lg">Add Purchase</CardTitle>
      <Button size="sm" variant="outline" onClick={() => setActiveForm("withdrawal")}>
        <IndianRupee className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">Record Withdrawal</span>
      </Button>
    </div>
  </CardHeader>

  <CardContent className="px-4 sm:px-6">
      <form className="space-y-4" onSubmit={handleSubmit}>

        {/* SELECT KABADIWALA */}
        <div>
          <Label>Select Kabadiwala</Label>
          <select
            className="border p-2 rounded w-full"
            value={form.vendor_id}
            required
            onChange={(e) => onVendorChange(e.target.value)}
          >
            <option value="">-- Select Vendor --</option>
            {vendors.map((v) => (
              <option key={v.vendor_id} value={v.vendor_id}>
                {v.vendor_name}
              </option>
            ))}
          </select>
        </div>

        {/* DATE */}
        <div>
          <Label>Date</Label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, date: e.target.value }))
            }
            required
          />
        </div>

        {/* SCRAP ROWS */}
        <Label>Scrap Items</Label>

        {form.scraps.map((row, i) => (
          <div key={i} className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 items-center p-2 bg-gray-50 rounded-lg sm:bg-transparent sm:p-0">

            {/* Material */}
            <div className="space-y-1">
              <select
                className="border p-2 rounded w-full"
                value={row.isNew ? "__new__" : row.scrap_type_id}
                required
                onChange={(e) => onScrapChange(i, "scrap_type_id", e.target.value)}
              >
                <option value="">Material</option>
                {scrapTypes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.material_type}
                  </option>
                ))}
                <option value="__new__">+ Add new item</option>
              </select>

              {row.isNew && (
                <Input
                  type="text"
                  placeholder="New item name"
                  value={row.material}
                  onChange={(e) => onScrapChange(i, "material", e.target.value)}
                />
              )}
            </div>

            {/* Weight */}
            <Input
              type="number"
              placeholder="Weight"
              value={row.weight}
              onChange={(e) => onScrapChange(i, "weight", e.target.value)}
            />

            {/* Rate (editable) */}
            <Input type="number" placeholder="Rate" value={row.rate} onChange={(e) => onScrapChange(i, "rate", e.target.value)} />

            {/* Amount */}
            <Input type="number" value={row.amount} readOnly />

            {/* Remove Row */}
            {form.scraps.length > 1 && (
              <Button type="button" variant="outline" onClick={() => removeScrapRow(i)}>
                <Trash2 />
              </Button>
            )}
          </div>
        ))}

        {/* Add Row Button */}
        <Button type="button" variant="outline" onClick={addScrapRow}>
          <Plus className="mr-2" /> Add More
        </Button>

        {/* Save / Cancel */}
        <div className="flex gap-3 mt-4">
          <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-2" /> {isSubmitting ? 'Saving...' : 'Save Purchase'}
            </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setForm({
                date: new Date().toISOString().split("T")[0],
                vendor_id: "",
                vehicle_number: "",
                scraps: [{ scrap_type_id: "", weight: "", rate: 0, amount: 0, isNew: false, material: "" }],
              });
            }}
          >
            <X className="mr-2" /> Cancel
          </Button>
        </div>
      </form>
  </CardContent>
</Card>
   ) : (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Record Withdrawal</CardTitle>
              <CardDescription>Money paid to Kabadiwala</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setActiveForm("purchase")}>
              <X className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={submitPayment} className="grid grid-cols-1 md:grid-cols-5 gap-3">

            <div>
              <Label></Label>
              <select
                className="border p-2 rounded w-full"
                value={payForm.vendor_id}
                onChange={(e) => setPayForm(prev => ({ ...prev, vendor_id: e.target.value }))}
              >
                <option value="">-- Select Kabadiwala--</option>
                {vendors.map(v => (
                  <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label></Label>
              <Input
                type="date"
                value={payForm.date}
                onChange={(e) => setPayForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <div>
              <Label></Label>
              <Input
                type="number"
                 placeholder="Amount"
                value={payForm.amount}
                onChange={(e) => setPayForm(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <div>
              <Label></Label>
              <select
                className="border p-2 rounded w-full"
                value={payForm.mode}
                onChange={(e) => setPayForm(prev => ({ ...prev, mode: e.target.value }))}
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
              </select>
            </div>

          
            <div>
              <Label></Label>
              <Input
               placeholder="Note"
                value={payForm.note}

                onChange={(e) => setPayForm(prev => ({ ...prev, note: e.target.value }))}
              />
            </div>

            <div className="col-span-5 flex gap-2 mt-3">
              <Button type="submit" disabled={isSubmitting}>
                <IndianRupee className="mr-2" /> {isSubmitting ? 'Saving...' : 'Record Withdrawal'}
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                setPayForm({
                  vendor_id: "",
                  amount: "",
                  mode: "cash",
                  note: "",
                  date: new Date().toISOString().split("T")[0],
                });
                setActiveForm("purchase");
              }}>
                <X className="mr-2" /> Back
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>

   )}

      {/* (Existing summary + form + table remain unchanged below) */}
      {/* -- YOUR EXISTING PURCHASE FORM CODE GOES HERE (not repeated) -- */}
      
    </div>
  );
}

export default KabadiwalaManager;
