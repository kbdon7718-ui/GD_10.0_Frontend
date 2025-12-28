// src/components/Owner/RokadiUpdate.jsx

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "../ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";
import { RefreshCcw, Wallet, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "../../utils/currencyFormat";
import { OwnerReadOnlyBadge } from "./OwnerBadge";
import { ResizableHistoryModal } from "./ResizableHistoryModal";
import { useMediaQuery } from "../../utils/useMediaQuery";
import { getApiBaseUrl } from "../../utils/apiBaseUrl";

const COMPANY_ID = "2f762c5e-5274-4a65-aa66-15a7642a1608";
const GODOWN_ID = "fbf61954-4d32-4cb4-92ea-d0fe3be01311";

export function RokadiUpdate() {
  const API_URL = getApiBaseUrl();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [cashAccounts, setCashAccounts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [totalRokadi, setTotalRokadi] = useState(0);

  const [cashHistoryOpen, setCashHistoryOpen] = useState(false);
const [cashTransactions, setCashTransactions] = useState([]);
const [cashLoading, setCashLoading] = useState(false);

  const [bankHistoryOpen, setBankHistoryOpen] = useState(false);
  const [bankTransactions, setBankTransactions] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);

  const [loading, setLoading] = useState(false);

  /* ================= ADD CASH CREDIT ================= */
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    account_id: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    note: "",
  });

  /* ================= LOAD ROKADI ================= */
  const loadRokadi = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `${API_URL}/api/rokadi/accounts?company_id=${COMPANY_ID}&godown_id=${GODOWN_ID}`
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const accounts = data.accounts || [];

      const cash = accounts.filter(a => a.account_type === "cash");
      const banks = accounts.filter(a => a.account_type === "bank");

      setCashAccounts(cash);
      setBankAccounts(banks);

      const cashTotal = cash.reduce((s, a) => s + Number(a.balance || 0), 0);
      const bankTotal = banks.reduce((s, b) => s + Number(b.balance || 0), 0);

      setTotalRokadi(cashTotal + bankTotal);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load Rokadi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRokadi();
  }, []);

  /* ================= ADD CASH ================= */
  const submitAddCash = async () => {
    if (!addForm.account_id || !addForm.amount) {
      toast.error("Select account & amount");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/rokadi/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: COMPANY_ID,
          godown_id: GODOWN_ID,
          account_id: addForm.account_id,
          type: "credit",
          amount: Number(addForm.amount),
          category: "manual_cash",
          reference: addForm.note,
          date: addForm.date,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success("Cash added successfully");
      setAddOpen(false);
      setAddForm({
        account_id: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        note: "",
      });
      loadRokadi();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add cash");
    }
  };

const loadCashHistory = async () => {
  try {
    setCashLoading(true);
    const res = await fetch(
      `${API_URL}/api/rokadi/history/cash?company_id=${COMPANY_ID}&godown_id=${GODOWN_ID}`
    );
    const data = await res.json();

    if (!data.success) throw new Error(data.error);
    setCashTransactions(data.transactions || []);
  } catch (err) {
    console.error(err);
    toast.error("Failed to load cash history");
  } finally {
    setCashLoading(false);
  }
};


  /* ================= BANK HISTORY ================= */
  const loadBankHistory = async () => {
    try {
      setBankLoading(true);
      const res = await fetch(
        `${API_URL}/api/rokadi/history/bank?company_id=${COMPANY_ID}&godown_id=${GODOWN_ID}`
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setBankTransactions(data.transactions || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load bank history");
    } finally {
      setBankLoading(false);
    }
  };

  // ================= EXPORT TO CSV (COMMON) =================
const exportToCSV = (rows, filename) => {
  if (!rows || rows.length === 0) {
    toast.error("No data to export");
    return;
  }

  const headers = ["Date", "Account", "Particulars", "Debit", "Credit"];

  const csvRows = [
    headers.join(","), // header row
    ...rows.map(r =>
      [
        new Date(r.date).toLocaleDateString(),
        r.account_name || "",
        `"${(r.reference || r.category || "").replace(/"/g, '""')}"`,
        r.type === "debit" ? r.amount : "",
        r.type === "credit" ? r.amount : "",
      ].join(",")
    ),
  ];

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  window.URL.revokeObjectURL(url);
};

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Rokadi Update</h2>
          <p className="text-sm text-gray-500">Cash & bank position</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OwnerReadOnlyBadge />
          <Button variant="outline" size="sm" onClick={loadRokadi}>
            <RefreshCcw className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* TOTAL */}
      <Card className="border-2 border-green-200 bg-green-50">
        <CardHeader className="flex flex-row justify-between items-center pb-2">
          <div>
            <CardTitle className="text-green-700 text-base sm:text-lg">Total Rokadi</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Cash + Bank</CardDescription>
          </div>
          <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-green-700" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl sm:text-3xl font-bold text-green-700">
            {formatINR(totalRokadi)}
          </div>
        </CardContent>
      </Card>

      {/* CASH */}
     <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Cash in Hand</CardTitle>
            <CardDescription>Manual credit only</CardDescription>
          </div>

          <div className="flex gap-2">
            {cashAccounts.length > 0 && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setCashHistoryOpen(true);
                    loadCashHistory();
                  }}
                >
                  History
                </Button>
                <ResizableHistoryModal
                  isOpen={cashHistoryOpen}
                  onClose={() => setCashHistoryOpen(false)}
                  title="Cash History"
                  defaultWidth={900}
                  defaultHeight={600}
                >
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          exportToCSV(
                            cashTransactions,
                            `Cash_History_${new Date().toISOString().slice(0,10)}.csv`
                          )
                        }
                      >
                        Export CSV
                      </Button>
                    </div>

                    {cashLoading ? (
                      <p className="text-center py-6">Loading…</p>
                    ) : cashTransactions.length === 0 ? (
                      <p className="text-center py-6 text-gray-500">
                        No transactions
                      </p>
                    ) : (
                      <div className="overflow-hidden rounded-md border">
                        <div className="divide-y">
                          {cashTransactions.map((t) => {
                            const particulars = t.reference || t.category || "—";
                            const isDebit = t.type === "debit";
                            const amount = Number(t.amount || 0);

                            return (
                              <div key={t.id} className="px-3 py-3 sm:px-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground">
                                      {new Date(t.date).toLocaleDateString()}
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground break-words">
                                      {particulars}
                                    </p>
                                  </div>

                                  <div className="shrink-0 text-right">
                                    <p
                                      className={`text-sm font-semibold ${
                                        isDebit ? "text-red-600" : "text-green-600"
                                      }`}
                                    >
                                      {formatINR(amount)}
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                      {isDebit ? "Debit" : "Credit"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </ResizableHistoryModal>
              </>
            )}

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Cash
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Cash (Credit)</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <div>
                  <Label>Cash Account</Label>
                  <Select
                    value={addForm.account_id}
                    onValueChange={(v) =>
                      setAddForm({ ...addForm, account_id: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cash account" />
                    </SelectTrigger>
                    <SelectContent>
                      {cashAccounts.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={addForm.amount}
                    onChange={(e) =>
                      setAddForm({ ...addForm, amount: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={addForm.date}
                    onChange={(e) =>
                      setAddForm({ ...addForm, date: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>Note</Label>
                  <Input
                    value={addForm.note}
                    onChange={(e) =>
                      setAddForm({ ...addForm, note: e.target.value })
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={submitAddCash}>Add Cash</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cashAccounts.map(a => (
              <Card key={a.id}>
                <CardHeader>
                  <CardTitle className="text-sm">{a.account_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">
                    {formatINR(a.balance)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* BANK */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Bank</CardTitle>

          {bankAccounts.length > 0 && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setBankHistoryOpen(true);
                  loadBankHistory();
                }}
              >
                History
              </Button>
              <ResizableHistoryModal
                isOpen={bankHistoryOpen}
                onClose={() => setBankHistoryOpen(false)}
                title="Bank Statement"
                defaultWidth={900}
                defaultHeight={600}
              >
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        exportToCSV(
                          bankTransactions,
                          `Bank_History_${new Date().toISOString().slice(0,10)}.csv`
                        )
                      }
                    >
                      Export CSV
                    </Button>
                  </div>

                  {bankLoading ? (
                    <p className="text-center py-6">Loading…</p>
                  ) : bankTransactions.length === 0 ? (
                    <p className="text-center py-6 text-gray-500">
                      No transactions
                    </p>
                  ) : (
                    <div className="overflow-hidden rounded-md border">
                      <div className="divide-y">
                        {bankTransactions.map((t) => {
                          const particulars = t.reference || t.category || "—";
                          const isDebit = t.type === "debit";
                          const amount = Number(t.amount || 0);

                          return (
                            <div key={t.id} className="px-3 py-3 sm:px-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground">
                                    {new Date(t.date).toLocaleDateString()}
                                  </p>
                                  <p className="mt-0.5 text-xs text-muted-foreground break-words">
                                    {particulars}
                                  </p>
                                </div>

                                <div className="shrink-0 text-right">
                                  <p
                                    className={`text-sm font-semibold ${
                                      isDebit ? "text-red-600" : "text-green-600"
                                    }`}
                                  >
                                    {formatINR(amount)}
                                  </p>
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {isDebit ? "Debit" : "Credit"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </ResizableHistoryModal>
            </>
          )}
        </CardHeader>

        <CardContent>
          {bankAccounts.length === 0 ? (
            <p className="text-gray-500">No bank accounts</p>
          ) : (
            bankAccounts.map(b => (
              <div
                key={b.id}
                className="flex items-center justify-between border-b py-2"
              >
                <div>
                  <p className="font-medium">{b.account_name}</p>
                  <p className="text-sm text-gray-500">
                    {b.account_number || "—"}
                  </p>
                </div>
                <div className="text-xl font-semibold text-purple-600">
                  {formatINR(b.balance)}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {loading && (
        <p className="text-center text-gray-500">Updating…</p>
      )}
    </div>
  );
}

export default RokadiUpdate;
