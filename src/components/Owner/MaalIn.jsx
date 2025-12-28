import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHead,
  TableRow,
} from "../ui/table";

import { Button } from "../ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { Calendar as CalendarComponent } from "../ui/calendar";

import { Calendar, RefreshCcw } from "lucide-react";
import { formatDate } from "../../utils/dateFormat";
import { toast } from "sonner";
import { useMediaQuery } from "../../utils/useMediaQuery";
import { getApiBaseUrl } from "../../utils/apiBaseUrl";

export default function MaalIn() {
  const API_URL = getApiBaseUrl();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [maalIn, setMaalIn] = useState([]);
  const [summary, setSummary] = useState({
    totalWeight: 0,
    totalAmount: 0,
  });

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const company_id = "2f762c5e-5274-4a65-aa66-15a7642a1608";
  const godown_id = "fbf61954-4d32-4cb4-92ea-d0fe3be01311";

  /* ======================================================
        FETCH FROM BACKEND (REAL DATA)
  ====================================================== */
  const fetchMaalIn = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/maalin/list?company_id=${company_id}&godown_id=${godown_id}&date=${filterDate}`
      );

      const data = await res.json();

      if (!data.success) {
        toast.error("Failed to fetch Maal In");
        return;
      }

      const entries = data.maal_in;

      // Convert header-only response into detailed item rows
      let allItemRows = [];

      for (let entry of entries) {
        // Fetch items for each Maal In
        const resp = await fetch(`${API_URL}/api/maalin/${entry.id}`);
        const detail = await resp.json();

        if (detail.success) {
          detail.items.forEach((it) => {
            allItemRows.push({
              id: it.id,
              date: entry.date,
              material: it.material,
              weight: it.weight,
              rate: it.rate,
              amount: it.amount,
              supplier: entry.supplier_name,
              source: entry.source,
            });
          });
        }
      }

      setMaalIn(allItemRows);

      // SUMMARY
      const totalWeight = allItemRows.reduce(
        (s, i) => s + Number(i.weight || 0),
        0
      );
      const totalAmount = allItemRows.reduce(
        (s, i) => s + Number(i.amount || 0),
        0
      );

      setSummary({ totalWeight, totalAmount });
    } catch (err) {
      console.error(err);
      toast.error("Error loading Maal In");
    }
  };

  useEffect(() => {
    fetchMaalIn();
    // NOTE: fetchMaalIn is declared inline and intentionally not added to deps to avoid re-creating the function and re-fetching unnecessarily.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDate]);

  const handleDateSelect = (date) => {
    if (date) {
      setSelectedDate(date);
      setFilterDate(date.toISOString().split("T")[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Maal In Records
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Read-only view of all Maal In entries
          </p>
        </div>

        {/*
          Mobile-first actions:
          - Avoid squeezing / wrapping into a horizontal-scroll row.
          - Full-width buttons on mobile, inline only on `sm+`.
        */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 w-full sm:w-auto justify-start">
                <Calendar className="w-4 h-4" />
                {formatDate(filterDate)}
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

          <Button variant="outline" size="sm" onClick={fetchMaalIn} className="w-full sm:w-auto">
            <RefreshCcw className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Weight</CardTitle>
          </CardHeader>
          <CardContent className="text-yellow-600 font-semibold">
            {summary.totalWeight} KG
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Amount</CardTitle>
          </CardHeader>
          <CardContent className="text-green-600 font-semibold">
            ₹{summary.totalAmount.toLocaleString()}
          </CardContent>
        </Card>
      </div>

      {/* TABLE */}
      <Card>
        <CardHeader>
          <CardTitle>Maal In Details</CardTitle>
          <CardDescription>Owner view — read only</CardDescription>
        </CardHeader>

        <CardContent>
          {/*
            Mobile UX fix:
            - Replace desktop table with stacked cards on < md.
            - Keep table only on md+.
            - No horizontal scrolling on phones.
          */}
          {isDesktop ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {maalIn.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6">
                        No records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    maalIn.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{formatDate(m.date)}</TableCell>
                        <TableCell>{m.material}</TableCell>
                        <TableCell>{m.weight}</TableCell>
                        <TableCell>₹{m.rate}</TableCell>
                        <TableCell className="text-green-600 font-semibold">₹{m.amount}</TableCell>
                        <TableCell>{m.supplier}</TableCell>
                        <TableCell>{m.source}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="space-y-3">
              {maalIn.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">No records found</p>
              ) : (
                maalIn.map((m) => (
                  <Card key={m.id} className="w-full">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{m.material}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{formatDate(m.date)}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                          <p className="text-sm font-semibold text-green-600">₹{Number(m.amount || 0).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Weight</p>
                          <p className="text-sm text-gray-900 dark:text-white truncate">{m.weight} KG</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Rate</p>
                          <p className="text-sm text-gray-900 dark:text-white truncate">₹{m.rate}</p>
                        </div>
                        <div className="min-w-0 col-span-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Supplier</p>
                          <p className="text-sm text-gray-900 dark:text-white truncate">{m.supplier || "—"}</p>
                        </div>
                        <div className="min-w-0 col-span-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Source</p>
                          <p className="text-sm text-gray-900 dark:text-white truncate">{m.source || "—"}</p>
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
