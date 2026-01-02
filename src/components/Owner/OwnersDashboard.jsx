import { useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";

import {
  LayoutDashboard,
  BookOpen,
  Package,
  Users,
  Factory,
  Settings,
  LogOut,
  RefreshCcw,
} from "lucide-react";

import { useAuth } from "../../utils/authContext";
import { usePageRefresh } from "../../utils/pageRefreshContext";

/* SECTIONS */
import DashboardOverview from "./DashboardOverview";
// import OwnerDashboard from "./OwnerDashboard";
import { DailyDataBook } from "./DailyDataBook";
import { RokadiUpdate } from "./RokadiUpdate";
import MaalIn from "./MaalIn";
import { FeriwalaSection } from "./FeriwalaSection";
import KabadiwalaSection from "./KabadiwalaSection";
import { LabourSection } from "./LabourSection";
import { MillSection } from "./MillSection";
import RatesUpdate from "./RatesUpdate";

/* Bottom Nav Button */
function NavBtn({ active, onClick, icon, label, highlight }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center transition-all ${
        active ? "text-emerald-600 font-semibold" : "text-gray-500"
      } ${highlight ? "scale-110" : ""}`}
    >
      {icon}
      <span className="text-xs mt-0.5">{label}</span>
    </button>
  );
}

export function OwnersDashboard() {
  const { user, logout } = useAuth();
  const { refresh, hasHandler } = usePageRefresh();

  const [activeTab, setActiveTab] = useState("dashboard");

  /* merged sub-tabs */
  const [maalTab, setMaalTab] = useState("maalin");
  const [dailyTab, setDailyTab] = useState("daily");
  const [millTab, setMillTab] = useState("mill");

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col overflow-x-hidden">
      {/* ================= HEADER ================= */}

      {/* ========== OWNER DAILY SUMMARY DASHBOARD REMOVED ========== */}
      <div className="sticky top-0 z-40 bg-white px-4 py-4 flex justify-between items-center shadow-sm">
          <div>
            <h1 className="text-xl font-bold tracking-wide text-emerald-600">
            GT<span className="text-gray-800">C</span>
          </h1>
            <p className="text-xs text-gray-600 mt-1 font-medium">Powered By ScrapCo.</p>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="text-black hover:bg-white/20"
              onClick={refresh}
              disabled={!hasHandler}
              aria-label="Refresh"
            >
              <RefreshCcw />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="text-black hover:bg-white/20"
              onClick={() => setActiveTab("settings")}
              aria-label="Settings"
            >
              <Settings />
            </Button>
          </div>
      </div>

      {/* ================= CONTENT ================= */}
      {/*
        Mobile UX fix:
        - Remove nested scroll container (was `overflow-y-auto`) to avoid "scroll inside scroll" on phones.
        - Keep ONLY one vertical scroll (the page/body).
        - Add safe bottom padding so fixed bottom-nav never overlaps content.
      */}
      <div className="flex-1 p-4 app-content-safe-bottom">

        {/* DASHBOARD */}
        {activeTab === "dashboard" && <DashboardOverview />}

        {/* DAILY BOOK + ROKADI */}
        {activeTab === "daily" && (
          <>
            <Tabs
              value={dailyTab}
              onValueChange={setDailyTab}
              className="mb-4"
            >
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="rokadi">Rokadi</TabsTrigger>
                <TabsTrigger value="daily">Daily Book</TabsTrigger>
              </TabsList>
            </Tabs>

            {dailyTab === "daily" && <DailyDataBook />}
            {dailyTab === "rokadi" && <RokadiUpdate />}
          </>
        )}

        {/* MAAL + FERIWALA + KABADIWALA */}
        {activeTab === "maal" && (
          <>
            <Tabs
              value={maalTab}
              onValueChange={setMaalTab}
              className="mb-4"
            >
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="maalin">Maal In</TabsTrigger>
                <TabsTrigger value="feriwala">Feriwala</TabsTrigger>
                <TabsTrigger value="kabadiwala">Kabadiwala</TabsTrigger>
              </TabsList>
            </Tabs>

            {maalTab === "maalin" && <MaalIn />}
            {maalTab === "feriwala" && <FeriwalaSection />}
            {maalTab === "kabadiwala" && <KabadiwalaSection />}
          </>
        )}

        {/* LABOUR */}
        {activeTab === "labour" && <LabourSection />}

        {/* MILL + RATES */}
        {activeTab === "mill" && (
          <>
            <Tabs
              value={millTab}
              onValueChange={setMillTab}
              className="mb-4"
            >
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="mill">Party / Mill</TabsTrigger>
                <TabsTrigger value="rates">Rates</TabsTrigger>
              </TabsList>
            </Tabs>

            {millTab === "mill" && <MillSection />}
            {millTab === "rates" && <RatesUpdate />}
          </>
        )}

        {/* SETTINGS */}
        {activeTab === "settings" && (
          <Card>
            <CardContent className="space-y-4 p-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-semibold">{user?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-semibold">{user?.email}</p>
              </div>

              <Button
                variant="destructive"
                className="w-full"
                onClick={logout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ================= BOTTOM NAV (MOBILE STYLE) ================= */}
      <div className="app-bottom-nav fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-md">
        <div className="h-full flex items-center justify-around px-2">

          <NavBtn
            active={activeTab === "labour"}
            onClick={() => setActiveTab("labour")}
            icon={<Users className="h-5 w-5" />}
            label="Labour"
          />

          <NavBtn
            active={activeTab === "maal"}
            onClick={() => setActiveTab("maal")}
            icon={<Package className="h-5 w-5" />}
            label="Maal"
          />

          {/* CENTER DASHBOARD */}
          <NavBtn
            active={activeTab === "dashboard"}
            onClick={() => setActiveTab("dashboard")}
            icon={<LayoutDashboard className="h-6 w-6" />}
            label="Dashboard"
            highlight
          />

          <NavBtn
            active={activeTab === "daily"}
            onClick={() => setActiveTab("daily")}
            icon={<BookOpen className="h-5 w-5" />}
            label="Daily"
          />

          <NavBtn
            active={activeTab === "mill"}
            onClick={() => setActiveTab("mill")}
            icon={<Factory className="h-5 w-5" />}
            label="Mills"
          />

        </div>
      </div>
    </div>
  );
}

export default OwnersDashboard;
