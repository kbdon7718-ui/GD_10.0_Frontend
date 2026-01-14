import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BadgePercent, BookOpen, LogOut, User } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { getApiBaseUrl } from "../../utils/apiBaseUrl";
import { useAuth } from "../../utils/authContext";

const COMPANY_ID_DEFAULT = "2f762c5e-5274-4a65-aa66-15a7642a1608";
const GODOWN_ID_DEFAULT = "fbf61954-4d32-4cb4-92ea-d0fe3be01311";

const getCompanyId = () =>
  (localStorage.getItem("scrapco_company_id") ||
    localStorage.getItem("company_id")) ||
  COMPANY_ID_DEFAULT;

const getGodownId = () =>
  (localStorage.getItem("scrapco_godown_id") ||
    localStorage.getItem("godown_id")) ||
  GODOWN_ID_DEFAULT;

function NavBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center text-xs transition-all ${
        active ? "text-emerald-600 font-semibold" : "text-gray-500"
      }`}
    >
      {icon}
      <span className="text-xs mt-0.5">{label}</span>
    </button>
  );
}

export function VendorDashboard() {
  const API = getApiBaseUrl();
  const { session, logout } = useAuth();

  const token = session?.access_token;

  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [outstanding, setOutstanding] = useState(0);
  const [rates, setRates] = useState([]);
  const [activeTab, setActiveTab] = useState("sale");

  const companyId = useMemo(() => getCompanyId(), []);
  const godownId = useMemo(() => getGodownId(), []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const meRes = await fetch(`${API}/api/vendor/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const meJson = await meRes.json();
        if (!meRes.ok) throw new Error(meJson.error || "Failed to load vendor");

        const ledgerRes = await fetch(
          `${API}/api/vendor/ledger?company_id=${companyId}&godown_id=${godownId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const ledgerJson = await ledgerRes.json();
        if (!ledgerRes.ok) throw new Error(ledgerJson.error || "Failed to load ledger");

        const ratesRes = await fetch(`${API}/api/vendor/rates`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const ratesJson = await ratesRes.json();
        if (!ratesRes.ok) throw new Error(ratesJson.error || "Failed to load rates");

        if (!mounted) return;
        setVendor(meJson.vendor);
        setLedger(Array.isArray(ledgerJson.ledger) ? ledgerJson.ledger : []);
        setOutstanding(Number(ledgerJson.outstanding || 0));
        setRates(Array.isArray(ratesJson.rates) ? ratesJson.rates : []);
      } catch (err) {
        toast.error(err.message || "Failed to load vendor portal");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [API, token, companyId, godownId]);

  if (loading) return null;

  if (!vendor) {
    return (
      <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-900 flex flex-col overflow-x-hidden">
        <div className="sticky top-0 z-40 bg-white px-4 py-4 flex justify-between items-center shadow-sm">
          <div>
            <h1 className="text-xl font-bold tracking-wide text-emerald-600">
              GT<span className="text-gray-800">C</span>
            </h1>
            <p className="text-xs text-gray-600 mt-1 font-medium">Powered By ScrapCo.</p>
          </div>

          <Button variant="ghost" size="icon" onClick={logout} aria-label="Logout">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 p-4 app-content-safe-bottom">
          <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Vendor Portal</CardTitle>
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 dark:text-gray-300">Unable to load vendor details.</div>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-900 flex flex-col overflow-x-hidden">
      <div className="sticky top-0 z-40 bg-white px-4 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-wide text-emerald-600">
            GT<span className="text-gray-800">C</span>
          </h1>
          <p className="text-xs text-gray-600 mt-1 font-medium">Powered By ScrapCo.</p>
        </div>

        <Button variant="ghost" size="icon" onClick={logout} aria-label="Logout">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 p-4 app-content-safe-bottom">
      <div className="max-w-5xl mx-auto space-y-4">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Godown</CardTitle>
               <div className="text-sm text-gray-600 dark:text-gray-300">
                 {vendor.vendor_name}
               </div>
            </div>
            <div className="text-sm">
              Outstanding: <span className="font-semibold">₹{Number(outstanding || 0).toFixed(2)}</span>
            </div>
          </CardHeader>
        </Card>

        {activeTab === "sale" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sale</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Description</th>
                      <th className="py-2 pr-3">Amount</th>
                      <th className="py-2">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.length === 0 ? (
                      <tr>
                        <td className="py-3 text-gray-600 dark:text-gray-300" colSpan={5}>
                          No entries
                        </td>
                      </tr>
                    ) : (
                      ledger.map((row, idx) => (
                        <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 align-top">
                          <td className="py-2 pr-3 whitespace-nowrap">{String(row.date || "").slice(0, 10)}</td>
                          <td className="py-2 pr-3">{row.type}</td>
                          <td className="py-2 pr-3 whitespace-pre-line">{row.description}</td>
                          <td className="py-2 pr-3">₹{Number(row.amount || 0).toFixed(2)}</td>
                          <td className="py-2">₹{Number(row.balance || 0).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "rate" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2 pr-3">Material</th>
                      <th className="py-2">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.length === 0 ? (
                      <tr>
                        <td className="py-3 text-gray-600 dark:text-gray-300" colSpan={2}>
                          No rates
                        </td>
                      </tr>
                    ) : (
                      rates.map((r) => (
                        <tr key={r.scrap_type_id} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2 pr-3">{r.material_type}</td>
                          <td className="py-2">₹{Number(r.effective_rate || 0).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "profile" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-300">Name:</span> {vendor.vendor_name}
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-300">Type:</span> {vendor.vendor_type}
              </div>
              {/* Company and godown IDs are intentionally hidden from vendor UI */}
            </CardContent>
          </Card>
        ) : null}
      </div>
      </div>

      <div className="app-bottom-nav fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-md">
        <div className="h-full max-w-5xl mx-auto flex items-center justify-around px-2">
          <NavBtn
            active={activeTab === "rate"}
            onClick={() => setActiveTab("rate")}
            icon={<BadgePercent className="h-5 w-5" />}
            label="Rate"
          />

          <NavBtn
            active={activeTab === "sale"}
            onClick={() => setActiveTab("sale")}
            icon={<BookOpen className="h-5 w-5" />}
            label="Sale"
          />

          <NavBtn
            active={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
            icon={<User className="h-5 w-5" />}
            label="Profile"
          />
        </div>
      </div>
    </div>
  );
}
