# ===================================================================
# API ROUTES - routes.py
# ===================================================================
# Defines all REST API endpoints for the expense analyzer
# Handles CRUD operations on expenses and AI analysis
# ===================================================================

from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import pandas as pd
from models import db, Expense, Budget, Prediction, AnomalyLog
from ai_engine import ExpenseAnalyzer

# Create Blueprint for organizing routes
api_bp = Blueprint('api', __name__, url_prefix='/api')

# Initialize AI Engine
analyzer = None

def init_analyzer(app):
    """Initialize the AI analyzer with app config"""
    global analyzer
    analyzer = ExpenseAnalyzer(app.config)

# ===================================================================
# EXPENSE ENDPOINTS
# ===================================================================

@api_bp.route('/expenses', methods=['GET'])
def get_expenses():
    """
    GET all expenses for the user
    
    Query Parameters:
        - category: Filter by category (optional)
        - start_date: Filter from this date (optional)
        - end_date: Filter until this date (optional)
    
    Returns:
        List of expenses in JSON format
    """
    try:
        # Start with all expenses for current user (user_id = 1 for demo)
        query = Expense.query.filter_by(user_id=1)
        
        # Apply category filter if provided
        category = request.args.get('category')
        if category:
            query = query.filter_by(category=category)
        
        # Apply date range filters if provided
        start_date = request.args.get('start_date')
        if start_date:
            query = query.filter(Expense.date >= datetime.fromisoformat(start_date))
        
        end_date = request.args.get('end_date')
        if end_date:
            query = query.filter(Expense.date <= datetime.fromisoformat(end_date))
        
        # Order by date, newest first
        expenses = query.order_by(Expense.date.desc()).all()
        
        return jsonify({
            'success': True,
            'data': [expense.to_dict() for expense in expenses],
            'count': len(expenses)
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/expenses', methods=['POST'])
def create_expense():
    """
    POST - Create a new expense
    
    Expected JSON:
    {
        "category": "Food & Dining",
        "amount": 250.50,
        "date": "2024-01-15",
        "description": "Lunch with colleagues"
    }
    
    Returns:
        Created expense object
    """
    try:
        # Get JSON data from request
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['category', 'amount', 'date']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Create new expense object
        expense = Expense(
            user_id=1,  # Demo user
            category=data['category'],
            amount=float(data['amount']),
            date=datetime.fromisoformat(data['date']).date(),
            description=data.get('description', ''),
            is_flagged=False
        )
        
        # Add to database
        db.session.add(expense)
        db.session.commit()
        
        # Check for anomalies
        check_expense_for_anomalies(expense)
        
        return jsonify({
            'success': True,
            'message': 'Expense created successfully',
            'data': expense.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/expenses/<int:expense_id>', methods=['GET'])
def get_expense(expense_id):
    """
    GET a specific expense by ID
    
    Args:
        expense_id: ID of the expense
    
    Returns:
        Expense details
    """
    try:
        expense = Expense.query.get(expense_id)
        
        if not expense:
            return jsonify({
                'success': False,
                'error': 'Expense not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': expense.to_dict()
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/expenses/<int:expense_id>', methods=['PUT'])
def update_expense(expense_id):
    """
    PUT - Update an existing expense
    
    Args:
        expense_id: ID of expense to update
    
    Expected JSON: (same as create, but all fields optional)
    """
    try:
        expense = Expense.query.get(expense_id)
        
        if not expense:
            return jsonify({
                'success': False,
                'error': 'Expense not found'
            }), 404
        
        data = request.get_json()
        
        # Update fields if provided
        if 'category' in data:
            expense.category = data['category']
        if 'amount' in data:
            expense.amount = float(data['amount'])
        if 'date' in data:
            expense.date = datetime.fromisoformat(data['date']).date()
        if 'description' in data:
            expense.description = data['description']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Expense updated successfully',
            'data': expense.to_dict()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    """
    DELETE - Remove an expense
    
    Args:
        expense_id: ID of expense to delete
    """
    try:
        expense = Expense.query.get(expense_id)
        
        if not expense:
            return jsonify({
                'success': False,
                'error': 'Expense not found'
            }), 404
        
        db.session.delete(expense)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Expense deleted successfully'
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ===================================================================
# ANALYSIS ENDPOINTS
# ===================================================================

@api_bp.route('/analysis/anomalies', methods=['GET'])
def get_anomalies():
    """
    GET - Detect anomalies in spending
    
    Query Parameters:
        - days: Number of days to analyze (default=90)
        - method: 'statistical' or 'ml' (default='statistical')
    
    Returns:
        List of detected anomalies
    """
    try:
        # Get parameters
        days = request.args.get('days', 90, type=int)
        method = request.args.get('method', 'statistical')
        
        # Get expenses from last N days
        start_date = datetime.now() - timedelta(days=days)
        expenses = Expense.query.filter_by(user_id=1).filter(
            Expense.date >= start_date.date()
        ).all()
        
        # Convert to DataFrame
        expenses_data = pd.DataFrame([{
            'category': e.category,
            'amount': e.amount,
            'date': e.date
        } for e in expenses])
        
        if len(expenses_data) == 0:
            return jsonify({
                'success': True,
                'data': [],
                'message': 'No expenses found for analysis'
            }), 200
        
        # Detect anomalies based on method
        if method == 'ml':
            anomalies = analyzer.detect_anomalies_isolation_forest(expenses_data)
        else:
            anomalies = analyzer.detect_anomalies_statistical(expenses_data)
        
        # Also check category anomalies
        category_anomalies = analyzer.detect_category_anomalies(expenses_data)
        
        return jsonify({
            'success': True,
            'data': {
                'statistical_anomalies': anomalies,
                'category_anomalies': category_anomalies,
                'total_anomalies_found': len(anomalies) + len(category_anomalies)
            }
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/analysis/statistics', methods=['GET'])
def get_statistics():
    """
    GET - Get spending statistics
    
    Returns:
        Total, average, category breakdown, etc.
    """
    try:
        days = request.args.get('days', 90, type=int)
        start_date = datetime.now() - timedelta(days=days)
        
        expenses = Expense.query.filter_by(user_id=1).filter(
            Expense.date >= start_date.date()
        ).all()
        
        expenses_df = pd.DataFrame([{
            'category': e.category,
            'amount': e.amount,
            'date': e.date
        } for e in expenses])
        
        if len(expenses_df) == 0:
            return jsonify({
                'success': True,
                'data': {},
                'message': 'No expenses to analyze'
            }), 200
        
        stats = analyzer.get_spending_statistics(expenses_df)
        
        return jsonify({
            'success': True,
            'data': stats
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/analysis/trends', methods=['GET'])
def get_trends():
    """
    GET - Get monthly spending trends
    
    Returns:
        Month-wise spending breakdown
    """
    try:
        expenses = Expense.query.filter_by(user_id=1).all()
        
        expenses_df = pd.DataFrame([{
            'category': e.category,
            'amount': e.amount,
            'date': e.date
        } for e in expenses])
        
        if len(expenses_df) == 0:
            return jsonify({
                'success': True,
                'data': {},
                'message': 'No expenses found'
            }), 200
        
        trends = analyzer.get_monthly_trends(expenses_df)
        
        return jsonify({
            'success': True,
            'data': trends
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/analysis/insights', methods=['GET'])
def get_insights():
    """
    GET - Get category insights and recommendations
    
    Returns:
        Insights for each category with budget recommendations
    """
    try:
        days = request.args.get('days', 180, type=int)
        start_date = datetime.now() - timedelta(days=days)
        
        expenses = Expense.query.filter_by(user_id=1).filter(
            Expense.date >= start_date.date()
        ).all()
        
        expenses_df = pd.DataFrame([{
            'category': e.category,
            'amount': e.amount,
            'date': e.date
        } for e in expenses])
        
        if len(expenses_df) == 0:
            return jsonify({
                'success': True,
                'data': {},
                'message': 'No expenses found'
            }), 200
        
        insights = analyzer.get_category_insights(expenses_df)
        
        return jsonify({
            'success': True,
            'data': insights
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ===================================================================
# PREDICTION ENDPOINTS
# ===================================================================

@api_bp.route('/predictions', methods=['GET'])
def get_predictions():
    """
    GET - Get expense predictions for next month
    
    Query Parameters:
        - method: 'linear' or 'exponential' (default='linear')
    
    Returns:
        Predicted expenses per category
    """
    try:
        method = request.args.get('method', 'linear')
        
        # Get last 6 months of expenses
        start_date = datetime.now() - timedelta(days=180)
        expenses = Expense.query.filter_by(user_id=1).filter(
            Expense.date >= start_date.date()
        ).all()
        
        expenses_df = pd.DataFrame([{
            'category': e.category,
            'amount': e.amount,
            'date': e.date
        } for e in expenses])
        
        if len(expenses_df) == 0:
            return jsonify({
                'success': True,
                'data': {},
                'message': 'Insufficient data for predictions'
            }), 200
        
        # Make predictions
        if method == 'exponential':
            predictions = analyzer.predict_expenses_exponential_smoothing(expenses_df)
        else:
            predictions = analyzer.predict_expenses_linear_regression(expenses_df)
        
        return jsonify({
            'success': True,
            'data': predictions,
            'method': method
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/categories', methods=['GET'])
def get_categories():
    """
    GET - Get list of available expense categories
    
    Returns:
        List of category names
    """
    try:
        from config import Config
        return jsonify({
            'success': True,
            'data': Config.EXPENSE_CATEGORIES
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ===================================================================
# HELPER FUNCTIONS
# ===================================================================

def check_expense_for_anomalies(expense):
    """
    Helper function to check if a new expense is an anomaly
    
    Args:
        expense: Expense object to check
    """
    try:
        # Get last 90 days of same category expenses
        start_date = datetime.now() - timedelta(days=90)
        similar_expenses = Expense.query.filter_by(
            user_id=expense.user_id,
            category=expense.category
        ).filter(Expense.date >= start_date.date()).all()
        
        if len(similar_expenses) < 3:
            return  # Not enough data
        
        amounts = [e.amount for e in similar_expenses if e.id != expense.id]
        mean = sum(amounts) / len(amounts)
        std_dev = (sum((x - mean) ** 2 for x in amounts) / len(amounts)) ** 0.5
        
        # If expense is > mean + 2*std_dev, flag as anomaly
        if std_dev > 0 and expense.amount > (mean + 2 * std_dev):
            expense.is_flagged = True
            
            # Create anomaly log
            anomaly = AnomalyLog(
                user_id=expense.user_id,
                expense_id=expense.id,
                anomaly_type='Amount Outlier',
                severity=3
            )
            db.session.add(anomaly)
            db.session.commit()
    
    except Exception as e:
        print(f"Error checking anomalies: {str(e)}")

@api_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'message': 'API is running'
    }), 200