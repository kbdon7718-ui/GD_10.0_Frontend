import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Download } from "lucide-react";
import { formatDate } from "../../utils/dateFormat";
import { toast } from "sonner";
import { useMediaQuery } from "../../utils/useMediaQuery";
import { getApiBaseUrl } from "../../utils/apiBaseUrl";

const COMPANY_ID = "2f762c5e-5274-4a65-aa66-15a7642a1608";
const GODOWN_ID = "fbf61954-4d32-4cb4-92ea-d0fe3be01311";

export function BankAccount() {
  const API_URL = getApiBaseUrl();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ================= FETCH ================= */

  const loadStatement = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_URL}/api/bank/statement?company_id=${COMPANY_ID}&godown_id=${GODOWN_ID}`
      );
      const data = await res.json();

      if (!data.success) throw new Error(data.error);
      setTransactions(data.transactions || []);
    } catch (err) {
      toast.error("Failed to load bank statement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatement();
  }, []);

  /* ================= FILTERS ================= */

  const credits = transactions.filter(t => t.type === "credit");
  const debits = transactions.filter(t => t.type === "debit");

  /* ================= LEDGER ================= */

  const ledger = [...transactions].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  let runningBalance = 0;
  const ledgerWithBalance = ledger.map((t) => {
    runningBalance += t.type === "credit"
      ? Number(t.amount)
      : -Number(t.amount);

    return { ...t, runningBalance };
  });

  /* ================= UI ================= */

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Bank Account Statement</h2>
          <p className="text-sm text-gray-500">Notebook style bank register</p>
        </div>

        <Button variant="outline" size="sm" className="w-fit">
          <Download className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </div>

      <Tabs defaultValue="ledger">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
          <TabsTrigger value="ledger" className="text-xs sm:text-sm">Ledger</TabsTrigger>
          <TabsTrigger value="credit" className="text-xs sm:text-sm">Credit</TabsTrigger>
          <TabsTrigger value="debit" className="text-xs sm:text-sm">Debit</TabsTrigger>
        </TabsList>

        {/* ================= LEDGER ================= */}
        <TabsContent value="ledger">
          <Card className="bg-[#fdfdfb] border-l-4 border-blue-400">
            <CardHeader>
              <CardTitle>Bank Passbook</CardTitle>
            </CardHeader>

            <CardContent className="px-2 sm:px-6">
              {loading ? (
                <p className="text-center py-8">Loading…</p>
              ) : (
                isDesktop ? (
                  <div className="overflow-x-auto -mx-2 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Particulars</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {ledgerWithBalance.length > 0 ? (
                          ledgerWithBalance.map((t) => (
                            <TableRow key={t.id}>
                              <TableCell>{formatDate(t.date)}</TableCell>
                              <TableCell>{t.reference || t.category}</TableCell>

                              <TableCell className="text-right text-red-600">
                                {t.type === "debit" ? t.amount.toLocaleString() : "-"}
                              </TableCell>

                              <TableCell className="text-right text-green-600">
                                {t.type === "credit" ? t.amount.toLocaleString() : "-"}
                              </TableCell>

                              <TableCell className="text-right font-semibold">
                                ₹{t.runningBalance.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              No entries
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ledgerWithBalance.length > 0 ? (
                      ledgerWithBalance.map((t) => {
                        const isDebit = t.type === "debit";
                        return (
                          <Card key={t.id} className="w-full">
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-semibold text-gray-900 truncate">{t.reference || t.category || "—"}</p>
                                  <p className="text-sm text-gray-500 truncate">{formatDate(t.date)}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="text-xs text-gray-500">Balance</p>
                                  <p className="text-sm font-semibold text-gray-900">₹{Number(t.runningBalance || 0).toLocaleString()}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs text-gray-500">Debit</p>
                                  <p className={`text-sm font-semibold ${isDebit ? "text-red-600" : "text-gray-900"}`}>
                                    {isDebit ? `₹${Number(t.amount || 0).toLocaleString()}` : "—"}
                                  </p>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs text-gray-500">Credit</p>
                                  <p className={`text-sm font-semibold ${!isDebit ? "text-green-600" : "text-gray-900"}`}>
                                    {!isDebit ? `₹${Number(t.amount || 0).toLocaleString()}` : "—"}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-500 py-6 text-center">No entries</p>
                    )}
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= CREDIT ONLY ================= */}
        <TabsContent value="credit">
          <Card className="bg-[#fdfdfb] border-l-4 border-green-400">
            <CardHeader>
              <CardTitle>Credit Register</CardTitle>
            </CardHeader>

            <CardContent>
              {isDesktop ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Received From</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {credits.length > 0 ? (
                        credits.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell>{formatDate(t.date)}</TableCell>
                            <TableCell>{t.reference || t.category}</TableCell>
                            <TableCell className="text-right text-green-600">
                              ₹{t.amount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8">
                            No credit entries
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="space-y-3">
                  {credits.length > 0 ? (
                    credits.map((t) => (
                      <Card key={t.id} className="w-full">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{t.reference || t.category || "—"}</p>
                              <p className="text-sm text-gray-500 truncate">{formatDate(t.date)}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-xs text-gray-500">Amount</p>
                              <p className="text-sm font-semibold text-green-600">₹{Number(t.amount || 0).toLocaleString()}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 py-6 text-center">No credit entries</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= DEBIT ONLY ================= */}
        <TabsContent value="debit">
          <Card className="bg-[#fdfdfb] border-l-4 border-red-400">
            <CardHeader>
              <CardTitle>Debit Register</CardTitle>
            </CardHeader>

            <CardContent>
              {isDesktop ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Paid To</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {debits.length > 0 ? (
                        debits.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell>{formatDate(t.date)}</TableCell>
                            <TableCell>{t.reference || t.category}</TableCell>
                            <TableCell className="text-right text-red-600">
                              ₹{t.amount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8">
                            No debit entries
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="space-y-3">
                  {debits.length > 0 ? (
                    debits.map((t) => (
                      <Card key={t.id} className="w-full">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{t.reference || t.category || "—"}</p>
                              <p className="text-sm text-gray-500 truncate">{formatDate(t.date)}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-xs text-gray-500">Amount</p>
                              <p className="text-sm font-semibold text-red-600">₹{Number(t.amount || 0).toLocaleString()}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 py-6 text-center">No debit entries</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
