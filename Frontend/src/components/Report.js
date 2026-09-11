// ===================================================================
// REPORT COMPONENT - components/Report.js
// ===================================================================
// The redesigned analytics "Report" section: a donut chart + category
// list for the selected month, a Day/Week/Month toggle backed by
// pre-aggregated data from /api/expenses/analysis, and monthly income
// tracking with an income-vs-expense comparison.
//
// Rendered inside Analytics.js, above the (untouched) Anomaly
// Detection and Category Insights sections.
// ===================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { format, subMonths, startOfMonth } from 'date-fns';
import { FiBarChart2, FiRefreshCw } from 'react-icons/fi';
import { API_BASE_URL } from '../config';
import { getCategoryColor } from '../utils/categoryColors';

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

// ===== Helpers =====

/**
 * Chart.js draws to a <canvas>, which can't resolve CSS custom
 * properties (var(--x)) the way DOM elements can - so theme colors
 * used in chart options have to be read as resolved values instead.
 */
function getCssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * Parse an API-provided 'YYYY-MM-DD' string as a LOCAL date.
 * new Date('2025-11-01') parses as UTC midnight, which can render as
 * the previous day in timezones behind UTC - the numeric constructor
 * avoids that entirely.
 */
function parseISODate(isoDateStr) {
  const [y, m, d] = isoDateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Pretty-print a 'YYYY-MM' string, e.g. '2025-11' -> 'November 2025' */
function monthLabel(yyyyMM, fmt = 'MMMM yyyy') {
  const [y, m] = yyyyMM.split('-').map(Number);
  return format(new Date(y, m - 1, 1), fmt);
}

/** Last `count` months (including the current one), newest first */
function getMonthOptions(count = 12) {
  const now = startOfMonth(new Date());
  return Array.from({ length: count }, (_, i) => {
    const d = subMonths(now, i);
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') };
  });
}

/**
 * Report Component
 * Expenses/Income tabs + month selector, sitting above the existing
 * Anomaly Detection and Category Insights sections in Analytics.js.
 */
function Report() {
  const API_BASE = API_BASE_URL;
  const monthOptions = useMemo(() => getMonthOptions(12), []);

  // ===== State =====
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [activeTab, setActiveTab] = useState('expenses');
  const [period, setPeriod] = useState('month');

  const [analysis, setAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(true);
  const [analysisError, setAnalysisError] = useState(null);

  const [income, setIncome] = useState(null);
  const [loadingIncome, setLoadingIncome] = useState(true);
  const [incomeError, setIncomeError] = useState(null);
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeInput, setIncomeInput] = useState('');
  const [savingIncome, setSavingIncome] = useState(false);

  // ===== API Functions =====

  const fetchAnalysis = useCallback(async () => {
    try {
      setLoadingAnalysis(true);
      setAnalysisError(null);
      const response = await axios.get(`${API_BASE}/expenses/analysis`, {
        params: { period, month: selectedMonth }
      });
      if (response.data.success) {
        setAnalysis(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
      setAnalysisError('Failed to load report data.');
    } finally {
      setLoadingAnalysis(false);
    }
  }, [API_BASE, period, selectedMonth]);

  const fetchIncome = useCallback(async () => {
    try {
      setLoadingIncome(true);
      setIncomeError(null);
      const response = await axios.get(`${API_BASE}/income`, {
        params: { month: selectedMonth }
      });
      if (response.data.success) {
        setIncome(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching income:', err);
      setIncomeError('Failed to load income.');
    } finally {
      setLoadingIncome(false);
    }
  }, [API_BASE, selectedMonth]);

  useEffect(() => { fetchAnalysis(); }, [fetchAnalysis]);
  useEffect(() => { fetchIncome(); }, [fetchIncome]);
  useEffect(() => { setEditingIncome(false); }, [selectedMonth]);

  const handleSaveIncome = async (e) => {
    e.preventDefault();
    const amount = parseFloat(incomeInput);
    if (isNaN(amount) || amount < 0) {
      setIncomeError('Enter a valid, non-negative income amount.');
      return;
    }
    try {
      setSavingIncome(true);
      setIncomeError(null);
      const response = await axios.put(`${API_BASE}/income`, {
        month: selectedMonth,
        amount
      });
      if (response.data.success) {
        setIncome(response.data.data);
        setEditingIncome(false);
      }
    } catch (err) {
      console.error('Error saving income:', err);
      setIncomeError('Failed to save income. Please try again.');
    } finally {
      setSavingIncome(false);
    }
  };

  const startEditingIncome = () => {
    setIncomeInput(income?.amount ? String(income.amount) : '');
    setEditingIncome(true);
  };

  // ===== Chart Data =====

  const categories = analysis?.categories || [];
  const total = analysis?.total || 0;

  const donutData = {
    labels: categories.map(c => c.category),
    datasets: [{
      data: categories.map(c => c.total),
      backgroundColor: categories.map((c, i) => getCategoryColor(c.category, i)),
      borderColor: getCssVar('--surface-color', '#ffffff'),
      borderWidth: 2,
      hoverOffset: 6
    }]
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: getCssVar('--surface-color', '#ffffff'),
        titleColor: getCssVar('--text-primary', '#0f172a'),
        bodyColor: getCssVar('--text-secondary', '#475569'),
        borderColor: getCssVar('--border-color', '#e2e8f0'),
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (ctx) => {
            const cat = categories[ctx.dataIndex];
            return ` ${ctx.label}: ₹${ctx.parsed.toFixed(2)} (${cat.percentage.toFixed(1)}%)`;
          }
        }
      }
    }
  };

  const sharedScaleGrid = { color: getCssVar('--border-color', '#e2e8f0') };
  const sharedTicks = { color: getCssVar('--text-secondary', '#475569') };

  const weekChartData = {
    labels: (analysis?.weeks || []).map(w => w.label),
    datasets: [{
      label: 'Spent',
      data: (analysis?.weeks || []).map(w => w.total),
      backgroundColor: getCssVar('--primary-color', '#4f46e5'),
      borderRadius: 6,
      maxBarThickness: 64
    }]
  };

  const dayChartData = {
    labels: (analysis?.days || []).map(d => parseInt(d.date.split('-')[2], 10)),
    datasets: [{
      label: 'Spent',
      data: (analysis?.days || []).map(d => d.total),
      borderColor: getCssVar('--primary-color', '#4f46e5'),
      backgroundColor: getCssVar('--primary-light', '#eef2ff'),
      fill: true,
      tension: 0.3,
      pointRadius: 2,
      pointHoverRadius: 5
    }]
  };

  const trendData = {
    labels: (analysis?.trend || []).map(t => monthLabel(t.month, 'MMM')),
    datasets: [{
      label: 'Total Spend',
      data: (analysis?.trend || []).map(t => t.total),
      borderColor: getCssVar('--primary-color', '#4f46e5'),
      backgroundColor: getCssVar('--primary-light', '#eef2ff'),
      fill: true,
      tension: 0.3,
      pointRadius: 3,
      pointHoverRadius: 6
    }]
  };

  const barLikeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: getCssVar('--surface-color', '#ffffff'),
        titleColor: getCssVar('--text-primary', '#0f172a'),
        bodyColor: getCssVar('--text-secondary', '#475569'),
        borderColor: getCssVar('--border-color', '#e2e8f0'),
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (ctx) => ` ₹${ctx.parsed.y.toFixed(2)}`
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: sharedTicks },
      y: { grid: sharedScaleGrid, ticks: sharedTicks, beginAtZero: true }
    }
  };

  // Week bars get a tooltip title showing the actual date range
  // ("Nov 3 - Nov 9") instead of just "Week 2".
  const weekChartOptions = {
    ...barLikeOptions,
    plugins: {
      ...barLikeOptions.plugins,
      tooltip: {
        ...barLikeOptions.plugins.tooltip,
        callbacks: {
          ...barLikeOptions.plugins.tooltip.callbacks,
          title: (items) => {
            const week = (analysis?.weeks || [])[items[0].dataIndex];
            if (!week) return items[0].label;
            return `${format(parseISODate(week.start), 'MMM d')} – ${format(parseISODate(week.end), 'MMM d')}`;
          }
        }
      }
    }
  };

  // ===== Render: Income vs Expense comparison =====

  const renderIncomeComparison = (compact) => {
    const incomeAmount = income?.amount || 0;

    if (incomeAmount <= 0) {
      return (
        <p className="income-hint">
          Set your income for {monthLabel(selectedMonth)} to see how much of it you've spent.
        </p>
      );
    }

    const spentPercentage = (total / incomeAmount) * 100;
    const isOver = spentPercentage > 100;

    return (
      <div className={`income-vs-expense ${compact ? 'compact' : ''}`}>
        <div className="income-vs-expense-header">
          <span className="income-vs-expense-percent">
            {spentPercentage.toFixed(0)}% of income spent
          </span>
          <span className="income-vs-expense-detail">
            ₹{total.toFixed(2)} of ₹{incomeAmount.toFixed(2)}
          </span>
        </div>
        <div className="income-progress-bar">
          <div
            className={`income-progress-fill ${isOver ? 'over' : ''}`}
            style={{ width: `${Math.min(spentPercentage, 100)}%` }}
          />
        </div>
      </div>
    );
  };

  // ===== Render: Expenses tab, Month view =====

  const renderMonthView = () => {
    if (total === 0 && categories.length === 0) {
      return (
        <div className="empty-state">
          <p>No expenses recorded for {monthLabel(selectedMonth)} yet.</p>
        </div>
      );
    }

    return (
      <>
        {renderIncomeComparison(true)}

        <div className="donut-section">
          <div className="donut-chart-wrap">
            <Doughnut data={donutData} options={donutOptions} />
            <div className="donut-center">
              <span className="donut-total">₹{total.toFixed(0)}</span>
              <span className="donut-label">Total Spent</span>
            </div>
          </div>

          <div className="category-list-v2">
            {categories.map((cat, i) => {
              const color = getCategoryColor(cat.category, i);
              const change = cat.change_percentage;
              const isIncrease = change > 0;
              const isFlat = change === 0;

              return (
                <div className="category-list-item" key={cat.category}>
                  <span className="category-dot" style={{ backgroundColor: color }} aria-hidden="true" />
                  <span className="category-list-name">{cat.category}</span>
                  <div className="category-list-bar">
                    <div
                      className="category-list-bar-fill"
                      style={{ width: `${cat.percentage}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="category-list-percent">{cat.percentage.toFixed(1)}%</span>
                  <span className="category-list-amount">₹{cat.total.toFixed(2)}</span>
                  <span className={`delta-badge ${isFlat ? 'flat' : isIncrease ? 'up' : 'down'}`}>
                    {isFlat ? '—' : `${isIncrease ? '+' : ''}${change.toFixed(0)}%`} vs last month
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {analysis?.trend && analysis.trend.length > 1 && (
          <div className="trend-section">
            <h3>Spending Trend</h3>
            <div className="trend-chart-wrap">
              <Line data={trendData} options={barLikeOptions} />
            </div>
          </div>
        )}
      </>
    );
  };

  const renderWeekView = () => {
    const weeks = analysis?.weeks || [];
    if (!weeks.some(w => w.total > 0)) {
      return (
        <div className="empty-state">
          <p>No expenses recorded for {monthLabel(selectedMonth)} yet.</p>
        </div>
      );
    }
    return (
      <div className="period-chart-section">
        <div className="period-chart-wrap">
          <Bar data={weekChartData} options={weekChartOptions} />
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const days = analysis?.days || [];
    if (!days.some(d => d.total > 0)) {
      return (
        <div className="empty-state">
          <p>No expenses recorded for {monthLabel(selectedMonth)} yet.</p>
        </div>
      );
    }
    return (
      <div className="period-chart-section">
        <div className="period-chart-wrap">
          <Line data={dayChartData} options={barLikeOptions} />
        </div>
      </div>
    );
  };

  const renderExpensesTab = () => (
    <>
      <div className="period-toggle" role="tablist" aria-label="Time period">
        {['day', 'week', 'month'].map(p => (
          <button
            key={p}
            role="tab"
            aria-selected={period === p}
            className={`period-btn ${period === p ? 'active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {loadingAnalysis ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading report...</p>
        </div>
      ) : (
        <>
          {period === 'month' && renderMonthView()}
          {period === 'week' && renderWeekView()}
          {period === 'day' && renderDayView()}
        </>
      )}
    </>
  );

  // ===== Render: Income tab =====

  const renderIncomeTab = () => {
    if (loadingIncome) {
      return (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading income...</p>
        </div>
      );
    }

    return (
      <div className="income-panel">
        <div className="income-card">
          <h3>Monthly Income — {monthLabel(selectedMonth)}</h3>

          {editingIncome ? (
            <form className="income-form" onSubmit={handleSaveIncome}>
              <div className="form-group">
                <label htmlFor="income-amount">Income Amount (₹)</label>
                <input
                  id="income-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={incomeInput}
                  onChange={(e) => setIncomeInput(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="submit-btn" disabled={savingIncome}>
                  {savingIncome ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  className="reset-btn"
                  onClick={() => setEditingIncome(false)}
                  disabled={savingIncome}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="income-display">
              <span className="income-amount">₹{(income?.amount || 0).toFixed(2)}</span>
              <button className="edit-btn" onClick={startEditingIncome}>Edit</button>
            </div>
          )}
        </div>

        {renderIncomeComparison(false)}
      </div>
    );
  };

  // ===== Main Render =====

  return (
    <section className="report-section">
      <div className="report-header">
        <h2><FiBarChart2 aria-hidden="true" /> Report</h2>
        <div className="report-controls">
          <div className="report-tabs" role="tablist" aria-label="Report view">
            <button
              role="tab"
              aria-selected={activeTab === 'expenses'}
              className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
              onClick={() => setActiveTab('expenses')}
            >
              Expenses
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'income'}
              className={`tab-btn ${activeTab === 'income' ? 'active' : ''}`}
              onClick={() => setActiveTab('income')}
            >
              Income
            </button>
          </div>
          <select
            className="month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            aria-label="Select month"
          >
            {monthOptions.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {(analysisError || incomeError) && (
        <div className="error-banner" role="alert">
          <span>{analysisError || incomeError}</span>
          <button
            onClick={() => { fetchAnalysis(); fetchIncome(); }}
            aria-label="Retry loading report data"
          >
<FiRefreshCw aria-hidden="true" /> Retry
          </button>
        </div>
      )}

      {activeTab === 'expenses' ? renderExpensesTab() : renderIncomeTab()}
    </section>
  );
}

export default Report;
