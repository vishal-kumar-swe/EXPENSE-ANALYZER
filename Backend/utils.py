# ===================================================================
# UTILITY FUNCTIONS - utils.py
# ===================================================================
# Helper functions for common operations
# ===================================================================

from datetime import datetime, timedelta
import json

def serialize_date(obj):
    """
    JSON serializer for objects not serializable by default json code
    Handles datetime objects
    
    Args:
        obj: Object to serialize
    
    Returns:
        Serialized object or original if not datetime
    """
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

def get_date_range(days=30):
    """
    Get date range for the last N days
    
    Args:
        days: Number of days to go back
    
    Returns:
        Tuple of (start_date, end_date)
    """
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days)
    return start_date, end_date

def format_currency(amount, currency='₹'):
    """
    Format amount as currency
    
    Args:
        amount: Amount to format
        currency: Currency symbol (default: Indian Rupee)
    
    Returns:
        Formatted currency string
    """
    return f"{currency} {amount:,.2f}"

def get_month_key(date_obj):
    """
    Get month key in format YYYY-MM
    
    Args:
        date_obj: Date object
    
    Returns:
        String in format YYYY-MM
    """
    return date_obj.strftime('%Y-%m')

def validate_category(category, valid_categories):
    """
    Validate if category is in allowed list
    
    Args:
        category: Category to validate
        valid_categories: List of valid categories
    
    Returns:
        Boolean indicating if valid
    """
    return category in valid_categories

def validate_amount(amount):
    """
    Validate expense amount
    
    Args:
        amount: Amount to validate
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        amount = float(amount)
        if amount <= 0:
            return False, "Amount must be greater than 0"
        if amount > 1000000:  # Max 10 lakhs per transaction
            return False, "Amount exceeds maximum limit"
        return True, None
    except (ValueError, TypeError):
        return False, "Amount must be a valid number"

def calculate_percentage(value, total):
    """
    Calculate percentage of value in total
    
    Args:
        value: Value to calculate percentage for
        total: Total value
    
    Returns:
        Percentage as float (0-100)
    """
    if total == 0:
        return 0
    return (value / total) * 100

def round_to_decimals(value, decimals=2):
    """
    Round value to N decimal places
    
    Args:
        value: Value to round
        decimals: Number of decimal places
    
    Returns:
        Rounded value
    """
    return round(float(value), decimals)

def safe_divide(numerator, denominator, default=0):
    """
    Safely divide two numbers without zero division error
    
    Args:
        numerator: Numerator
        denominator: Denominator
        default: Default value if denominator is 0
    
    Returns:
        Result of division or default
    """
    if denominator == 0:
        return default
    return numerator / denominator