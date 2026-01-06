import React, { useEffect, useState } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { Calendar as CalendarComponent } from "../ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
} from "lucide-react";
import { formatDate, getTodayISO } from "../../utils/dateFormat";
import { toast } from "sonner";
import { useMediaQuery } from "../../utils/useMediaQuery";
import { getApiBaseUrl } from "../../utils/apiBaseUrl";
import { usePageRefresh } from "../../utils/pageRefreshContext";

export function DailyDataBook() {
  const { setRefreshHandler } = usePageRefresh();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const todayISO = getTodayISO();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterDate, setFilterDate] = useState(todayISO);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [slideDir, setSlideDir] = useState("right");

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const API_URL = getApiBaseUrl();
  const COMPANY_ID = "2f762c5e-5274-4a65-aa66-15a7642a1608";
  const GODOWN_ID = "fbf61954-4d32-4cb4-92ea-d0fe3be01311";

  /* ================= FETCH ================= */

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_URL}/api/expenses/list?company_id=${COMPANY_ID}&godown_id=${GODOWN_ID}&date=${filterDate}`
      );
      const data = await res.json();
      if (data.success) setExpenses(data.expenses || []);
      else toast.error("Failed to fetch expenses");
    } catch {
      toast.error("Error fetching expenses");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/expenses/summary?company_id=${COMPANY_ID}&godown_id=${GODOWN_ID}&start_date=${filterDate}&end_date=${filterDate}`
      );
      const data = await res.json();
      if (data.success) setSummary(data.summary);
    } catch {}
  };

  useEffect(() => {
    fetchExpenses();
    fetchSummary();
    // NOTE: fetchExpenses/fetchSummary are declared inline and depend on filterDate.
    // Keeping only [filterDate] avoids extra re-renders/refetch cycles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDate]);


  /* ================= DATE NAV ================= */

  const goToDate = (date, dir) => {
    setSlideDir(dir);
    setSelectedDate(date);
    setFilterDate(date.toLocaleDateString("en-CA"));
  };

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    goToDate(d, "left");
  };

  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    goToDate(d, "right");
  };

  /* ================= DELETE ================= */

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense?")) return;

    try {
      const res = await fetch(`${API_URL}/api/expenses/delete/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Expense deleted");
        fetchExpenses();
        fetchSummary();
      } else toast.error("Delete failed");
    } catch {
      toast.error("Delete error");
    }
  };

  /* ================= UPDATE ================= */

  const handleUpdate = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/expenses/update/${editingExpense.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingExpense),
        }
      );
      const data = await res.json();
      if (!data.success) throw new Error();
      toast.success("Expense updated");
      setEditOpen(false);
      fetchExpenses();
      fetchSummary();
    } catch {
      toast.error("Update failed");
    }
  };

  const totalExpense = Number(summary?.total_amount || 0);

  /* ================= EXPORT ================= */
  const handleExport = () => {
    if (!expenses.length) {
      toast.error("No data to export");
      return;
    }
    // Prepare CSV header
    const header = [
      "Category",
      "Description",
      "Paid To",
      "Mode",
      "Amount",
      "Date"
    ];
    // Prepare CSV rows
    const rows = expenses.map((e) => [
      e.category,
      e.description,
      e.paid_to,
      e.payment_mode,
      e.amount,
      e.date ? formatDate(e.date) : ""
    ]);
    // Combine header and rows
    const csvContent = [header, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    // Create blob and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expenses_${filterDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Exported as CSV");
  };

  // Refresh button handler
  const handleRefresh = () => {
    fetchExpenses();
    fetchSummary();
    toast.success("Data refreshed");
  };

  useEffect(() => {
    setRefreshHandler(handleRefresh);
    return () => setRefreshHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDate]);

  /* ================= UI ================= */


  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Daily Data Book
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
           
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Calendar className="w-4 h-4" />
                {filterDate === todayISO ? "Today" : formatDate(filterDate)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && goToDate(d, "right")}
              />
            </PopoverContent>
          </Popover>

          <Button className="bg-green-600" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* NOTEBOOK */}
      <div className="relative overflow-hidden">
        <button
          onClick={prevDay}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2"
        >
          <ChevronLeft />
        </button>

        <button
          onClick={nextDay}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2"
        >
          <ChevronRight />
        </button>

        <div
          className={`transition-transform duration-300 ${
            slideDir === "left" ? "-translate-x-2" : "translate-x-2"
          }`}
        >
          <Card className="bg-[#fdfdfb] border-l-4 border-red-300 shadow-md">
            <CardHeader className="border-b">
              <CardTitle className="flex justify-between">
                <span>{formatDate(filterDate)}</span>
                <span className="text-red-600">
                  Total ₹{totalExpense.toLocaleString()}
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent>
              {loading ? (
                <p className="text-center py-10">Loading page…</p>
              ) : (
                <>
                  {expenses.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">
                      No entries for this day
                    </p>
                  ) : isDesktop ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Paid To</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {expenses.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell>{e.category}</TableCell>
                            <TableCell>{e.description}</TableCell>
                            <TableCell>{e.paid_to}</TableCell>
                            <TableCell>{e.payment_mode}</TableCell>
                            <TableCell className="text-red-600 font-semibold">
                              ₹{Number(e.amount).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingExpense(e);
                                    setEditOpen(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDelete(e.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="space-y-3">
                      {expenses.map((e) => (
                        <Card key={e.id} className="border">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <CardTitle className="text-base truncate">
                                  {e.category}
                                </CardTitle>
                                <p className="text-sm text-gray-600 break-words">
                                  {e.description || "—"}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-semibold text-red-600">
                                  ₹{Number(e.amount).toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {e.payment_mode || "—"}
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <div className="text-xs text-gray-500">Paid To</div>
                                <div className="font-medium break-words">
                                  {e.paid_to || "—"}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingExpense(e);
                                  setEditOpen(true);
                                }}
                              >
                                <Edit className="w-4 h-4 mr-2" /> Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(e.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>

          {editingExpense && (
            <div className="space-y-4">
              <div>
                <Label>Category</Label>
                <Input
                  value={editingExpense.category}
                  onChange={(e) =>
                    setEditingExpense({ ...editingExpense, category: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  value={editingExpense.description}
                  onChange={(e) =>
                    setEditingExpense({ ...editingExpense, description: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Paid To</Label>
                <Input
                  value={editingExpense.paid_to}
                  onChange={(e) =>
                    setEditingExpense({ ...editingExpense, paid_to: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={editingExpense.amount}
                  onChange={(e) =>
                    setEditingExpense({ ...editingExpense, amount: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
