import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getCurrentRoleFromProfile,
  getCurrentSession,
  loginWithIdentifier,
  logoutSupabase,
} from "./supabaseAuth";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [roleOverride, setRoleOverride] = useState(null);
  const [devAdminBypass, setDevAdminBypass] = useState(false);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const bypass = localStorage.getItem("scrapco_dev_admin_bypass") === "1";
        if (bypass) setDevAdminBypass(true);

        const sess = await getCurrentSession();
        if (!mounted) return;
        setSession(sess);

        const storedOverride = localStorage.getItem("scrapco_role_override");
        if (storedOverride) setRoleOverride(storedOverride);

        if (sess) {
          const r = await getCurrentRoleFromProfile();
          if (!mounted) return;
          setRole(r);
        } else {
          setRole(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (identifier, password) => {
    setLoading(true);
    try {
      const result = await loginWithIdentifier(identifier, password);
      if (!result.ok) return result;

      // refresh session + role after login
      const sess = await getCurrentSession();
      setSession(sess);
      setRole(result.role);

      // Clear any stale override when logging in fresh
      localStorage.removeItem("scrapco_role_override");
      setRoleOverride(null);

      // Also clear dev admin bypass on real login
      localStorage.removeItem("scrapco_dev_admin_bypass");
      setDevAdminBypass(false);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutSupabase();
      setSession(null);
      setRole(null);
      localStorage.removeItem("scrapco_role_override");
      setRoleOverride(null);
      localStorage.removeItem("scrapco_dev_admin_bypass");
      setDevAdminBypass(false);
      // Don't reset welcome; user asked "after welcome" flow.
    } finally {
      setLoading(false);
    }
  };

  const enableDevAdminBypass = () => {
    localStorage.setItem("scrapco_dev_admin_bypass", "1");
    setDevAdminBypass(true);
  };

  const disableDevAdminBypass = () => {
    localStorage.removeItem("scrapco_dev_admin_bypass");
    setDevAdminBypass(false);
  };

  const setRoleClient = (nextRole) => {
    const next = String(nextRole || "").toLowerCase();

    // Only allow switching between owner and manager as a UI convenience.
    const baseRole = String(role || "").toLowerCase();
    const allowed = ["owner", "manager"];
    if (!allowed.includes(next)) return;
    if (!allowed.includes(baseRole)) return;

    localStorage.setItem("scrapco_role_override", next);
    setRoleOverride(next);
  };

  const effectiveRole = useMemo(() => {
    if (devAdminBypass) return "admin";

    const baseRole = String(role || "").toLowerCase();
    const override = String(roleOverride || "").toLowerCase();

    if (baseRole === "owner" && (override === "owner" || override === "manager")) {
      return override;
    }

    if (baseRole === "manager" && (override === "owner" || override === "manager")) {
      return override;
    }

    return role;
  }, [role, roleOverride, devAdminBypass]);

  const user = useMemo(() => {
    const u = session?.user;
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      phone: u.phone,
      role: effectiveRole,
    };
  }, [session, effectiveRole]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role: effectiveRole,
        loading,
        login,
        logout,
        setRole: setRoleClient,
        enableDevAdminBypass,
        disableDevAdminBypass,
        devAdminBypass,
        isAuthenticated: !!session || devAdminBypass,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
