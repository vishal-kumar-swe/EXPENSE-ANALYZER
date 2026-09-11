# ===================================================================
# API ROUTES - routes.py
# ===================================================================
# Defines all REST API endpoints for the expense analyzer
# Handles CRUD operations on expenses and AI analysis
# ===================================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from datetime import date, datetime, timedelta
import calendar
import pandas as pd
from dateutil.relativedelta import relativedelta
from models import db, Expense, Budget, Prediction, AnomalyLog, MonthlyIncome
from ai_engine import ExpenseAnalyzer
from access_control import student_required

# Create Blueprint for organizing routes
api_bp = Blueprint('api', __name__, url_prefix='/api')

# Initialize AI Engine
analyzer = None

def init_analyzer(app):
    """Initialize the AI analyzer with app config"""
    global analyzer
    analyzer = ExpenseAnalyzer(app.config)

def parse_month_param(default_to_today=True):
    """
    Parse the shared `?month=YYYY-MM` query param used by the report
    endpoints below.

    Returns:
        (year, month) tuple. Falls back to the current month if the
        param is missing (or malformed, when default_to_today=True).
    """
    month_param = request.args.get('month')
    if month_param:
        year_str, month_str = month_param.split('-')
        return int(year_str), int(month_str)
    if default_to_today:
        today = datetime.now()
        return today.year, today.month
    raise ValueError('month is required (format: YYYY-MM)')

def expenses_to_df(expenses):
    """Shared Expense-list -> DataFrame conversion used across analysis endpoints"""
    return pd.DataFrame([{
        'category': e.category,
        'amount': e.amount,
        'date': e.date
    } for e in expenses])

# ===================================================================
# EXPENSE ENDPOINTS
# ===================================================================

@api_bp.route('/expenses', methods=['GET'])
@student_required
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
        # Start with all expenses for the logged-in user
        user_id = int(get_jwt_identity())
        query = Expense.query.filter_by(user_id=user_id)
        
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
@student_required
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
            user_id=int(get_jwt_identity()),
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
@student_required
def get_expense(expense_id):
    """
    GET a specific expense by ID

    Args:
        expense_id: ID of the expense

    Returns:
        Expense details
    """
    try:
        expense = Expense.query.filter_by(id=expense_id, user_id=int(get_jwt_identity())).first()

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
@student_required
def update_expense(expense_id):
    """
    PUT - Update an existing expense

    Args:
        expense_id: ID of expense to update

    Expected JSON: (same as create, but all fields optional)
    """
    try:
        expense = Expense.query.filter_by(id=expense_id, user_id=int(get_jwt_identity())).first()

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
@student_required
def delete_expense(expense_id):
    """
    DELETE - Remove an expense

    Args:
        expense_id: ID of expense to delete
    """
    try:
        expense = Expense.query.filter_by(id=expense_id, user_id=int(get_jwt_identity())).first()

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

@api_bp.route('/expenses/analysis', methods=['GET'])
@student_required
def get_expenses_analysis():
    """
    GET - Pre-aggregated expense totals for the Report section, grouped
    however the frontend's Day/Week/Month toggle asks for. All grouping
    happens here so the frontend never has to sum raw expenses itself.

    Query Parameters:
        - period: 'day' | 'week' | 'month' (default 'month')
        - month: 'YYYY-MM' (default: current month)

    Returns:
        - period=day:   {period, month, total, days: [{date, total}, ...]}
        - period=week:  {period, month, total, weeks: [{label, start, end, total}, ...]}
        - period=month: {period, month, total, categories: [...], trend: [...], income}
    """
    try:
        user_id = int(get_jwt_identity())
        period = request.args.get('period', 'month')
        year, month = parse_month_param()

        month_start = date(year, month, 1)
        month_end = date(year, month, calendar.monthrange(year, month)[1])
        month_label = f'{year:04d}-{month:02d}'

        current_expenses = Expense.query.filter_by(user_id=user_id).filter(
            Expense.date >= month_start, Expense.date <= month_end
        ).all()
        current_df = expenses_to_df(current_expenses)

        if period == 'day':
            days = analyzer.get_daily_breakdown(current_df, year, month)
            return jsonify({
                'success': True,
                'data': {
                    'period': 'day',
                    'month': month_label,
                    'total': sum(d['total'] for d in days),
                    'days': days
                }
            }), 200

        elif period == 'week':
            weeks = analyzer.get_weekly_breakdown(current_df, year, month)
            return jsonify({
                'success': True,
                'data': {
                    'period': 'week',
                    'month': month_label,
                    'total': sum(w['total'] for w in weeks),
                    'weeks': weeks
                }
            }), 200

        else:  # month
            previous_month_end = month_start - timedelta(days=1)
            previous_month_start = previous_month_end.replace(day=1)
            previous_expenses = Expense.query.filter_by(user_id=user_id).filter(
                Expense.date >= previous_month_start, Expense.date <= previous_month_end
            ).all()
            previous_df = expenses_to_df(previous_expenses)

            breakdown = analyzer.get_monthly_category_breakdown(current_df, previous_df)

            # Trend line: the 6 months up to and including the selected one
            trend_start = month_start - relativedelta(months=5)
            trend_expenses = Expense.query.filter_by(user_id=user_id).filter(
                Expense.date >= trend_start, Expense.date <= month_end
            ).all()
            trend_df = expenses_to_df(trend_expenses)
            monthly_trends = analyzer.get_monthly_trends(trend_df)
            trend = [{'month': k, 'total': v} for k, v in sorted(monthly_trends.items())]

            income_row = MonthlyIncome.query.filter_by(user_id=user_id, month=month_start).first()

            return jsonify({
                'success': True,
                'data': {
                    'period': 'month',
                    'month': month_label,
                    'total': breakdown['total'],
                    'categories': breakdown['categories'],
                    'trend': trend,
                    'income': income_row.amount if income_row else None
                }
            }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ===================================================================
# ANALYSIS ENDPOINTS
# ===================================================================

@api_bp.route('/analysis/anomalies', methods=['GET'])
@student_required
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
        expenses = Expense.query.filter_by(user_id=int(get_jwt_identity())).filter(
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
@student_required
def get_statistics():
    """
    GET - Get spending statistics

    Returns:
        Total, average, category breakdown, etc.
    """
    try:
        days = request.args.get('days', 90, type=int)
        start_date = datetime.now() - timedelta(days=days)

        expenses = Expense.query.filter_by(user_id=int(get_jwt_identity())).filter(
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
@student_required
def get_trends():
    """
    GET - Get monthly spending trends

    Returns:
        Month-wise spending breakdown
    """
    try:
        expenses = Expense.query.filter_by(user_id=int(get_jwt_identity())).all()
        
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
@student_required
def get_insights():
    """
    GET - Get category insights and recommendations

    Returns:
        Insights for each category with budget recommendations
    """
    try:
        days = request.args.get('days', 180, type=int)
        start_date = datetime.now() - timedelta(days=days)

        expenses = Expense.query.filter_by(user_id=int(get_jwt_identity())).filter(
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
@student_required
def get_predictions():
    """
    GET - Get expense predictions for next month

    Query Parameters:
        - method: 'ensemble' (default), 'linear', or 'exponential'
                  'ensemble' blends linear regression + exponential
                  smoothing and additionally reports insufficient-data
                  categories and a forward-looking safe-daily-spend
                  summary; 'linear'/'exponential' return the raw
                  single-method per-category predictions only (kept for
                  anyone who wants to see one model in isolation).

    Returns:
        Predicted expenses per category (shape depends on `method`)
    """
    try:
        method = request.args.get('method', 'ensemble')
        user_id = int(get_jwt_identity())

        # Get last 6 months of expenses
        start_date = datetime.now() - timedelta(days=180)
        expenses = Expense.query.filter_by(user_id=user_id).filter(
            Expense.date >= start_date.date()
        ).all()

        expenses_df = expenses_to_df(expenses)

        if method == 'ensemble':
            today = datetime.now().date()
            income_row = MonthlyIncome.query.filter_by(
                user_id=user_id, month=today.replace(day=1)
            ).first()
            predictions = analyzer.predict_expenses_ensemble(
                expenses_df,
                income_amount=income_row.amount if income_row else None,
                today=today
            )
            return jsonify({'success': True, 'data': predictions, 'method': 'ensemble'}), 200

        if len(expenses_df) == 0:
            return jsonify({
                'success': True,
                'data': {},
                'message': 'Insufficient data for predictions'
            }), 200

        # Legacy single-method views
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

# ===================================================================
# INCOME ENDPOINTS
# ===================================================================

@api_bp.route('/income', methods=['GET'])
@student_required
def get_income():
    """
    GET - The logged-in user's income for one month (defaults to the
    current month). Returns amount 0 (not a 404) when nothing has been
    set yet, since "no income entered" is the normal starting state.
    """
    try:
        user_id = int(get_jwt_identity())
        year, month = parse_month_param()
        month_date = date(year, month, 1)

        income = MonthlyIncome.query.filter_by(user_id=user_id, month=month_date).first()

        return jsonify({
            'success': True,
            'data': income.to_dict() if income else {
                'month': month_date.isoformat(),
                'amount': 0.0
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/income', methods=['PUT'])
@student_required
def set_income():
    """
    PUT - Create or update the logged-in user's income for one month
    (upsert on the user_id + month unique constraint).

    Expected JSON:
    {
        "month": "2025-11",
        "amount": 60000
    }
    """
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json() or {}

        month_param = data.get('month')
        if not month_param:
            return jsonify({'success': False, 'error': 'month is required (format: YYYY-MM)'}), 400
        if 'amount' not in data:
            return jsonify({'success': False, 'error': 'amount is required'}), 400

        try:
            amount = float(data['amount'])
        except (TypeError, ValueError):
            return jsonify({'success': False, 'error': 'amount must be a number'}), 400
        if amount < 0:
            return jsonify({'success': False, 'error': 'amount cannot be negative'}), 400

        year_str, month_str = month_param.split('-')
        month_date = date(int(year_str), int(month_str), 1)

        income = MonthlyIncome.query.filter_by(user_id=user_id, month=month_date).first()
        if income:
            income.amount = amount
        else:
            income = MonthlyIncome(user_id=user_id, month=month_date, amount=amount)
            db.session.add(income)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Income saved successfully',
            'data': income.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
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