import { useEffect, useState } from "react";
import { Toaster } from "./components/ui/sonner";

import { OwnersDashboard } from "./components/Owner/OwnersDashboard";
import { ManagerDashboard } from "./components/manager/ManagerDashboard";
import { VendorDashboard } from "./components/vendor/VendorDashboard";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { Welcome } from "./components/Owner/Welcome";
import { Login } from "./components/Owner/Login";

import { Navigate, Route, Routes } from "react-router-dom";
import AiBotPage from "./components/ai/AiBotPage";

import { AuthProvider, useAuth } from "./utils/authContext";
import { DataProvider } from "./utils/dataContext";
import { PageRefreshProvider } from "./utils/pageRefreshContext";

function AppContent() {
  const { role, loading, isAuthenticated, disableDevAdminBypass } = useAuth();

  // Always show Welcome first (no persistence).
  const [welcomeDone, setWelcomeDone] = useState(false);

  // If user clicked "Admin Login" on Welcome, force admin-only login.
  const [loginMode, setLoginMode] = useState("user");

  const [activeSection, setActiveSection] = useState("dashboard");

  if (!welcomeDone) {
    return (
      <Welcome
        onContinue={() => {
          disableDevAdminBypass();
          setLoginMode("user");
          setWelcomeDone(true);
        }}
        onAdminLogin={() => {
          // Admin portal should be protected by real credentials.
          // Ensure any old dev-bypass is disabled.
          disableDevAdminBypass();
          setLoginMode("admin");
          setWelcomeDone(true);
        }}
      />
    );
  }

  if (loading) return null;

  if (!isAuthenticated) {
    return <Login expectedRole={loginMode === "admin" ? "admin" : null} />;
  }

  if (role === "vendor") {
    return <VendorDashboard />;
  }

  if (role === "admin") {
    return <AdminDashboard />;
  }

  if (role === "manager") {
    return (
      <Routes>
        <Route path="/" element={<ManagerDashboard />} />
        <Route path="/ai-bot" element={<AiBotPage role="manager" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (role === "owner") {
    return (
      <Routes>
        <Route
          path="/"
          element={
            <OwnersDashboard
              activeSection={activeSection}
              setActiveSection={setActiveSection}
            />
          }
        />
        <Route path="/ai-bot" element={<AiBotPage role="owner" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
