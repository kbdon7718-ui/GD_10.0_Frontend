// ================= IMPORTS AT TOP =================
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import OwnerDailySummary from "./OwnerDailySummary";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Input } from "../ui/input";
import {
  Wallet,
  Building2,
  ArrowDownCircle,
  ArrowUpCircle,
  LogOut,
  Truck,
  Users,
  Store,
} from "lucide-react";
import { formatINR } from "../../utils/currencyFormat";
import { useAuth } from "../../utils/authContext";
import { getApiBaseUrl, getApiBaseUrlCandidates, normalizeBaseUrl, setStoredApiBaseUrl } from "../../utils/apiBaseUrl";
import { usePageRefresh } from "../../utils/pageRefreshContext";

const COMPANY_ID_DEFAULT = "2f762c5e-5274-4a65-aa66-15a7642a1608";
const GODOWN_ID_DEFAULT = "fbf61954-4d32-4cb4-92ea-d0fe3be01311";

function MetricCard({ title, icon: Icon, value, items, className }) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
        <CardTitle className="text-sm sm:text-base">{title}</CardTitle>
        {Icon ? <Icon className="w-4 h-4 sm:w-5 sm:h-5" /> : null}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-base sm:text-lg font-semibold">{value}</div>
        {Array.isArray(items) && items.length > 0 ? (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {items.slice(0, 3).map((it, idx) => (
              <div key={idx} className="min-w-0">
                <p className="text-[11px] text-gray-500 truncate">{it?.label || ""}</p>
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                  {it?.value ?? ""}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function DashboardOverview() {
  const { user, logout } = useAuth();
  const { setRefreshHandler } = usePageRefresh();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [apiBase, setApiBase] = useState(getApiBaseUrl);
  const [apiDraft, setApiDraft] = useState(getApiBaseUrl);
  // New state for time filter
  const [timeFilter, setTimeFilter] = useState('today');

  // KPI and chart data variables
  let profit = 0, cash = 0, expense = 0, bank = 0, truck = 0, labour = 0, feriwala = 0, kabadiwala = 0;
  let maalBarData = [], scrapFlowData = [], expensePieData = [], expensePieColors = ['#f87171','#fbbf24','#34d399','#60a5fa','#a78bfa','#f472b6','#facc15'], expenseTableData = [];
  let activityTableData = [], scrapCategoryData = [], scrapCategoryColors = ['#4ade80','#60a5fa','#fbbf24','#f472b6','#a78bfa'];
  if (data) {
    const analytics = data.analytics || data;
    const tf = timeFilter === 'today' ? 'today' : timeFilter === 'month' ? 'month' : 'all_time';
    // Profit: sales - purchase - expenses
    const sales = Number(analytics?.sales?.[tf] ?? 0);
    const purchase = Number(analytics?.purchase?.[tf] ?? 0);
    expense = Number(analytics?.expenses?.[tf] ?? 0);
    profit = sales - purchase - expense;
    // Cash/Bank
    cash = Number(analytics?.cash?.rokadi ?? 0);
    bank = Number(analytics?.cash?.bank ?? 0);
    // Maal In/Out bar chart
    maalBarData = [
      { name: 'Purchase', value: purchase },
      { name: 'Sales', value: sales },
      { name: 'Expenses', value: expense },
      { name: 'Profit', value: profit },
    ];
    // Scrap flow line chart (trend)
    scrapFlowData = (analytics?.scrap_flow ?? []).map(d => ({ date: d.date, scrapIn: d.in, scrapOut: d.out }));
    // Expense pie chart
    expensePieData = (analytics?.expense_pie ?? []).map(e => ({ category: e.category, value: e.value }));
    // Expense table
    expenseTableData = (analytics?.expense_summary ?? []).map(e => ({ category: e.category, payments: e.payments, total: Number(e.total) }));
    // Activity summary
    truck = Number(analytics?.truck?.[tf] ?? 0);
    labour = Number(analytics?.labour?.[tf] ?? 0);
    feriwala = Number(analytics?.feriwala?.[tf] ?? 0);
    kabadiwala = Number(analytics?.kabadiwala?.[tf] ?? 0);
    activityTableData = [
      { activity: 'Truck', today: analytics?.truck?.today ?? 0, month: analytics?.truck?.month ?? 0, all: analytics?.truck?.all_time ?? 0 },
      { activity: 'Labour', today: analytics?.labour?.today ?? 0, month: analytics?.labour?.month ?? 0, all: analytics?.labour?.all_time ?? 0 },
      { activity: 'Feriwala', today: analytics?.feriwala?.today ?? 0, month: analytics?.feriwala?.month ?? 0, all: analytics?.feriwala?.all_time ?? 0 },
      { activity: 'Kabadiwala', today: analytics?.kabadiwala?.today ?? 0, month: analytics?.kabadiwala?.month ?? 0, all: analytics?.kabadiwala?.all_time ?? 0 },
    ];
    // Scrap category pie
    scrapCategoryData = (analytics?.scrap_by_material ?? []).map(m => ({ category: m.material, value: m.weight }));
  }

  const companyId =
    (typeof window !== "undefined" &&
      (localStorage.getItem("scrapco_company_id") ||
        localStorage.getItem("company_id"))) ||
    COMPANY_ID_DEFAULT;

  const godownId =
    (typeof window !== "undefined" &&
      (localStorage.getItem("scrapco_godown_id") ||
        localStorage.getItem("godown_id"))) ||
    GODOWN_ID_DEFAULT;

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    setRefreshHandler(fetchOverview);
    return () => setRefreshHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const candidates = getApiBaseUrlCandidates(apiBase);

      let lastErr = null;

      for (const base of candidates) {
        try {
          const res = await fetch(
            `${base}/api/dashboard/overview?company_id=${companyId}&godown_id=${godownId}`
          );

          let json = null;
          try {
            json = await res.json();
          } catch (_e) {
            json = null;
          }

          if (!res.ok) {
            throw new Error(json?.error || json?.message || `Dashboard API failed (${res.status})`);
          }

          if (!json?.success) {
            throw new Error(json?.error || "Failed to load dashboard");
          }

          setApiBase(base);
          setApiDraft(base);

          setData(json);
          setLastUpdated(new Date());
          return;
        } catch (e) {
          lastErr = e;
        }
      }

      throw lastErr || new Error("Failed to load dashboard");
    } catch (err) {
      console.error("Dashboard load failed:", err.message);

      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const saveApiBase = async () => {
    const next = normalizeBaseUrl(apiDraft);
    if (!next) return;
    setStoredApiBaseUrl(next);
    setApiBase(next);
    await fetchOverview();
  };

  const resetApiBase = async () => {
    setStoredApiBaseUrl("");
    const next = getApiBaseUrl();
    setApiBase(next);
    setApiDraft(next);
    await fetchOverview();
  };

  return (
    <div className="space-y-6">

      {/* ================= HEADER ================= */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-emerald-600">
            Dashboard
          </h2>
          <p className="text-sm text-gray-500">
            Welcome, {user?.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="destructive" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-1" />
            Logout
          </Button>
        </div>
      </div>

      {/* ================= LOADING ================= */}
      {loading && (
        <div className="flex justify-center py-16">
          <p className="text-gray-500 text-sm">Loading dashboard…</p>
        </div>
      )}

      {!loading && error && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg text-red-700">Unable to load dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">{error}</p>
            <p className="text-xs text-gray-500">API: {apiBase}</p>

            <div className="space-y-2">
              <p className="text-sm text-gray-500">Backend API URL</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={apiDraft}
                  onChange={(e) => setApiDraft(e.target.value)}
                  placeholder="https://gd-10-0-backend-1.onrender.com"
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={saveApiBase} disabled={loading}>
                    Save
                  </Button>
                  <Button variant="ghost" onClick={resetApiBase} disabled={loading}>
                    Reset
                  </Button>
                </div>
              </div>
            </div>

            <Button size="sm" onClick={fetchOverview}>Try again</Button>
          </CardContent>
        </Card>
      )}

      {/* ================= DASHBOARD ================= */}
      {!loading && !error && data && (
        <>
          {/* ========== TIME FILTER ========== */}
          <div className="mb-4 flex gap-2">
            {['today', 'month', 'all'].map((period) => (
              <button
                key={period}
                className={`px-3 py-1 rounded-full border text-xs font-semibold ${timeFilter === period ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700'}`}
                onClick={() => setTimeFilter(period)}
              >
                {period === 'today' ? 'Today' : period === 'month' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>

          {/* ========== KPI CARDS ========== */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {/* Profit KPI */}
            <Card className="text-center">
              <CardHeader>
                <CardTitle>Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${profit > 0 ? 'text-green-600' : profit < 0 ? 'text-red-600' : 'text-gray-500'}`}>₹{profit.toLocaleString()}</div>
                <div className="text-xs mt-1">{profit > 0 ? 'Profit' : profit < 0 ? 'Loss' : 'Neutral'}</div>
              </CardContent>
            </Card>
            {/* Cash KPI */}
            <Card className="text-center">
              <CardHeader>
                <CardTitle>Cash</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">₹{cash.toLocaleString()}</div>
                <div className="text-xs mt-1">{timeFilter === 'today' ? 'Today' : timeFilter === 'month' ? 'This Month' : 'All Time'}</div>
              </CardContent>
            </Card>
            {/* Expense KPI */}
            <Card className="text-center">
              <CardHeader>
                <CardTitle>Expense</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">₹{expense.toLocaleString()}</div>
                <div className="text-xs mt-1">{timeFilter === 'today' ? 'Today' : timeFilter === 'month' ? 'This Month' : 'All Time'}</div>
              </CardContent>
            </Card>
          </div>

          {/* ========== MAAL IN VS OUT BAR CHART ========== */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Maal In vs Out (Bar Chart)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={maalBarData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              {lastUpdated ? `Last updated: ${lastUpdated.toLocaleString()}` : ""}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Today</Badge>
              <Badge variant="outline" className="text-xs">This Month</Badge>
              <Badge variant="outline" className="text-xs">All Time</Badge>
            </div>
          </div>

          {(() => {
            const analytics = data?.analytics || data;

            const toNum = (v) => {
              const n = Number(v);
              return Number.isFinite(n) ? n : 0;
            };

            const formatCount = (v) => toNum(v).toLocaleString("en-IN");
            const formatKg = (v) =>
              `${toNum(v).toLocaleString("en-IN", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })} kg`;

            const scrapInToday = toNum(analytics?.scrap_in?.today ?? analytics?.scrap_in?.nd);
            const scrapInMonth = toNum(analytics?.scrap_in?.month ?? analytics?.scrap_in?.mo);
            const scrapInAll = toNum(analytics?.scrap_in?.all_time);

            const scrapOutToday = toNum(analytics?.scrap_out?.today ?? analytics?.scrap_out?.nd);
            const scrapOutMonth = toNum(analytics?.scrap_out?.month ?? analytics?.scrap_out?.mo);
            const scrapOutAll = toNum(analytics?.scrap_out?.all_time);

            const expenseToday = toNum(analytics?.expenses?.today ?? analytics?.expenses?.nd);
            const expenseMonth = toNum(analytics?.expenses?.month ?? analytics?.expenses?.mo);
            const expenseAll = toNum(analytics?.expenses?.all_time);

            const cashRokadi = toNum(analytics?.cash?.rokadi);
            const bankTotal = toNum(analytics?.cash?.bank);

            const truckToday = toNum(analytics?.truck?.today);
            const truckMonth = toNum(analytics?.truck?.month);
            const truckAll = toNum(analytics?.truck?.all_time);

            const feriwalaToday = toNum(analytics?.feriwala?.today);
            const feriwalaMonth = toNum(analytics?.feriwala?.month);
            const feriwalaAll = toNum(analytics?.feriwala?.all_time);

            const kabadiwalaToday = toNum(analytics?.kabadiwala?.today);
            const kabadiwalaMonth = toNum(analytics?.kabadiwala?.month);
            const kabadiwalaAll = toNum(analytics?.kabadiwala?.all_time);

            const labourToday = toNum(analytics?.labour?.today);
            const labourMonth = toNum(analytics?.labour?.month);
            const labourAll = toNum(analytics?.labour?.all_time);

            const expenseSummary = Array.isArray(analytics?.expense_summary)
              ? analytics.expense_summary
              : (Array.isArray(data?.expense_summary) ? data.expense_summary : []);

            const scrapByMaterial = Array.isArray(analytics?.scrap_by_material)
              ? analytics.scrap_by_material
              : (Array.isArray(data?.scrap_by_material) ? data.scrap_by_material : []);

            return (
              <>
                {/* ================= TOP METRICS ================= */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <MetricCard
                    title="Scrap In"
                    icon={ArrowDownCircle}
                    className="border-green-200"
                    value={formatKg(scrapInMonth)}
                    items={[
                      { label: "Today", value: formatKg(scrapInToday) },
                      { label: "MTD", value: formatKg(scrapInMonth) },
                      { label: "All", value: formatKg(scrapInAll) },
                    ]}
                  />

                  <MetricCard
                    title="Scrap Out"
                    icon={ArrowUpCircle}
                    className="border-blue-200"
                    value={formatKg(scrapOutMonth)}
                    items={[
                      { label: "Today", value: formatKg(scrapOutToday) },
                      { label: "MTD", value: formatKg(scrapOutMonth) },
                      { label: "All", value: formatKg(scrapOutAll) },
                    ]}
                  />

                  <MetricCard
                    title="Expenses"
                    icon={Wallet}
                    className="border-red-200"
                    value={formatINR(expenseMonth)}
                    items={[
                      { label: "Today", value: formatINR(expenseToday) },
                      { label: "MTD", value: formatINR(expenseMonth) },
                      { label: "All", value: formatINR(expenseAll) },
                    ]}
                  />

                  <MetricCard
                    title="Cash"
                    icon={Wallet}
                    className="border-orange-200"
                    value={formatINR(cashRokadi)}
                    items={[{ label: "Rokadi", value: formatINR(cashRokadi) }]}
                  />

                  <MetricCard
                    title="Bank"
                    icon={Building2}
                    className="border-purple-200"
                    value={formatINR(bankTotal)}
                    items={[{ label: "Total", value: formatINR(bankTotal) }]}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <Card className="lg:col-span-2">

                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <CardTitle className="text-base sm:text-lg">Monthly Expense Summary</CardTitle>
                      <div className="text-xs sm:text-sm text-gray-500">
                        <span className="mr-3">Today: {formatINR(expenseToday)}</span>
                        <span>MTD: {formatINR(expenseMonth)}</span>
                      </div>
                    </CardHeader>

                    <CardContent>
                      {(!expenseSummary || expenseSummary.length === 0) ? (
                        <p className="text-sm text-gray-500">
                          No expenses recorded this month
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Category</TableHead>
                              <TableHead className="text-right">Payments</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {expenseSummary.map((e) => (
                              <TableRow key={e.category}>
                                <TableCell className="font-medium">{e.category}</TableCell>
                                <TableCell className="text-right">{formatCount(e.payments)}</TableCell>
                                <TableCell className="text-right">{formatINR(toNum(e.total))}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base sm:text-lg">Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <MetricCard
                          title="Truck"
                          icon={Truck}
                          className="border"
                          value={formatCount(truckMonth)}
                          items={[
                            { label: "Today", value: formatCount(truckToday) },
                            { label: "MTD", value: formatCount(truckMonth) },
                            { label: "All", value: formatCount(truckAll) },
                          ]}
                        />
                        <MetricCard
                          title="Labour"
                          icon={Users}
                          className="border"
                          value={formatCount(labourMonth)}
                          items={[
                            { label: "Today", value: formatCount(labourToday) },
                            { label: "MTD", value: formatCount(labourMonth) },
                            { label: "All", value: formatCount(labourAll) },
                          ]}
                        />
                        <MetricCard
                          title="Feriwala"
                          icon={Store}
                          className="border"
                          value={formatCount(feriwalaMonth)}
                          items={[
                            { label: "Today", value: formatCount(feriwalaToday) },
                            { label: "MTD", value: formatCount(feriwalaMonth) },
                            { label: "All", value: formatCount(feriwalaAll) },
                          ]}
                        />
                        <MetricCard
                          title="Kabadiwala"
                          icon={Store}
                          className="border"
                          value={formatCount(kabadiwalaMonth)}
                          items={[
                            { label: "Today", value: formatCount(kabadiwalaToday) },
                            { label: "MTD", value: formatCount(kabadiwalaMonth) },
                            { label: "All", value: formatCount(kabadiwalaAll) },
                          ]}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Scrap In by Category (Today)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {scrapByMaterial.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No scrap received today
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Material</TableHead>
                            <TableHead className="text-right">Weight</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {scrapByMaterial.map((m) => (
                            <TableRow key={m.material}>
                              <TableCell className="font-medium">{m.material || "—"}</TableCell>
                              <TableCell className="text-right">{formatKg(m.weight)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <CardTitle className="text-base sm:text-lg">Connection</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs">API: {apiBase}</Badge>
                      <Badge variant="outline" className="text-xs">Company: {companyId}</Badge>
                      <Badge variant="outline" className="text-xs">Godown: {godownId}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <p className="text-sm text-gray-500">Backend API URL</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            value={apiDraft}
                            onChange={(e) => setApiDraft(e.target.value)}
                            placeholder="https://gd-10-0-backend-1.onrender.com"
                          />
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={saveApiBase} disabled={loading}>
                              Save
                            </Button>
                            <Button variant="ghost" onClick={resetApiBase} disabled={loading}>
                              Reset
                            </Button>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-500">
                        To switch company/godown, set localStorage keys
                        <span className="font-medium text-gray-700 dark:text-gray-200"> scrapco_company_id</span> and
                        <span className="font-medium text-gray-700 dark:text-gray-200"> scrapco_godown_id</span>.
                      </p>
                    </div>
                  </CardContent>
                </Card>

              </>

            );
          })()}
        </>

      )}
    </div>
  );
}