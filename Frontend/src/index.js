import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';
// Registers the Authorization-header + 401-redirect axios interceptors
// used by every API call in the app - must run before anything fires
// a request, so it's imported here for its side effects only.
import './api/axiosConfig';

// Create root and render App
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
