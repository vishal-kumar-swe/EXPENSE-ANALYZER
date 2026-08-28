// ===================================================================
// DASHBOARD COMPONENT - Dashboard.js
// ===================================================================
// Main dashboard showing:
// - Expense summary (total, average, etc.)
// - List of recent expenses
// - Quick stats by category
// ===================================================================

import React, { useMemo, useState } from 'react';

/**
 * Dashboard Component
 * 
 * Props:
 *  - expenses: Array of expense objects
 *  - onDelete: Callback function to delete expense
 *  - onUpdate: Callback function to update expense
 */
function Dashboard({ expenses, onDelete, onUpdate }) {
  // ===== State =====
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  // ===== Calculations (using useMemo for performance) =====

  /**
   * Calculate summary statistics
   */
  const summary = useMemo(() => {
    if (expenses.length === 0) {
      return {
        total: 0,
        average: 0,
        count: 0,
        highest: 0,
        lowest: 0
      };
    }

    const amounts = expenses.map(e => e.amount);
    const total = amounts.reduce((sum, amt) => sum + amt, 0);

    return {
      total: total.toFixed(2),
      average: (total / amounts.length).toFixed(2),
      count: expenses.length,
      highest: Math.max(...amounts).toFixed(2),
      lowest: Math.min(...amounts).toFixed(2)
    };
  }, [expenses]);

  /**
   * Calculate category-wise breakdown
   */
  const categoryBreakdown = useMemo(() => {
    const breakdown = {};
    
    expenses.forEach(expense => {
      if (!breakdown[expense.category]) {
        breakdown[expense.category] = {
          total: 0,
          count: 0
        };
      }
      breakdown[expense.category].total += expense.amount;
      breakdown[expense.category].count += 1;
    });

    return breakdown;
  }, [expenses]);

  /**
   * Filter expenses based on selected category
   */
  const filteredExpenses = selectedCategory
    ? expenses.filter(e => e.category === selectedCategory)
    : expenses;

  // ===== Event Handlers =====

  /**
   * Handle edit button click
   */
  const handleEdit = (expense) => {
    setEditingId(expense.id);
    setEditData(expense);
  };

  /**
   * Handle save edited expense
   */
  const handleSave = async (expenseId) => {
    await onUpdate(expenseId, editData);
    setEditingId(null);
  };

  /**
   * Handle input change in edit mode
   */
  const handleEditChange = (field, value) => {
    setEditData({
      ...editData,
      [field]: value
    });
  };

  // ===== Render =====

  return (
    <div className="dashboard">
      {/* Summary Cards Section */}
      <section className="summary-section">
        <h2>📊 Spending Summary</h2>
        <div className="summary-cards">
          {/* Total Spent Card */}
          <div className="summary-card">
            <h3>Total Spent</h3>
            <p className="summary-value">₹{summary.total}</p>
            <span className="summary-label">{summary.count} transactions</span>
          </div>

          {/* Average Spent Card */}
          <div className="summary-card">
            <h3>Average Per Transaction</h3>
            <p className="summary-value">₹{summary.average}</p>
            <span className="summary-label">Per expense</span>
          </div>

          {/* Highest Spent Card */}
          <div className="summary-card">
            <h3>Highest Expense</h3>
            <p className="summary-value">₹{summary.highest}</p>
            <span className="summary-label">Max amount</span>
          </div>

          {/* Lowest Spent Card */}
          <div className="summary-card">
            <h3>Lowest Expense</h3>
            <p className="summary-value">₹{summary.lowest}</p>
            <span className="summary-label">Min amount</span>
          </div>
        </div>
      </section>

      {/* Category Breakdown Section */}
      <section className="category-section">
        <h2>📂 Breakdown by Category</h2>
        <div className="category-list">
          {Object.entries(categoryBreakdown).length === 0 ? (
            <p className="empty-message">No expenses yet. Add one to get started!</p>
          ) : (
            Object.entries(categoryBreakdown).map(([category, data]) => (
              <div
                key={category}
                className={`category-item ${
                  selectedCategory === category ? 'selected' : ''
                }`}
                onClick={() =>
                  setSelectedCategory(
                    selectedCategory === category ? null : category
                  )
                }
              >
                <div className="category-info">
                  <h4>{category}</h4>
                  <span className="category-count">{data.count} transactions</span>
                </div>
                <div className="category-amount">
                  <p>₹{data.total.toFixed(2)}</p>
                  <span className="category-percentage">
                    {((data.total / summary.total) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Expenses List Section */}
      <section className="expenses-section">
        <h2>
          💸 Recent Expenses
          {selectedCategory && ` - ${selectedCategory}`}
        </h2>

        {/* Clear Filter Button */}
        {selectedCategory && (
          <button
            className="clear-filter-btn"
            onClick={() => setSelectedCategory(null)}
          >
            ✕ Clear Filter
          </button>
        )}

        {/* Expenses Table */}
        <div className="expenses-table">
          <div className="table-header">
            <div className="col-date">Date</div>
            <div className="col-category">Category</div>
            <div className="col-description">Description</div>
            <div className="col-amount">Amount</div>
            <div className="col-status">Status</div>
            <div className="col-actions">Actions</div>
          </div>

          {/* Table Body */}
          <div className="table-body">
            {filteredExpenses.length === 0 ? (
              <div className="empty-row">
                <p>No expenses found.</p>
              </div>
            ) : (
              filteredExpenses.map(expense => (
                <div
                  key={expense.id}
                  className={`table-row ${expense.is_flagged ? 'flagged' : ''}`}
                >
                  {/* Edit Mode */}
                  {editingId === expense.id ? (
                    <>
                      <div className="col-date">
                        <input
                          type="date"
                          value={editData.date}
                          onChange={(e) =>
                            handleEditChange('date', e.target.value)
                          }
                        />
                      </div>
                      <div className="col-category">
                        <input
                          type="text"
                          value={editData.category}
                          onChange={(e) =>
                            handleEditChange('category', e.target.value)
                          }
                        />
                      </div>
                      <div className="col-description">
                        <input
                          type="text"
                          value={editData.description || ''}
                          onChange={(e) =>
                            handleEditChange('description', e.target.value)
                          }
                        />
                      </div>
                      <div className="col-amount">
                        <input
                          type="number"
                          value={editData.amount}
                          onChange={(e) =>
                            handleEditChange('amount', parseFloat(e.target.value))
                          }
                        />
                      </div>
                      <div className="col-status">
                        {expense.is_flagged && <span className="flag-badge">⚠️ Unusual</span>}
                      </div>
                      <div className="col-actions">
                        <button
                          className="save-btn"
                          onClick={() => handleSave(expense.id)}
                        >
                          ✓ Save
                        </button>
                        <button
                          className="cancel-btn"
                          onClick={() => setEditingId(null)}
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    /* View Mode */
                    <>
                      <div className="col-date">{expense.date}</div>
                      <div className="col-category">{expense.category}</div>
                      <div className="col-description">
                        {expense.description || '-'}
                      </div>
                      <div className="col-amount">₹{expense.amount.toFixed(2)}</div>
                      <div className="col-status">
                        {expense.is_flagged && (
                          <span className="flag-badge">⚠️ Unusual</span>
                        )}
                      </div>
                      <div className="col-actions">
                        <button
                          className="edit-btn"
                          onClick={() => handleEdit(expense)}
                          title="Edit expense"
                        >
                          ✎ Edit
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => onDelete(expense.id)}
                          title="Delete expense"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;