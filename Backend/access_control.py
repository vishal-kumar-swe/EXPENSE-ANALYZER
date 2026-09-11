# ===================================================================
# ACCESS CONTROL - access_control.py
# ===================================================================
# Role boundary between "student" and "parent" accounts.
#
# There is deliberately NO `role` column on User - a user's role is
# derived from whether they appear on a ParentalControl row, so adding
# parental control never requires an ALTER TABLE on the existing,
# git-tracked users table (see models.py ParentalControl docstring).
#
# A user becomes "a parent" the moment they are linked as
# ParentalControl.parent_user_id for ANY student. From that point on,
# @student_required blocks them from every endpoint that can reveal
# transaction-level detail (expenses, analysis, predictions, income,
# chatbot) - even if that same person also happens to have their own
# expense rows from before they linked. This is a deliberate, simple
# rule for a hackathon demo: one account = one role, no dual-mode UI.
# ===================================================================

from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from models import ParentalControl


def is_parent_account(user_id):
    """True if this user is linked as a parent on any ParentalControl row."""
    return ParentalControl.query.filter_by(parent_user_id=user_id).first() is not None


def student_required(fn):
    """
    Require a valid JWT AND that the caller is NOT a linked parent.
    Use on every endpoint that can expose transaction-level detail:
    expenses, analysis, predictions, income, chatbot.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
        if is_parent_account(user_id):
            return jsonify({
                'success': False,
                'error': 'Parent accounts cannot access transaction-level data.'
            }), 403
        return fn(*args, **kwargs)
    return wrapper


def parent_required(fn):
    """
    Require a valid JWT AND that the caller IS a linked parent.
    Use on the parental-summary/limit endpoints.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
        if not is_parent_account(user_id):
            return jsonify({
                'success': False,
                'error': 'This endpoint is only available to linked parent accounts.'
            }), 403
        return fn(*args, **kwargs)
    return wrapper
