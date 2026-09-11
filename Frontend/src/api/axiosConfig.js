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
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);
