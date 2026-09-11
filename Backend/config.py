# ===================================================================
# CONFIGURATION FILE - config.py
# ===================================================================
# This file contains all configuration settings for the Flask app
# Including database, environment, and API settings
# ===================================================================

import os
from datetime import timedelta

# Get the absolute path of the project
basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    """
    Base configuration class with common settings
    Used as parent class for different environments
    """
    
    # ===== DATABASE CONFIGURATION =====
    # SQLite database file location
    # This creates a 'database.db' file in the project root
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(basedir, "database.db")}'
    
    # Disable modification tracking to save memory
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # ===== APP CONFIGURATION =====
    # Secret key for session management and security
    # Change this to a random string in production
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

    # ===== JWT CONFIGURATION =====
    # Flask-JWT-Extended signs tokens with JWT_SECRET_KEY, falling back to
    # SECRET_KEY if it isn't set - so we don't need a separate env var here.
    # DECISION POINT: 24h is a hackathon-friendly default (no re-login mid-demo).
    # Shorten this for anything longer-lived.
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)

    # ===== FLASK SETTINGS =====
    # Disable JSON sorting for better performance
    JSON_SORT_KEYS = False
    
    # JSON settings for API responses
    JSONIFY_PRETTYPRINT_REGULAR = True
    
    # Session lifetime
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    
    # ===== CORS SETTINGS =====
    # Allow frontend to communicate with backend.
    # Deployed frontend origin is included by default so the production
    # build (which has no way to run on localhost) isn't blocked by CORS.
    # Override/extend via the CORS_ORIGINS env var (comma-separated) if the
    # frontend is ever deployed to a different URL.
    _default_cors_origins = (
        "http://localhost:3000,"
        "http://localhost:5000,"
        "https://expense-analyzer-frontend.onrender.com"
    )
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', _default_cors_origins).split(',')
    
    # ===== EXPENSE ANALYSIS SETTINGS =====
    # Number of days to consider for anomaly detection
    ANOMALY_WINDOW_DAYS = 90
    
    # Standard deviation threshold for anomaly detection
    # Transactions exceeding mean + (STD_DEV_THRESHOLD * std_dev) are flagged
    ANOMALY_STD_DEV_THRESHOLD = 2.0
    
    # Minimum historical data points needed for predictions
    MIN_DATA_POINTS_FOR_PREDICTION = 5
    
    # Number of months ahead to predict
    PREDICTION_MONTHS = 1
    
    # ===== CATEGORIES =====
    # Default expense categories
    EXPENSE_CATEGORIES = [
        'Food & Dining',
        'Transportation',
        'Shopping',
        'Entertainment',
        'Utilities',
        'Health & Fitness',
        'Education',
        'Subscriptions',
        'Other'
    ]

    @staticmethod
    def init_app(app):
        """
        Hook for environment-specific setup/validation.
        Called explicitly by create_app() AFTER a config is selected, so
        subclasses can safely validate things (e.g. required env vars)
        without that check running for every config on module import.
        Base implementation is a no-op; override in subclasses as needed.
        """
        pass

class DevelopmentConfig(Config):
    """Configuration for development environment"""
    DEBUG = True
    TESTING = False

class TestingConfig(Config):
    """Configuration for testing environment"""
    TESTING = True
    # Use in-memory database for faster tests
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False

class ProductionConfig(Config):
    """Configuration for production environment"""
    DEBUG = False
    TESTING = False
    # In production, use environment variables for sensitive data.
    # NOTE: this must NOT be validated at class-body/import time - that ran
    # for every config on every import (even 'development'), so the app
    # couldn't even boot locally without a SECRET_KEY env var. init_app()
    # below only runs when ProductionConfig is the config actually selected.
    SECRET_KEY = os.environ.get('SECRET_KEY')

    @staticmethod
    def init_app(app):
        if not ProductionConfig.SECRET_KEY:
            raise ValueError("SECRET_KEY environment variable not set")

# Select configuration based on environment
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}