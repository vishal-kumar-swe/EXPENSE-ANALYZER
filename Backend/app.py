# ===================================================================
# MAIN APPLICATION - app.py
# ===================================================================
# Entry point for the Flask application
# Initializes database, routes, and middleware
# ===================================================================

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import os
from datetime import datetime

# Import configuration and models
from config import config
from models import db, User, Expense, Budget, Prediction, AnomalyLog
from routes import api_bp, init_analyzer
from auth_routes import auth_bp

# ===================================================================
# APPLICATION FACTORY FUNCTION
# ===================================================================

def create_app(config_name='development'):
    """
    Create and configure the Flask application
    
    Args:
        config_name: Configuration to use ('development', 'production', 'testing')
    
    Returns:
        Configured Flask app instance
    """
    
    # Create Flask app instance
    app = Flask(__name__)

    # Load configuration
    selected_config = config[config_name]
    app.config.from_object(selected_config)

    # Run environment-specific validation (e.g. ProductionConfig requires
    # SECRET_KEY to actually be set) - only for the config we just selected,
    # not for every config class defined in config.py.
    selected_config.init_app(app)

    # ===== Initialize Extensions =====

    # Initialize SQLAlchemy (database)
    db.init_app(app)

    # Initialize JWT (token-based auth)
    JWTManager(app)

    # Enable CORS (Cross-Origin Resource Sharing)
    # Allows frontend to make requests to backend
    CORS(app, origins=app.config['CORS_ORIGINS'])

    # Initialize AI Engine with config
    init_analyzer(app)

    # ===== Register Blueprints =====
    # Blueprints are modular sets of routes
    app.register_blueprint(auth_bp)
    app.register_blueprint(api_bp)
    
    # ===== Error Handlers =====
    
    @app.errorhandler(404)
    def not_found_error(error):
        """Handle 404 Not Found errors"""
        return jsonify({
            'success': False,
            'error': 'Resource not found',
            'status': 404
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 Internal Server errors"""
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'status': 500
        }), 500
    
    @app.errorhandler(400)
    def bad_request_error(error):
        """Handle 400 Bad Request errors"""
        return jsonify({
            'success': False,
            'error': 'Bad request',
            'status': 400
        }), 400
    
    # ===== Custom Routes (Non-API) =====
    
    @app.route('/')
    def home():
        """Root endpoint - API information"""
        return jsonify({
            'message': 'AI Expense Analyzer API',
            'version': '1.0.0',
            'endpoints': {
                'expenses': '/api/expenses',
                'analysis': '/api/analysis/*',
                'predictions': '/api/predictions',
                'health': '/api/health'
            }
        }), 200
    
    # ===== Database Setup =====
    
    @app.before_request
    def before_request():
        """
        Code that runs before each request
        Useful for authentication, logging, etc.
        """
        pass
    
    @app.teardown_appcontext
    def shutdown_session(exception=None):
        """Clean up database session"""
        db.session.remove()
    
    # ===== Context Processors (for templates if needed) =====
    
    @app.context_processor
    def inject_config():
        """Inject config into template context"""
        return dict(
            app_name='AI Expense Analyzer',
            current_year=datetime.now().year
        )
    
    # ===== Create Database Tables =====
    
    with app.app_context():
        """
        Create database tables if they don't exist
        This is called when app starts
        """
        db.create_all()
        print("✓ Database tables created/verified")
    
    return app

# ===================================================================
# APPLICATION ENTRY POINT
# ===================================================================

if __name__ == '__main__':
    """
    Main entry point
    Only runs if script is executed directly (not imported)
    """
    
    # Determine environment from FLASK_ENV variable
    # Default to 'development' if not set
    env = os.environ.get('FLASK_ENV', 'development')
    
    # Create app with appropriate config
    app = create_app(env)
    
    # Print startup information
    print("=" * 60)
    print("🚀 AI EXPENSE ANALYZER API STARTING")
    print("=" * 60)
    print(f"Environment: {env}")
    print(f"Debug Mode: {app.debug}")
    print(f"CORS Origins: {app.config['CORS_ORIGINS']}")
    print("=" * 60)
    
    # Run development server
    # - host='0.0.0.0' allows external connections
    # - port=5000 is default Flask port
    # - debug=True enables auto-reload on code changes
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=(env == 'development'),
        use_reloader=True
    )