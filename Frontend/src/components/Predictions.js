// ===================================================================
// PREDICTIONS COMPONENT - Predictions.js
// ===================================================================
// Shows AI-generated predictions for future expenses
// Uses multiple forecasting methods
// ===================================================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

/**
 * Predictions Component
 * Shows forecasted expenses for next month
 */
function Predictions() {
  // ===== State =====
  const [predictions, setPredictions] = useState({});
  const [method, setMethod] = useState('linear');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nextMonth, setNextMonth] = useState('');

  const API_BASE = API_BASE_URL;

  // ===== Lifecycle Hooks =====

  /**
   * Fetch predictions on component mount and method change
   */
  useEffect(() => {
    fetchPredictions();
    // Set next month text
    const today = new Date();
    const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    setNextMonth(next.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method]);

  // ===== API Functions =====

  /**
   * Fetch predictions from backend
   */
  const fetchPredictions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `${API_BASE}/predictions?method=${method}`
      );

      if (response.data.success) {
        setPredictions(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setError('Failed to load predictions');
    } finally {
      setLoading(false);
    }
  };

  // ===== Calculation Functions =====

  /**
   * Calculate total predicted amount
   */
  const getTotalPrediction = () => {
    return Object.values(predictions).reduce(
      (sum, pred) => sum + (pred.predicted_amount || 0),
      0
    );
  };

  /**
   * Get average confidence score
   */
  const getAverageConfidence = () => {
    const confidences = Object.values(predictions)
      .map(p => p.confidence || 0)
      .filter(c => c > 0);

    if (confidences.length === 0) return 0;
    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  };

  /**
   * Get confidence color based on score
   */
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#16a34a'; // Green (success)
    if (confidence >= 0.6) return '#d97706'; // Amber (warning)
    return '#dc2626'; // Red (danger)
  };

  /**
   * Get confidence label
   */
  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  // ===== Render Functions =====

  /**
   * Render prediction cards
   */
  const renderPredictions = () => {
    if (Object.keys(predictions).length === 0) {
      return (
        <div className="empty-state">
          <p>📊 Not enough historical data to make predictions.</p>
          <p>Try adding more expenses first!</p>
        </div>
      );
    }

    return (
      <div className="predictions-grid">
        {Object.entries(predictions).map(([category, prediction]) => (
          <div key={category} className="prediction-card">
            <h3>{category}</h3>

            <div className="prediction-amount">
              <p className="amount">₹{prediction.predicted_amount?.toFixed(2)}</p>
              <span className="label">Predicted Amount</span>
            </div>

            <div className="prediction-confidence">
              <div className="confidence-bar">
                <div
                  className="confidence-fill"
                  style={{
                    width: `${(prediction.confidence || 0) * 100}%`,
                    backgroundColor: getConfidenceColor(prediction.confidence)
                  }}
                ></div>
              </div>
              <div className="confidence-info">
                <span className="confidence-value">
                  {((prediction.confidence || 0) * 100).toFixed(0)}%
                </span>
                <span className="confidence-label">
                  {getConfidenceLabel(prediction.confidence)} Confidence
                </span>
              </div>
            </div>

            {prediction.historical_average && (
              <div className="prediction-comparison">
                <p>
                  <strong>Historical Avg:</strong> ₹
                  {prediction.historical_average.toFixed(2)}
                </p>
                <p>
                  <strong>Difference:</strong>{' '}
                  <span
                    className={
                      prediction.predicted_amount >
                      prediction.historical_average
                        ? 'increase'
                        : 'decrease'
                    }
                  >
                    {prediction.predicted_amount >
                    prediction.historical_average
                      ? '↑'
                      : '↓'}{' '}
                    {Math.abs(
                      (
                        ((prediction.predicted_amount -
                          prediction.historical_average) /
                          prediction.historical_average) *
                        100
                      ).toFixed(1)
                    )}
                    %
                  </span>
                </p>
              </div>
            )}

            {prediction.trend && (
              <div className="prediction-trend">
                <p>
                  <strong>Trend:</strong>{' '}
                  <span className={`trend ${prediction.trend}`}>
                    {prediction.trend === 'increasing' ? '📈' : '📉'}{' '}
                    {prediction.trend.toUpperCase()}
                  </span>
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ===== Main Render =====

  if (loading && Object.keys(predictions).length === 0) {
    return (
      <div className="predictions">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Generating predictions...</p>
        </div>
      </div>
    );
  }

  const totalPrediction = getTotalPrediction();
  const avgConfidence = getAverageConfidence();

  return (
    <div className="predictions">
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button onClick={fetchPredictions} aria-label="Retry loading predictions">
            🔄 Retry
          </button>
        </div>
      )}

      {/* Header Section */}
      <section className="predictions-header">
        <div className="header-content">
          <h2>🔮 Expense Predictions for {nextMonth}</h2>
          <p className="subtitle">
            AI-powered forecasts based on your spending history
          </p>
        </div>

        {/* Method Selector */}
        <div className="method-selector">
          <label>Prediction Method:</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="linear">Linear Regression (Trend-based)</option>
            <option value="exponential">
              Exponential Smoothing (Recent-focused)
            </option>
          </select>
        </div>
      </section>

      {/* Summary Cards */}
      {Object.keys(predictions).length > 0 && (
        <section className="summary-cards">
          <div className="summary-card">
            <h3>Total Predicted Spending</h3>
            <p className="summary-value">₹{totalPrediction.toFixed(2)}</p>
            <span className="summary-label">For {nextMonth}</span>
          </div>
          <div className="summary-card">
            <h3>Average Confidence</h3>
            <div className="confidence-gauge">
              <div
                className="gauge-fill"
                style={{
                  width: `${avgConfidence * 100}%`,
                  backgroundColor: getConfidenceColor(avgConfidence)
                }}
              ></div>
            </div>
            <p className="summary-value">{(avgConfidence * 100).toFixed(0)}%</p>
            <span className="summary-label">
              {getConfidenceLabel(avgConfidence)} Confidence
            </span>
          </div>
        </section>
      )}

      {/* Predictions Grid */}
      <section className="predictions-section">
        <h3>📊 Category-wise Predictions</h3>
        {renderPredictions()}
      </section>

      {/* Information Section */}
      <section className="predictions-info">
        <h3>ℹ️ How Predictions Work</h3>
        <div className="info-grid">
          <div className="info-card">
            <h4>Linear Regression</h4>
            <p>
              Analyzes spending trends over time and projects them forward. Best
              for categories with consistent trends.
            </p>
          </div>
          <div className="info-card">
            <h4>Exponential Smoothing</h4>
            <p>
              Gives more weight to recent spending patterns. Better captures
              recent behavior changes.
            </p>
          </div>
          <div className="info-card">
            <h4>Confidence Scores</h4>
            <p>
              Higher confidence means more consistent historical patterns.
              Low confidence indicates variable spending.
            </p>
          </div>
          <div className="info-card">
            <h4>Use These Predictions</h4>
            <p>
              Set budgets based on these predictions, track actual vs predicted,
              and adjust spending habits accordingly.
            </p>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <div className="predictions-actions">
        <button onClick={fetchPredictions} className="refresh-btn">
          🔄 Refresh Predictions
        </button>
      </div>
    </div>
  );
}

export default Predictions;