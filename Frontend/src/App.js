// ===================================================================
// MAIN APP COMPONENT - App.js
// ===================================================================
// Root component that manages overall app state and routing
// Coordinates between different pages/components
// ===================================================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Dashboard from './components/Dashboard';
import ExpenseForm from './components/ExpenseForm';
import Analytics from './components/Analytics';
import Predictions from './components/Predictions';
import { API_BASE_URL, DEFAULT_CATEGORIES } from './config';

/**
 * Main App Component
 * 
 * State:
 *  - currentPage: Which page to display (dashboard, add, analytics, predictions)
 *  - expenses: List of all expenses
 *  - categories: Available categories
 *  - loading: Loading state during API calls
 *  - error: Error message if API call fails
 */
function App() {
  // ===== State Variables =====
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // API Base URL - single shared source, see src/config.js
  const API_BASE = API_BASE_URL;

  // ===== Lifecycle Hooks =====

  /**
   * useEffect runs when component mounts
   * Fetches initial data from backend
   */
  useEffect(() => {
    // Fetch categories and expenses on app start
    fetchCategories();
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== API Functions =====

  /**
   * Fetch all categories from backend
   */
  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE}/categories`);
      if (response.data.success && response.data.data && response.data.data.length > 0) {
        setCategories(response.data.data);
      } else {
        // Backend reachable but returned no categories - fall back to
        // sensible defaults so "Select Category" is never empty.
        setCategories(DEFAULT_CATEGORIES);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Don't leave the category dropdown empty just because the
      // network call failed - fall back to sensible defaults.
      setCategories(DEFAULT_CATEGORIES);
      setError('Could not reach the server for the latest categories. Showing default categories instead.');
    }
  };

  /**
   * Fetch all expenses from backend
   */
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/expenses`);
      if (response.data.success) {
        setExpenses(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add a new expense
   * 
   * Args:
   *  - expenseData: {category, amount, date, description}
   */
  const handleAddExpense = async (expenseData) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE}/expenses`, expenseData);
      
      if (response.data.success) {
        // Add new expense to state
        setExpenses([response.data.data, ...expenses]);
        setError(null);
        showSuccess('Expense added successfully.');
        // Go back to dashboard after adding
        setCurrentPage('dashboard');
      }
    } catch (err) {
      console.error('Error adding expense:', err);
      setError('Failed to add expense. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Show a success message that auto-dismisses after a few seconds
   */
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  /**
   * Delete an expense
   * 
   * Args:
   *  - expenseId: ID of expense to delete
   */
  const handleDeleteExpense = async (expenseId) => {
    try {
      const response = await axios.delete(`${API_BASE}/expenses/${expenseId}`);
      
      if (response.data.success) {
        // Remove from state
        setExpenses(expenses.filter(e => e.id !== expenseId));
        setError(null);
        showSuccess('Expense deleted.');
      }
    } catch (err) {
      console.error('Error deleting expense:', err);
      setError('Failed to delete expense. Please try again.');
    }
  };

  /**
   * Update an existing expense
   * 
   * Args:
   *  - expenseId: ID of expense to update
   *  - expenseData: Updated expense data
   */
  const handleUpdateExpense = async (expenseId, expenseData) => {
    try {
      const response = await axios.put(
        `${API_BASE}/expenses/${expenseId}`,
        expenseData
      );
      
      if (response.data.success) {
        // Update in state
        const updatedExpenses = expenses.map(e =>
          e.id === expenseId ? response.data.data : e
        );
        setExpenses(updatedExpenses);
        setError(null);
        showSuccess('Expense updated.');
      }
    } catch (err) {
      console.error('Error updating expense:', err);
      setError('Failed to update expense. Please try again.');
    }
  };

  // ===== Render Current Page =====

  /**
   * Returns the component to render based on currentPage state
   */
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            expenses={expenses}
            categories={categories}
            onDelete={handleDeleteExpense}
            onUpdate={handleUpdateExpense}
          />
        );
      case 'add':
        return (
          <ExpenseForm
            categories={categories}
            onSubmit={handleAddExpense}
          />
        );
      case 'analytics':
        return <Analytics expenses={expenses} />;
      case 'predictions':
        return <Predictions />;
      default:
        return <Dashboard expenses={expenses} />;
    }
  };

  // ===== Main Render =====

  return (
    <div className="app">
      {/* Header/Navigation Bar */}
      <header className="app-header">
        <div className="header-container">
          <h1 className="app-title">💰 AI Expense Analyzer</h1>
          
          {/* Navigation Menu */}
          <nav className="nav-menu" aria-label="Main navigation">
            <button
              className={`nav-btn ${currentPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentPage('dashboard')}
              aria-current={currentPage === 'dashboard' ? 'page' : undefined}
            >
              📊 Dashboard
            </button>
            <button
              className={`nav-btn ${currentPage === 'add' ? 'active' : ''}`}
              onClick={() => setCurrentPage('add')}
              aria-current={currentPage === 'add' ? 'page' : undefined}
            >
              ➕ Add Expense
            </button>
            <button
              className={`nav-btn ${currentPage === 'analytics' ? 'active' : ''}`}
              onClick={() => setCurrentPage('analytics')}
              aria-current={currentPage === 'analytics' ? 'page' : undefined}
            >
              📈 Analytics
            </button>
            <button
              className={`nav-btn ${currentPage === 'predictions' ? 'active' : ''}`}
              onClick={() => setCurrentPage('predictions')}
              aria-current={currentPage === 'predictions' ? 'page' : undefined}
            >
              🔮 Predictions
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-main">
        {/* Error Message Display */}
        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss error">✕</button>
          </div>
        )}

        {/* Success Message Display */}
        {successMessage && (
          <div className="success-banner" role="status">
            <span>✓ {successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} aria-label="Dismiss message">✕</button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        )}

        {/* Current Page Content */}
        {!loading && renderPage()}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>
          🚀 AI Expense Analyzer v1.0 | Smart spending insights powered by AI
        </p>
      </footer>
    </div>
  );
}

export default App;