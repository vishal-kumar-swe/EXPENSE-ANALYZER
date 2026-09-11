// ===================================================================
// PROTECTED ROUTE - components/ProtectedRoute.js
// ===================================================================
// Wraps a route element; redirects to /login unless there's a valid
// logged-in session. See AuthContext for how isChecking/isAuthenticated
// are derived.
// ===================================================================

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isChecking } = useAuth();

  if (isChecking) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
