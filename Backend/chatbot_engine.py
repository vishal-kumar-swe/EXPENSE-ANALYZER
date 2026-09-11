# ===================================================================
# CHATBOT ENGINE - chatbot_engine.py
# ===================================================================
# Rule-based (not LLM-backed) chatbot that answers questions about a
# student's own spending using ONLY the numbers already computed by
# ExpenseAnalyzer (ai_engine.py) - anomaly detection, category insights,
# and the ensemble forecast. Deliberately not calling an external LLM
# API: no key to configure or leak, nothing that can fail/rate-limit
# during a live demo, and every answer is fully explainable because it
# is built by filling real numbers into a template rather than being
# generated - which matches the project's "explainable AI, not a black
# box" positioning. See access_control.student_required on the route
# that calls this - a parent account can never reach it, since even an
# indirect answer here ("your Food spending is up") would leak the
# category-level detail parental control is meant to hide.
# ===================================================================

import re
import calendar
from datetime import date

AMOUNT_PATTERN = re.compile(r'(?:₹|rs\.?|inr)\s*([0-9][0-9,]*(?:\.[0-9]+)?)', re.IGNORECASE)
BARE_NUMBER_PATTERN = re.compile(r'\b([0-9][0-9,]{2,}(?:\.[0-9]+)?)\b')

MONTH_NAMES = {m.lower(): i for i, m in enumerate(calendar.month_name) if m}


class ChatbotEngine:
    def __init__(self, analyzer):
        self.analyzer = analyzer

    # ===== Public entry point =====

    def answer(self, question, expenses_df, income_amount=None, today=None):
        if today is None:
            today = date.today()

        question = (question or '').strip()
        if not question:
            return self._response("Ask me something like \"How much can I safely spend this month?\" or \"Can I afford a ₹3000 trip next week?\"")

        if len(expenses_df) == 0:
            return self._response(
                "You don't have any expenses recorded yet, so I don't have anything to base advice on. "
                "Add a few transactions on the Dashboard and ask me again."
            )

        q = question.lower()
        amount = self._extract_amount(question)

        if amount is not None and self._matches(q, ['afford', 'can i spend', 'buy', 'trip', 'purchase']):
            return self._answer_affordability(amount, expenses_df, income_amount, today)

        if self._matches(q, ['safe to spend', 'safely spend', 'daily limit', 'how much can i spend', 'budget for the rest']):
            return self._answer_safe_spend(expenses_df, income_amount, today)

        if self._matches(q, ['spike', 'why did my', 'why is my', 'increase', 'went up', 'more than usual']):
            return self._answer_spike(question, expenses_df, today)

        if self._matches(q, ['predict', 'forecast', 'next month', 'expect to spend']):
            return self._answer_prediction(expenses_df, income_amount, today)

        if self._matches(q, ['how much have i spent', 'total spent', 'summary', 'overview', 'how am i doing']):
            return self._answer_summary(expenses_df)

        return self._response(
            "I can help with things like:\n"
            "• \"How much can I safely spend for the rest of this month?\"\n"
            "• \"Can I afford a ₹3000 trip next week?\"\n"
            "• \"Why did my spending spike in Food?\"\n"
            "• \"What's my predicted spending next month?\"\n"
            "Try rephrasing your question along those lines."
        )

    # ===== Intent handlers =====

    def _answer_affordability(self, amount, expenses_df, income_amount, today):
        forecast = self.analyzer.predict_expenses_ensemble(expenses_df, income_amount, today)
        summary = forecast['summary']
        safe_daily = summary.get('safe_daily_spend')
        days_remaining = summary['days_remaining_this_month']
        remaining_total = (safe_daily or 0) * days_remaining

        if safe_daily is None:
            return self._response(
                f"I can't give you a confident answer on ₹{amount:,.0f} yet - "
                "I don't have enough spending history or an income figure to work from. "
                "Set your income under Report > Income for a more accurate answer."
            )

        fits = amount <= remaining_total
        basis_note = 'your entered income minus what you have already spent this month' if summary['basis'] == 'income' else 'your predicted spending (no income set)'

        if fits:
            leftover = remaining_total - amount
            verdict = (
                f"Yes, a ₹{amount:,.0f} expense looks affordable. Based on {basis_note}, "
                f"you have roughly ₹{remaining_total:,.0f} left for the remaining {days_remaining} days "
                f"(≈₹{safe_daily:,.0f}/day). After this purchase you'd have about ₹{leftover:,.0f} left for everything else this month."
            )
        else:
            shortfall = amount - remaining_total
            verdict = (
                f"That would be tight. Based on {basis_note}, you have roughly ₹{remaining_total:,.0f} left "
                f"for the remaining {days_remaining} days (≈₹{safe_daily:,.0f}/day) - "
                f"₹{amount:,.0f} is about ₹{shortfall:,.0f} more than that. "
                "You could still do it, but it would likely mean cutting back elsewhere this month."
            )

        return self._response(verdict)

    def _answer_safe_spend(self, expenses_df, income_amount, today):
        forecast = self.analyzer.predict_expenses_ensemble(expenses_df, income_amount, today)
        summary = forecast['summary']
        safe_daily = summary.get('safe_daily_spend')

        if safe_daily is None:
            return self._response(
                "I don't have enough data yet to give you a safe daily figure. "
                "Add a few more expenses (and your income, under Report > Income) and ask again."
            )

        basis_note = 'your entered income for this month' if summary['basis'] == 'income' else "your predicted spending (you haven't set an income yet - Report > Income will sharpen this number)"

        return self._response(
            f"Based on {basis_note}, you've spent ₹{summary['spent_this_month']:,.0f} so far. "
            f"With {summary['days_remaining_this_month']} days left in the month, a safe pace is about "
            f"₹{safe_daily:,.0f}/day to stay on track."
        )

    def _answer_spike(self, question, expenses_df, today):
        q = question.lower()

        # If a month name was mentioned, compare that month's total to
        # the average of the other months on file.
        mentioned_month = next((name for name in MONTH_NAMES if name in q), None)
        if mentioned_month:
            trends = self.analyzer.get_monthly_trends(expenses_df)
            target_entries = [(k, v) for k, v in trends.items() if k.split('-')[1].lstrip('0') == str(MONTH_NAMES[mentioned_month]) or int(k.split('-')[1]) == MONTH_NAMES[mentioned_month]]
            if target_entries and len(trends) > 1:
                target_key, target_total = target_entries[0]
                others = [v for k, v in trends.items() if k != target_key]
                other_avg = sum(others) / len(others) if others else 0
                if other_avg > 0 and target_total > other_avg:
                    pct = ((target_total - other_avg) / other_avg) * 100
                    return self._response(
                        f"In {mentioned_month.capitalize()} you spent ₹{target_total:,.0f}, "
                        f"about {pct:.0f}% above your average month of ₹{other_avg:,.0f}. "
                        "Check the Report tab for that month to see which category drove it."
                    )

        # Otherwise, fall back to category-level trend comparison.
        insights = self.analyzer.get_category_insights(expenses_df)
        increasing = {k: v for k, v in insights.items() if v['trend'] == 'increasing'}
        if not increasing:
            return self._response(
                "Nothing stands out as a clear spending spike right now - your category trends look stable. "
                "Check the Analytics tab's Anomaly Detection section for individual unusual transactions."
            )

        top_category, top_data = max(increasing.items(), key=lambda kv: kv[1]['average'])
        return self._response(
            f"Your {top_category} spending is trending up - averaging ₹{top_data['average']:,.0f} per transaction "
            f"across {top_data['count']} transactions recently. That's the category most worth a closer look "
            f"(recommended monthly budget: ₹{top_data['recommended_budget']:,.0f})."
        )

    def _answer_prediction(self, expenses_df, income_amount, today):
        forecast = self.analyzer.predict_expenses_ensemble(expenses_df, income_amount, today)
        categories = forecast['categories']
        summary = forecast['summary']

        if not categories:
            insufficient = forecast['insufficient_categories']
            if insufficient:
                needed = insufficient[0]
                return self._response(
                    f"I can't forecast yet - {needed['message']} Keep logging expenses and check back."
                )
            return self._response("I don't have enough history yet to forecast next month. Keep adding expenses.")

        top = sorted(categories.items(), key=lambda kv: kv[1]['predicted_amount'], reverse=True)[:3]
        top_lines = ', '.join(f"{cat} (₹{data['predicted_amount']:,.0f})" for cat, data in top)

        confidence_pct = summary['overall_confidence'] * 100
        return self._response(
            f"For next month, I predict a total of about ₹{summary['total_predicted_next_month']:,.0f} "
            f"across all categories ({confidence_pct:.0f}% average confidence). "
            f"Your biggest predicted categories are {top_lines}."
        )

    def _answer_summary(self, expenses_df):
        stats = self.analyzer.get_spending_statistics(expenses_df)
        if not stats:
            return self._response("You don't have enough data yet for a summary.")

        top_category = None
        if stats.get('by_category'):
            top_category = max(stats['by_category'].items(), key=lambda kv: kv[1]['total'])

        line = (
            f"Over the period I have on file, you've spent ₹{stats['total_spent']:,.0f} "
            f"across {stats['total_transactions']} transactions (avg ₹{stats['average_transaction']:,.0f} each)."
        )
        if top_category:
            name, data = top_category
            line += f" Your biggest category is {name} at ₹{data['total']:,.0f} ({data['percentage']:.0f}% of total)."

        return self._response(line)

    def _no_data_response(self):
        return self._response("You don't have any expenses recorded yet - add a few transactions first.")

    # ===== Helpers =====

    @staticmethod
    def _matches(text, keywords):
        return any(kw in text for kw in keywords)

    @staticmethod
    def _extract_amount(question):
        m = AMOUNT_PATTERN.search(question)
        if not m:
            m = BARE_NUMBER_PATTERN.search(question)
        if not m:
            return None
        try:
            return float(m.group(1).replace(',', ''))
        except ValueError:
            return None

    @staticmethod
    def _response(text):
        return {'reply': text}
