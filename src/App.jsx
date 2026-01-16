import { useEffect, useState } from "react";
import { Toaster } from "./components/ui/sonner";

import { OwnersDashboard } from "./components/Owner/OwnersDashboard";
import { ManagerDashboard } from "./components/manager/ManagerDashboard";
import { VendorDashboard } from "./components/vendor/VendorDashboard";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { Welcome } from "./components/Owner/Welcome";
import { Login } from "./components/Owner/Login";

import { AuthProvider, useAuth } from "./utils/authContext";
import { DataProvider } from "./utils/dataContext";
import { PageRefreshProvider } from "./utils/pageRefreshContext";

function AppContent() {
  const { role, loading, isAuthenticated, enableDevAdminBypass, disableDevAdminBypass } = useAuth();

  // Always show Welcome first (no persistence).
  const [welcomeDone, setWelcomeDone] = useState(false);

  const [activeSection, setActiveSection] = useState("dashboard");

  if (!welcomeDone) {
    return (
      <Welcome
        onContinue={() => {
          disableDevAdminBypass();
          setWelcomeDone(true);
        }}
        onAdminLogin={() => {
          enableDevAdminBypass();
          setWelcomeDone(true);
        }}
      />
    );
  }

  if (loading) return null;

  if (!isAuthenticated) {
    return <Login />;
  }

  if (role === "vendor") {
    return <VendorDashboard />;
  }

  if (role === "admin") {
    return <AdminDashboard />;
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
