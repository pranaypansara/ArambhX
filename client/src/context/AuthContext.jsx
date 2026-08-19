import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api, setAuthToken, setOnUnauthorized } from '@/services/api';

const AuthContext = createContext();
const TOKEN_KEY = 'arambh_token';
const USER_KEY = 'arambh_user';

const BACKEND_ROLES = ['ADMIN', 'FACULTY', 'COUNSELOR', 'STUDENT'];

const readStoredUser = () => {
  try {
    const saved = localStorage.getItem(USER_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    const valid = parsed && typeof parsed.id === 'number' && BACKEND_ROLES.includes(parsed.role);
    return valid ? parsed : null;
  } catch (e) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  const [initializing, setInitializing] = useState(true);
  const restoringRef = useRef(false);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAuthToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    // On a 401 from any API call, drop the local session (server already rejected it).
    setOnUnauthorized(() => clearSession);
  }, [clearSession]);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setAuthToken(null);
      setInitializing(false);
      return;
    }
    setAuthToken(token);
    if (restoringRef.current) return;
    restoringRef.current = true;

    api.me()
      .then((res) => {
        const fresh = res.data;
        setUser(fresh);
        localStorage.setItem(USER_KEY, JSON.stringify(fresh));
      })
      .catch(() => {
        clearSession();
      })
      .finally(() => {
        setInitializing(false);
        restoringRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.login({ email, password });
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setAuthToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async ({ name, email, password, studentId }) => {
    const res = await api.register({ name, email, password, studentId: studentId || null });
    // Public registration returns the profile only — the user must sign in afterwards.
    return res.data;
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const role = user?.role || null;
  const value = {
    user,
    role,
    isAuthenticated: !!user,
    initializing,
    isAdmin: role === 'ADMIN',
    isFaculty: role === 'FACULTY',
    isCounselor: role === 'COUNSELOR',
    isStudent: role === 'STUDENT',
    isStaff: role === 'ADMIN' || role === 'FACULTY' || role === 'COUNSELOR',
    studentId: user?.studentId ?? null,
    displayName: user?.name || '',
    displayRole: role,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};