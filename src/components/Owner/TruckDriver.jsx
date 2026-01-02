import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
import { Calendar } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { toast } from "sonner";
import { formatDate } from "../../utils/dateFormat";
import { useMediaQuery } from "../../utils/useMediaQuery";
import { getApiBaseUrl } from "../../utils/apiBaseUrl";
import { usePageRefresh } from "../../utils/pageRefreshContext";

const COMPANY_ID = "2f762c5e-5274-4a65-aa66-15a7642a1608";
const GODOWN_ID = "fbf61954-4d32-4cb4-92ea-d0fe3be01311";

export default function TruckDriver() {
  const API_URL = getApiBaseUrl();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { setRefreshHandler } = usePageRefresh();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({
    totalFuel: 0,
    totalMisc: 0,
    totalPaid: 0,
    totalReturn: 0,
  });

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // =============================
  // 🔥 Fetch REAL TRUCK DATA
  // =============================
  const fetchTruckRecords = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/truck/all?company_id=${COMPANY_ID}&godown_id=${GODOWN_ID}`
      );

      const data = await res.json();
      if (!data.success) {
        toast.error("Failed to load truck records");
        return;
      }

      // Filter by date
      // Filter by date (dd/mm/yyyy match)
let list = data.trucks.filter((r) => {
  return formatDate(r.date) === formatDate(filterDate);
});

      //let list = data.trucks.filter((r) => r.date === filterDate);

      setRecords(list);

      // Summary
      const totalFuel = list.reduce((s, r) => s + Number(r.fuel_cost || 0), 0);
      const totalMisc = list.reduce((s, r) => s + Number(r.miscellaneous || 0), 0);
      const totalPaid = list.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
      const totalReturn = list.reduce((s, r) => s + Number(r.return_amount || 0), 0);

      setSummary({ totalFuel, totalMisc, totalPaid, totalReturn });
    } catch (err) {
      console.error(err);
      toast.error("Error fetching truck data");
    }
  };

  useEffect(() => {
    fetchTruckRecords();
  }, [filterDate]);

  useEffect(() => {
    setRefreshHandler(fetchTruckRecords);
    return () => setRefreshHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDate]);

  const handleDateSelect = (date) => {
    if (!date) return;
    setSelectedDate(date);
    setFilterDate(date.toISOString().split("T")[0]);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-1">
            Truck Driver Records
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Read-only truck details
          </p>
        </div>

        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">{formatDate(filterDate)}</span>
                <span className="sm:hidden">{formatDate(filterDate).slice(0, 5)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
              />
            </PopoverContent>
          </Popover>

        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-xs text-gray-500">Total Paid</p>
          <p className="text-lg font-bold text-green-600">
            ₹{summary.totalPaid.toLocaleString()}
          </p>
        </Card>

        <Card className="p-3">
          <p className="text-xs text-gray-500">Fuel Cost</p>
          <p className="text-lg font-bold text-blue-600">
            ₹{summary.totalFuel.toLocaleString()}
          </p>
        </Card>

        <Card className="p-3">
          <p className="text-xs text-gray-500">Miscellaneous</p>
          <p className="text-lg font-bold text-yellow-600">
            ₹{summary.totalMisc.toLocaleString()}
          </p>
        </Card>

        <Card className="p-3">
          <p className="text-xs text-gray-500">Total Return</p>
          <p className="text-lg font-bold text-red-600">
            ₹{summary.totalReturn.toLocaleString()}
          </p>
        </Card>
      </div>
      {/* TABLE */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Truck Driver Entries</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Owner cannot edit or delete</CardDescription>
        </CardHeader>

        <CardContent className="px-2 sm:px-6">
          {isDesktop ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Trip</TableHead>
                    <TableHead>Fuel (₹)</TableHead>
                    <TableHead>Misc (₹)</TableHead>
                    <TableHead>Paid (₹)</TableHead>
                    <TableHead>Return (₹)</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{formatDate(r.date)}</TableCell>
                        <TableCell>{r.driver_name}</TableCell>
                        <TableCell>{r.vehicle_number}</TableCell>
                        <TableCell>{r.trip_details}</TableCell>
                        <TableCell>₹{r.fuel_cost}</TableCell>
                        <TableCell>₹{r.miscellaneous}</TableCell>
                        <TableCell className="text-green-600">
                          ₹{r.amount_paid}
                        </TableCell>
                        <TableCell className="text-blue-600 font-bold">
                          ₹{r.return_amount}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="space-y-3">
              {records.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">No records found</p>
              ) : (
                records.map((r) => (
                  <Card key={r.id} className="w-full">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{r.driver_name || "—"}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{formatDate(r.date)}{r.vehicle_number ? ` • ${r.vehicle_number}` : ""}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Paid</p>
                          <p className="text-sm font-semibold text-green-600">₹{Number(r.amount_paid || 0).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Fuel</p>
                          <p className="text-sm text-gray-900 dark:text-white truncate">₹{Number(r.fuel_cost || 0).toLocaleString()}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Misc</p>
                          <p className="text-sm text-gray-900 dark:text-white truncate">₹{Number(r.miscellaneous || 0).toLocaleString()}</p>
                        </div>
                        <div className="min-w-0 col-span-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Trip</p>
                          <p className="text-sm text-gray-900 dark:text-white">{r.trip_details || "—"}</p>
                        </div>
                        <div className="min-w-0 col-span-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Return</p>
                          <p className="text-sm font-semibold text-blue-600">₹{Number(r.return_amount || 0).toLocaleString()}</p>
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
