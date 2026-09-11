// ===================================================================
// PREDICTIONS COMPONENT - Predictions.js
// ===================================================================
// Forward-looking forecast view, backed by GET /api/predictions
// (defaults to method=ensemble - see Backend/ai_engine.py
// predict_expenses_ensemble). Leads with "what can I do with this
// money" (safe daily spend) rather than a wall of past transactions,
// and explicitly explains categories that don't have enough history
// yet instead of silently omitting them.
// ===================================================================

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FiTrendingUp, FiTrendingDown, FiMinus, FiRefreshCw, FiInfo, FiAlertCircle } from 'react-icons/fi';
import { API_BASE_URL } from '../config';

function getConfidenceColor(confidence) {
  if (confidence >= 0.7) return 'var(--success-color)';
  if (confidence >= 0.4) return 'var(--warning-color)';
  return 'var(--danger-color)';
}

function getConfidenceLabel(confidence) {
  if (confidence >= 0.7) return 'High';
  if (confidence >= 0.4) return 'Medium';
  return 'Low';
}

function TrendIcon({ trend }) {
  if (trend === 'increasing') return <FiTrendingUp aria-hidden="true" className="trend-icon increasing" />;
  if (trend === 'decreasing') return <FiTrendingDown aria-hidden="true" className="trend-icon decreasing" />;
  return <FiMinus aria-hidden="true" className="trend-icon" />;
}

function Predictions() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nextMonthLabel, setNextMonthLabel] = useState('');

  useEffect(() => {
    const today = new Date();
    const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    setNextMonthLabel(next.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }));
  }, []);

  const fetchPredictions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/predictions`);
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setError('Failed to load your forecast. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPredictions(); }, [fetchPredictions]);

  if (loading) {
    return (
      <div className="predictions">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Building your forecast...</p>
        </div>
      </div>
    );
  }

  const categories = data?.categories || {};
  const insufficient = data?.insufficient_categories || [];
  const summary = data?.summary;
  const hasAnyPrediction = Object.keys(categories).length > 0;
  const hasNoDataAtAll = !hasAnyPrediction && insufficient.length === 0 && (!summary || summary.basis === 'none');

  const sortedCategories = Object.entries(categories).sort(
    (a, b) => b[1].predicted_amount - a[1].predicted_amount
  );

  return (
    <div className="predictions">
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button onClick={fetchPredictions} aria-label="Retry loading predictions">
            <FiRefreshCw aria-hidden="true" /> Retry
          </button>
        </div>
      )}

      <section className="predictions-header">
        <div className="header-content">
          <h2>Looking Ahead to {nextMonthLabel}</h2>
          <p className="subtitle">
            A blended forecast (trend + recent-behavior models), grounded in your actual income
            when you've set one.
          </p>
        </div>
      </section>

      {hasNoDataAtAll ? (
        <section>
          <div className="empty-state">
            <p>Add a few expenses to unlock a forecast - the more history you log, the more reliable it gets.</p>
          </div>
        </section>
      ) : (
        <>
          {summary && (
            <section className="safe-spend-hero">
              <div className="safe-spend-main">
                <span className="safe-spend-label">Safe to spend, per day, for the rest of this month</span>
                <span className="safe-spend-value">
                  {summary.safe_daily_spend != null ? `₹${summary.safe_daily_spend.toFixed(0)}` : '—'}
                </span>
                <span className="safe-spend-note">{summary.note}</span>
              </div>
              <div className="safe-spend-stats">
                <div className="safe-spend-stat">
                  <span className="stat-value">₹{summary.total_predicted_next_month.toFixed(0)}</span>
                  <span className="stat-label">Predicted total, {nextMonthLabel}</span>
                </div>
                <div className="safe-spend-stat">
                  <span className="stat-value" style={{ color: getConfidenceColor(summary.overall_confidence) }}>
                    {(summary.overall_confidence * 100).toFixed(0)}%
                  </span>
                  <span className="stat-label">{getConfidenceLabel(summary.overall_confidence)} confidence</span>
                </div>
                <div className="safe-spend-stat">
                  <span className="stat-value">{summary.days_remaining_this_month}</span>
                  <span className="stat-label">Days remaining</span>
                </div>
              </div>
            </section>
          )}

          {hasAnyPrediction && (
            <section className="predictions-section">
              <h3>Category Forecasts</h3>
              <div className="predictions-grid">
                {sortedCategories.map(([category, prediction]) => (
                  <div key={category} className="prediction-card">
                    <h3>{category}</h3>

                    <div className="prediction-amount">
                      <p className="amount">₹{prediction.predicted_amount.toFixed(2)}</p>
                      <span className="label">Predicted Amount</span>
                    </div>

                    <div className="prediction-confidence">
                      <div className="confidence-bar">
                        <div
                          className="confidence-fill"
                          style={{
                            width: `${prediction.confidence * 100}%`,
                            backgroundColor: getConfidenceColor(prediction.confidence)
                          }}
                        />
                      </div>
                      <div className="confidence-info">
                        <span className="confidence-value">{(prediction.confidence * 100).toFixed(0)}%</span>
                        <span className="confidence-label">{getConfidenceLabel(prediction.confidence)} Confidence</span>
                      </div>
                    </div>

                    <div className="prediction-comparison">
                      <p><strong>Historical Avg:</strong> ₹{prediction.historical_average.toFixed(2)}</p>
                    </div>

                    <div className="prediction-trend">
                      <p>
                        <strong>Trend:</strong>{' '}
                        <span className={`trend ${prediction.trend}`}>
                          <TrendIcon trend={prediction.trend} /> {prediction.trend.toUpperCase()}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {insufficient.length > 0 && (
            <section className="predictions-section">
              <h3>Not Enough Data Yet</h3>
              <div className="insufficient-grid">
                {insufficient.map((item) => (
                  <div key={item.category} className="insufficient-card">
                    <FiAlertCircle aria-hidden="true" className="insufficient-icon" />
                    <div>
                      <h4>{item.category}</h4>
                      <p>{item.message}</p>
                      <div className="insufficient-progress">
                        <div
                          className="insufficient-progress-fill"
                          style={{ width: `${Math.min((item.data_points / item.needed) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="field-hint">{item.data_points} of {item.needed} transactions logged</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="predictions-info">
            <h3><FiInfo aria-hidden="true" /> How This Forecast Works</h3>
            <div className="info-grid">
              <div className="info-card">
                <h4>Blended Modeling</h4>
                <p>
                  Each category's forecast blends a trend-based model (Linear Regression) with a
                  recent-behavior model (Exponential Smoothing), which helps cancel out either
                  model's individual blind spots.
                </p>
              </div>
              <div className="info-card">
                <h4>Confidence Scores</h4>
                <p>
                  Higher confidence means more consistent historical patterns. Low confidence
                  indicates variable spending - treat those numbers as rough guides, not guarantees.
                </p>
              </div>
              <div className="info-card">
                <h4>Safe Daily Spend</h4>
                <p>
                  {summary?.basis === 'income'
                    ? "Calculated from your entered income minus what you've already spent this month, divided across the days remaining."
                    : "Calculated from your predicted spending since no income is set yet. Add your income in Report → Income for a more accurate number."}
                </p>
              </div>
              <div className="info-card">
                <h4>Insufficient Data</h4>
                <p>
                  Categories need at least a handful of transactions before a forecast is
                  statistically meaningful - we show exactly how many more you need instead of
                  guessing.
                </p>
              </div>
            </div>
          </section>
        </>
      )}

      <div className="predictions-actions">
        <button onClick={fetchPredictions} className="refresh-btn">
          <FiRefreshCw aria-hidden="true" /> Refresh Forecast
        </button>
      </div>
    </div>
  );
}

export default Predictions;
