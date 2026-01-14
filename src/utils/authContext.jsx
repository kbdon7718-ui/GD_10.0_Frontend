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

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const sess = await getCurrentSession();
        if (!mounted) return;
        setSession(sess);

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
      // Don't reset welcome; user asked "after welcome" flow.
    } finally {
      setLoading(false);
    }
  };

  const user = useMemo(() => {
    const u = session?.user;
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      phone: u.phone,
      role: role,
    };
  }, [session, role]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        login,
        logout,
        isAuthenticated: !!session,
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
