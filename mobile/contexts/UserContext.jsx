// mobile/contexts/UserContext.jsx
import React, { createContext, useContext, useMemo, useState } from "react";
import { useEffect } from "react";
import authService from "../services/authService";

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;

    const restoreUser = async () => {
      try {
        const storedUser = await authService.getStoredUser();

        if (mounted && storedUser) {
          setUser(storedUser);
        }
      } catch (error) {
        console.log("Restore user error:", error?.message || error);
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    };

    restoreUser();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await authService.login(email, password);

      // expected backend response:
      // { user: {...}, token: "..." }
      // or just { ...userData }
      setUser(data.user || data);

      return data;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const data = await authService.register(name, email, password);

      setUser(data.user || data);

      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      setUser,
      loading,
      initializing,
      login,
      register,
      logout,
      isAuthenticated: !!user,
    }),
    [user, loading, initializing]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }

  return context;
}

export default UserContext;
