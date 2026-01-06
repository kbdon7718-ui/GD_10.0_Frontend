import React, { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { toast } from "sonner";
import { Plus, Save, X } from "lucide-react";
import { formatDate } from "../../utils/dateFormat";
import { useMediaQuery } from "../../utils/useMediaQuery";
import { getApiBaseUrl } from "../../utils/apiBaseUrl";

const EXPENSE_CATEGORIES = [
  "Godam",
  "Maintenance",
  "Labour",
  "Feriwala",
  "Kabadiwala",
  "Partner",
];

const normalizePaymentMode = (mode) => {
  if (!mode) return "Cash";
  if (mode === "UPI" || mode === "Bank Transfer") return "Bank";
  if (mode === "cash") return "Cash";
  if (mode === "bank") return "Bank";
  if (mode === "Cash" || mode === "Bank") return mode;
  return "Cash";
};

export function ExpenseManager() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [expenses, setExpenses] = useState([]);
  const [labours, setLabours] = useState([]);
  const [feriwalas, setFeriwalas] = useState([]);
  const [kabadiwalas, setKabadiwalas] = useState([]);

  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "Godam",
    description: "",
    amount: "",
    transactionMode: "Cash",
    paymentTo: "",
    labour_id: null,
  });

  const COMPANY_ID = "2f762c5e-5274-4a65-aa66-15a7642a1608";
  const GODOWN_ID = "fbf61954-4d32-4cb4-92ea-d0fe3be01311";
  const API = getApiBaseUrl();

  /* ================= LABOURS ================= */
  useEffect(() => {
    if (!API) return;

    fetch(
      `${API}/api/labour/all?company_id=${COMPANY_ID}&godown_id=${GODOWN_ID}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setLabours(data.labour);
      });
  }, [API]);

  /* ================= FERIWALA (balances) ================= */
  useEffect(() => {
    if (!API) return;

    fetch(
      `${API}/api/feriwala/balances?company_id=${COMPANY_ID}&godown_id=${GODOWN_ID}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setFeriwalas(data.balances);
      });
  }, [API]);

  /* ================= KABADIWALA (same as KabadiwalaManager) ================= */
  useEffect(() => {
    if (!API) return;

    fetch(`${API}/api/rates/vendors-with-rates`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const filtered = data.vendors.filter(
            (v) => v.type === "kabadiwala"
          );
          setKabadiwalas(filtered);
        }
      })
      .catch(() => toast.error("Failed to load kabadiwalas"));
  }, [API]);

  /* ================= EXPENSE LIST ================= */
  const fetchExpenses = async () => {
    try {
      const res = await fetch(
        `${API}/api/expenses/list?company_id=${COMPANY_ID}&godown_id=${GODOWN_ID}`
      );
      const data = await res.json();
      if (data.success) setExpenses(data.expenses);
    } catch {
      toast.error("Failed to load expenses");
    }
  };

  useEffect(() => {
    if (API) fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API]);

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      category: "Godam",
      description: "",
      amount: "",
      transactionMode: "Cash",
      paymentTo: "",
      labour_id: null,
    });
    setIsAdding(false);
    setLoading(false);
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const payload = {
        company_id: COMPANY_ID,
        godown_id: GODOWN_ID,
        date: formData.date,
        category: formData.category,
        description: formData.description || "",
        amount: Number(formData.amount),
        payment_mode: normalizePaymentMode(formData.transactionMode),
        paid_to: "",
        labour_id: null,
        vendor_id: null,
        vendor_type: null,
      };

      // LABOUR
      let withdrawalRes = null;
      if (formData.category === "Labour") {
        payload.labour_id = formData.labour_id;
        payload.paid_to =
          labours.find((l) => l.id === formData.labour_id)?.name || "";

        // Also record as withdrawal for labour history
        withdrawalRes = await fetch(`${API}/api/labour/withdraw`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company_id: COMPANY_ID,
            godown_id: GODOWN_ID,
            labour_id: formData.labour_id,
            date: formData.date,
            amount: Number(formData.amount),
            mode: normalizePaymentMode(formData.transactionMode),
          }),
        });
        // Optionally check withdrawalRes.ok and show error if needed
      }

      // FERIWALA
      if (formData.category === "Feriwala") {
        const v = feriwalas.find(
          (x) => x.vendor_id === formData.paymentTo
        );
        payload.vendor_id = formData.paymentTo;
        payload.vendor_type = "feriwala";
        payload.paid_to = v?.vendor_name || "";
      }

      // KABADIWALA
      if (formData.category === "Kabadiwala") {
        const v = kabadiwalas.find(
          (x) => x.vendor_id === formData.paymentTo
        );
        payload.vendor_id = formData.paymentTo;
        payload.vendor_type = "kabadiwala";
        payload.paid_to = v?.vendor_name || "";
      }

      // OTHER
      if (
        !["Labour", "Feriwala", "Kabadiwala"].includes(formData.category)
      ) {
        payload.paid_to = formData.paymentTo;
      }

      const res = await fetch(`${API}/api/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Payment recorded successfully");
      fetchExpenses();
      resetForm();
    } catch (err) {
      toast.error(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Daily Kharch </CardTitle>
              <CardDescription className="text-sm">
                
              </CardDescription>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-2">
              <div>
                <p className="text-xs text-gray-500">Total Expenses</p>
                <p className="text-red-600 font-semibold">
                  ₹{totalExpenses.toLocaleString()}
                </p>
              </div>
              {!isAdding && (
                <Button size="sm" onClick={() => setIsAdding(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add Expense
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-3 sm:px-6">
          {isAdding && (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 mb-6 p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
            >
              {/* FORM — SAME AS YOUR STRUCTURE */}
              {/* (unchanged UI logic, already verified above) */}
              {/* … form fields exactly same as you pasted … */}
           
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Date */}
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        category: value,
                        paymentTo: "",
                        labour_id: null,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amount: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                {/* Payment Mode */}
                <div className="space-y-2">
                  <Label>Payment Mode</Label>
                  <Select
                    value={formData.transactionMode}
                    onValueChange={(value) =>
                      setFormData({ ...formData, transactionMode: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank">Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Paid To / Labour */}
                {/* Paid To (Dynamic) */}
{formData.category === "Labour" && (
  <div className="space-y-2">
    <Label>Labour</Label>
    <Select
      value={formData.labour_id || ""}
      onValueChange={(id) => {
        const l = labours.find(x => x.id === id);
        setFormData({
          ...formData,
          labour_id: id,
          paymentTo: l?.name || ""
        });
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select Labour" />
      </SelectTrigger>
      <SelectContent>
        {labours.map(l => (
          <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}

{formData.category === "Feriwala" && (
  <div className="space-y-2">
    <Label>Feriwala</Label>
    <Select
      value={formData.paymentTo}
      onValueChange={(val) => setFormData({ ...formData, paymentTo: val })}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select Feriwala" />
      </SelectTrigger>
      <SelectContent>
        {feriwalas.map(v => (
          <SelectItem key={v.vendor_id} value={v.vendor_id}>
            {v.vendor_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}

{formData.category === "Kabadiwala" && (
  <div className="space-y-2">
    <Label>Kabadiwala</Label>
    <Select
      value={formData.paymentTo}
      onValueChange={(val) =>
        setFormData({ ...formData, paymentTo: val })
      }
    >
      <SelectTrigger>
        <SelectValue placeholder="Select Kabadiwala" />
      </SelectTrigger>
      <SelectContent>
        {kabadiwalas.map(v => (
          <SelectItem key={v.vendor_id} value={v.vendor_id}>
            {v.vendor_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}


{!["Labour","Feriwala","Kabadiwala"].includes(formData.category) && (
  <div className="space-y-2">
    <Label>Paid To</Label>
    <Input
      value={formData.paymentTo}
      onChange={(e) =>
        setFormData({ ...formData, paymentTo: e.target.value })
      }
    />
  </div>
)}

              </div>

              <div className="flex gap-2 mt-4">
                <Button type="submit" disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Saving..." : "Save Expense"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
              </div>
            </form>
          )}


          {isDesktop ? (
            <div className="overflow-x-auto mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Paid To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No expenses yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{formatDate(e.date)}</TableCell>
                        <TableCell>{e.category}</TableCell>
                        <TableCell>{e.description}</TableCell>
                        <TableCell>
                          ₹{Number(e.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>{e.payment_mode}</TableCell>
                        <TableCell>{e.paid_to}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="space-y-3 mt-6">
              {expenses.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">No expenses yet</p>
              ) : (
                expenses.map((e) => (
                  <Card key={e.id} className="w-full">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{e.category || "—"}</p>
                          <p className="text-sm text-gray-500 truncate">{formatDate(e.date)}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-gray-500">Amount</p>
                          <p className="text-sm font-semibold text-gray-900">₹{Number(e.amount || 0).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">Description</p>
                        <p className="text-sm text-gray-900 break-words">{e.description || "—"}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Mode</p>
                          <p className="text-sm text-gray-900 truncate">{e.payment_mode || "—"}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Paid To</p>
                          <p className="text-sm text-gray-900 truncate">{e.paid_to || "—"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
