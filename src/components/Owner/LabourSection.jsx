import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Plus,
  RefreshCcw,
  User,
  Truck,
  FileSpreadsheet,
  Edit,
  Trash2,
} from "lucide-react";
import { formatINR } from "../../utils/currencyFormat";
import { toast } from "sonner";
import { OwnerReadOnlyBadge } from "./OwnerBadge";
import { useMediaQuery } from "../../utils/useMediaQuery";
import { ResizableHistoryModal } from "./ResizableHistoryModal";
import { getApiBaseUrl } from "../../utils/apiBaseUrl";

export function LabourSection() {
  const API_URL = getApiBaseUrl();
  const COMPANY_ID = "2f762c5e-5274-4a65-aa66-15a7642a1608";
  const GODOWN_ID = "fbf61954-4d32-4cb4-92ea-d0fe3be01311";

  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [activeTab, setActiveTab] = useState("labour");
  const [labours, setLabours] = useState([]);
  const [salarySummary, setSalarySummary] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);

  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerWorker, setLedgerWorker] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerTotals, setLedgerTotals] = useState(null);

  const [newWorker, setNewWorker] = useState({
    name: "",
    contact: "",
    role: "",
    worker_type: "Labour",
    daily_wage: 0,
    monthly_salary: 0,
    per_kg_rate: 0,
  });

  /* ================= FETCH ================= */

  const fetchLabours = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/labour/all?company_id=${COMPANY_ID}&godown_id=${GODOWN_ID}`
      );
      const data = await res.json();
      if (res.ok && data.success) setLabours(data.labour || []);
      else toast.error(data.error || "Failed to fetch workers");
    } catch {
      toast.error("Connection error");
    }
  };

  const fetchSalarySummary = async () => {
    try {
      setSummaryLoading(true);
      const res = await fetch(
        `${API_URL}/api/labour/salary/summary?company_id=${COMPANY_ID}&godown_id=${GODOWN_ID}`
      );
      const data = await res.json();
      if (res.ok && data.success) setSalarySummary(data.summary || []);
      else toast.error(data.error || "Failed to load summary");
    } catch {
      toast.error("Error loading summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchLabours();
  }, []);

  useEffect(() => {
    if (activeTab === "summary") fetchSalarySummary();
  }, [activeTab, reloadKey]);

  /* ================= ADD ================= */

  const handleAddWorker = async () => {
    if (!newWorker.name || !newWorker.contact) {
      toast.error("Please fill required fields");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/labour/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: COMPANY_ID,
          godown_id: GODOWN_ID,
          ...newWorker,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Worker added");
        setIsAddDialogOpen(false);
        setNewWorker({
          name: "",
          contact: "",
          role: "",
          worker_type: "Labour",
          daily_wage: 0,
          monthly_salary: 0,
          per_kg_rate: 0,
        });
        fetchLabours();
      } else toast.error(data.error || "Failed to add worker");
    } catch {
      toast.error("Connection error");
    }
  };

  /* ================= EDIT / DELETE ================= */

  const openEditWorker = (worker) => {
    setEditingWorker({ ...worker });
    setEditOpen(true);
  };

  const handleUpdateWorker = async () => {
    try {
      const res = await fetch(`${API_URL}/api/labour/${editingWorker.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: COMPANY_ID,
          godown_id: GODOWN_ID,
          ...editingWorker,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Worker updated");
        setEditOpen(false);
        fetchLabours();
        setReloadKey((k) => k + 1);
      } else toast.error(data.error || "Update failed");
    } catch {
      toast.error("Connection error");
    }
  };

  const handleDeleteWorker = async () => {
    if (!window.confirm("Delete this worker? This cannot be undone.")) return;

    try {
      const res = await fetch(
        `${API_URL}/api/labour/${editingWorker.id}`,
        { method: "DELETE" }
      );
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("Worker deleted");
        setEditOpen(false);
        fetchLabours();
        setReloadKey((k) => k + 1);
      } else toast.error(data.error || "Delete failed");
    } catch {
      toast.error("Connection error");
    }
  };

  /* ================= FILTER ================= */

  const labourWorkers = labours.filter((w) => w.worker_type === "Labour");
  const contractors = labours.filter((w) => w.worker_type === "Contractor");

  /* ================= LEDGER ================= */

  const getDisplayName = (obj) => {
    const name =
      obj?.name ??
      obj?.labour_name ??
      obj?.worker_name ??
      obj?.full_name ??
      obj?.labour?.name ??
      obj?.worker?.name;

    return typeof name === "string" && name.trim().length > 0 ? name : "—";
  };

  const loadLedger = async (worker) => {
    try {
      setLedgerWorker(worker);
      setLedgerOpen(true);
      setLedgerLoading(true);

      const res = await fetch(
        `${API_URL}/api/labour/history/${worker.id}?company_id=${COMPANY_ID}&godown_id=${GODOWN_ID}`
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load ledger");
      }

      setLedgerEntries(data.entries || []);
      setLedgerTotals(data.totals || null);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to load ledger");
      setLedgerOpen(false);
      setLedgerWorker(null);
      setLedgerEntries([]);
      setLedgerTotals(null);
    } finally {
      setLedgerLoading(false);
    }
  };

  const closeLedger = () => {
    setLedgerOpen(false);
    setLedgerWorker(null);
    setLedgerEntries([]);
    setLedgerTotals(null);
  };

  /* ================= UI ================= */

  // Mobile rendering helper: stacked key/value rows instead of desktop tables.
  // Keeps business logic identical; only changes layout for < md.
  const KV = ({ label, value, className = "" }) => (
    <div className={`min-w-0 ${className}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm text-gray-900 dark:text-white truncate">{value ?? "—"}</p>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* HEADER */}
      {/*
        Mobile-first header:
        - Stack actions vertically on phones.
        - Keep a single row only on `sm+`.
      */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-gray-900 dark:text-white mb-1">
            Labour & Contractor Register
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Notebook-style labour records
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="w-fit">
            <OwnerReadOnlyBadge />
          </div>

          <Button onClick={fetchLabours} variant="outline" className="w-full sm:w-auto">
            <RefreshCcw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-1" /> Add Worker
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/*
          Mobile UX fix:
          - Avoid `w-max` which can force horizontal scrolling on long tab labels.
          - Use full-width grid so tabs wrap/fit within viewport.
        */}
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="labour" className="text-xs sm:text-sm">
            <User className="w-4 h-4 mr-1 hidden sm:inline" />Labours
          </TabsTrigger>
          <TabsTrigger value="contractor" className="text-xs sm:text-sm">
            <Truck className="w-4 h-4 mr-1 hidden sm:inline" />Contractors
          </TabsTrigger>
          <TabsTrigger value="summary" className="text-xs sm:text-sm">
            <FileSpreadsheet className="w-4 h-4 mr-1 hidden sm:inline" />Salary Summary
          </TabsTrigger>
        </TabsList>

        {/* NOTEBOOK PAGE */}
        <Card className="bg-white dark:bg-gray-900 border-l-4 border-red-300 shadow-md">
          <CardHeader className="border-b bg-white dark:bg-gray-800">
            <CardTitle>
              {activeTab === "labour" && "Labour Register"}
              {activeTab === "contractor" && "Contractor Register"}
              {activeTab === "summary" && "Salary Summary Register"}
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-4">
            {/* LABOUR */}
            <TabsContent value="labour">
              {isDesktop ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Daily Wage</TableHead>
                        <TableHead>Monthly Salary</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {labourWorkers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No workers
                          </TableCell>
                        </TableRow>
                      ) : (
                        labourWorkers.map((w) => (
                          <TableRow key={w.id}>
                            <TableCell>{w.name}</TableCell>
                            <TableCell>{w.contact}</TableCell>
                            <TableCell>{w.role}</TableCell>
                            <TableCell>{formatINR(w.daily_wage)}</TableCell>
                            <TableCell>{formatINR(w.monthly_salary)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => loadLedger(w)}
                                >
                                  View History
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditWorker(w)}
                                >
                                  <Edit className="w-4 h-4 mr-1" /> Edit
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="space-y-3">
                  {labourWorkers.length === 0 ? (
                    <p className="text-sm text-gray-500 py-6 text-center">No workers found</p>
                  ) : (
                    labourWorkers.map((w) => (
                      <Card key={w.id} className="w-full">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-white truncate">{w.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{w.role || "—"}</p>
                            </div>
                            <div className="shrink-0 flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => loadLedger(w)}
                              >
                                History
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditWorker(w)}
                              >
                                <Edit className="w-4 h-4 mr-1" /> Edit
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <KV label="Contact" value={w.contact} />
                            <KV label="Daily Wage" value={formatINR(w.daily_wage)} />
                            <KV
                              label="Monthly Salary"
                              value={formatINR(w.monthly_salary)}
                              className="col-span-2"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </TabsContent>

            {/* CONTRACTOR */}
            <TabsContent value="contractor">
              {isDesktop ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Per Kg Rate</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contractors.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            No contractors
                          </TableCell>
                        </TableRow>
                      ) : (
                        contractors.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>{c.name}</TableCell>
                            <TableCell>{c.contact}</TableCell>
                            <TableCell>{c.role}</TableCell>
                            <TableCell>{formatINR(c.per_kg_rate)}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => openEditWorker(c)}>
                                <Edit className="w-4 h-4 mr-1" /> Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="space-y-3">
                  {contractors.length === 0 ? (
                    <p className="text-sm text-gray-500 py-6 text-center">No contractors found</p>
                  ) : (
                    contractors.map((c) => (
                      <Card key={c.id} className="w-full">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-white truncate">{c.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{c.role || "—"}</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => openEditWorker(c)} className="shrink-0">
                              <Edit className="w-4 h-4 mr-1" /> Edit
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <KV label="Contact" value={c.contact} />
                            <KV label="Per Kg Rate" value={formatINR(c.per_kg_rate)} />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </TabsContent>

            {/* SUMMARY */}
            <TabsContent value="summary">
              {summaryLoading ? (
                <p className="text-center py-10">Loading…</p>
              ) : (
                <>
                  {isDesktop ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Joining Date</TableHead>
                            <TableHead>Present Days</TableHead>
                            <TableHead>Total Earned</TableHead>
                            <TableHead>Total Paid</TableHead>
                            <TableHead>Remaining</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salarySummary.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                No summary
                              </TableCell>
                            </TableRow>
                          ) : (
                            salarySummary.map((r) => (
                              <TableRow key={r.labour_id}>
                                <TableCell>{getDisplayName(r)}</TableCell>
                                <TableCell>
                                  {r.joining_date
                                    ? new Date(r.joining_date).toLocaleDateString()
                                    : "—"}
                                </TableCell>
                                <TableCell>{r.present_days}</TableCell>
                                <TableCell>{formatINR(r.total_earned)}</TableCell>
                                <TableCell>{formatINR(r.total_paid)}</TableCell>
                                <TableCell className={r.net_balance >= 0 ? "text-green-600" : "text-red-600"}>
                                  {formatINR(r.net_balance)}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {salarySummary.length === 0 ? (
                        <p className="text-sm text-gray-500 py-6 text-center">No summary available</p>
                      ) : (
                        salarySummary.map((r) => (
                          <Card key={r.labour_id} className="w-full">
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-semibold text-gray-900 dark:text-white truncate">{getDisplayName(r)}</p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Joining: {r.joining_date ? new Date(r.joining_date).toLocaleDateString() : "—"}
                                  </p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Remaining</p>
                                  <p className={`text-sm font-semibold ${r.net_balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {formatINR(r.net_balance)}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <KV label="Present Days" value={r.present_days} />
                                <KV label="Total Earned" value={formatINR(r.total_earned)} />
                                <KV label="Total Paid" value={formatINR(r.total_paid)} />
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      {/* EDIT DIALOG (UNCHANGED LOGIC) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Worker</DialogTitle>
          </DialogHeader>

          {editingWorker && (
            <div className="space-y-3">
              <Label>Name</Label>
              <Input value={editingWorker.name} onChange={(e) => setEditingWorker({ ...editingWorker, name: e.target.value })} />

              <Label>Contact</Label>
              <Input value={editingWorker.contact} onChange={(e) => setEditingWorker({ ...editingWorker, contact: e.target.value })} />

              <Label>Role</Label>
              <Input value={editingWorker.role} onChange={(e) => setEditingWorker({ ...editingWorker, role: e.target.value })} />

              {editingWorker.worker_type === "Labour" ? (
                <>
                  <Label>Daily Wage</Label>
                  <Input type="number" value={editingWorker.daily_wage} onChange={(e) => setEditingWorker({ ...editingWorker, daily_wage: Number(e.target.value) })} />
                  <Label>Monthly Salary</Label>
                  <Input type="number" value={editingWorker.monthly_salary} onChange={(e) => setEditingWorker({ ...editingWorker, monthly_salary: Number(e.target.value) })} />
                </>
              ) : (
                <>
                  <Label>Per Kg Rate</Label>
                  <Input type="number" value={editingWorker.per_kg_rate} onChange={(e) => setEditingWorker({ ...editingWorker, per_kg_rate: Number(e.target.value) })} />
                </>
              )}
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button variant="destructive" onClick={handleDeleteWorker}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
            <Button onClick={handleUpdateWorker}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD WORKER DIALOG */}
<Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
  <DialogContent className="max-h-[90dvh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Add Worker</DialogTitle>
    </DialogHeader>

    <div className="space-y-3">
      <div>
        <Label>Worker Type</Label>
        <Select
          value={newWorker.worker_type}
          onValueChange={(val) =>
            setNewWorker({ ...newWorker, worker_type: val })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Labour">Labour</SelectItem>
            <SelectItem value="Contractor">Contractor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Name *</Label>
        <Input
          value={newWorker.name}
          onChange={(e) =>
            setNewWorker({ ...newWorker, name: e.target.value })
          }
        />
      </div>

      <div>
        <Label>Contact *</Label>
        <Input
          value={newWorker.contact}
          onChange={(e) =>
            setNewWorker({ ...newWorker, contact: e.target.value })
          }
        />
      </div>

      <div>
        <Label>Role</Label>
        <Input
          value={newWorker.role}
          onChange={(e) =>
            setNewWorker({ ...newWorker, role: e.target.value })
          }
        />
      </div>

      {newWorker.worker_type === "Labour" ? (
        <>
          <div>
            <Label>Daily Wage (₹)</Label>
            <Input
              type="number"
              value={newWorker.daily_wage}
              onChange={(e) =>
                setNewWorker({
                  ...newWorker,
                  daily_wage: Number(e.target.value),
                })
              }
            />
          </div>

          <div>
            <Label>Monthly Salary (₹)</Label>
            <Input
              type="number"
              value={newWorker.monthly_salary}
              onChange={(e) =>
                setNewWorker({
                  ...newWorker,
                  monthly_salary: Number(e.target.value),
                })
              }
            />
          </div>
        </>
      ) : (
        <div>
          <Label>Per Kg Rate (₹)</Label>
          <Input
            type="number"
            value={newWorker.per_kg_rate}
            onChange={(e) =>
              setNewWorker({
                ...newWorker,
                per_kg_rate: Number(e.target.value),
              })
            }
          />
        </div>
      )}
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleAddWorker}>
        Add Worker
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

      {/* LABOUR LEDGER MODAL */}
      <ResizableHistoryModal
        isOpen={ledgerOpen}
        onClose={closeLedger}
        title={ledgerWorker ? `Ledger — ${getDisplayName(ledgerWorker)}` : "Ledger"}
        defaultWidth={1000}
        defaultHeight={650}
      >
        {ledgerLoading ? (
          <p className="text-center py-8 text-gray-500">Loading…</p>
        ) : !ledgerWorker ? (
          <p className="text-center py-8 text-gray-500">No worker selected</p>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 grid grid-cols-2 gap-3">
                <KV label="Name" value={getDisplayName(ledgerWorker)} />
                <KV label="Role" value={ledgerWorker.role || "—"} />
                <KV label="Contact" value={ledgerWorker.contact || "—"} />
                <KV label="Daily Wage" value={formatINR(ledgerWorker.daily_wage)} />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500">Total Earned</p>
                  <p className="text-lg font-semibold">{formatINR(ledgerTotals?.total_earned)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500">Total Paid</p>
                  <p className="text-lg font-semibold">{formatINR(ledgerTotals?.total_paid)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500">Remaining</p>
                  <p className={`text-lg font-semibold ${(Number(ledgerTotals?.remaining || 0) >= 0) ? "text-green-600" : "text-red-600"}`}>
                    {formatINR(Number(ledgerTotals?.remaining || 0))}
                  </p>
                </CardContent>
              </Card>
            </div>

            {ledgerEntries.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <FileSpreadsheet className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Transaction History</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  No salary payments, withdrawals, or expenses found for this worker. History will appear here once transactions are recorded.
                </p>
              </div>
            ) : isDesktop ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
  {(() => {
    let running = 0;

    return ledgerEntries.map((e, idx) => {
      const amt = Number(e.amount ?? 0);

      // Decide balance effect safely
      let delta = 0;
      if (e.entry_type === "Salary") {
        delta = amt;            // credit
      } else if (e.entry_type === "Payment") {
        delta = -amt;           // debit
      } else {
        // fallback for future entry types
        delta = Number(e.delta ?? 0);
      }

      running += delta;

      const isCredit = delta >= 0;

      return (
        <TableRow key={idx}>
          <TableCell>
            {e.date ? new Date(e.date).toLocaleDateString() : "—"}
          </TableCell>

          <TableCell>{e.entry_type || "—"}</TableCell>

          <TableCell>{e.mode || "—"}</TableCell>

          <TableCell
            className={`text-right font-medium ${
              isCredit ? "text-green-700" : "text-red-700"
            }`}
          >
            {formatINR(amt)}
          </TableCell>

          <TableCell className="text-right font-semibold">
            {formatINR(running)}
          </TableCell>

          <TableCell className="text-sm text-gray-600 dark:text-gray-400">
            {e.remarks || (e.entry_type === "Expense" ? e.description : "—")}
          </TableCell>
        </TableRow>
      );
    });
  })()}
</TableBody>

                </Table>
              </div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  let running = 0;
                  return ledgerEntries.map((e, idx) => {
                    const amt = Number(e.amount || 0);
                    const isSalary = e.entry_type === "Salary";
                    running += isSalary ? amt : -amt;
                    return (
                      <Card key={idx}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  e.entry_type === 'Salary' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                  e.entry_type === 'Payment' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                  'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                                }`}>
                                  {e.entry_type}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {e.mode || "—"}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {e.date ? new Date(e.date).toLocaleDateString() : "—"}
                              </p>
                              {(e.remarks || (e.entry_type === "Expense" && e.description)) && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  {e.remarks || e.description}
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-sm font-semibold ${
                                e.entry_type === 'Salary' ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {e.entry_type === 'Salary' ? '+' : '-'}{formatINR(amt)}
                              </p>
                              <p className="text-xs text-gray-500">Bal: {formatINR(running)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}
      </ResizableHistoryModal>

    </div>
  );
}