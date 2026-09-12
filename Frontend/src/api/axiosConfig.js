// ===================================================================
// AXIOS GLOBAL CONFIG - api/axiosConfig.js
// ===================================================================
// Registers interceptors on the shared axios singleton so every
// axios.get/post/put/delete call anywhere in the app (App.js,
// AppShell.js, Analytics.js, Predictions.js, ...) automatically:
//   - sends the JWT as an Authorization header, and
//   - gets bounced to /login if that token is rejected as unauthorized.
//
// Importing this module once (see index.js) is enough - axios
// interceptors attach to the module-level default export, which is a
// singleton shared by every `import axios from 'axios'` elsewhere.
// ===================================================================

import axios from 'axios';
import { TOKEN_KEY, USER_KEY } from '../config';

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only treat this as "your session died" if we actually attached a
    // token to the request that got rejected - a plain login/register
    // failure (wrong password) is a 401 too, but never carries a token,
    // and should just be handled by the calling component instead.
    const requestHadToken = Boolean(error.config?.headers?.Authorization);

    // Flask-JWT-Extended returns 401 for an EXPIRED token but 422 for a
    // structurally malformed one (its default invalid_token_loader) -
    // both mean "this token is dead," so both need to bounce to /login.
    const isDeadToken = error.response?.status === 401 || error.response?.status === 422;

    if (isDeadToken && requestHadToken) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      // Force a full reload to '/', unconditionally - no "only if we're
      // not already there" guard. This whole app runs its entire
      // authenticated section (Dashboard/Analytics/Predictions/...) as
      // tabs under ONE route, so the browser's URL is almost always
      // already '/' when a token dies. A guard like
      // `if (pathname !== '/') window.location.href = '/'` looked safe
      // but meant the redirect almost NEVER actually fired in practice -
      // AuthContext's React state doesn't know localStorage was just
      // cleared (that only happens on mount), so the user was left
      // staring at stale cached data with a dead session and no way
      // back to the login form without manually refreshing.
      // Reassigning location.href to the SAME url still forces a real
      // browser reload (unlike e.g. reassigning .hash), which is exactly
      // what's needed here: a fresh mount reads the now-empty
      // localStorage, so isAuthenticated is correctly false and
      // ProtectedRoute sends the user to /login via normal client-side
      // routing - no further server request involved, so this doesn't
      // depend on the static host's SPA-rewrite support either.
      window.location.href = '/';
    }

    return Promise.reject(error);
  }
);
