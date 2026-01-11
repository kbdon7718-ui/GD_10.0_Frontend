import React, { useState, useEffect } from "react";
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
import { Plus, Trash2, Save, X, FileText } from "lucide-react";
import { useSubmitOnce } from "../../utils/useSubmitOnce";
import { toast } from "sonner";
import { formatDate } from "../../utils/dateFormat";
import { useMediaQuery } from "../../utils/useMediaQuery";

const MATERIAL_TYPES = [
  "Iron",
  "Steel",
  "Copper",
  "Brass",
  "Aluminum",
  "Plastic",
];

export function PartyManager() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [sales, setSales] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    buyer: "",
    items: [{ material: "", weight: "", rate: "", amount: "" }],
  });

  // ✅ Static IDs (will come from context later)
  const COMPANY_ID = "2f762c5e-5274-4a65-aa66-15a7642a1608";
  const GODOWN_ID = "fbf61954-4d32-4cb4-92ea-d0fe3be01311";
  const ACCOUNT_ID = "11a59a0a-bd93-41f3-bb45-ce0470a280c1";

  // ✅ Fetch all Maal Out sales
  const fetchSales = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/party/list/${COMPANY_ID}`
      );
      const data = await res.json();
      if (res.ok) {
        setSales(data.data || []);
      } else {
        toast.error(data.error || "Failed to load sales");
      }
    } catch (err) {
      toast.error("Backend connection error");
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  // ✅ Add new item row
  const handleAddItem = () =>
    setForm({
      ...form,
      items: [
        ...form.items,
        { material: "", weight: "", rate: "", amount: "" },
      ],
    });

  // ✅ Remove item row
  const handleRemoveItem = (index) =>
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== index),
    });

  // ✅ Handle change in item fields
  const handleChangeItem = (index, key, value) => {
    const newItems = [...form.items];
    newItems[index][key] = value;
    if (key === "weight" || key === "rate") {
      newItems[index].amount = (
        parseFloat(newItems[index].weight || 0) *
        parseFloat(newItems[index].rate || 0)
      ).toFixed(2);
    }
    setForm({ ...form, items: newItems });
  };

  // ✅ Submit Sale (Maal Out)
  const [isSubmitting, wrap] = useSubmitOnce();

  const handleSubmit = wrap(async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/party/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: COMPANY_ID,
          godown_id: GODOWN_ID,
          buyer: form.buyer,
          account_id: ACCOUNT_ID,
          items: form.items,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Sale recorded successfully!");
        setForm({
          buyer: "",
          items: [{ material: "", weight: "", rate: "", amount: "" }],
        });
        setIsAdding(false);
        fetchSales(); // ✅ Refresh list
      } else {
        toast.error(data.error || "Error adding sale");
      }
    } catch (err) {
      toast.error("Error connecting to backend");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Total Sales
  const totalSales = sales.reduce(
    (sum, s) => sum + (parseFloat(s.total_amount) || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Dashboard Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Buyers</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-blue-600">{sales.length}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Sales Value</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-green-600">
              ₹{totalSales.toLocaleString()}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-orange-600">{sales.length}</span>
          </CardContent>
        </Card>
      </div>

      {/* Maal Out Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Maal Out (Sales to Mills / Parties)</CardTitle>
              <CardDescription>
                Record sales transactions and scrap details
              </CardDescription>
            </div>
            {!isAdding && (
              <Button onClick={() => setIsAdding(true)}>
                <Plus className="mr-2 h-4 w-4" /> New Sale
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {isAdding && (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
            >
              {/* Buyer Input */}
              <div>
                <Label>Buyer / Mill Name</Label>
                <Input
                  value={form.buyer}
                  onChange={(e) => setForm({ ...form, buyer: e.target.value })}
                  required
                  placeholder="Enter buyer or mill name"
                />
              </div>

              {/* Scrap Item Inputs */}
              <div className="space-y-2">
                <Label>Scrap Details</Label>
                {form.items.map((item, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center"
                  >
                    <select
                      value={item.material}
                      onChange={(e) =>
                        handleChangeItem(i, "material", e.target.value)
                      }
                      className="border rounded-md px-2 py-2"
                      required
                    >
                      <option value="">Material</option>
                      {MATERIAL_TYPES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      placeholder="Weight (kg)"
                      value={item.weight}
                      onChange={(e) =>
                        handleChangeItem(i, "weight", e.target.value)
                      }
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Rate (₹)"
                      value={item.rate}
                      onChange={(e) =>
                        handleChangeItem(i, "rate", e.target.value)
                      }
                      required
                    />
                    <Input readOnly value={item.amount} placeholder="Amount" />
                    {form.items.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleRemoveItem(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="secondary" onClick={handleAddItem}>
                  <Plus className="mr-2 h-4 w-4" /> Add More Scrap
                </Button>
              </div>

              <div className="flex gap-2 mt-4">
                <Button type="submit" disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Saving..." : "Save Sale"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAdding(false)}
                >
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Sales Records */}
          {isDesktop ? (
            <div className="overflow-x-auto mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Weight (kg)</TableHead>
                    <TableHead>Rate (₹)</TableHead>
                    <TableHead>Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-gray-500 py-8"
                      >
                        No sales records yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.map((sale) =>
                      sale.items.map((item, i) => (
                        <TableRow key={`${sale.id}-${i}`}>
                          {i === 0 && (
                            <>
                              <TableCell rowSpan={sale.items.length}>
                                {formatDate(sale.date)}
                              </TableCell>
                              <TableCell rowSpan={sale.items.length}>
                                {sale.buyer}
                              </TableCell>
                            </>
                          )}
                          <TableCell>{item.material}</TableCell>
                          <TableCell>{item.weight}</TableCell>
                          <TableCell>{item.rate}</TableCell>
                          <TableCell>{item.amount}</TableCell>
                        </TableRow>
                      ))
                    )
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="space-y-3 mt-6">
              {sales.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">No sales records yet.</p>
              ) : (
                sales.flatMap((sale) =>
                  (sale.items || []).map((item, i) => (
                    <Card key={`${sale.id}-${i}`} className="w-full">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{sale.buyer || "—"}</p>
                            <p className="text-sm text-gray-500 truncate">{formatDate(sale.date)}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs text-gray-500">Amount</p>
                            <p className="text-sm font-semibold text-gray-900">₹{Number(item.amount || 0).toLocaleString("en-IN")}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500">Material</p>
                            <p className="text-sm text-gray-900 truncate">{item.material || "—"}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500">Weight</p>
                            <p className="text-sm text-gray-900 truncate">{item.weight || "—"} kg</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500">Rate</p>
                            <p className="text-sm text-gray-900 truncate">₹{Number(item.rate || 0).toLocaleString("en-IN")}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
