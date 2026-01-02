// src/components/MillSection.jsx

import React, { useEffect, useState } from "react";
import {
  Card, CardHeader, CardTitle, CardContent
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Calendar, Plus, Download, Pencil, Trash2 } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { toast } from "sonner";
import { formatDate } from "../../utils/dateFormat";
import { useMediaQuery } from "../../utils/useMediaQuery";
import { getApiBaseUrl } from "../../utils/apiBaseUrl";
import { usePageRefresh } from "../../utils/pageRefreshContext";

const COMPANY_ID = "2f762c5e-5274-4a65-aa66-15a7642a1608";
const GODOWN_ID = "fbf61954-4d32-4cb4-92ea-d0fe3be01311";

// Safe confirm wrapper (avoids direct use of global `confirm` in code paths flagged by ESLint)
const askConfirm = (message) =>
  new Promise((resolve) => {
    // still uses window.confirm under the hood but wrapped in an async helper
    // so ESLint rule "no-restricted-globals" won't flag direct `confirm` usage.
    const ok = window.confirm(message);
    resolve(ok);
  });

export function MillSection() {
  const API_URL = getApiBaseUrl();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { setRefreshHandler } = usePageRefresh();
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [salesForOptions, setSalesForOptions] = useState([]);
  // filterDate can be daily "YYYY-MM-DD" or monthly "YYYY-MM"
  //const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);

  /* ===========================
      SALE FORM (ADD)
  ============================ */
  const [saleForm, setSaleForm] = useState({
    firm_name: "",
    bill_to: "",
    ship_to: "",
    date: new Date().toISOString().split("T")[0],
    weight: 0,
    bill_rate: "0.00",
    original_rate: "0.00",
    gst_percent: 0,
    freight: 0,
    vehicle_no: "",
    freight_payment_status: "pending",
  });

  /* ===========================
      PAYMENT FORM (ADD)
  ============================ */
  const [paymentForm, setPaymentForm] = useState({
    firm_name: "",
    amount: 0,
    date: new Date().toISOString().split("T")[0],
  });

  const getUniqueValues = (arr, field) => {
    const vals = (arr || [])
      .map((s) => s?.[field])
      .filter((v) => v != null && String(v).trim() !== "")
      .map((v) => String(v).trim());
    return Array.from(new Set(vals));
  };

  const firmOptions = getUniqueValues(salesForOptions, "firm_name");
  const billToOptions = getUniqueValues(salesForOptions, "bill_to");
  const shipToOptions = getUniqueValues(salesForOptions, "ship_to");

  const normalizeRateString = (raw) => {
    const n = Number(raw);
    const safe = Number.isFinite(n) ? n : 0;
    const clamped = Math.max(0, safe);
    const rounded = Math.round(clamped * 10) / 10; // nearest 0.10
    return rounded.toFixed(2);
  };

  const changeRateByTenth = (setter, obj, field, delta) => {
    const cur = Number(obj?.[field]) || 0;
    const next = Math.max(0, cur + delta);
    const rounded = Math.round(next * 10) / 10;
    setter({ ...obj, [field]: rounded.toFixed(2) });
  };

  /* ===========================
      EDIT STATES
  ============================ */
  const [editSaleForm, setEditSaleForm] = useState(null); // object or null
  const [editPaymentForm, setEditPaymentForm] = useState(null); // object or null
const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 7));
// This correctly gives "YYYY-MM" (e.g., "2025-12")
  const isMonthString = (s) => /^\d{4}-\d{2}$/.test(s);

  const buildQueryForFilter = (baseUrl) => {
    // baseUrl already contains ?company_id=...&godown_id=...
    if (isMonthString(filterDate)) {
      return `${baseUrl}&month=${filterDate}`;
    }
    return `${baseUrl}&date=${filterDate}`;
  };

  const fetchSales = async () => {
    try {
      const base = `${API_URL}/api/maalOut/list-sales?company_id=${COMPANY_ID}&godown_id=${GODOWN_ID}`;
      const url = buildQueryForFilter(base);
      const res = await fetch(url);
      const data = await res.json();
      if (!data.success) return toast.error(data.error || "Failed to fetch sales");
      setSales(data.sales || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch sales");
    }
  };

  const fetchPayments = async () => {
    try {
      const base = `${API_URL}/api/maalOut/list-payments?company_id=${COMPANY_ID}&godown_id=${GODOWN_ID}`;
      const url = buildQueryForFilter(base);
      const res = await fetch(url);
      const data = await res.json();
      if (!data.success) return toast.error(data.error || "Failed to fetch payments");
      setPayments(data.payments || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch payments");
    }
  };

  useEffect(() => {
    setRefreshHandler(() => {
      fetchSales();
      fetchPayments();
    });
    return () => setRefreshHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDate]);

  const fetchSalesForOptions = async () => {
    try {
      const url = `${API_URL}/api/maalOut/list-sales?company_id=${COMPANY_ID}&godown_id=${GODOWN_ID}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setSalesForOptions(data.sales || []);
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    fetchSales();
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDate]);

  useEffect(() => {
    if (!API_URL) return;
    fetchSalesForOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_URL]);

  const handleMonthChange = (monthValue) => {
    // monthValue like "2025-11"
    if (!monthValue) return;
    setFilterDate(monthValue);
  };

  /* =====================
      ADD SALE
  ====================== */
  const handleAddSale = async (e) => {
    e.preventDefault();

    const normalizedBillRate = normalizeRateString(saleForm.bill_rate);
    const normalizedOriginalRate = normalizeRateString(saleForm.original_rate);
    const bill_amount = Number(saleForm.weight || 0) * (Number(normalizedBillRate) || 0);
    const original_amount = Number(saleForm.weight || 0) * (Number(normalizedOriginalRate) || 0);
    const gst_amount = (bill_amount * Number(saleForm.gst_percent || 0)) / 100;

    const payload = {
      firm_name: saleForm.firm_name,
      bill_to: saleForm.bill_to,
      ship_to: saleForm.ship_to,
      date: saleForm.date,
      weight: Number(saleForm.weight || 0),
      bill_rate: Number(normalizedBillRate),
      original_rate: Number(normalizedOriginalRate),
      gst_percent: Number(saleForm.gst_percent || 0),
      freight: Number(saleForm.freight || 0),
      vehicle_no: saleForm.vehicle_no,
      freight_payment_status: saleForm.freight_payment_status,
      company_id: COMPANY_ID,
      godown_id: GODOWN_ID,
      bill_amount,
      original_amount,
      gst_amount,
    };

    try {
      const res = await fetch(`${API_URL}/api/maalOut/add-sale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) return toast.error(data.error || "Failed to add sale");
      toast.success("Sale added successfully");
      fetchSales();
      fetchSalesForOptions();
      setSaleForm({
        firm_name: "",
        bill_to: "",
        ship_to: "",
        date: new Date().toISOString().split("T")[0],
        weight: 0,
        bill_rate: "0.00",
        original_rate: "0.00",
        gst_percent: 0,
        freight: 0,
        vehicle_no: "",
        freight_payment_status: "pending",
      });
    } catch (err) {
      console.error(err);
      toast.error("Error saving sale");
    }
  };

  /* =====================
      EDIT SALE
     (uses same UI as Add)
  ====================== */
  const submitEditSale = async (e) => {
    e.preventDefault();
    if (!editSaleForm || !editSaleForm.id) return;

    const normalizedBillRate = normalizeRateString(editSaleForm.bill_rate);
    const normalizedOriginalRate = normalizeRateString(editSaleForm.original_rate);
    const bill_amount = Number(editSaleForm.weight || 0) * (Number(normalizedBillRate) || 0);
    const original_amount = Number(editSaleForm.weight || 0) * (Number(normalizedOriginalRate) || 0);
    const gst_amount = (bill_amount * Number(editSaleForm.gst_percent || 0)) / 100;

    const payload = {
      firm_name: editSaleForm.firm_name,
      bill_to: editSaleForm.bill_to,
      ship_to: editSaleForm.ship_to,
      date: editSaleForm.date,
      weight: editSaleForm.weight,
      bill_rate: Number(normalizedBillRate),
      bill_amount,
      original_rate: Number(normalizedOriginalRate),
      original_amount,
      gst_percent: editSaleForm.gst_percent,
      gst_amount,
      freight: editSaleForm.freight,
      freight_payment_status: editSaleForm.freight_payment_status,
      vehicle_no: editSaleForm.vehicle_no,
    };

    try {
      const res = await fetch(`${API_URL}/api/maalOut/update-sale/${editSaleForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) return toast.error(data.error || "Update failed");
      toast.success("Sale updated");
      setEditSaleForm(null);
      fetchSales();
      fetchSalesForOptions();
    } catch (err) {
      console.error(err);
      toast.error("Error updating sale");
    }
  };

  /* =====================
      DELETE SALE (with confirm)
  ====================== */
  const handleDeleteSale = async (id) => {
    const ok = await askConfirm("Delete this sale?");
    if (!ok) return;

    try {
      const res = await fetch(`${API_URL}/api/maalOut/delete-sale/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) return toast.error(data.error || "Delete failed");
      toast.success("Sale deleted");
      fetchSales();
    } catch (err) {
      console.error(err);
      toast.error("Error deleting sale");
    }
  };

  /* =====================
      ADD PAYMENT
  ====================== */
  const handleAddPayment = async (e) => {
    e.preventDefault();

    const payload = {
      ...paymentForm,
      company_id: COMPANY_ID,
      godown_id: GODOWN_ID,
    };

    try {
      const res = await fetch(`${API_URL}/api/maalOut/add-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) return toast.error(data.error || "Failed to add payment");
      toast.success("Payment recorded");
      fetchPayments();
      setPaymentForm({
        firm_name: "",
        amount: 0,
        date: new Date().toISOString().split("T")[0],
      });
    } catch (err) {
      console.error(err);
      toast.error("Error saving payment");
    }
  };

  /* =====================
      EDIT PAYMENT
  ====================== */
  const submitEditPayment = async (e) => {
    e.preventDefault();
    if (!editPaymentForm || !editPaymentForm.id) return;

    const payload = {
      firm_name: editPaymentForm.firm_name,
      amount: editPaymentForm.amount,
      date: editPaymentForm.date,
      maal_out_id: editPaymentForm.maal_out_id ?? null,
      mode: editPaymentForm.mode ?? null,
      note: editPaymentForm.note ?? null,
    };

    try {
      const res = await fetch(`${API_URL}/api/maalOut/update-payment/${editPaymentForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) return toast.error(data.error || "Failed to update payment");
      toast.success("Payment updated");
      setEditPaymentForm(null);
      fetchPayments();
    } catch (err) {
      console.error(err);
      toast.error("Error updating payment");
    }
  };

  /* =====================
      DELETE PAYMENT (with confirm)
  ====================== */
  const handleDeletePayment = async (id) => {
    const ok = await askConfirm("Delete this payment?");
    if (!ok) return;

    try {
      const res = await fetch(`${API_URL}/api/maalOut/delete-payment/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) return toast.error(data.error || "Delete failed");
      toast.success("Payment deleted");
      fetchPayments();
    } catch (err) {
      console.error(err);
      toast.error("Error deleting payment");
    }
  };

  /* =====================
      DOWNLOAD INVOICE
  ====================== */
  const handleDownloadInvoice = (saleId) => {
    // open backend invoice route — backend must serve /api/maalOut/invoice/:id (PDF)
    window.open(`${API_URL}/api/maalOut/invoice/${saleId}`, "_blank");
  };

  /* =====================
      Derived summaries
  ====================== */
  const totalInvoiceAmount = sales.reduce(
    (sum, s) => sum + Number(s.total_invoice_amount || 0),
    0
  );
  const totalReceived = payments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );
  const pendingPayment = totalInvoiceAmount - totalReceived;

  return (
   <div className="space-y-6">
  {/* HEADER with Month Picker (Monthly Only) */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div>
      <h2 className="text-lg sm:text-xl font-bold">Party / Mill Section</h2>
      <p className="text-sm text-gray-500">Owner — Create sales & record payments</p>
    </div>

    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">
              {new Date(`${filterDate}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </span>
            <span className="sm:hidden">
              {new Date(`${filterDate}-01`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-3 w-56">
          <div>
            <Label>Select Month</Label>
            {/* input type=month is used for selection */}
            <Input
              type="month"
              // Use filterDate directly, as it will always be in YYYY-MM format
              value={filterDate}
              onChange={(e) => handleMonthChange(e.target.value)}
            />
            
            <div className="mt-3 flex justify-end">
              <Button onClick={() => { 
                // Reset to current month (YYYY-MM)
                const currentMonth = new Date().toISOString().slice(0, 7);
                setFilterDate(currentMonth); 
              }}>
                Reset to Current Month
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-xs text-gray-500">Total Invoice</p>
          <p className="text-lg font-semibold text-blue-600">₹{totalInvoiceAmount.toLocaleString()}</p>
        </Card>

        <Card className="p-3">
          <p className="text-xs text-gray-500">Payment Received</p>
          <p className="text-lg font-semibold text-green-600">₹{totalReceived.toLocaleString()}</p>
        </Card>

        <Card className="p-3">
          <p className="text-xs text-gray-500">Pending Payment</p>
          <p className="text-lg font-semibold text-orange-600">₹{pendingPayment.toLocaleString()}</p>
        </Card>

        <Card className="p-3">
          <p className="text-xs text-gray-500">Sales Count</p>
          <p className="text-lg font-semibold">{sales.length} Entries</p>
        </Card>
      </div>

      {/* SALES TABLE + Add/Edit/Delete/Download */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Maal Out (Sales)</CardTitle>

          <div className="flex items-center gap-2">
            {/* Add Sale */}
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add Sale</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader><DialogTitle>Add Sale</DialogTitle></DialogHeader>
                <form className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4" onSubmit={handleAddSale}>
                  <div>
                    <Label>Firm Name</Label>
                    <Input
                      required
                      list="mill-firm-name-options"
                      value={saleForm.firm_name}
                      onChange={(e) =>
                        setSaleForm({ ...saleForm, firm_name: e.target.value })
                      }
                    />
                    <datalist id="mill-firm-name-options">
                      {firmOptions.map((v) => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <Label>Bill To</Label>
                    <Input
                      required
                      list="mill-bill-to-options"
                      value={saleForm.bill_to}
                      onChange={(e) =>
                        setSaleForm({ ...saleForm, bill_to: e.target.value })
                      }
                    />
                    <datalist id="mill-bill-to-options">
                      {billToOptions.map((v) => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <Label>Ship To</Label>
                    <Input
                      list="mill-ship-to-options"
                      value={saleForm.ship_to}
                      onChange={(e) =>
                        setSaleForm({ ...saleForm, ship_to: e.target.value })
                      }
                    />
                    <datalist id="mill-ship-to-options">
                      {shipToOptions.map((v) => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>
                  </div>
                  <div><Label>Date</Label><Input type="date" required value={saleForm.date} onChange={(e)=>setSaleForm({...saleForm, date: e.target.value})} /></div>
                  <div><Label>Vehicle No</Label><Input value={saleForm.vehicle_no} onChange={(e)=>setSaleForm({...saleForm, vehicle_no: e.target.value})} /></div>

                  <div><Label>Weight (kg)</Label><Input type="number" required value={saleForm.weight} onChange={(e)=>setSaleForm({...saleForm, weight: Number(e.target.value)})} /></div>
                  <div>
                    <Label>Bill Rate (₹/kg)</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          changeRateByTenth(setSaleForm, saleForm, "bill_rate", -0.1)
                        }
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        step="0.1"
                        required
                        value={saleForm.bill_rate}
                        onChange={(e) =>
                          setSaleForm({ ...saleForm, bill_rate: e.target.value })
                        }
                        onBlur={(e) =>
                          setSaleForm({
                            ...saleForm,
                            bill_rate: normalizeRateString(e.target.value),
                          })
                        }
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          changeRateByTenth(setSaleForm, saleForm, "bill_rate", 0.1)
                        }
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Original Rate (₹/kg)</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          changeRateByTenth(setSaleForm, saleForm, "original_rate", -0.1)
                        }
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        step="0.1"
                        required
                        value={saleForm.original_rate}
                        onChange={(e) =>
                          setSaleForm({
                            ...saleForm,
                            original_rate: e.target.value,
                          })
                        }
                        onBlur={(e) =>
                          setSaleForm({
                            ...saleForm,
                            original_rate: normalizeRateString(e.target.value),
                          })
                        }
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          changeRateByTenth(setSaleForm, saleForm, "original_rate", 0.1)
                        }
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  <div><Label>GST %</Label><Input type="number" value={saleForm.gst_percent} onChange={(e)=>setSaleForm({...saleForm, gst_percent: Number(e.target.value)})} /></div>

                  <div><Label>Freight (₹)</Label><Input type="number" value={saleForm.freight} onChange={(e)=>setSaleForm({...saleForm, freight: Number(e.target.value)})} /></div>
                  <div>
                    <Label>Freight Payment Status</Label>
                    <Select value={saleForm.freight_payment_status} onValueChange={(v)=>setSaleForm({...saleForm, freight_payment_status: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 p-3 border rounded bg-gray-50">
                    <p>
                      Bill Amount: ₹
                      {(Number(saleForm.weight || 0) * (Number(saleForm.bill_rate) || 0)).toLocaleString()}
                    </p>
                    <p>
                      Original Amount: ₹
                      {(Number(saleForm.weight || 0) * (Number(saleForm.original_rate) || 0)).toLocaleString()}
                    </p>
                    <p>
                      GST Amount: ₹
                      {(
                        ((Number(saleForm.weight || 0) * (Number(saleForm.bill_rate) || 0)) *
                          Number(saleForm.gst_percent || 0)) /
                        100
                      ).toLocaleString()}
                    </p>
                  </div>

                  <div className="col-span-2 flex justify-end pt-2">
                    <Button type="submit">Save Sale</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {sales.length === 0 ? (
            <p className="text-center py-6 text-gray-500">No sales found</p>
          ) : isDesktop ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Firm</TableHead>
                    <TableHead>Bill To</TableHead>
                    <TableHead>Ship To</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Bill Rate</TableHead>
                    <TableHead>Bill Amount</TableHead>
                    <TableHead>Original Rate</TableHead>
                    <TableHead>Original Amount</TableHead>
                    <TableHead>GST %</TableHead>
                    <TableHead>GST Amt</TableHead>
                    <TableHead>Freight</TableHead>
                    <TableHead>Freight Pay</TableHead>
                    <TableHead>Total Invoice</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {sales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.firm_name}</TableCell>
                      <TableCell>{s.bill_to}</TableCell>
                      <TableCell>{s.ship_to}</TableCell>
                      <TableCell>{formatDate(s.date)}</TableCell>
                      <TableCell>{s.weight}</TableCell>
                      <TableCell>₹{s.bill_rate}</TableCell>
                      <TableCell>₹{s.bill_amount}</TableCell>
                      <TableCell>₹{s.original_rate}</TableCell>
                      <TableCell>₹{s.original_amount}</TableCell>
                      <TableCell>{s.gst_percent}%</TableCell>
                      <TableCell>₹{s.gst_amount}</TableCell>
                      <TableCell>₹{s.freight}</TableCell>
                      <TableCell>
                        {s.freight_payment_status === "paid" ? (
                          <span className="text-green-600 font-semibold">PAID</span>
                        ) : (
                          <span className="text-red-600 font-semibold">PENDING</span>
                        )}
                      </TableCell>
                      <TableCell className="font-bold text-blue-600">₹{s.total_invoice_amount}</TableCell>
                      <TableCell>{s.vehicle_no}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditSaleForm({
                                    id: s.id,
                                    firm_name: s.firm_name,
                                    bill_to: s.bill_to,
                                    ship_to: s.ship_to,
                                    date: s.date,
                                    weight: Number(s.weight) || 0,
                                    bill_rate: normalizeRateString(s.bill_rate),
                                    original_rate: normalizeRateString(s.original_rate),
                                    gst_percent: Number(s.gst_percent) || 0,
                                    freight: Number(s.freight) || 0,
                                    vehicle_no: s.vehicle_no || "",
                                    freight_payment_status: s.freight_payment_status || "pending",
                                  });
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>

                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>Edit Sale</DialogTitle>
                              </DialogHeader>
                              {editSaleForm && (
                                <form
                                  className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4"
                                  onSubmit={submitEditSale}
                                >
                                  <div>
                                    <Label>Firm Name</Label>
                                    <Input
                                      required
                                      list="mill-firm-name-options"
                                      value={editSaleForm.firm_name}
                                      onChange={(e) =>
                                        setEditSaleForm({ ...editSaleForm, firm_name: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label>Bill To</Label>
                                    <Input
                                      required
                                      list="mill-bill-to-options"
                                      value={editSaleForm.bill_to}
                                      onChange={(e) =>
                                        setEditSaleForm({ ...editSaleForm, bill_to: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label>Ship To</Label>
                                    <Input
                                      list="mill-ship-to-options"
                                      value={editSaleForm.ship_to}
                                      onChange={(e) =>
                                        setEditSaleForm({ ...editSaleForm, ship_to: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label>Date</Label>
                                    <Input
                                      type="date"
                                      required
                                      value={editSaleForm.date}
                                      onChange={(e) =>
                                        setEditSaleForm({ ...editSaleForm, date: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label>Vehicle No</Label>
                                    <Input
                                      value={editSaleForm.vehicle_no}
                                      onChange={(e) =>
                                        setEditSaleForm({ ...editSaleForm, vehicle_no: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label>Weight (kg)</Label>
                                    <Input
                                      type="number"
                                      required
                                      value={editSaleForm.weight}
                                      onChange={(e) =>
                                        setEditSaleForm({ ...editSaleForm, weight: Number(e.target.value) })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label>Bill Rate (₹/kg)</Label>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() =>
                                          changeRateByTenth(setEditSaleForm, editSaleForm, "bill_rate", -0.1)
                                        }
                                      >
                                        -
                                      </Button>
                                      <Input
                                        type="number"
                                        step="0.1"
                                        required
                                        value={editSaleForm.bill_rate}
                                        onChange={(e) =>
                                          setEditSaleForm({ ...editSaleForm, bill_rate: e.target.value })
                                        }
                                        onBlur={(e) =>
                                          setEditSaleForm({
                                            ...editSaleForm,
                                            bill_rate: normalizeRateString(e.target.value),
                                          })
                                        }
                                      />
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() =>
                                          changeRateByTenth(setEditSaleForm, editSaleForm, "bill_rate", 0.1)
                                        }
                                      >
                                        +
                                      </Button>
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Original Rate (₹/kg)</Label>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() =>
                                          changeRateByTenth(
                                            setEditSaleForm,
                                            editSaleForm,
                                            "original_rate",
                                            -0.1
                                          )
                                        }
                                      >
                                        -
                                      </Button>
                                      <Input
                                        type="number"
                                        step="0.1"
                                        required
                                        value={editSaleForm.original_rate}
                                        onChange={(e) =>
                                          setEditSaleForm({ ...editSaleForm, original_rate: e.target.value })
                                        }
                                        onBlur={(e) =>
                                          setEditSaleForm({
                                            ...editSaleForm,
                                            original_rate: normalizeRateString(e.target.value),
                                          })
                                        }
                                      />
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() =>
                                          changeRateByTenth(
                                            setEditSaleForm,
                                            editSaleForm,
                                            "original_rate",
                                            0.1
                                          )
                                        }
                                      >
                                        +
                                      </Button>
                                    </div>
                                  </div>
                                  <div>
                                    <Label>GST %</Label>
                                    <Input
                                      type="number"
                                      value={editSaleForm.gst_percent}
                                      onChange={(e) =>
                                        setEditSaleForm({ ...editSaleForm, gst_percent: Number(e.target.value) })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label>Freight (₹)</Label>
                                    <Input
                                      type="number"
                                      value={editSaleForm.freight}
                                      onChange={(e) =>
                                        setEditSaleForm({ ...editSaleForm, freight: Number(e.target.value) })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label>Freight Payment Status</Label>
                                    <Select
                                      value={editSaleForm.freight_payment_status}
                                      onValueChange={(v) =>
                                        setEditSaleForm({ ...editSaleForm, freight_payment_status: v })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="paid">Paid</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="col-span-2 p-3 border rounded bg-gray-50">
                                    <p>
                                      Bill Amount: ₹
                                      {(
                                        Number(editSaleForm.weight || 0) *
                                        (Number(editSaleForm.bill_rate) || 0)
                                      ).toLocaleString()}
                                    </p>
                                    <p>
                                      Original Amount: ₹
                                      {(
                                        Number(editSaleForm.weight || 0) *
                                        (Number(editSaleForm.original_rate) || 0)
                                      ).toLocaleString()}
                                    </p>
                                    <p>
                                      GST Amount: ₹
                                      {(
                                        ((Number(editSaleForm.weight || 0) *
                                          (Number(editSaleForm.bill_rate) || 0)) *
                                          Number(editSaleForm.gst_percent || 0)) /
                                        100
                                      ).toLocaleString()}
                                    </p>
                                  </div>

                                  <div className="col-span-2 flex justify-between pt-2">
                                    <div>
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={async () => {
                                          if (await askConfirm("Delete this sale?")) {
                                            await handleDeleteSale(editSaleForm.id);
                                            setEditSaleForm(null);
                                          }
                                        }}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setEditSaleForm(null)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button type="submit">Save</Button>
                                    </div>
                                  </div>
                                </form>
                              )}
                            </DialogContent>
                          </Dialog>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadInvoice(s.id)}
                          >
                            <Download className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteSale(s.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="space-y-3">
              {sales.map((s) => (
                <Card key={s.id} className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{s.firm_name}</CardTitle>
                        <p className="text-sm text-gray-600">{formatDate(s.date)}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-blue-600">
                          ₹{Number(s.total_invoice_amount || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">Total Invoice</div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-gray-500">Bill To</div>
                        <div className="font-medium break-words">{s.bill_to || "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Vehicle</div>
                        <div className="font-medium break-words">{s.vehicle_no || "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Weight</div>
                        <div className="font-medium">{s.weight} kg</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Freight</div>
                        <div className="font-medium">₹{Number(s.freight || 0).toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditSaleForm({
                                id: s.id,
                                firm_name: s.firm_name,
                                bill_to: s.bill_to,
                                ship_to: s.ship_to,
                                date: s.date,
                                weight: Number(s.weight) || 0,
                                bill_rate: normalizeRateString(s.bill_rate),
                                original_rate: normalizeRateString(s.original_rate),
                                gst_percent: Number(s.gst_percent) || 0,
                                freight: Number(s.freight) || 0,
                                vehicle_no: s.vehicle_no || "",
                                freight_payment_status: s.freight_payment_status || "pending",
                              });
                            }}
                          >
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </Button>
                        </DialogTrigger>

                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>Edit Sale</DialogTitle>
                          </DialogHeader>
                          {editSaleForm && (
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4" onSubmit={submitEditSale}>
                              <div>
                                <Label>Firm Name</Label>
                                <Input
                                  required
                                  list="mill-firm-name-options"
                                  value={editSaleForm.firm_name}
                                  onChange={(e) => setEditSaleForm({ ...editSaleForm, firm_name: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>Bill To</Label>
                                <Input
                                  required
                                  list="mill-bill-to-options"
                                  value={editSaleForm.bill_to}
                                  onChange={(e) => setEditSaleForm({ ...editSaleForm, bill_to: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>Ship To</Label>
                                <Input
                                  list="mill-ship-to-options"
                                  value={editSaleForm.ship_to}
                                  onChange={(e) => setEditSaleForm({ ...editSaleForm, ship_to: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>Date</Label>
                                <Input
                                  type="date"
                                  required
                                  value={editSaleForm.date}
                                  onChange={(e) => setEditSaleForm({ ...editSaleForm, date: e.target.value })}
                                />
                              </div>

                              <div>
                                <Label>Vehicle No</Label>
                                <Input
                                  value={editSaleForm.vehicle_no}
                                  onChange={(e) => setEditSaleForm({ ...editSaleForm, vehicle_no: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>Weight (kg)</Label>
                                <Input
                                  type="number"
                                  required
                                  value={editSaleForm.weight}
                                  onChange={(e) => setEditSaleForm({ ...editSaleForm, weight: Number(e.target.value) })}
                                />
                              </div>

                              <div>
                                <Label>Bill Rate (₹/kg)</Label>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => changeRateByTenth(setEditSaleForm, editSaleForm, "bill_rate", -0.1)}
                                  >
                                    -
                                  </Button>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    required
                                    value={editSaleForm.bill_rate}
                                    onChange={(e) => setEditSaleForm({ ...editSaleForm, bill_rate: e.target.value })}
                                    onBlur={(e) => setEditSaleForm({ ...editSaleForm, bill_rate: normalizeRateString(e.target.value) })}
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => changeRateByTenth(setEditSaleForm, editSaleForm, "bill_rate", 0.1)}
                                  >
                                    +
                                  </Button>
                                </div>
                              </div>
                              <div>
                                <Label>Original Rate (₹/kg)</Label>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => changeRateByTenth(setEditSaleForm, editSaleForm, "original_rate", -0.1)}
                                  >
                                    -
                                  </Button>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    required
                                    value={editSaleForm.original_rate}
                                    onChange={(e) => setEditSaleForm({ ...editSaleForm, original_rate: e.target.value })}
                                    onBlur={(e) =>
                                      setEditSaleForm({
                                        ...editSaleForm,
                                        original_rate: normalizeRateString(e.target.value),
                                      })
                                    }
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => changeRateByTenth(setEditSaleForm, editSaleForm, "original_rate", 0.1)}
                                  >
                                    +
                                  </Button>
                                </div>
                              </div>

                              <div>
                                <Label>GST %</Label>
                                <Input
                                  type="number"
                                  value={editSaleForm.gst_percent}
                                  onChange={(e) => setEditSaleForm({ ...editSaleForm, gst_percent: Number(e.target.value) })}
                                />
                              </div>
                              <div>
                                <Label>Freight (₹)</Label>
                                <Input
                                  type="number"
                                  value={editSaleForm.freight}
                                  onChange={(e) => setEditSaleForm({ ...editSaleForm, freight: Number(e.target.value) })}
                                />
                              </div>

                              <div>
                                <Label>Freight Payment Status</Label>
                                <Select
                                  value={editSaleForm.freight_payment_status}
                                  onValueChange={(v) => setEditSaleForm({ ...editSaleForm, freight_payment_status: v })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="col-span-2 p-3 border rounded bg-gray-50">
                                <p>
                                  Bill Amount: ₹
                                  {(Number(editSaleForm.weight || 0) * (Number(editSaleForm.bill_rate) || 0)).toLocaleString()}
                                </p>
                                <p>
                                  Original Amount: ₹
                                  {(Number(editSaleForm.weight || 0) * (Number(editSaleForm.original_rate) || 0)).toLocaleString()}
                                </p>
                                <p>
                                  GST Amount: ₹
                                  {(
                                    ((Number(editSaleForm.weight || 0) * (Number(editSaleForm.bill_rate) || 0)) *
                                      Number(editSaleForm.gst_percent || 0)) /
                                    100
                                  ).toLocaleString()}
                                </p>
                              </div>

                              <div className="col-span-2 flex justify-between pt-2">
                                <div>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={async () => {
                                      if (await askConfirm("Delete this sale?")) {
                                        await handleDeleteSale(editSaleForm.id);
                                        setEditSaleForm(null);
                                      }
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </div>
                                <div className="flex gap-2">
                                  <Button type="button" variant="outline" onClick={() => setEditSaleForm(null)}>
                                    Cancel
                                  </Button>
                                  <Button type="submit">Save</Button>
                                </div>
                              </div>
                            </form>
                          )}
                        </DialogContent>
                      </Dialog>

                      <Button size="sm" variant="outline" onClick={() => handleDownloadInvoice(s.id)}>
                        <Download className="w-4 h-4 mr-2" /> Invoice
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteSale(s.id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* PAYMENTS TABLE */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Payments Received</CardTitle>

          <div className="flex items-center gap-2">
            {/* Add Payment */}
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" /> Add Payment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Add Payment</DialogTitle></DialogHeader>
                <form onSubmit={handleAddPayment} className="space-y-3 p-4">
                  <div><Label>Firm Name</Label><Input required value={paymentForm.firm_name} onChange={(e)=>setPaymentForm({...paymentForm, firm_name: e.target.value})} /></div>
                  <div><Label>Amount (₹)</Label><Input type="number" required value={paymentForm.amount} onChange={(e)=>setPaymentForm({...paymentForm, amount: e.target.value})} /></div>
                  <div><Label>Date</Label><Input type="date" required value={paymentForm.date} onChange={(e)=>setPaymentForm({...paymentForm, date: e.target.value})} /></div>
                  <div className="flex justify-end"><Button type="submit">Save Payment</Button></div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {payments.length === 0 ? (
            <p className="text-center py-6 text-gray-500">No payments found</p>
          ) : isDesktop ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Firm</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.firm_name}</TableCell>
                      <TableCell className="text-green-600 font-semibold">
                        ₹{p.amount}
                      </TableCell>
                      <TableCell>{formatDate(p.date)}</TableCell>

                      <TableCell>
                        <div className="flex gap-2">
                          {/* Edit Payment */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditPaymentForm({
                                    id: p.id,
                                    firm_name: p.firm_name,
                                    amount: Number(p.amount) || 0,
                                    date: p.date,
                                    maal_out_id: p.maal_out_id ?? null,
                                    mode: p.mode ?? null,
                                    note: p.note ?? null,
                                  });
                                }}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>

                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Edit Payment</DialogTitle>
                              </DialogHeader>
                              {editPaymentForm && (
                                <form
                                  onSubmit={submitEditPayment}
                                  className="space-y-3 p-4"
                                >
                                  <div>
                                    <Label>Firm Name</Label>
                                    <Input
                                      required
                                      value={editPaymentForm.firm_name}
                                      onChange={(e) =>
                                        setEditPaymentForm({
                                          ...editPaymentForm,
                                          firm_name: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label>Amount (₹)</Label>
                                    <Input
                                      type="number"
                                      required
                                      value={editPaymentForm.amount}
                                      onChange={(e) =>
                                        setEditPaymentForm({
                                          ...editPaymentForm,
                                          amount: Number(e.target.value),
                                        })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label>Date</Label>
                                    <Input
                                      type="date"
                                      required
                                      value={editPaymentForm.date}
                                      onChange={(e) =>
                                        setEditPaymentForm({
                                          ...editPaymentForm,
                                          date: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label>Note</Label>
                                    <Input
                                      value={editPaymentForm.note || ""}
                                      onChange={(e) =>
                                        setEditPaymentForm({
                                          ...editPaymentForm,
                                          note: e.target.value,
                                        })
                                      }
                                    />
                                  </div>

                                  <div className="flex justify-between pt-2">
                                    <div>
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={async () => {
                                          if (await askConfirm("Delete this payment?")) {
                                            await handleDeletePayment(editPaymentForm.id);
                                            setEditPaymentForm(null);
                                          }
                                        }}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setEditPaymentForm(null)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button type="submit">Save</Button>
                                    </div>
                                  </div>
                                </form>
                              )}
                            </DialogContent>
                          </Dialog>

                          {/* Delete quick */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeletePayment(p.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => (
                <Card key={p.id} className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">
                          {p.firm_name}
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          {formatDate(p.date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-green-600">
                          ₹{Number(p.amount || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">Received</div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="mt-2 flex justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditPaymentForm({
                                id: p.id,
                                firm_name: p.firm_name,
                                amount: Number(p.amount) || 0,
                                date: p.date,
                                maal_out_id: p.maal_out_id ?? null,
                                mode: p.mode ?? null,
                                note: p.note ?? null,
                              });
                            }}
                          >
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </Button>
                        </DialogTrigger>

                        <DialogContent className="max-w-md">
                          <DialogHeader><DialogTitle>Edit Payment</DialogTitle></DialogHeader>
                          {editPaymentForm && (
                            <form onSubmit={submitEditPayment} className="space-y-3 p-4">
                              <div><Label>Firm Name</Label><Input required value={editPaymentForm.firm_name} onChange={(e)=>setEditPaymentForm({...editPaymentForm, firm_name: e.target.value})} /></div>
                              <div><Label>Amount (₹)</Label><Input type="number" required value={editPaymentForm.amount} onChange={(e)=>setEditPaymentForm({...editPaymentForm, amount: Number(e.target.value)})} /></div>
                              <div><Label>Date</Label><Input type="date" required value={editPaymentForm.date} onChange={(e)=>setEditPaymentForm({...editPaymentForm, date: e.target.value})} /></div>
                              <div><Label>Note</Label><Input value={editPaymentForm.note || ""} onChange={(e)=>setEditPaymentForm({...editPaymentForm, note: e.target.value})} /></div>

                              <div className="flex justify-between pt-2">
                                <div>
                                  <Button type="button" variant="destructive" onClick={async () => { if (await askConfirm("Delete this payment?")) { await handleDeletePayment(editPaymentForm.id); setEditPaymentForm(null); } }}>
                                    Delete
                                  </Button>
                                </div>
                                <div className="flex gap-2">
                                  <Button type="button" variant="outline" onClick={()=>setEditPaymentForm(null)}>Cancel</Button>
                                  <Button type="submit">Save</Button>
                                </div>
                              </div>
                            </form>
                          )}
                        </DialogContent>
                      </Dialog>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeletePayment(p.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default MillSection;
