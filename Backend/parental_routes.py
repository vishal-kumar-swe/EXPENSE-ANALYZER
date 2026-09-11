# ===================================================================
# PARENTAL CONTROL ROUTES - parental_routes.py
# ===================================================================
# Two audiences, two very different levels of access:
#
#   STUDENT side (student_required): generate/view/revoke a share code,
#   see whatever limit their parent has set. Ordinary transaction data
#   for the student is unaffected - it's still reachable through the
#   normal endpoints in routes.py.
#
#   PARENT side (public register/login, then parent_required): the
#   parent NEVER gets a student_id to query with directly. Every parent
#   endpoint derives "which student" from the ParentalControl row where
#   parent_user_id == the caller's own id - a parent can only ever see
#   the ONE student they're linked to, and only an aggregate total,
#   never category/description/date/merchant detail. See models.py
#   ParentalControl.to_parent_summary_dict for exactly what crosses
#   that boundary.
# ===================================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import date
import calendar

from models import db, User, Expense, ParentalControl
from access_control import student_required, parent_required, is_parent_account
from routes import parse_month_param

parental_bp = Blueprint('parental', __name__, url_prefix='/api/parental')

MIN_PASSWORD_LENGTH = 6


def _month_bounds(year, month):
    start = date(year, month, 1)
    end = date(year, month, calendar.monthrange(year, month)[1])
    return start, end, f'{year:04d}-{month:02d}'


# ===================================================================
# STUDENT SIDE
# ===================================================================

@parental_bp.route('/status', methods=['GET'])
@student_required
def get_status():
    """
    GET - The logged-in student's own parental-control status: whether
    a parent is linked yet, their share code, and any limit that's been
    set. Creates nothing - use POST /generate-code for that.
    """
    student_id = int(get_jwt_identity())
    link = ParentalControl.query.filter_by(student_id=student_id).first()

    if not link:
        return jsonify({'success': True, 'data': {'linked': False, 'link_code': None, 'spending_limit': None}}), 200

    return jsonify({'success': True, 'data': link.to_student_dict()}), 200


@parental_bp.route('/generate-code', methods=['POST'])
@student_required
def generate_code():
    """
    POST - Create (or return the existing) share code for this student.
    Idempotent by design: calling this again after a parent has already
    linked does NOT rotate the code, since that would silently orphan
    the linked parent. Use /unlink first if you want to start over.
    """
    student_id = int(get_jwt_identity())
    link = ParentalControl.query.filter_by(student_id=student_id).first()

    if link:
        return jsonify({'success': True, 'data': link.to_student_dict()}), 200

    link = ParentalControl(
        student_id=student_id,
        link_code=ParentalControl.generate_link_code()
    )
    db.session.add(link)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Share this code with your parent to let them see your spending limit status.',
        'data': link.to_student_dict()
    }), 201


@parental_bp.route('/unlink', methods=['DELETE'])
@student_required
def unlink():
    """
    DELETE - Revoke parental access entirely. Deletes the link row, so
    the old code stops working and the previously-linked parent account
    is no longer a parent account for this student (it simply has no
    linked student until redeeming a new code).
    """
    student_id = int(get_jwt_identity())
    link = ParentalControl.query.filter_by(student_id=student_id).first()

    if not link:
        return jsonify({'success': False, 'error': 'No parental link exists to remove'}), 404

    db.session.delete(link)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Parental access has been revoked.'}), 200


# ===================================================================
# PARENT SIDE - accont creation / login via the student's code
# ===================================================================

@parental_bp.route('/register', methods=['POST'])
def parent_register():
    """
    POST - First-time parent sign-up, always tied to a student's code.

    Expected JSON:
    {
        "link_code": "K7QX9P2M",
        "username": "priya_parent",
        "email": "priya@example.com",
        "password": "secret123"
    }
    """
    try:
        data = request.get_json() or {}

        link_code = (data.get('link_code') or '').strip().upper()
        username = (data.get('username') or '').strip()
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''

        if not link_code or not username or not email or not password:
            return jsonify({'success': False, 'error': 'link_code, username, email, and password are all required'}), 400
        if len(password) < MIN_PASSWORD_LENGTH:
            return jsonify({'success': False, 'error': f'Password must be at least {MIN_PASSWORD_LENGTH} characters'}), 400

        link = ParentalControl.query.filter_by(link_code=link_code).first()
        if not link:
            return jsonify({'success': False, 'error': 'Invalid or expired code. Ask your student to generate a new one.'}), 404
        if link.parent_user_id is not None:
            return jsonify({'success': False, 'error': 'This code has already been used to link a parent account.'}), 409

        existing = User.query.filter((User.username == username) | (User.email == email)).first()
        if existing:
            return jsonify({'success': False, 'error': 'Username or email is already registered. Try Parent Login instead.'}), 409

        parent = User(username=username, email=email)
        parent.set_password(password)
        db.session.add(parent)
        db.session.flush()  # get parent.id without a full commit yet

        link.parent_user_id = parent.id
        db.session.commit()

        student = User.query.get(link.student_id)
        token = create_access_token(identity=str(parent.id))

        return jsonify({
            'success': True,
            'message': f'Linked to {student.username if student else "student"} successfully.',
            'data': {
                'token': token,
                'user': {**parent.to_dict(), 'role': 'parent'}
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@parental_bp.route('/login', methods=['POST'])
def parent_login():
    """
    POST - Returning-parent login. Still requires the link_code on every
    call, not just username/password - the parent session only ever
    exists BECAUSE of the student relationship, so we re-verify it here
    rather than trusting a bare username/password the way student login
    does.

    Expected JSON:
    {
        "link_code": "K7QX9P2M",
        "username": "priya_parent",
        "password": "secret123"
    }
    """
    try:
        data = request.get_json() or {}

        link_code = (data.get('link_code') or '').strip().upper()
        username = (data.get('username') or data.get('email') or '').strip()
        password = data.get('password') or ''

        if not link_code or not username or not password:
            return jsonify({'success': False, 'error': 'link_code, username/email, and password are required'}), 400

        link = ParentalControl.query.filter_by(link_code=link_code).first()
        if not link or link.parent_user_id is None:
            return jsonify({'success': False, 'error': 'This code is not linked to a parent account yet. Use Parent Sign Up first.'}), 404

        user = User.query.filter(
            (User.username == username) | (User.email == username.lower())
        ).first()

        if not user or not user.check_password(password) or user.id != link.parent_user_id:
            return jsonify({'success': False, 'error': 'Invalid code, username/email, or password.'}), 401

        token = create_access_token(identity=str(user.id))

        return jsonify({
            'success': True,
            'message': 'Login successful',
            'data': {
                'token': token,
                'user': {**user.to_dict(), 'role': 'parent'}
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ===================================================================
# PARENT SIDE - the restricted, aggregate-only view
# ===================================================================

@parental_bp.route('/summary', methods=['GET'])
@parent_required
def parent_summary():
    """
    GET - The ONE thing a parent is allowed to see: this month's total
    spend for their linked student, and the limit they've set. No
    category, description, date, or merchant ever appears here.
    """
    parent_id = int(get_jwt_identity())
    link = ParentalControl.query.filter_by(parent_user_id=parent_id).first()

    if not link:
        return jsonify({'success': False, 'error': 'No linked student found for this account.'}), 404

    student = User.query.get(link.student_id)
    year, month = parse_month_param()
    month_start, month_end, month_label = _month_bounds(year, month)

    total_spent = db.session.query(db.func.coalesce(db.func.sum(Expense.amount), 0.0)).filter(
        Expense.user_id == link.student_id,
        Expense.date >= month_start,
        Expense.date <= month_end
    ).scalar()

    return jsonify({
        'success': True,
        'data': link.to_parent_summary_dict(
            student_username=student.username if student else 'Student',
            total_spent=float(total_spent or 0.0),
            month_label=month_label
        )
    }), 200


@parental_bp.route('/limit', methods=['PUT'])
@parent_required
def set_limit():
    """
    PUT - The ONLY write a parent can make: the monthly spending limit
    for their linked student. Cannot touch anything else.

    Expected JSON: { "spending_limit": 5000 }
    """
    try:
        parent_id = int(get_jwt_identity())
        link = ParentalControl.query.filter_by(parent_user_id=parent_id).first()

        if not link:
            return jsonify({'success': False, 'error': 'No linked student found for this account.'}), 404

        data = request.get_json() or {}
        if 'spending_limit' not in data:
            return jsonify({'success': False, 'error': 'spending_limit is required'}), 400

        try:
            limit = float(data['spending_limit'])
        except (TypeError, ValueError):
            return jsonify({'success': False, 'error': 'spending_limit must be a number'}), 400
        if limit < 0:
            return jsonify({'success': False, 'error': 'spending_limit cannot be negative'}), 400

        link.spending_limit = limit
        db.session.commit()

        return jsonify({'success': True, 'message': 'Spending limit updated.', 'data': {'spending_limit': link.spending_limit}}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
