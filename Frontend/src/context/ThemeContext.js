// ===================================================================
// THEME CONTEXT - context/ThemeContext.js
// ===================================================================
// Light/dark mode. Stores the choice in localStorage; on first visit
// (nothing stored yet) it follows the OS/browser preference via
// prefers-color-scheme. The actual color values live in App.css under
// :root[data-theme="dark"] - this context only ever sets/reads the
// data-theme attribute on <html>, it doesn't know about any colors.
// ===================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { THEME_KEY } from '../config';

const ThemeContext = createContext(null);

function getInitialTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
