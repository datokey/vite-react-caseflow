import { useCallback, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";
import { AuthContext } from "./authContext";

export const AuthProvider = ({ children }) => {
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

      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      return { success: false, error: error?.message || "Login gagal, silakan coba lagi." };
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
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, authenticating }),
    [user, loading, login, logout, authenticating],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
