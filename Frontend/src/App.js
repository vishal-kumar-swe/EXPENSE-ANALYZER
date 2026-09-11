// ===================================================================
// MAIN APP COMPONENT - App.js
// ===================================================================
// Top-level router: decides between the public Login/Register pages
// and the protected dashboard (AppShell). All the dashboard/expense
// logic itself lives in components/AppShell.js, unchanged from before
// routing was introduced.
// ===================================================================

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Register from './components/Register';
import AppShell from './components/AppShell';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
