// App.js
import { useEffect, useState } from "react";
import { Toaster } from "./components/ui/sonner";

import { OwnersDashboard } from "./components/Owner/OwnersDashboard";
import { ManagerDashboard } from "./components/manager/ManagerDashboard";
import { VendorDashboard } from "./components/vendor/VendorDashboard";
import { Welcome } from "./components/Owner/Welcome";
import { Login } from "./components/Owner/Login";

import { AuthProvider, useAuth } from "./utils/authContext";
import { DataProvider } from "./utils/dataContext";
import { PageRefreshProvider } from "./utils/pageRefreshContext";

function AppContent() {
  const { role, loading, isAuthenticated } = useAuth();

  const [hasSeenWelcome, setHasSeenWelcome] = useState(true);

  useEffect(() => {
    const seen = localStorage.getItem("scrapco_seen_welcome");
    setHasSeenWelcome(!!seen);
  }, []);

  // 🔑 Owner section state (SINGLE SOURCE OF TRUTH)
  const [activeSection, setActiveSection] = useState("dashboard");

  if (!hasSeenWelcome) {
    return (
      <Welcome
        onContinue={() => {
          localStorage.setItem("scrapco_seen_welcome", "1");
          setHasSeenWelcome(true);
        }}
      />
    );
  }

  if (loading) return null;

  if (!isAuthenticated) {
    return <Login />;
  }

  // 👇 ROLE BASED ROUTING
  if (role === "vendor") {
    return <VendorDashboard />;
  }

  if (role === "manager") {
    return <ManagerDashboard />;
  }

  if (role === "owner") {
    return (
      <OwnersDashboard
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />
    );
  }

  // fallback (should never hit)
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <PageRefreshProvider>
          <AppContent />
          <Toaster />
        </PageRefreshProvider>
      </DataProvider>
    </AuthProvider>
  );
}
