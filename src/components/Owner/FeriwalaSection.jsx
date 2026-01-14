import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "../../utils/dateFormat";
import { useMediaQuery } from "../../utils/useMediaQuery";
import { ResizableHistoryModal } from "./ResizableHistoryModal";
import { getApiBaseUrl } from "../../utils/apiBaseUrl";
import { usePageRefresh } from "../../utils/pageRefreshContext";

export function FeriwalaSection() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const API_URL = getApiBaseUrl();
  const { setRefreshHandler } = usePageRefresh();
  const company_id = "2f762c5e-5274-4a65-aa66-15a7642a1608";
  const godown_id = "fbf61954-4d32-4cb4-92ea-d0fe3be01311";

  const [balances, setBalances] = useState([]);

  const [search, setSearch] = useState("");
  const [activeVendor, setActiveVendor] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [outstanding, setOutstanding] = useState(0);

  /* ===============================
     LOAD BALANCES
  =============================== */
  const loadBalances = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/feriwala/balances?company_id=${company_id}&godown_id=${godown_id}`
      );
      const data = await res.json();

      if (data.success) setBalances(data.balances || []);
      else toast.error(data.error);
    } catch {
      toast.error("Server error");
    }
  };

  /* ===============================
     LOAD LEDGER
  =============================== */
  const loadLedger = async (vendor) => {
    try {
      setLedgerLoading(true);
      setActiveVendor(vendor);

      const res = await fetch(
        `${API_URL}/api/feriwala/ledger?company_id=${company_id}&godown_id=${godown_id}&vendor_id=${vendor.vendor_id}`
      );

      const data = await res.json();

      if (data.success) {
        setLedger(data.ledger || []);
        setOutstanding(data.outstanding || 0);
      } else toast.error(data.error);
    } catch {
      toast.error("Server error");
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    loadBalances();
  }, []);

  useEffect(() => {
    setRefreshHandler(loadBalances);
    return () => setRefreshHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===============================
     SEARCH
  =============================== */
  const filteredVendors = useMemo(() => {
    return balances.filter((b) =>
      (b.vendor_name || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [balances, search]);

  /* ===============================
     EXPORT CSV
  =============================== */
  const exportCSV = () => {
    if (!ledger.length || !activeVendor) return;

    const rows = [
      ["Date", "Type", "Description", "Amount", "Balance"],
      ...ledger.map((l) => [
        formatDate(l.date),
        l.type,
        l.description.replace(/\n/g, " | "),
        l.amount,
        l.balance,
      ]),
    ];

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeVendor.vendor_name}_ledger.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
        {/*}  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Feriwala Ledger
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Outstanding & transaction history
          </p>*/}
        </div>

      </div>

      {/* SEARCH */}
      <Input
        placeholder="Search feriwala..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full sm:max-w-sm"
      />

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredVendors.map((v) => (
          <Card key={v.vendor_id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{v.vendor_name}</CardTitle>
                </div>
                <p
                  className={`text-lg font-semibold shrink-0 ${
                    v.balance > 0
                      ? "text-green-600"
                      : v.balance < 0
                      ? "text-red-600"
                      : ""
                  }`}
                >
                  ₹{Number(v.balance).toLocaleString()}
                </p>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3"
                onClick={() => loadLedger(v)}
              >
                View History
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>


      <ResizableHistoryModal
        isOpen={!!activeVendor}
        onClose={() => setActiveVendor(null)}
        title={activeVendor ? `Ledger — ${activeVendor.vendor_name}` : "Ledger"}
        defaultWidth={1000}
        defaultHeight={650}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0" />
            <Button
              size="sm"
              variant="outline"
              onClick={exportCSV}
              disabled={!ledger.length || !activeVendor}
            >
              <FileDown className="w-4 h-4 mr-2" /> Export
            </Button>
          </div>

          {ledgerLoading ? (
            <p className="text-center py-6">Loading…</p>
          ) : ledger.length === 0 ? (
            <p className="text-center py-6 text-gray-500">No transactions</p>
          ) : isDesktop ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {ledger.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell>{formatDate(l.date)}</TableCell>
                    <TableCell>
                      {l.type === "purchase" ? "Maal" : "Payment"}
                    </TableCell>
                    <TableCell>
                      <pre className="whitespace-pre-wrap text-sm">
                        {l.description}
                      </pre>
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{Number(l.amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{Number(l.balance).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="space-y-3">
              {ledger.map((l, i) => (
                <Card key={i} className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-base">
                          {formatDate(l.date)}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {l.type === "purchase" ? "Maal" : "Payment"}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">
                          ₹{Number(l.amount).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          Bal: ₹{Number(l.balance).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm text-gray-700 break-words">
                      {l.description || "—"}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="pt-2 text-right font-semibold">
            Final Outstanding: ₹{Number(outstanding).toLocaleString()}
          </div>
        </div>
      </ResizableHistoryModal>
    </div>
  );
}
