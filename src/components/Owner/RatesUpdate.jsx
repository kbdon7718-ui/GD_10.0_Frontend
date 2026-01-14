// src/components/Owners/RatesUpdate.jsx  (or wherever you keep it)
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
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Plus,
  Edit,
  Bell,
  TrendingUp,
  TrendingDown,
  UserPlus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "../../utils/currencyFormat";
import { useMediaQuery } from "../../utils/useMediaQuery";
import { getApiBaseUrl } from "../../utils/apiBaseUrl";
import { usePageRefresh } from "../../utils/pageRefreshContext";

/**
 * RatesUpdate component
 * - Manage global material rates and vendor-specific rates
 */
export default function RatesUpdate() {
  const API = getApiBaseUrl();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { setRefreshHandler } = usePageRefresh();
  // data
  const [materials, setMaterials] = useState([]); // global scrap_types
  const [vendors, setVendors] = useState([]); // vendors with rates

  // add material dialog
  const [addMaterialOpen, setAddMaterialOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    materialType: "",
    baseRate: "",
  });

  // edit global rate dialog
  const [editMaterialOpen, setEditMaterialOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [newGlobalRate, setNewGlobalRate] = useState("");

  // add vendor dialog
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: "",
    vendorType: "feriwala",
  });

  // set vendor rate dialog
  const [setVendorRateOpen, setSetVendorRateOpen] = useState(false);
  const [selectedVendorForRate, setSelectedVendorForRate] = useState(null);
  const [vendorRatesDraft, setVendorRatesDraft] = useState({});
  const [savingVendorRates, setSavingVendorRates] = useState(false);

  // fetch all
  const fetchAll = async () => {
    try {
      const [mRes, vRes] = await Promise.all([
        fetch(`${API}/api/rates/global`),
        fetch(`${API}/api/rates/vendors-with-rates`),
      ]);
      const mJson = await mRes.json();
      const vJson = await vRes.json();

      if (mRes.ok) setMaterials(mJson.materials || []);
      else {
        toast.error(mJson.error || "Failed to load materials");
        setMaterials([]);
      }

      if (vRes.ok) setVendors(vJson.vendors || []);
      else {
        toast.error(vJson.error || "Failed to load vendors");
        setVendors([]);
      }
    } catch (err) {
      toast.error("Failed to fetch rate data");
      console.error(err);
    }
  };

  useEffect(() => {
    setRefreshHandler(fetchAll);
    return () => setRefreshHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API]);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived stats (safe)
  const validMaterialRates = materials.filter(
    (m) => m && m.global_rate != null && !Number.isNaN(Number(m.global_rate))
  );

  const averageRate =
    validMaterialRates.length > 0
      ? validMaterialRates.reduce((s, m) => s + Number(m.global_rate || 0), 0) /
        validMaterialRates.length
      : 0;

  const lastUpdated = (() => {
    const validDates = materials
      .map((m) => {
        if (!m || !m.last_updated) return null;
        const d = new Date(m.last_updated);
        return isNaN(d.getTime()) ? null : d.getTime();
      })
      .filter(Boolean);
    if (validDates.length === 0) return "N/A";
    return new Date(Math.max(...validDates)).toLocaleDateString("en-IN");
  })();

  // safe delete handlers
  const handleDeleteMaterial = async (scrap_type_id) => {
    if (!window.confirm("Delete this material?")) return;

    try {
      const res = await fetch(
        `${API}/api/rates/delete-material/${scrap_type_id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("Material deleted");
        fetchAll();
      } else {
        toast.error(data.error || "Failed to delete material");
      }
    } catch (err) {
      toast.error("Failed to delete");
      console.error(err);
    }
  };

  const handleDeleteVendor = async (vendor_id) => {
    if (!window.confirm("Delete this vendor?")) return;

    try {
      const res = await fetch(`${API}/api/rates/delete-vendor/${vendor_id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("Vendor deleted");
        fetchAll();
      } else {
        toast.error(data.error || "Failed to delete vendor");
      }
    } catch (err) {
      toast.error("Failed to delete vendor");
      console.error(err);
    }
  };

  // Add material
  const handleAddMaterial = async () => {
    const name = (newMaterial.materialType || "").trim();
    const rate = Number(newMaterial.baseRate);
    if (!name || Number.isNaN(rate) || rate <= 0) {
      toast.error("Enter valid material name and base rate");
      return;
    }
    try {
      const res = await fetch(`${API}/api/rates/add-material`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          material_type: name,
          base_rate: rate,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to add");
      toast.success("Material added");
      setAddMaterialOpen(false);
      setNewMaterial({ materialType: "", baseRate: "" });
      fetchAll();
    } catch (err) {
      toast.error(err.message || "Failed to add material");
      console.error(err);
    }
  };

  // Update global
  const handleUpdateGlobal = async () => {
    if (!editingMaterial) {
      toast.error("No material selected");
      return;
    }
    const rate = Number(newGlobalRate);
    if (Number.isNaN(rate) || rate <= 0) {
      toast.error("Enter a valid new global rate");
      return;
    }
    try {
      const res = await fetch(`${API}/api/rates/update-global`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scrap_type_id: editingMaterial.id,
          new_global_rate: rate,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to update global rate");
      toast.success("Global rate updated and vendor rates adjusted");
      setEditMaterialOpen(false);
      setEditingMaterial(null);
      setNewGlobalRate("");
      fetchAll();
    } catch (err) {
      toast.error(err.message || "Failed to update global rate");
      console.error(err);
    }
  };

  // Add vendor
  const handleAddVendor = async () => {
    const name = (newVendor.name || "").trim();
    if (!name || !newVendor.vendorType) {
      toast.error("Enter vendor name and type");
      return;
    }
    try {
      const res = await fetch(`${API}/api/rates/add-vendor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          vendor_type: newVendor.vendorType,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to add vendor");
      toast.success("Vendor added");
      setAddVendorOpen(false);
      setNewVendor({ name: "", vendorType: "feriwala" });
      fetchAll();
    } catch (err) {
      toast.error(err.message || "Failed to add vendor");
      console.error(err);
    }
  };

  const handleSaveVendorRates = async () => {
    if (!selectedVendorForRate) {
      toast.error("Select vendor");
      return;
    }
    if (!materials || materials.length === 0) {
      toast.error("No materials available");
      return;
    }

    const rows = materials.map((m) => {
      const raw = vendorRatesDraft?.[m.id];
      const rate = Number(raw);
      return {
        id: m.id,
        name: m.material_type,
        rate,
      };
    });

    const invalid = rows.find((r) => Number.isNaN(r.rate) || r.rate <= 0);
    if (invalid) {
      toast.error(`Enter valid rate for ${invalid.name}`);
      return;
    }

    setSavingVendorRates(true);
    try {
      for (const r of rows) {
        const res = await fetch(`${API}/api/rates/set-vendor-rate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendor_id: selectedVendorForRate.vendor_id,
            scrap_type_id: r.id,
            vendor_rate: r.rate,
          }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || `Failed to set rate for ${r.name}`);
      }

      toast.success("Vendor rates saved");
      setSetVendorRateOpen(false);
      setSelectedVendorForRate(null);
      setVendorRatesDraft({});
      fetchAll();
    } catch (err) {
      toast.error(err.message || "Failed to save vendor rates");
      console.error(err);
    } finally {
      setSavingVendorRates(false);
    }
  };

  // helper to open set-vendor-rate modal with vendor
  const openSetRateModal = (vendor) => {
    setSelectedVendorForRate(vendor);
    const existing = new Map((vendor?.rates || []).map((r) => [r.scrap_type_id, r.vendor_rate]));
    const draft = {};
    (materials || []).forEach((m) => {
      const current = existing.get(m.id);
      draft[m.id] = current != null ? String(current) : String(m.global_rate ?? "");
    });
    setVendorRatesDraft(draft);
    setSetVendorRateOpen(true);
  };

  // Track previous rates for change calculation
  const previousRatesRef = React.useRef({});

  // After each fetch, update previousRatesRef
  useEffect(() => {
    if (materials && materials.length > 0) {
      const prev = previousRatesRef.current;
      materials.forEach((m) => {
        if (m && m.id) {
          prev[m.id] = prev[m.id] ?? m.global_rate;
        }
      });
      previousRatesRef.current = { ...prev };
    }
  }, [materials]);

  // Compute rate change for each material
  const getRateChange = (mat) => {
    if (!mat || !mat.id) return 0;
    const prev = previousRatesRef.current[mat.id];
    if (prev == null) return 0;
    const change = Number(mat.global_rate) - Number(prev);
    // If no change, show 0
    return change !== 0 ? change.toFixed(2) : "0";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-1">
            Material Rates Update
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
           
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setAddMaterialOpen(true)}
            size="sm"
            className="gap-2"
            aria-label="Add new material"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Material</span>
          </Button>

          <Dialog open={addVendorOpen} onOpenChange={setAddVendorOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" variant="outline">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Vendor</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Vendor</DialogTitle>
                <DialogDescription>Add a feriwala or kabadiwala</DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-4">
                <div>
                  <Label>Vendor Name</Label>
                  <Input
                    value={newVendor.name}
                    onChange={(e) =>
                      setNewVendor({ ...newVendor, name: e.target.value })
                    }
                    placeholder="Vendor name"
                  />
                </div>
                <div>
                  <Label>Vendor Type</Label>
                  <Select
                    value={newVendor.vendorType}
                    onValueChange={(v) =>
                      setNewVendor({ ...newVendor, vendorType: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feriwala">Feriwala (street collector)</SelectItem>
                      <SelectItem value="kabadiwala">Kabadiwala (scrap dealer)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setAddVendorOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddVendor}>Add Vendor</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      {/* Mobile-first: avoid 3 squeezed columns on phones */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
        <Card className="p-3">
          <p className="text-xs text-gray-500">Average Rate</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">{formatINR(averageRate)}/kg</p>
          <p className="text-xs text-gray-500 mt-1 hidden sm:block">
            Across {materials.length} materials
          </p>
        </Card>

        <Card className="p-3">
          <p className="text-xs text-gray-500">Total Materials</p>
          <p className="text-lg sm:text-2xl font-bold text-blue-600">{materials.length}</p>
          <p className="text-xs text-gray-500 mt-1 hidden sm:block">Active scrap types</p>
        </Card>

        <Card className="p-3">
          <p className="text-xs text-gray-500">Last Updated</p>
          <p className="text-lg sm:text-2xl font-bold text-purple-600">{lastUpdated}</p>
          <p className="text-xs text-gray-500 mt-1 hidden sm:block">Most recent update</p>
        </Card>
      </div>

      {/* GLOBAL RATES TABLE */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Global Scrap Rates
        </h3>
        <Card>
        <CardHeader>
          {/*
            Mobile-first header:
            - Stack buttons vertically on phones.
            - Keep row layout only on `sm+`.
          */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Global Material Rates</CardTitle>
              <CardDescription>
                Update global base rates here. Vendor rates will adjust keeping their offset.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setAddMaterialOpen(true)}
                className="gap-2 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" /> Add Material
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  toast("Use edit button on each row to change rate");
                }}
                className="w-full sm:w-auto"
              >
                <Bell className="h-4 w-4" /> Notify Vendors
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/*
            Mobile UX fix:
            - Replace desktop table with cards on < md.
            - Keep table only on md+.
            - Prevent horizontal scrolling on phones.
          */}
          {isDesktop ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Global Rate (₹/kg)</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {materials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No materials
                      </TableCell>
                    </TableRow>
                  ) : (
                    materials.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{m.material_type}</TableCell>
                        <TableCell className="font-semibold">{formatINR(m.global_rate)}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {m.last_updated ? new Date(m.last_updated).toLocaleDateString("en-IN") : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getRateChange(m) > 0 ? (
                              <span className="inline-flex items-center gap-1 text-green-600">
                                <TrendingUp className="h-3 w-3" /> ₹{getRateChange(m)}/kg
                              </span>
                            ) : getRateChange(m) < 0 ? (
                              <span className="inline-flex items-center gap-1 text-red-600">
                                <TrendingDown className="h-3 w-3" /> ₹{getRateChange(m)}/kg
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                ₹0/kg
                              </span>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingMaterial(m);
                              setNewGlobalRate(m.global_rate ?? "");
                              setEditMaterialOpen(true);
                            }}
                            aria-label={`Edit ${m.material_type}`}
                          >
                            <Edit className="h-4 w-4" /> Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteMaterial(m.id)}
                            aria-label={`Delete ${m.material_type}`}
                          >
                            <Trash2 className="h-4 w-4" /> Delete
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
              {materials.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">No materials</p>
              ) : (
                materials.map((m) => (
                  <Card key={m.id} className="w-full">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{m.material_type}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Updated: {m.last_updated ? new Date(m.last_updated).toLocaleDateString("en-IN") : "—"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Global Rate</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatINR(m.global_rate)}/kg</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="max-w-full">
                          {getRateChange(m) > 0 ? (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <TrendingUp className="h-3 w-3" /> ₹{getRateChange(m)}/kg
                            </span>
                          ) : getRateChange(m) < 0 ? (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <TrendingDown className="h-3 w-3" /> ₹{getRateChange(m)}/kg
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              ₹0/kg
                            </span>
                          )}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingMaterial(m);
                            setNewGlobalRate(m.global_rate ?? "");
                            setEditMaterialOpen(true);
                          }}
                          aria-label={`Edit ${m.material_type}`}
                        >
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteMaterial(m.id)}
                          aria-label={`Delete ${m.material_type}`}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
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

      {/* VENDORS + RATES */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Vendor Rates
        </h3>
        <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Vendors & Their Rates</CardTitle>
              <CardDescription>
                Assign and view per-vendor rates for each material
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Mobile: cards. Desktop: table. */}
          {isDesktop ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rates</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {vendors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        No vendors
                      </TableCell>
                    </TableRow>
                  ) : (
                    vendors.map((v) => (
                      <TableRow key={v.vendor_id}>
                        <TableCell>{v.vendor_name}</TableCell>
                        <TableCell className="capitalize">{v.type}</TableCell>
                        <TableCell>
                          {v.rates?.length === 0 ? (
                            <span className="text-sm text-gray-500">No rates set</span>
                          ) : (
                            <div className="flex gap-2 flex-wrap">
                              {v.rates.map((r) => (
                                <Badge key={r.scrap_type_id} className="gap-2">
                                  {r.scrap_type}: {formatINR(r.vendor_rate)} ({r.rate_offset >= 0 ? `+${formatINR(r.rate_offset)}` : formatINR(r.rate_offset)})
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right flex gap-2 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => openSetRateModal(v)}>
                            <Save className="h-4 w-4" /> Set Rate
                          </Button>

                          <Button size="sm" variant="destructive" onClick={() => handleDeleteVendor(v.vendor_id)}>
                            <Trash2 className="h-4 w-4" /> Delete
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
              {vendors.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">No vendors</p>
              ) : (
                vendors.map((v) => (
                  <Card key={v.vendor_id} className="w-full">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{v.vendor_name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{v.type}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 shrink-0">
                          <Button size="sm" variant="outline" onClick={() => openSetRateModal(v)}>
                            <Save className="h-4 w-4 mr-1" /> Set
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteVendor(v.vendor_id)}>
                            <Trash2 className="h-4 w-4 mr-1" /> Del
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Rates</p>
                        {v.rates?.length === 0 ? (
                          <p className="text-sm text-gray-500">No rates set</p>
                        ) : (
                          <div className="space-y-2">
                            {v.rates.map((r) => (
                              <div key={r.scrap_type_id} className="rounded-md border bg-white dark:bg-gray-900 px-3 py-2">
                                <div className="flex items-start justify-between gap-3">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.scrap_type}</p>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white shrink-0">{formatINR(r.vendor_rate)}</p>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Offset: {r.rate_offset >= 0 ? `+${formatINR(r.rate_offset)}` : formatINR(r.rate_offset)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
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

      {/* DIALOGS */}

      {/* Add Material Dialog */}
      <Dialog open={addMaterialOpen} onOpenChange={setAddMaterialOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Material</DialogTitle>
            <DialogDescription>
              Add a new scrap material and global base rate
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Material Type</Label>
              <Input
                value={newMaterial.materialType}
                onChange={(e) => setNewMaterial({ ...newMaterial, materialType: e.target.value })}
                placeholder="Iron, Plastic..."
              />
            </div>
            <div>
              <Label>Base Rate (₹/kg)</Label>
              <Input
                type="number"
                value={newMaterial.baseRate}
                onChange={(e) => setNewMaterial({ ...newMaterial, baseRate: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMaterialOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMaterial}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Global Rate Dialog */}
      <Dialog open={editMaterialOpen} onOpenChange={setEditMaterialOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Global Rate</DialogTitle>
            <DialogDescription>
              Change global rate; vendor rates will be adjusted preserving offsets.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Material</Label>
              <Input value={editingMaterial?.material_type || ""} disabled />
            </div>
            <div>
              <Label>New Global Rate (₹/kg)</Label>
              <Input type="number" value={newGlobalRate} onChange={(e) => setNewGlobalRate(e.target.value)} />
              <p className="text-xs text-gray-500 mt-1">Current: ₹{formatINR(editingMaterial?.global_rate || 0)}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMaterialOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateGlobal}>Update Global</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Vendor Rate Dialog */}
      <Dialog open={setVendorRateOpen} onOpenChange={setSetVendorRateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Set Vendor Rate</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Vendor</Label>
              <Input value={selectedVendorForRate?.vendor_name || ""} disabled />
            </div>

            <div className="rounded-md border overflow-hidden">
              <div className="grid grid-cols-2 gap-2 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 bg-background">
                <div className="truncate">Scrap Type</div>
                <div className="text-right">Rate (₹/kg)</div>
              </div>
              <div className="max-h-[55vh] overflow-y-auto divide-y">
                {materials.map((m) => (
                  <div key={m.id} className="grid grid-cols-2 gap-2 px-3 py-2 items-center">
                    <div className="truncate text-sm text-gray-900 dark:text-white">{m.material_type}</div>
                    <div className="flex justify-end">
                      <Input
                        type="number"
                        className="w-32 text-right"
                        value={vendorRatesDraft?.[m.id] ?? ""}
                        onChange={(e) =>
                          setVendorRatesDraft((prev) => ({
                            ...(prev || {}),
                            [m.id]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSetVendorRateOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveVendorRates} disabled={savingVendorRates}>
              {savingVendorRates ? "Saving..." : "Save Rates"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
