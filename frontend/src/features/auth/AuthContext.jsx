import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../../services/authService';
import { setOnAuthFailure, clearAccessToken } from '../../services/api';

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
      clearAccessToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    setOnAuthFailure(() => {
      if (isMounted) {
        setUser(null);
      }
    });

    // Try silent refresh on app startup
    authService
      .refresh()
      .then(async () => {
        const me = await authService.getMe();
        if (isMounted) {
          setUser(me);
        }
      })
      .catch(() => {
        if (isMounted) {
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

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (email, username, password) => {
    const data = await authService.register(email, username, password);
    setUser(data.user);
    return data;
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
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
