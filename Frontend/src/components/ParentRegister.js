// ===================================================================
// PARENT REGISTER PAGE - components/ParentRegister.js
// ===================================================================
// First-time parent sign-up. Always requires the student's share code -
// there is no way to create a parent account that isn't tied to a
// specific student from the moment it exists (see
// Backend/parental_routes.py parent_register).
// ===================================================================

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FiUsers, FiX } from 'react-icons/fi';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

function ParentRegister() {
  const [formData, setFormData] = useState({
    linkCode: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (!formData.linkCode.trim() || !formData.username.trim() || !formData.email.trim() || !formData.password) {
      return 'All fields are required.';
    }
    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/parental/register`, {
        link_code: formData.linkCode.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password
      });

      if (response.data.success) {
        login(response.data.data.token, response.data.data.user);
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="expense-form-container auth-page">
      <div className="form-card">
        <h2><FiUsers aria-hidden="true" /> Parent Sign Up</h2>

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
            <small className="field-hint">Ask your student for this - it's in their Parental Access settings.</small>
          </div>

          <div className="form-group">
            <label htmlFor="username">
              Your Username <span className="required">*</span>
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="priya_parent"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">
              Your Email <span className="required">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
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
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
            <small className="field-hint">Must be at least 6 characters</small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              Confirm Password <span className="required">*</span>
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create Parent Account'}
            </button>
          </div>
        </form>

        <p className="auth-switch">
          Already linked? <Link to="/parent-login">Parent sign in</Link>
        </p>
        <p className="auth-switch">
          Not a parent? <Link to="/register">Student sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default ParentRegister;
