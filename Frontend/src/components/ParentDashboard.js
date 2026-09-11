// ===================================================================
// PARENT DASHBOARD - components/ParentDashboard.js
// ===================================================================
// The ENTIRE parent-facing surface of the app. On purpose, this
// component never imports Dashboard/ExpenseForm/Analytics/Predictions/
// ChatbotWidget - a parent account has nothing to navigate to besides
// this one screen. The only data shown is what GET /api/parental/summary
// returns (student name, this month's total, the limit, a status) -
// there is no path in this component that could ever render a
// transaction, category, or description, because the API it calls
// never sends that data to a parent in the first place.
// ===================================================================

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FiLogOut, FiUsers } from 'react-icons/fi';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

function ParentDashboard() {
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingLimit, setEditingLimit] = useState(false);
  const [limitInput, setLimitInput] = useState('');
  const [savingLimit, setSavingLimit] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/parental/summary`);
      if (response.data.success) {
        setSummary(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching parental summary:', err);
      setError(
        err.response?.data?.error ||
        'Failed to load your student\'s spending summary. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const startEditingLimit = () => {
    setLimitInput(summary?.spending_limit != null ? String(summary.spending_limit) : '');
    setEditingLimit(true);
  };

  const handleSaveLimit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(limitInput);
    if (isNaN(amount) || amount < 0) {
      setError('Enter a valid, non-negative spending limit.');
      return;
    }
    try {
      setSavingLimit(true);
      setError(null);
      await axios.put(`${API_BASE_URL}/parental/limit`, { spending_limit: amount });
      setEditingLimit(false);
      fetchSummary();
    } catch (err) {
      console.error('Error saving spending limit:', err);
      setError(err.response?.data?.error || 'Failed to save the spending limit. Please try again.');
    } finally {
      setSavingLimit(false);
    }
  };

  const statusMeta = {
    under: { label: 'Under limit', className: 'status-under' },
    near: { label: 'Approaching limit', className: 'status-near' },
    over: { label: 'Over limit', className: 'status-over' },
    no_limit_set: { label: 'No limit set', className: 'status-neutral' }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-container">
          <h1 className="app-title">Expense Tracker</h1>
          <div className="header-user">
            <ThemeToggle />
            {user && <span className="header-username">{user.username}</span>}
            <button className="nav-btn" onClick={logout}>
              <FiLogOut aria-hidden="true" /> Log Out
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <section className="parent-intro">
          <FiUsers className="parent-intro-icon" aria-hidden="true" />
          <div>
            <h2>Parent View</h2>
            <p>
              You can see your student's total spending for the month and set a spending
              limit. Individual transactions, categories, merchants, and locations are
              never shared here - only this aggregate total.
            </p>
          </div>
        </section>

        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button onClick={fetchSummary} aria-label="Retry loading summary">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        ) : summary && (
          <section className="parent-summary-card">
            <div className="parent-summary-header">
              <h3>{summary.student_username}'s spending — {summary.month}</h3>
              <span className={`status-pill ${statusMeta[summary.status].className}`}>
                {statusMeta[summary.status].label}
              </span>
            </div>

            <div className="parent-summary-total">
              <span className="parent-summary-amount">₹{summary.total_spent.toFixed(2)}</span>
              <span className="parent-summary-label">spent this month</span>
            </div>

            {summary.spending_limit != null && (
              <div className="parent-limit-bar">
                <div
                  className={`parent-limit-bar-fill ${summary.status === 'over' ? 'over' : ''}`}
                  style={{ width: `${Math.min((summary.total_spent / summary.spending_limit) * 100, 100)}%` }}
                />
              </div>
            )}

            <div className="parent-limit-section">
              <h4>Monthly Spending Limit</h4>
              {editingLimit ? (
                <form className="parent-limit-form" onSubmit={handleSaveLimit}>
                  <div className="form-group">
                    <label htmlFor="limit-amount">Limit Amount (₹)</label>
                    <input
                      id="limit-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={limitInput}
                      onChange={(e) => setLimitInput(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="submit-btn" disabled={savingLimit}>
                      {savingLimit ? 'Saving...' : 'Save Limit'}
                    </button>
                    <button
                      type="button"
                      className="reset-btn"
                      onClick={() => setEditingLimit(false)}
                      disabled={savingLimit}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="income-display">
                  <span className="income-amount">
                    {summary.spending_limit != null ? `₹${summary.spending_limit.toFixed(2)}` : 'Not set'}
                  </span>
                  <button className="edit-btn" onClick={startEditingLimit}>
                    {summary.spending_limit != null ? 'Edit' : 'Set Limit'}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>Expense Tracker — Parent View</p>
      </footer>
    </div>
  );
}

export default ParentDashboard;
