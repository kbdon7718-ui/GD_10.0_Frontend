import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(undefined);

const USERS_BY_ROLE = {
  owner: {
    id: '1',
    name: 'Rajesh Kumar',
    email: 'owner@scrapco.com',
    role: 'owner',
  },
  manager: {
    id: '2',
    name: 'Amit Sharma',
    email: 'manager@scrapco.com',
    role: 'manager',
  },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(USERS_BY_ROLE.owner);

  // Load role on mount (default owner)
  useEffect(() => {
    const storedRole = localStorage.getItem('scrapco_role');
    const role = storedRole === 'manager' ? 'manager' : 'owner';
    setUser(USERS_BY_ROLE[role]);
  }, []);

  const setRole = (role) => {
    const normalized = role === 'manager' ? 'manager' : 'owner';
    localStorage.setItem('scrapco_role', normalized);
    setUser(USERS_BY_ROLE[normalized]);
  };

  const logout = () => {
    localStorage.removeItem('scrapco_role');
    localStorage.removeItem('scrapco_seen_welcome');
    setUser(USERS_BY_ROLE.owner);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        logout,
        setRole,
        isAuthenticated: true,
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
