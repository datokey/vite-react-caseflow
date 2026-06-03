import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authService } from "../services/authService";
import { AuthContext } from "./authContext";

const AUTH_STORAGE_KEYS = [
  "accessToken",
  "auth",
  "authUser",
  "currentUser",
  "isLoggedIn",
  "isAuthenticated",
  "jwt",
  "profile",
  "refreshToken",
  "role",
  "token",
  "user",
  "userRole",
];

const clearAuthStorage = () => {
  if (typeof window === "undefined") return;

  AUTH_STORAGE_KEYS.forEach((key) => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  });
};

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();

        if (isMounted) {
          setUser(currentUser);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    setAuthenticating(true);

    try {
      let userData = await authService.login(credentials);

      if (!userData) {
        userData = await authService.getCurrentUser();
      }

      clearAuthStorage();
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      return { success: false, error: error?.message || "Login gagal, silakan coba lagi." };
    } finally {
      setAuthenticating(false);
    }
  }, []);

  const register = useCallback(async (payload) => {
    setAuthenticating(true);

    try {
      let userData = await authService.register(payload);

      if (!userData) {
        try {
          userData = await authService.getCurrentUser();
        } catch {
          userData = null;
        }
      }

      clearAuthStorage();
      if (userData) {
        setUser(userData);
      }
      return { success: true, user: userData, requiresLogin: !userData };
    } catch (error) {
      return { success: false, error: error?.message || "Registrasi gagal, silakan coba lagi." };
    } finally {
      setAuthenticating(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Tetap bersihkan user meskipun logout gagal.
    } finally {
      clearAuthStorage();
      setUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, loading, login, logout, register, authenticating }),
    [user, loading, login, logout, register, authenticating],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
