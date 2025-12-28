import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
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
  RefreshCcw,
  Truck,
  Users,
  Store,
} from "lucide-react";
import { formatINR } from "../../utils/currencyFormat";
import { useAuth } from "../../utils/authContext";
import { getApiBaseUrl, getApiBaseUrlCandidates, normalizeBaseUrl } from "../../utils/apiBaseUrl";

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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [apiBase, setApiBase] = useState(getApiBaseUrl);
  const [apiDraft, setApiDraft] = useState(getApiBaseUrl);

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
          if (typeof window !== "undefined") {
            localStorage.setItem("scrapco_api_url", base);
          }

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
    if (typeof window !== "undefined") {
      localStorage.setItem("scrapco_api_url", next);
    }
    setApiBase(next);
    await fetchOverview();
  };

  const resetApiBase = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("scrapco_api_url");
    }
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
          <Button variant="outline" size="sm" onClick={fetchOverview} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
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
                  placeholder="http://localhost:5000"
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
                            placeholder="http://localhost:5000"
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