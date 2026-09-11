// ===================================================================
// PARENT LOGIN PAGE - components/ParentLogin.js
// ===================================================================
// Returning-parent sign-in. Deliberately still requires the student's
// link_code on every login (not just username/password) - see
// Backend/parental_routes.py parent_login for why: the parent session
// only exists because of the student relationship, so it's re-verified
// every time rather than trusted from a bare username/password.
// ===================================================================

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FiUsers, FiX } from 'react-icons/fi';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

function ParentLogin() {
  const [formData, setFormData] = useState({ linkCode: '', identifier: '', password: '' });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.linkCode.trim() || !formData.identifier.trim() || !formData.password) {
      setError('Please fill in the share code, username/email, and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/parental/login`, {
        link_code: formData.linkCode.trim(),
        username: formData.identifier.trim(),
        password: formData.password
      });

      if (response.data.success) {
        login(response.data.data.token, response.data.data.user);
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="expense-form-container auth-page">
      <div className="form-card">
        <h2><FiUsers aria-hidden="true" /> Parent Sign In</h2>

        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss error"><FiX aria-hidden="true" /></button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="expense-form">
          <div className="form-group">
            <label htmlFor="linkCode">
              Student's Share Code <span className="required">*</span>
            </label>
            <input
              type="text"
              id="linkCode"
              name="linkCode"
              value={formData.linkCode}
              onChange={handleChange}
              placeholder="e.g. K7QX9P2M"
              autoComplete="off"
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="identifier">
              Username or Email <span className="required">*</span>
            </label>
            <input
              type="text"
              id="identifier"
              name="identifier"
              value={formData.identifier}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Password <span className="required">*</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>

        <p className="auth-switch">
          New parent? <Link to="/parent-register">Create a parent account</Link>
        </p>
        <p className="auth-switch">
          Not a parent? <Link to="/login">Student login</Link>
        </p>
      </div>
    </div>
  );
}

export default ParentLogin;
