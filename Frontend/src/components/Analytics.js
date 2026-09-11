// ===================================================================
// ANALYTICS COMPONENT - Analytics.js
// ===================================================================
// Displays:
// - Anomaly detection results
// - Category breakdowns with charts
// - Spending statistics and insights
// - Monthly trends
// ===================================================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import Report from './Report';

/**
 * Analytics Component
 *
 * Renders the redesigned Report section (donut chart, day/week/month
 * toggle, income tracking) followed by the existing Anomaly Detection
 * and Category Insights sections, unchanged.
 *
 * Props:
 *  - expenses: Array of expense objects
 */
function Analytics({ expenses }) {
  // ===== State =====
  const [anomalies, setAnomalies] = useState([]);
  const [insights, setInsights] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detectionMethod, setDetectionMethod] = useState('statistical');

  const API_BASE = API_BASE_URL;

  // ===== Lifecycle Hooks =====

  /**
   * Fetch analytics data when component mounts
   */
  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectionMethod]);

  // ===== API Functions =====

  /**
   * Fetch all analytics data from backend
   */
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch in parallel
      const [anomalyRes, insightsRes] = await Promise.all([
        axios.get(`${API_BASE}/analysis/anomalies?method=${detectionMethod}`),
        axios.get(`${API_BASE}/analysis/insights`)
      ]);

      // Update state with responses
      if (anomalyRes.data.success) {
        setAnomalies(anomalyRes.data.data);
      }
      if (insightsRes.data.success) {
        setInsights(insightsRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // ===== Render Functions =====

  /**
   * Render anomaly section
   */
  const renderAnomalies = () => {
    const allAnomalies = [
      ...(anomalies.statistical_anomalies || []),
      ...(anomalies.category_anomalies || [])
    ];

    if (allAnomalies.length === 0) {
      return (
        <div className="empty-state">
          <p>✓ No anomalies detected! Your spending looks normal.</p>
        </div>
      );
    }

    return (
      <div className="anomalies-list">
        {allAnomalies.map((anomaly, idx) => (
          <div
            key={idx}
            className={`anomaly-card severity-${anomaly.severity || 3}`}
          >
            <div className="anomaly-header">
              <h4>⚠️ {anomaly.category}</h4>
              <span className="severity-badge">
                Severity: {anomaly.severity || '?'}
              </span>
            </div>
            <div className="anomaly-details">
              {anomaly.amount && (
                <p>
                  <strong>Amount:</strong> ₹{anomaly.amount.toFixed(2)}
                </p>
              )}
              {anomaly.expected_range && (
                <p>
                  <strong>Expected Range:</strong> {anomaly.expected_range}
                </p>
              )}
              {anomaly.z_score && (
                <p>
                  <strong>Z-Score:</strong> {anomaly.z_score.toFixed(2)}
                </p>
              )}
              {anomaly.type && (
                <p>
                  <strong>Type:</strong> {anomaly.type}
                </p>
              )}
              {anomaly.frequency_percentage && (
                <p>
                  <strong>Frequency:</strong>{' '}
                  {anomaly.frequency_percentage.toFixed(2)}%
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  /**
   * Render insights section
   */
  const renderInsights = () => {
    if (!insights || Object.keys(insights).length === 0) {
      return <p>No insights available yet.</p>;
    }

    return (
      <div className="insights-grid">
        {Object.entries(insights).map(([category, insight]) => (
          <div key={category} className="insight-card">
            <h4>{category}</h4>
            <div className="insight-details">
              <p>
                <strong>Average:</strong> ₹{insight.average?.toFixed(2)}
              </p>
              <p>
                <strong>Total:</strong> ₹{insight.total?.toFixed(2)}
              </p>
              <p>
                <strong>Transactions:</strong> {insight.count}
              </p>
              <p>
                <strong>Trend:</strong>{' '}
                <span className={`trend ${insight.trend}`}>
                  {insight.trend?.toUpperCase()}
                </span>
              </p>
              <p>
                <strong>Recommended Budget:</strong> ₹
                {insight.recommended_budget?.toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ===== Main Render =====

  if (loading) {
    return (
      <div className="analytics">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics">
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button onClick={fetchAnalytics} aria-label="Retry loading analytics">
            🔄 Retry
          </button>
        </div>
      )}

      {/* Report Section (donut chart, day/week/month, income) */}
      <Report />

      {/* Anomaly Detection Section */}
      <section className="analytics-section">
        <div className="section-header">
          <h2>🚨 Anomaly Detection</h2>
          <div className="method-selector">
            <label>Detection Method:</label>
            <select
              value={detectionMethod}
              onChange={(e) => setDetectionMethod(e.target.value)}
            >
              <option value="statistical">Statistical Analysis</option>
              <option value="ml">Machine Learning (Isolation Forest)</option>
            </select>
          </div>
        </div>
        {renderAnomalies()}
      </section>

      {/* Insights Section */}
      <section className="analytics-section">
        <h2>💡 Category Insights & Recommendations</h2>
        {renderInsights()}
      </section>

      {/* Refresh Button */}
      <div className="analytics-actions">
        <button onClick={fetchAnalytics} className="refresh-btn">
          🔄 Refresh Analytics
        </button>
      </div>
    </div>
  );
}

export default Analytics;