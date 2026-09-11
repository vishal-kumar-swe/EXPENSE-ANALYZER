// ===================================================================
// APP CONFIGURATION - config.js
// ===================================================================
// Single source of truth for the backend API base URL.
//
// Root cause fixed here: the three pages (App.js, Analytics.js,
// Predictions.js) each hardcoded their own, DIFFERENT, and WRONG API
// base URL:
//   - App.js pointed at the real backend but was missing the '/api'
//     prefix that every route in routes.py is registered under, so
//     every request 404'd (this is why "Select Categories" and the
//     dashboard were always empty).
//   - Analytics.js and Predictions.js pointed at 'http://localhost:5000',
//     which only works when running the backend on your own machine -
//     the deployed frontend running in someone else's browser can never
//     reach that address.
//
// Fix: one exported constant, overridable via REACT_APP_API_URL at
// build time, used everywhere.
// ===================================================================

export const API_BASE_URL =
  (process.env.REACT_APP_API_URL || 'https://expense-analyzer-j3l8.onrender.com/api').replace(/\/$/, '');

// localStorage keys for the JWT and cached user info (see AuthContext).
export const TOKEN_KEY = 'expenseAnalyzer.token';
export const USER_KEY = 'expenseAnalyzer.user';

// localStorage key for the light/dark theme preference (see ThemeContext).
export const THEME_KEY = 'expenseAnalyzer.theme';

// Fallback categories shown if the /categories endpoint is ever
// unreachable, so the "Select Category" dropdown is never empty.
// Mirrors Backend/config.py Config.EXPENSE_CATEGORIES.
export const DEFAULT_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Utilities',
  'Health & Fitness',
  'Education',
  'Subscriptions',
  'Other'
];
