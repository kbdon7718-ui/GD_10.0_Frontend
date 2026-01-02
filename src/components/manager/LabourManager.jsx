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
import { toast } from "sonner";
import { Calendar } from "lucide-react";
import { formatDate } from "../../utils/dateFormat";
import { useMediaQuery } from "../../utils/useMediaQuery";
import { getApiBaseUrl } from "../../utils/apiBaseUrl";
import { usePageRefresh } from "../../utils/pageRefreshContext";


export function LabourManager() {
  const API_URL = getApiBaseUrl();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { setRefreshHandler } = usePageRefresh();
  const company_id = "2f762c5e-5274-4a65-aa66-15a7642a1608";
  const godown_id = "fbf61954-4d32-4cb4-92ea-d0fe3be01311";

  const today = new Date().toISOString().split("T")[0];

  const [labours, setLabours] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [selectedDate, setSelectedDate] = useState(today);

  /* =======================================================
      FETCH LABOURS (ONLY worker_type = "Labour")
  ======================================================= */
  const fetchLabours = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/labour/all?company_id=${company_id}&godown_id=${godown_id}`
      );

      const data = await res.json();

      if (data.success) {
        const labourOnly = data.labour.filter(
          (l) => l.worker_type === "Labour"
        );
        setLabours(labourOnly);
      }
    } catch (err) {
      toast.error("Error fetching labour list");
    }
  };

  /* =======================================================
      FETCH ATTENDANCE FOR SELECTED DATE
  ======================================================= */
  const fetchAttendanceForDate = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/labour/attendance/by-date?company_id=${company_id}&godown_id=${godown_id}&date=${selectedDate}`
      );

      const data = await res.json();

      if (data.success) {
        const mapped = {};

        data.attendance.forEach((a) => {
          mapped[a.labour_id] = a.status;
        });

        setAttendance(mapped);
      }
    } catch (err) {
      toast.error("Error fetching attendance");
    }
  };

  useEffect(() => {
    fetchLabours();
  }, []);

  useEffect(() => {
    setRefreshHandler(() => {
      fetchLabours();
      fetchAttendanceForDate();
    });
    return () => setRefreshHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  useEffect(() => {
    fetchAttendanceForDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  /* =======================================================
      MARK ATTENDANCE
      - Present → saved in DB
      - Absent → not saved, only UI mark
  ======================================================= */
  const handleMarkAttendance = async (labourId, status) => {
    try {
      const res = await fetch(`${API_URL}/api/labour/attendance/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id,
          godown_id,
          labour_id: labourId,
          date: selectedDate,
          status,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`Marked ${status}`);

        // Update UI
        setAttendance((prev) => ({ ...prev, [labourId]: status }));
      } else {
        toast.error(data.error || "Could not update attendance");
      }
    } catch (err) {
      toast.error("Connection error");
    }
  };

  return (
    <div className="space-y-8">

      {/* ================================================= */}
      {/* HEADER + DATE SELECTOR */}
      {/* ================================================= */}
     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
  <div>
    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-1">
      Labour Attendance 
    </h2>
    <p className="text-sm text-gray-500 dark:text-gray-400">
      Mark daily attendance 
    </p>
  </div>

  <div className="flex items-center gap-2">
    {/* Date Selector */}
    <input
      type="date"
      value={selectedDate}
      onChange={(e) => setSelectedDate(e.target.value)}
      className="px-3 py-2 border rounded-md dark:bg-gray-800 text-sm"
    />

  </div>
</div>


      {/* ================================================= */}
      {/* SUMMARY CARDS */}
      {/* ================================================= */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">

        <Card className="p-3">
          <p className="text-xs text-gray-500">Total Labour</p>
          <p className="text-lg sm:text-2xl font-semibold text-blue-600">
            {labours.length}
          </p>
        </Card>

        <Card className="p-3">
          <p className="text-xs text-gray-500">Date</p>
          <p className="text-sm sm:text-lg flex items-center gap-1">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="truncate">{formatDate(selectedDate)}</span>
          </p>
        </Card>

        <Card className="p-3">
          <p className="text-xs text-gray-500">Present</p>
          <p className="text-lg sm:text-2xl font-semibold text-green-600">
            {
              Object.values(attendance).filter(
                (s) => s === "Present"
              ).length
            }
          </p>
        </Card>

      </div>

      {/* ================================================= */}
      {/* ATTENDANCE TABLE */}
      {/* ================================================= */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Attendance List</CardTitle>
        </CardHeader>

        <CardContent className="px-2 sm:px-6">
          {isDesktop ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Daily Wage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {labours.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-6 text-gray-500"
                      >
                        No workers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    labours.map((labour) => (
                      <TableRow key={labour.id}>
                        <TableCell className="font-medium">
                          {labour.name}
                        </TableCell>

                        <TableCell>
                          ₹{Number(labour.daily_wage).toFixed(2)}
                        </TableCell>

                        <TableCell>
                          {attendance[labour.id] ? (
                            <span
                              className={
                                attendance[labour.id] === "Present"
                                  ? "text-green-600 font-semibold"
                                  : "text-gray-400"
                              }
                            >
                              {attendance[labour.id]}
                            </span>
                          ) : (
                            <span className="text-gray-400">Not marked</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleMarkAttendance(labour.id, "Present")
                              }
                            >
                              Present
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-500"
                              onClick={() =>
                                handleMarkAttendance(labour.id, "Absent")
                              }
                            >
                              Absent
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
              {labours.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">No workers found</p>
              ) : (
                labours.map((labour) => {
                  const status = attendance[labour.id];
                  return (
                    <Card key={labour.id} className="w-full">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{labour.name}</p>
                            <p className="text-sm text-gray-500 truncate">₹{Number(labour.daily_wage || 0).toFixed(2)} / day</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs text-gray-500">Status</p>
                            {status ? (
                              <p className={`text-sm font-semibold ${status === "Present" ? "text-green-600" : "text-gray-400"}`}>
                                {status}
                              </p>
                            ) : (
                              <p className="text-sm text-gray-400">Not marked</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleMarkAttendance(labour.id, "Present")}
                          >
                            Present
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-500"
                            onClick={() => handleMarkAttendance(labour.id, "Absent")}
                          >
                            Absent
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
