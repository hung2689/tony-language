import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../../services/authService';
import { setOnAuthFailure, clearAccessToken, getAccessToken } from '../../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      clearAccessToken({ broadcast: true });
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    setOnAuthFailure(() => {
      if (isMounted && !getAccessToken()) {
        setUser(null);
      }
    });

    // Single-flight silent refresh on app startup (safe under React StrictMode)
    authService
      .restoreSession()
      .then((me) => {
        if (isMounted) {
          setUser(me);
        }
      })
      .catch(() => {
        if (isMounted && !getAccessToken()) {
          setUser(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email, password, rememberMe = false) => {
    const data = await authService.login(email, password, rememberMe);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (email, username, password) => {
    const data = await authService.register(email, username, password);
    setUser(data.user);
    return data;
  }, []);

  const updateUser = useCallback((updater) => {
    setUser((prev) => {
      if (!prev) return prev;
      const patch = typeof updater === 'function' ? updater(prev) : updater;
      return { ...prev, ...patch };
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await authService.getMe();
      if (me) {
        setUser(me);
      }
      return me;
    } catch {
      return null;
    }
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
