// ===================================================================
// PARENTAL ACCESS - components/ParentalAccess.js
// ===================================================================
// Student-side settings: generate a share code for a parent, see
// whether one has been linked yet and what limit they've set, and
// revoke access entirely. Everything here is data the student already
// owns outright - a spending limit isn't a privacy-sensitive detail
// the way a transaction is, so showing it back to the student who set
// it up is fine.
// ===================================================================

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FiUserPlus, FiCopy, FiTrash2, FiCheckCircle } from 'react-icons/fi';
import { API_BASE_URL } from '../config';

function ParentalAccess() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/parental/status`);
      if (response.data.success) {
        setStatus(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching parental status:', err);
      setError('Failed to load parental access status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleGenerateCode = async () => {
    try {
      setWorking(true);
      setError(null);
      const response = await axios.post(`${API_BASE_URL}/parental/generate-code`);
      if (response.data.success) {
        setStatus(response.data.data);
      }
    } catch (err) {
      console.error('Error generating code:', err);
      setError('Failed to generate a share code. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  const handleCopyCode = async () => {
    if (!status?.link_code) return;
    try {
      await navigator.clipboard.writeText(status.link_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permissions can fail silently in some browsers -
      // the code is still shown on screen for the student to copy manually.
    }
  };

  const handleUnlink = async () => {
    try {
      setWorking(true);
      setError(null);
      await axios.delete(`${API_BASE_URL}/parental/unlink`);
      setStatus({ linked: false, link_code: null, spending_limit: null });
    } catch (err) {
      console.error('Error revoking access:', err);
      setError('Failed to revoke parental access. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="parental-access">
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button onClick={fetchStatus} aria-label="Retry">Retry</button>
        </div>
      )}

      <section className="section-header-only">
        <h2>Parental Access</h2>
        <p className="subtitle">
          Share a code with a parent so they can see your total monthly spending and set a
          spending limit. They will never see individual transactions, categories,
          merchants, or locations - only the total.
        </p>
      </section>

      {!status || !status.link_code ? (
        <section>
          <div className="empty-state">
            <p>No parent is linked yet.</p>
          </div>
          <div className="form-actions">
            <button className="submit-btn" onClick={handleGenerateCode} disabled={working}>
              <FiUserPlus aria-hidden="true" /> {working ? 'Generating...' : 'Generate Share Code'}
            </button>
          </div>
        </section>
      ) : (
        <section className="parental-code-card">
          <h3>Your Share Code</h3>
          <div className="parental-code-row">
            <span className="parental-code">{status.link_code}</span>
            <button className="edit-btn" onClick={handleCopyCode}>
              {copied ? <FiCheckCircle aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <p className="field-hint">
            {status.linked
              ? 'A parent has linked to this code. They can view your monthly total and set a limit.'
              : 'Share this code with a parent so they can sign up as your parent account.'}
          </p>

          {status.linked && (
            <div className="parental-limit-display">
              <span className="field-hint">Spending limit set by your parent:</span>
              <span className="income-amount">
                {status.spending_limit != null ? `₹${status.spending_limit.toFixed(2)}` : 'Not set yet'}
              </span>
            </div>
          )}

          <div className="form-actions">
            <button className="delete-btn" onClick={handleUnlink} disabled={working}>
              <FiTrash2 aria-hidden="true" /> {working ? 'Revoking...' : 'Revoke Parental Access'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default ParentalAccess;
