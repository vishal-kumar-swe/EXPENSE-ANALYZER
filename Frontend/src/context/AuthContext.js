// ===================================================================
// AUTH CONTEXT - context/AuthContext.js
// ===================================================================
// Shares login state (token + user) across the app: the nav bar (to
// show the username / log out), ProtectedRoute (to gate dashboard
// pages), and the Login/Register pages (to record a successful auth).
// ===================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL, TOKEN_KEY, USER_KEY } from '../config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  // True while a stored token is being checked against the backend, so
  // ProtectedRoute can wait instead of redirecting a valid session to
  // /login just because the check hasn't finished yet.
  const [isChecking, setIsChecking] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setIsChecking(false);
      return;
    }

    let cancelled = false;

    axios.get(`${API_BASE_URL}/auth/me`, { timeout: 45000 })
      .then((response) => {
        if (cancelled) return;
        if (response.data.success) {
          setUser(response.data.data);
          localStorage.setItem(USER_KEY, JSON.stringify(response.data.data));
        }
      })
      .catch((error) => {
        if (cancelled) return;
        // Only a CONFIRMED 401 means the token itself is invalid/expired.
        // Any other failure - a network error, a timeout, Render's free
        // tier returning a 502/503 while it cold-starts - is NOT proof
        // the token is bad. Wiping the session on those was logging
        // people out (and making them re-register) just because the
        // backend was slow to wake up, not because their login was wrong.
        if (error.response?.status === 401) {
          setToken(null);
          setUser(null);
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
        // else: keep the cached token/user - trust the existing session.
        // If the token really is bad, the axios interceptor already
        // handles a 401 on any later API call and redirects to /login then.
      })
      .finally(() => {
        if (!cancelled) setIsChecking(false);
      });

    return () => {
      cancelled = true;
    };
    // Only run once per mount (on refresh) - not on every token change,
    // since login()/logout() already update state directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback((newToken, newUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    isAuthenticated: Boolean(token),
    isChecking,
    login,
    logout
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