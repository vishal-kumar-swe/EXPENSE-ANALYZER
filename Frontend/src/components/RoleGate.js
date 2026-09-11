// ===================================================================
// ROLE GATE - components/RoleGate.js
// ===================================================================
// Sits inside ProtectedRoute (so we already know there's a valid
// session) and decides which shell to render based on the logged-in
// user's role: a parent account never sees AppShell (the student's
// full dashboard/expenses/chatbot) - only ParentDashboard, the
// aggregate-only view. See Backend/access_control.py for where this
// boundary is actually enforced (server-side, not just this UI branch).
// ===================================================================

import React from 'react';
import AppShell from './AppShell';
import ParentDashboard from './ParentDashboard';
import { useAuth } from '../context/AuthContext';

function RoleGate() {
  const { user } = useAuth();

  if (user?.role === 'parent') {
    return <ParentDashboard />;
  }

  return <AppShell />;
}

export default RoleGate;
