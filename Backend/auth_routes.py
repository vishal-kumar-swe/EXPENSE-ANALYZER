# ===================================================================
# AUTH ROUTES - auth_routes.py
# ===================================================================
# Registration/login endpoints and JWT issuance.
# Kept separate from routes.py so auth concerns don't get tangled up
# with expense/analysis/prediction endpoints.
# ===================================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User
from access_control import is_parent_account

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

MIN_PASSWORD_LENGTH = 6


@auth_bp.route('/register', methods=['POST'])
def register():
    """
    POST - Create a new user account

    Expected JSON:
    {
        "username": "alice",
        "email": "alice@example.com",
        "password": "secret123"
    }

    Returns:
        JWT access token and the created user
    """
    try:
        data = request.get_json() or {}

        username = (data.get('username') or '').strip()
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''

        if not username or not email or not password:
            return jsonify({
                'success': False,
                'error': 'username, email, and password are all required'
            }), 400

        if len(password) < MIN_PASSWORD_LENGTH:
            return jsonify({
                'success': False,
                'error': f'Password must be at least {MIN_PASSWORD_LENGTH} characters'
            }), 400

        existing = User.query.filter(
            (User.username == username) | (User.email == email)
        ).first()
        if existing:
            return jsonify({
                'success': False,
                'error': 'Username or email is already registered'
            }), 409

        user = User(username=username, email=email)
        user.set_password(password)

        db.session.add(user)
        db.session.commit()

        # Identity must be a string - flask-jwt-extended rejects non-string
        # subjects, so we stringify the id and int() it back on the way out.
        token = create_access_token(identity=str(user.id))

        return jsonify({
            'success': True,
            'message': 'Account created successfully',
            'data': {
                'token': token,
                # A brand-new account can't already be linked as a parent
                # (that only happens via parental_routes.parent_register),
                # so this is always 'student' here.
                'user': {**user.to_dict(), 'role': 'student'}
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    POST - Authenticate and receive a JWT

    Expected JSON:
    {
        "username": "alice",   # username OR email works here
        "password": "secret123"
    }

    Returns:
        JWT access token and the user
    """
    try:
        data = request.get_json() or {}

        identifier = (data.get('username') or data.get('email') or '').strip()
        password = data.get('password') or ''

        if not identifier or not password:
            return jsonify({
                'success': False,
                'error': 'username/email and password are required'
            }), 400

        user = User.query.filter(
            (User.username == identifier) | (User.email == identifier.lower())
        ).first()

        if not user or not user.check_password(password):
            return jsonify({
                'success': False,
                'error': 'Invalid username/email or password'
            }), 401

        token = create_access_token(identity=str(user.id))
        # Compute role dynamically: this same login form works for a
        # parent account too (it's still just username+password against
        # the same users table) - if it turns out to belong to a linked
        # parent, tell the frontend so it can route to the parent view
        # instead of trying (and failing 403) to load student data.
        role = 'parent' if is_parent_account(user.id) else 'student'

        return jsonify({
            'success': True,
            'message': 'Login successful',
            'data': {
                'token': token,
                'user': {**user.to_dict(), 'role': role}
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    """
    GET - Return the current user for the JWT on the request.
    Used by the frontend on load to check whether a stored token is
    still valid before trusting it to show protected pages.
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404

        role = 'parent' if is_parent_account(user_id) else 'student'

        return jsonify({
            'success': True,
            'data': {**user.to_dict(), 'role': role}
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
