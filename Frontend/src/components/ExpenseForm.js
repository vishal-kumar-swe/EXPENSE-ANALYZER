// ===================================================================
// EXPENSE FORM COMPONENT - ExpenseForm.js
// ===================================================================
// Form for adding new expenses
// Includes validation and error handling
// ===================================================================

import React, { useState } from 'react';
import { FiPlusCircle, FiCheck, FiRefreshCw, FiInfo } from 'react-icons/fi';

/**
 * ExpenseForm Component
 * 
 * Props:
 *  - categories: Array of available categories
 *  - onSubmit: Callback when form is submitted with expense data
 */
function ExpenseForm({ categories, onSubmit }) {
  // ===== State =====
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0], // Today's date
    description: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ===== Validation Function =====

  /**
   * Validate form data
   * 
   * Returns:
   *  - Object with validation errors (empty if valid)
   */
  const validateForm = () => {
    const newErrors = {};

    // Validate category
    if (!formData.category || formData.category.trim() === '') {
      newErrors.category = 'Category is required';
    }

    // Validate amount
    if (!formData.amount || formData.amount === '') {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be a positive number';
    } else if (parseFloat(formData.amount) > 1000000) {
      newErrors.amount = 'Amount exceeds maximum limit (₹10,00,000)';
    }

    // Validate date
    if (!formData.date) {
      newErrors.date = 'Date is required';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      // Allow dates up to today
      if (selectedDate > today) {
        newErrors.date = 'Cannot select a future date';
      }
    }

    // Description is optional, but limit length
    if (formData.description && formData.description.length > 255) {
      newErrors.description = 'Description cannot exceed 255 characters';
    }

    return newErrors;
  };

  // ===== Event Handlers =====

  /**
   * Handle input field changes
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Update form data
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Set submitting state
    setIsSubmitting(true);

    try {
      // Call parent component's onSubmit
      await onSubmit({
        category: formData.category,
        amount: parseFloat(formData.amount),
        date: formData.date,
        description: formData.description
      });

      // Reset form after successful submission
      setFormData({
        category: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
      });
      setErrors({});
    } catch (err) {
      console.error('Error submitting form:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Reset form to initial state
   */
  const handleReset = () => {
    setFormData({
      category: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
    setErrors({});
  };

  // ===== Render =====

  return (
    <div className="expense-form-container">
      <div className="form-card">
        <h2><FiPlusCircle aria-hidden="true" /> Add New Expense</h2>

        <form onSubmit={handleSubmit} className="expense-form">
          {/* Category Field */}
          <div className="form-group">
            <label htmlFor="category">
              Category <span className="required">*</span>
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className={errors.category ? 'error' : ''}
            >
              <option value="">Select a category...</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.category && (
              <span className="error-message">{errors.category}</span>
            )}
            <small className="field-hint">
              Choose where you spent this money
            </small>
          </div>

          {/* Amount Field */}
          <div className="form-group">
            <label htmlFor="amount">
              Amount (₹) <span className="required">*</span>
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              className={errors.amount ? 'error' : ''}
            />
            {errors.amount && (
              <span className="error-message">{errors.amount}</span>
            )}
            <small className="field-hint">
              Enter the amount spent (supports decimals)
            </small>
          </div>

          {/* Date Field */}
          <div className="form-group">
            <label htmlFor="date">
              Date <span className="required">*</span>
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className={errors.date ? 'error' : ''}
            />
            {errors.date && (
              <span className="error-message">{errors.date}</span>
            )}
            <small className="field-hint">
              When did this expense occur?
            </small>
          </div>

          {/* Description Field */}
          <div className="form-group">
            <label htmlFor="description">
              Description (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Add notes about this expense..."
              rows="4"
              className={errors.description ? 'error' : ''}
              maxLength="255"
            />
            {errors.description && (
              <span className="error-message">{errors.description}</span>
            )}
            <small className="field-hint">
              {formData.description.length}/255 characters
            </small>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : (<><FiCheck aria-hidden="true" /> Add Expense</>)}
            </button>
            <button
              type="reset"
              onClick={handleReset}
              className="reset-btn"
              disabled={isSubmitting}
            >
              <FiRefreshCw aria-hidden="true" /> Clear
            </button>
          </div>
        </form>

        {/* Form Tips */}
        <div className="form-tips">
          <h3><FiInfo aria-hidden="true" /> Tips:</h3>
          <ul>
            <li>Be specific with categories - it helps with analysis</li>
            <li>Add descriptions for unusual expenses</li>
            <li>Enter daily transactions for better insights</li>
            <li>The system will flag unusual spending automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ExpenseForm;