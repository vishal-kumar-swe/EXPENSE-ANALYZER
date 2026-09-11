# ===================================================================
# CHATBOT ROUTES - chatbot_routes.py
# ===================================================================
# One endpoint: POST /api/chatbot/ask. Student-only (see
# access_control.student_required) - a parent JWT gets a 403 here just
# like every other data endpoint, since even an indirect chatbot answer
# ("your Food spending is up 20%") would leak exactly the category-level
# detail parental control exists to hide.
#
# Chat history is intentionally NOT persisted (no ChatMessage table) -
# keeps this feature to one small table-free endpoint for the hackathon
# scope. Easy to add later if wanted: store {user_id, question, reply,
# created_at} after computing the reply below.
# ===================================================================

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import get_jwt_identity
from datetime import datetime, timedelta

from models import MonthlyIncome
from routes import expenses_to_df
from access_control import student_required
from ai_engine import ExpenseAnalyzer
from chatbot_engine import ChatbotEngine
from models import Expense

chatbot_bp = Blueprint('chatbot', __name__, url_prefix='/api/chatbot')

_engine = None


def init_chatbot(app):
    """Mirrors routes.init_analyzer - builds the chatbot's own analyzer
    instance from app config once at startup."""
    global _engine
    _engine = ChatbotEngine(ExpenseAnalyzer(app.config))


@chatbot_bp.route('/ask', methods=['POST'])
@student_required
def ask():
    """
    POST - Ask the chatbot a question about your own spending.

    Expected JSON: { "message": "Can I afford a ₹3000 trip next week?" }

    Returns: { "success": true, "data": { "reply": "..." } }
    """
    try:
        data = request.get_json() or {}
        message = (data.get('message') or '').strip()

        if not message:
            return jsonify({'success': False, 'error': 'message is required'}), 400
        if len(message) > 500:
            return jsonify({'success': False, 'error': 'message is too long (max 500 characters)'}), 400

        user_id = int(get_jwt_identity())
        today = datetime.now().date()

        start_date = datetime.now() - timedelta(days=180)
        expenses = Expense.query.filter_by(user_id=user_id).filter(
            Expense.date >= start_date.date()
        ).all()
        expenses_df = expenses_to_df(expenses)

        income_row = MonthlyIncome.query.filter_by(
            user_id=user_id, month=today.replace(day=1)
        ).first()

        if _engine is None:
            init_chatbot(current_app)

        result = _engine.answer(
            question=message,
            expenses_df=expenses_df,
            income_amount=income_row.amount if income_row else None,
            today=today
        )

        return jsonify({'success': True, 'data': result}), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
