# ===================================================================
# AI ENGINE - ai_engine.py
# ===================================================================
# Core AI/ML functionality for:
# 1. Anomaly Detection (identify unusual spending)
# 2. Expense Forecasting (predict future expenses)
# 3. Pattern Analysis (understand spending behavior)
# ===================================================================

import calendar
import pandas as pd
import numpy as np
from datetime import date, datetime, timedelta
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

class ExpenseAnalyzer:
    """
    Main AI Engine Class for analyzing expenses
    Contains methods for anomaly detection, forecasting, and analysis
    """
    
    def __init__(self, config):
        """
        Initialize the analyzer with configuration settings
        
        Args:
            config: Configuration object with threshold values
        """
        self.config = config
        self.scaler = StandardScaler()
    
    # =================================================================
    # ANOMALY DETECTION METHODS
    # =================================================================
    
    def detect_anomalies_statistical(self, expenses_df):
        """
        Detect anomalies using Statistical Method (Z-Score)
        
        Approach:
            1. Calculate mean and std deviation of expenses per category
            2. Flag any transaction that is > (mean + 2*std_dev)
            3. This identifies unusual spending patterns
        
        Args:
            expenses_df: DataFrame with columns [category, amount, date]
        
        Returns:
            List of anomalies with details
        """
        anomalies = []
        
        # Check if dataframe is empty
        if len(expenses_df) == 0:
            return anomalies
        
        # Process each category separately
        for category in expenses_df['category'].unique():
            # Filter expenses for this category
            category_expenses = expenses_df[expenses_df['category'] == category]['amount'].values
            
            # Need at least 3 data points for statistical analysis
            if len(category_expenses) < 3:
                continue
            
            # Calculate statistics
            mean = np.mean(category_expenses)
            std_dev = np.std(category_expenses)
            
            # If std_dev is 0, all values are same, no anomalies
            if std_dev == 0:
                continue
            
            # Define threshold for anomaly (2 standard deviations from mean)
            threshold = mean + (self.config.ANOMALY_STD_DEV_THRESHOLD * std_dev)
            
            # Find anomalies
            for idx, amount in enumerate(category_expenses):
                if amount > threshold:
                    z_score = (amount - mean) / std_dev
                    anomalies.append({
                        'category': category,
                        'amount': float(amount),
                        'expected_range': f"{mean:.2f} - {threshold:.2f}",
                        'z_score': float(z_score),
                        'severity': min(5, int(z_score))  # Severity 1-5
                    })
        
        return anomalies
    
    def detect_anomalies_isolation_forest(self, expenses_df):
        """
        Detect anomalies using Machine Learning (Isolation Forest)
        
        Approach:
            1. Use Isolation Forest algorithm (unsupervised ML)
            2. Algorithm isolates outliers by randomly selecting features
            3. Anomalies are easier to isolate, so detected faster
            4. More sophisticated than statistical method
        
        Args:
            expenses_df: DataFrame with expense data
        
        Returns:
            List of detected anomalies
        """
        # Need at least 10 samples for meaningful ML detection
        if len(expenses_df) < 10:
            return []
        
        try:
            # Convert categorical data to numerical
            category_mapping = {cat: idx for idx, cat in enumerate(expenses_df['category'].unique())}
            X = expenses_df[['amount']].values
            
            # Apply Isolation Forest
            # contamination = expected proportion of outliers (10% = 0.1)
            iso_forest = IsolationForest(contamination=0.1, random_state=42)
            predictions = iso_forest.fit_predict(X)
            
            anomalies = []
            for idx, is_anomaly in enumerate(predictions):
                if is_anomaly == -1:  # -1 means anomaly
                    anomalies.append({
                        'category': expenses_df.iloc[idx]['category'],
                        'amount': float(expenses_df.iloc[idx]['amount']),
                        'detection_method': 'Isolation Forest',
                        'severity': 4
                    })
            
            return anomalies
        except Exception as e:
            print(f"Error in Isolation Forest: {str(e)}")
            return []
    
    def detect_category_anomalies(self, expenses_df):
        """
        Detect if user is spending in unusual categories
        
        Approach:
            1. Find most common spending categories
            2. Flag transactions in rare categories
            3. Useful to identify new spending habits
        
        Args:
            expenses_df: DataFrame with expenses
        
        Returns:
            List of category anomalies
        """
        if len(expenses_df) == 0:
            return []
        
        # Count frequency of each category
        category_counts = expenses_df['category'].value_counts()
        total_expenses = len(expenses_df)
        
        # Categories with <5% frequency are unusual
        threshold = 0.05
        anomalies = []
        
        for category, count in category_counts.items():
            frequency = count / total_expenses
            if frequency < threshold:
                anomalies.append({
                    'category': category,
                    'frequency_percentage': frequency * 100,
                    'type': 'Rare spending category',
                    'severity': 2
                })
        
        return anomalies
    
    # =================================================================
    # FORECASTING METHODS
    # =================================================================
    
    def predict_expenses_linear_regression(self, expenses_df, months_ahead=1):
        """
        Predict future expenses using Linear Regression
        
        Approach:
            1. Group expenses by month and category
            2. Create time series data
            3. Fit linear regression model (trend line)
            4. Extrapolate for future months
        
        Args:
            expenses_df: Historical expense data
            months_ahead: Number of months to predict (default=1)
        
        Returns:
            Dictionary with predictions per category
        """
        predictions = {}
        
        try:
            # Convert date column to datetime if not already
            expenses_df['date'] = pd.to_datetime(expenses_df['date'])
            
            # For each category, make a prediction
            for category in expenses_df['category'].unique():
                category_data = expenses_df[expenses_df['category'] == category].copy()
                
                # Need minimum 5 data points for meaningful prediction
                if len(category_data) < self.config.MIN_DATA_POINTS_FOR_PREDICTION:
                    continue
                
                # Group by month and sum
                category_data['year_month'] = category_data['date'].dt.to_period('M')
                monthly_data = category_data.groupby('year_month')['amount'].sum().reset_index()
                
                # Convert period to ordinal for numeric calculation
                monthly_data['month_ordinal'] = monthly_data['year_month'].apply(lambda x: x.ordinal)
                
                X = monthly_data['month_ordinal'].values.reshape(-1, 1)
                y = monthly_data['amount'].values
                
                # Fit linear regression model
                model = LinearRegression()
                model.fit(X, y)
                
                # Predict for next month(s)
                last_month_ordinal = monthly_data['month_ordinal'].iloc[-1]
                future_ordinal = last_month_ordinal + months_ahead
                
                predicted_amount = model.predict([[future_ordinal]])[0]
                
                # Ensure prediction is positive
                predicted_amount = max(0, predicted_amount)
                
                # Calculate R² score as confidence (0-1)
                confidence = min(model.score(X, y), 1.0)
                
                predictions[category] = {
                    'predicted_amount': float(predicted_amount),
                    'confidence': float(confidence),
                    'trend': 'increasing' if model.coef_[0] > 0 else 'decreasing',
                    'historical_average': float(y.mean())
                }
        
        except Exception as e:
            print(f"Error in prediction: {str(e)}")
        
        return predictions
    
    def predict_expenses_exponential_smoothing(self, expenses_df, months_ahead=1):
        """
        Predict using Exponential Smoothing (better for seasonal data)
        
        Approach:
            1. Apply exponential smoothing to give more weight to recent data
            2. Better captures recent trends and behavior
            3. Good for data with momentum/trends
        
        Args:
            expenses_df: Historical expenses
            months_ahead: Months to predict
        
        Returns:
            Predictions dictionary
        """
        predictions = {}
        
        try:
            expenses_df['date'] = pd.to_datetime(expenses_df['date'])
            
            for category in expenses_df['category'].unique():
                category_data = expenses_df[expenses_df['category'] == category].copy()
                
                if len(category_data) < self.config.MIN_DATA_POINTS_FOR_PREDICTION:
                    continue
                
                # Group by month
                category_data['year_month'] = category_data['date'].dt.to_period('M')
                monthly_amounts = category_data.groupby('year_month')['amount'].sum().values
                
                if len(monthly_amounts) < 2:
                    continue
                
                # Exponential smoothing with alpha=0.3 (30% weight to recent)
                alpha = 0.3
                smoothed = [monthly_amounts[0]]
                
                for i in range(1, len(monthly_amounts)):
                    smoothed_value = alpha * monthly_amounts[i] + (1 - alpha) * smoothed[i-1]
                    smoothed.append(smoothed_value)
                
                # Last smoothed value is our prediction
                predicted_amount = smoothed[-1]
                
                # Confidence based on data consistency
                variance = np.var(monthly_amounts)
                mean = np.mean(monthly_amounts)
                cv = variance / mean if mean > 0 else 0  # Coefficient of variation
                confidence = 1 / (1 + cv)  # Convert to 0-1 range
                
                predictions[category] = {
                    'predicted_amount': float(predicted_amount),
                    'confidence': float(min(confidence, 1.0)),
                    'method': 'exponential_smoothing'
                }
        
        except Exception as e:
            print(f"Error in exponential smoothing: {str(e)}")
        
        return predictions
    
    # =================================================================
    # ANALYSIS METHODS
    # =================================================================
    
    def get_spending_statistics(self, expenses_df):
        """
        Generate spending statistics and insights
        
        Args:
            expenses_df: Expense data
        
        Returns:
            Dictionary with various statistics
        """
        if len(expenses_df) == 0:
            return {}
        
        stats_dict = {
            'total_spent': float(expenses_df['amount'].sum()),
            'average_transaction': float(expenses_df['amount'].mean()),
            'median_transaction': float(expenses_df['amount'].median()),
            'max_transaction': float(expenses_df['amount'].max()),
            'min_transaction': float(expenses_df['amount'].min()),
            'std_deviation': float(expenses_df['amount'].std()),
            'total_transactions': len(expenses_df),
        }
        
        # Category-wise breakdown
        category_stats = {}
        for category in expenses_df['category'].unique():
            cat_expenses = expenses_df[expenses_df['category'] == category]['amount']
            category_stats[category] = {
                'total': float(cat_expenses.sum()),
                'count': len(cat_expenses),
                'average': float(cat_expenses.mean()),
                'percentage': float((cat_expenses.sum() / expenses_df['amount'].sum()) * 100)
            }
        
        stats_dict['by_category'] = category_stats
        
        return stats_dict
    
    def get_monthly_trends(self, expenses_df):
        """
        Analyze spending trends over months
        
        Args:
            expenses_df: Expense data
        
        Returns:
            Monthly breakdown of spending
        """
        if len(expenses_df) == 0:
            return {}
        
        expenses_df = expenses_df.copy()
        expenses_df['date'] = pd.to_datetime(expenses_df['date'])
        expenses_df['year_month'] = expenses_df['date'].dt.to_period('M')
        
        monthly_trends = {}
        for period, group in expenses_df.groupby('year_month'):
            monthly_trends[str(period)] = float(group['amount'].sum())
        
        return monthly_trends
    
    def get_daily_breakdown(self, expenses_df, year, month):
        """
        Total spend per day for every day in the given month (zero-filled,
        so the frontend gets a complete series with no gaps to patch over).

        Args:
            expenses_df: Expense data already filtered to this month
            year, month: The month to break down

        Returns:
            List of {date, total} dicts, one per day of the month, in order
        """
        days_in_month = calendar.monthrange(year, month)[1]
        daily_totals = {}

        if len(expenses_df) > 0:
            df = expenses_df.copy()
            df['date'] = pd.to_datetime(df['date'])
            grouped = df.groupby(df['date'].dt.day)['amount'].sum()
            daily_totals = grouped.to_dict()

        return [
            {
                'date': date(year, month, day).isoformat(),
                'total': float(daily_totals.get(day, 0))
            }
            for day in range(1, days_in_month + 1)
        ]

    def get_weekly_breakdown(self, expenses_df, year, month):
        """
        Total spend per calendar week (Monday-Sunday) overlapping the given
        month. Weeks are clipped to the month's actual days, so the first
        and last week may be shorter than 7 days - this is what produces
        the familiar "Week 1...Week 4/5" bucketing for a whole month.

        Args:
            expenses_df: Expense data already filtered to this month
            year, month: The month to break down

        Returns:
            List of {label, start, end, total} dicts, one per week
        """
        first_day = date(year, month, 1)
        last_day = date(year, month, calendar.monthrange(year, month)[1])

        df = None
        if len(expenses_df) > 0:
            df = expenses_df.copy()
            df['date'] = pd.to_datetime(df['date']).dt.date

        weeks = []
        # Start from the Monday on/before the 1st, so the first bucket
        # correctly represents "Week 1" even if the month doesn't start
        # on a Monday.
        current = first_day - timedelta(days=first_day.weekday())
        week_num = 1

        while current <= last_day:
            week_start = max(current, first_day)
            week_end = min(current + timedelta(days=6), last_day)

            total = 0.0
            if df is not None:
                mask = (df['date'] >= week_start) & (df['date'] <= week_end)
                total = float(df[mask]['amount'].sum())

            weeks.append({
                'label': f'Week {week_num}',
                'start': week_start.isoformat(),
                'end': week_end.isoformat(),
                'total': total
            })

            current += timedelta(days=7)
            week_num += 1

        return weeks

    def get_monthly_category_breakdown(self, current_df, previous_df):
        """
        Category totals for one month, with % of the month's total and
        the change vs. the same category the previous month - this is
        the data behind the donut chart + category list.

        Args:
            current_df: Expenses for the selected month
            previous_df: Expenses for the month immediately before it
                         (comparison baseline)

        Returns:
            Dict with 'total' and a 'categories' list, sorted by spend
            (highest first)
        """
        total = float(current_df['amount'].sum()) if len(current_df) > 0 else 0.0

        previous_by_category = {}
        if len(previous_df) > 0:
            previous_by_category = previous_df.groupby('category')['amount'].sum().to_dict()

        categories = []
        if len(current_df) > 0:
            current_by_category = current_df.groupby('category')['amount'].sum()

            for category, amount in current_by_category.items():
                amount = float(amount)
                previous_amount = float(previous_by_category.get(category, 0))

                if previous_amount > 0:
                    change_percentage = ((amount - previous_amount) / previous_amount) * 100
                else:
                    # No spending in this category last month - treat any
                    # spend at all as a fresh +100%, and no spend as flat.
                    change_percentage = 100.0 if amount > 0 else 0.0

                categories.append({
                    'category': category,
                    'total': amount,
                    'percentage': (amount / total * 100) if total > 0 else 0.0,
                    'previous_total': previous_amount,
                    'change_percentage': change_percentage
                })

            categories.sort(key=lambda c: c['total'], reverse=True)

        return {
            'total': total,
            'categories': categories
        }

    def get_category_insights(self, expenses_df):
        """
        Get detailed insights per category
        
        Args:
            expenses_df: Expense data
        
        Returns:
            Insights dictionary
        """
        if len(expenses_df) == 0:
            return {}
        
        insights = {}
        
        for category in expenses_df['category'].unique():
            cat_data = expenses_df[expenses_df['category'] == category]['amount']
            
            insights[category] = {
                'total': float(cat_data.sum()),
                'average': float(cat_data.mean()),
                'count': len(cat_data),
                'trend': self._calculate_trend(cat_data),
                'recommended_budget': float(cat_data.mean() * 1.2)  # 20% buffer
            }
        
        return insights
    
    def _calculate_trend(self, series):
        """Helper method to calculate if spending is trending up or down"""
        if len(series) < 2:
            return 'stable'
        
        # Compare first half with second half
        mid = len(series) // 2
        first_half_mean = series.iloc[:mid].mean()
        second_half_mean = series.iloc[mid:].mean()
        
        difference = ((second_half_mean - first_half_mean) / first_half_mean) * 100 if first_half_mean > 0 else 0
        
        if difference > 10:
            return 'increasing'
        elif difference < -10:
            return 'decreasing'
        else:
            return 'stable'