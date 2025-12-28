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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { formatDate } from "../../utils/dateFormat";
import { useMediaQuery } from "../../utils/useMediaQuery";
import { getApiBaseUrl } from "../../utils/apiBaseUrl";


export function TruckDriverManager() {
  const API_URL = getApiBaseUrl();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [truckRecords, setTruckRecords] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    driverName: "",
    vehicleNumber: "",
    tripDetails: "",
    cost: 0,
    fuelCost: 0,
    miscellaneous: 0,
    amountPaid: 0,
  });

  const company_id = "2f762c5e-5274-4a65-aa66-15a7642a1608";
  const godown_id = "fbf61954-4d32-4cb4-92ea-d0fe3be01311";

  // ✅ Fetch existing truck records
  const fetchTruckRecords = async () => {
  try {
    const res = await fetch(
      `${API_URL}/api/truck/all?company_id=${company_id}&godown_id=${godown_id}`
    );
    const data = await res.json();

    if (data.success) {
      const today = new Date().toISOString().split("T")[0];

      const todaysRecords = data.trucks.filter(
        (t) => t.date.split("T")[0] === today
      );

      setTruckRecords(todaysRecords);
    } else toast.error("Failed to fetch records");
  } catch (err) {
    toast.error("Error connecting to backend");
    console.error(err);
  }
};

  useEffect(() => {
    fetchTruckRecords();
  }, []);

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      driverName: "",
      vehicleNumber: "",
      tripDetails: "",
      cost: 0,
      fuelCost: 0,
      miscellaneous: 0,
      amountPaid: 0,
    });
    setIsAdding(false);
    setEditingId(null);
  };

  // ✅ Add or Update Record
  const handleSubmit = async (e) => {
    e.preventDefault();
    const returnAmount =
      parseFloat(formData.amountPaid || 0) -
      parseFloat(formData.fuelCost || 0) -
      parseFloat(formData.miscellaneous || 0);

    const record = {
      company_id,
      godown_id,
      date: formData.date,
      driver_name: formData.driverName,
      vehicle_number: formData.vehicleNumber,
      trip_details: formData.tripDetails,
      cost: formData.cost,
      fuel_cost: formData.fuelCost,
      miscellaneous: formData.miscellaneous,
      amount_paid: formData.amountPaid,
      return_amount: returnAmount,
    };

    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `${API_URL}/api/truck/update/${editingId}`
        : `${API_URL}/api/truck/add`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(editingId ? "Record updated!" : "Record added!");
        fetchTruckRecords();
        resetForm();
      } else toast.error(data.error || "Failed to save record");
    } catch (err) {
      toast.error("Error connecting to backend");
    }
  };

  const handleEdit = (record) => {
    setFormData({
      date: record.date,
      driverName: record.driver_name,
      vehicleNumber: record.vehicle_number,
      tripDetails: record.trip_details,
      cost: record.cost,
      fuelCost: record.fuel_cost,
      miscellaneous: record.miscellaneous,
      amountPaid: record.amount_paid,
    });
    setEditingId(record.id);
    setIsAdding(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      const res = await fetch(`${API_URL}/api/truck/delete/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Record deleted!");
        fetchTruckRecords();
      } else toast.error("Failed to delete record");
    } catch (err) {
      toast.error("Error deleting record");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Truck Section</CardTitle>
              <CardDescription>
                Record truck driver trip, cost, and return balances
              </CardDescription>
            </div>
            {!isAdding && (
              <Button onClick={() => setIsAdding(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Entry
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {isAdding && (
            <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Driver Name</Label>
                  <Input
                    value={formData.driverName}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Vehicle Number</Label>
                  <Input
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="md:col-span-3">
                  <Label>Trip Details</Label>
                  <Input
                    placeholder="From - To"
                    value={formData.tripDetails}
                    onChange={(e) => setFormData({ ...formData, tripDetails: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Cost (₹)</Label>
                  <Input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <Label>Fuel Cost (₹)</Label>
                  <Input
                    type="number"
                    value={formData.fuelCost}
                    onChange={(e) => setFormData({ ...formData, fuelCost: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <Label>Miscellaneous (₹)</Label>
                  <Input
                    type="number"
                    value={formData.miscellaneous}
                    onChange={(e) => setFormData({ ...formData, miscellaneous: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <Label>Amount Paid (₹)</Label>
                  <Input
                    type="number"
                    value={formData.amountPaid}
                    onChange={(e) => setFormData({ ...formData, amountPaid: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="md:col-span-3">
                  <Label>Return Amount (₹)</Label>
                  <div className="p-2 bg-green-50 rounded border border-green-200">
                    <p className="text-green-700 font-semibold">
                      ₹
                      {(
                        formData.amountPaid -
                        formData.fuelCost -
                        formData.miscellaneous
                      ).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" /> {editingId ? "Update" : "Save"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Records Section */}
          {isDesktop ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Vehicle No.</TableHead>
                    <TableHead>Trip</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Fuel</TableHead>
                    <TableHead>Misc</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Return</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {truckRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-gray-500 py-8">
                        No truck records yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    truckRecords.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{formatDate(t.date)}</TableCell>
                        <TableCell>{t.driver_name}</TableCell>
                        <TableCell>{t.vehicle_number}</TableCell>
                        <TableCell>{t.trip_details}</TableCell>
                        <TableCell>₹{t.cost}</TableCell>
                        <TableCell>₹{t.fuel_cost}</TableCell>
                        <TableCell>₹{t.miscellaneous}</TableCell>
                        <TableCell className="text-green-600">₹{t.amount_paid}</TableCell>
                        <TableCell className="text-blue-600 font-semibold">
                          ₹{Number(t.return_amount || 0).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(t)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(t.id)}>
                              <Trash2 className="h-3 w-3" />
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
              {truckRecords.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">No truck records yet.</p>
              ) : (
                truckRecords.map((t) => (
                  <Card key={t.id} className="w-full">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{t.driver_name || "—"}</p>
                          <p className="text-sm text-gray-500 truncate">{formatDate(t.date)}{t.vehicle_number ? ` • ${t.vehicle_number}` : ""}</p>
                        </div>
                        <div className="shrink-0 flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(t)} aria-label="Edit">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(t.id)} aria-label="Delete">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">Trip</p>
                        <p className="text-sm text-gray-900 break-words">{t.trip_details || "—"}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500">Cost</p>
                          <p className="text-sm text-gray-900">₹{Number(t.cost || 0).toLocaleString("en-IN")}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Fuel</p>
                          <p className="text-sm text-gray-900">₹{Number(t.fuel_cost || 0).toLocaleString("en-IN")}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Misc</p>
                          <p className="text-sm text-gray-900">₹{Number(t.miscellaneous || 0).toLocaleString("en-IN")}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Paid</p>
                          <p className="text-sm font-semibold text-green-600">₹{Number(t.amount_paid || 0).toLocaleString("en-IN")}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500">Return</p>
                          <p className="text-sm font-semibold text-blue-600">₹{Number(t.return_amount || 0).toLocaleString("en-IN")}</p>
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
