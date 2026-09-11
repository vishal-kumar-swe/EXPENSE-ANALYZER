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
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Register from './components/Register';
import ParentLogin from './components/ParentLogin';
import ParentRegister from './components/ParentRegister';
import RoleGate from './components/RoleGate';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/parent-login" element={<ParentLogin />} />
            <Route path="/parent-register" element={<ParentRegister />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <RoleGate />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
