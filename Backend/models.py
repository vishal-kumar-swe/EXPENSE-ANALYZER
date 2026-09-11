# ===================================================================
# DATABASE MODELS - models.py
# ===================================================================
# Defines all database tables/models for the expense analyzer
# Using SQLAlchemy ORM for database operations
# ===================================================================

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.sql import func
from werkzeug.security import generate_password_hash, check_password_hash

# Initialize SQLAlchemy (database object)
# This object will be imported and used in app.py
db = SQLAlchemy()

# ===================================================================
# USER MODEL
# ===================================================================
class User(db.Model):
    """
    User Model - Represents a registered user/account

    Attributes:
        id: Unique identifier for the user (this is what's stored in the JWT)
        username: Unique login name
        email: Unique email address
        password_hash: Salted hash of the user's password (never store plaintext)
        created_at: Timestamp when the account was created
    """

    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        """Hash and store a plaintext password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verify a plaintext password against the stored hash"""
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.id}: {self.username}>'

    def to_dict(self):
        """
        Convert User object to dictionary
        Never include password_hash in serialized output
        """
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat()
        }


# ===================================================================
# EXPENSE MODEL
# ===================================================================
class Expense(db.Model):
    """
    Expense Model - Represents a single expense entry
    
    Attributes:
        id: Unique identifier for the expense
        user_id: ID of the user who made the expense (placeholder for multi-user)
        category: Category of expense (Food, Transport, etc.)
        amount: Amount spent in rupees
        date: Date when expense occurred
        description: Brief description of the expense
        is_flagged: Whether this expense is an anomaly (unusual)
        created_at: Timestamp when record was created in DB
    """
    
    __tablename__ = 'expenses'
    
    # Primary key - unique identifier
    id = db.Column(db.Integer, primary_key=True)
    
    # Foreign key reference to user (placeholder for future multi-user feature)
    user_id = db.Column(db.Integer, default=1)
    
    # Expense details
    category = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.Date, nullable=False, default=datetime.now)
    description = db.Column(db.String(255), nullable=True)
    
    # Flag for anomaly detection
    is_flagged = db.Column(db.Boolean, default=False)
    
    # Timestamp - automatically set to current time when created
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        """String representation of Expense object"""
        return f'<Expense {self.id}: ₹{self.amount} - {self.category}>'
    
    def to_dict(self):
        """
        Convert Expense object to dictionary
        Useful for JSON serialization when sending to frontend
        """
        return {
            'id': self.id,
            'user_id': self.user_id,
            'category': self.category,
            'amount': self.amount,
            'date': self.date.isoformat(),
            'description': self.description,
            'is_flagged': self.is_flagged,
            'created_at': self.created_at.isoformat()
        }


# ===================================================================
# BUDGET MODEL
# ===================================================================
class Budget(db.Model):
    """
    Budget Model - Represents budget limits for each category per month
    
    Attributes:
        id: Unique identifier
        user_id: User who set this budget
        category: Expense category for this budget
        budget_limit: Maximum amount user wants to spend in this category
        month: Month/Year for which budget is set
        created_at: When this budget was created
    """
    
    __tablename__ = 'budgets'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, default=1)
    category = db.Column(db.String(50), nullable=False)
    budget_limit = db.Column(db.Float, nullable=False)
    
    # Store year-month (e.g., 2024-01)
    month = db.Column(db.Date, nullable=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Budget {self.category}: ₹{self.budget_limit}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'category': self.category,
            'budget_limit': self.budget_limit,
            'month': self.month.isoformat(),
            'created_at': self.created_at.isoformat()
        }


# ===================================================================
# PREDICTION MODEL
# ===================================================================
class Prediction(db.Model):
    """
    Prediction Model - Stores AI predictions for future expenses
    
    Attributes:
        id: Unique identifier
        user_id: User for whom prediction was made
        category: Expense category
        predicted_amount: AI predicted amount for next month
        month: Month for which prediction is made
        confidence: Confidence score of prediction (0-1)
        created_at: When prediction was generated
    """
    
    __tablename__ = 'predictions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, default=1)
    category = db.Column(db.String(50), nullable=False)
    predicted_amount = db.Column(db.Float, nullable=False)
    
    # Month for which we're predicting
    month = db.Column(db.Date, nullable=False)
    
    # Confidence score between 0 and 1
    # Higher is more confident
    confidence = db.Column(db.Float, default=0.5)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Prediction {self.category}: ₹{self.predicted_amount}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'category': self.category,
            'predicted_amount': self.predicted_amount,
            'month': self.month.isoformat(),
            'confidence': round(self.confidence, 2),
            'created_at': self.created_at.isoformat()
        }


# ===================================================================
# ANOMALY MODEL (Optional - stores flagged anomalies)
# ===================================================================
class AnomalyLog(db.Model):
    """
    AnomalyLog Model - Stores detected anomalies for historical tracking
    
    Attributes:
        id: Unique identifier
        user_id: User for whom anomaly was detected
        expense_id: Reference to the expense that triggered anomaly
        anomaly_type: Type of anomaly (outlier, unusual_category, etc.)
        severity: How severe is this anomaly (1-5)
        created_at: When anomaly was detected
    """
    
    __tablename__ = 'anomaly_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, default=1)
    expense_id = db.Column(db.Integer, db.ForeignKey('expenses.id'), nullable=False)
    anomaly_type = db.Column(db.String(50), nullable=False)
    severity = db.Column(db.Integer, default=2)  # 1-5 scale
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Anomaly {self.anomaly_type}: Severity {self.severity}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'expense_id': self.expense_id,
            'anomaly_type': self.anomaly_type,
            'severity': self.severity,
            'created_at': self.created_at.isoformat()
        }