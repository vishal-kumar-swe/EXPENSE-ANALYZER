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

  // API Base URL
  const API_BASE = 'http://localhost:5000/api';

  // ===== Lifecycle Hooks =====

  /**
   * useEffect runs when component mounts
   * Fetches initial data from backend
   */
  useEffect(() => {
    // Fetch categories and expenses on app start
    fetchCategories();
    fetchExpenses();
  }, []);

  // ===== API Functions =====

  /**
   * Fetch all categories from backend
   */
  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE}/categories`);
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories');
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
        // Go back to dashboard after adding
        setCurrentPage('dashboard');
      }
    } catch (err) {
      console.error('Error adding expense:', err);
      setError('Failed to add expense');
    } finally {
      setLoading(false);
    }
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
      }
    } catch (err) {
      console.error('Error deleting expense:', err);
      setError('Failed to delete expense');
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
      }
    } catch (err) {
      console.error('Error updating expense:', err);
      setError('Failed to update expense');
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
          <nav className="nav-menu">
            <button
              className={`nav-btn ${currentPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentPage('dashboard')}
            >
              📊 Dashboard
            </button>
            <button
              className={`nav-btn ${currentPage === 'add' ? 'active' : ''}`}
              onClick={() => setCurrentPage('add')}
            >
              ➕ Add Expense
            </button>
            <button
              className={`nav-btn ${currentPage === 'analytics' ? 'active' : ''}`}
              onClick={() => setCurrentPage('analytics')}
            >
              📈 Analytics
            </button>
            <button
              className={`nav-btn ${currentPage === 'predictions' ? 'active' : ''}`}
              onClick={() => setCurrentPage('predictions')}
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
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)}>✕</button>
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