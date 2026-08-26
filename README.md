# 💰 AI EXPENSE ANALYZER

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18.2+-blue.svg)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Smart Spending Insights Powered by AI** - Track, analyze, and predict your expenses with machine learning!

![AI Expense Analyzer Banner](https://img.shields.io/badge/Status-Active-brightgreen)

---

## 🎯 Features

### 📊 **Expense Tracking**
- ✅ Add, edit, delete expenses
- ✅ Categorize spending
- ✅ Track by date and amount
- ✅ Add descriptions and notes

### 🔍 **Anomaly Detection**
- ✅ Statistical analysis (Z-Score method)
- ✅ Machine learning detection (Isolation Forest)
- ✅ Identify unusual spending patterns
- ✅ Real-time alerts for suspicious transactions

### 📈 **Analytics & Insights**
- ✅ Category-wise breakdown
- ✅ Monthly spending trends
- ✅ Spending statistics (min, max, average)
- ✅ Budget recommendations
- ✅ Interactive visualizations

### 🔮 **Expense Predictions**
- ✅ Linear regression forecasting
- ✅ Exponential smoothing predictions
- ✅ Confidence scores
- ✅ Category-wise forecasts
- ✅ Budget planning assistance

### 💡 **Smart Features**
- ✅ Category anomalies detection
- ✅ Spending behavior analysis
- ✅ Trend identification (increasing/decreasing)
- ✅ Comparative analysis

---

## 🏗️ Architecture

### System Design

```
┌─────────────────────────────────────────────────────┐
│                   USER INTERFACE                    │
│                  (React - Port 3000)                │
├─────────────────────────────────────────────────────┤
│                  FRONTEND LAYER                     │
│  Dashboard | ExpenseForm | Analytics | Predictions │
├─────────────────────────────────────────────────────┤
│                    API GATEWAY                      │
│              REST API (Flask - Port 5000)           │
├─────────────────────────────────────────────────────┤
│                  APPLICATION LAYER                  │
│  Routes | Business Logic | Validation              │
├─────────────────────────────────────────────────────┤
│                      AI ENGINE                      │
│  Anomaly Detection | Forecasting | Analysis        │
├─────────────────────────────────────────────────────┤
│                    DATA LAYER                       │
│  SQLAlchemy ORM | SQLite Database                  │
└─────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18.2, Chart.js, CSS3 |
| **Backend** | Flask 2.3, SQLAlchemy 2.0 |
| **Database** | SQLite3 |
| **ML/AI** | Scikit-learn, Pandas, NumPy, SciPy |
| **APIs** | RESTful Flask-CORS |

---

## 📋 Project Structure

```
expense-analyzer/
├── backend/
│   ├── app.py                    # Flask application factory
│   ├── models.py                 # Database models (Expense, Budget, Prediction)
│   ├── config.py                 # Configuration management
│   ├── routes.py                 # API endpoints
│   ├── ai_engine.py              # ML/AI algorithms
│   ├── utils.py                  # Utility functions
│   ├── requirements.txt           # Python dependencies
│   └── database.db               # SQLite database
│
├── frontend/
│   ├── public/index.html
│   ├── src/
│   │   ├── App.js                # Main React component
│   │   ├── App.css               # Global styles
│   │   ├── components/
│   │   │   ├── Dashboard.js      # Expense list & summary
│   │   │   ├── ExpenseForm.js    # Add expense form
│   │   │   ├── Analytics.js      # Anomaly & analysis
│   │   │   └── Predictions.js    # Future forecasts
│   │   └── index.js
│   └── package.json
│
├── SETUP_GUIDE.md                # Detailed setup instructions
└── README.md                     # This file
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 14+
- Git

### Installation

**1. Clone Repository**
```bash
git clone <repository-url>
cd expense-analyzer
```

**2. Backend Setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

**3. Frontend Setup** (New Terminal)
```bash
cd frontend
npm install
npm start
```

**4. Access Application**
```
Browser: http://localhost:3000
API: http://localhost:5000/api
```

> For detailed setup, see [SETUP_GUIDE.md](SETUP_GUIDE.md)

---

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Endpoints

#### Expenses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/expenses` | Get all expenses |
| POST | `/expenses` | Create new expense |
| GET | `/expenses/<id>` | Get specific expense |
| PUT | `/expenses/<id>` | Update expense |
| DELETE | `/expenses/<id>` | Delete expense |

**Example Request:**
```bash
curl -X POST http://localhost:5000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Food & Dining",
    "amount": 250.50,
    "date": "2024-01-15",
    "description": "Restaurant"
  }'
```

#### Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analysis/anomalies` | Detect anomalies |
| GET | `/analysis/statistics` | Get statistics |
| GET | `/analysis/trends` | Get monthly trends |
| GET | `/analysis/insights` | Get insights |

#### Predictions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/predictions` | Get expense predictions |
| GET | `/categories` | Get available categories |

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "status": 400
}
```

---

## 🤖 AI/ML Features

### Anomaly Detection Methods

#### 1. **Statistical Analysis (Z-Score)**
```
Algorithm: Detect values > (mean + 2*std_dev)
Use Case: Quick outlier detection
Accuracy: Good for normal distributions
```

#### 2. **Machine Learning (Isolation Forest)**
```
Algorithm: Isolate outliers in feature space
Use Case: Complex pattern detection
Advantage: Works with multivariate data
```

#### 3. **Category Anomalies**
```
Algorithm: Identify rare spending categories
Use Case: New spending behavior detection
Alert: Categories with <5% frequency
```

### Forecasting Methods

#### 1. **Linear Regression**
```
Model: y = mx + b
Use: Captures overall trend
Best for: Consistent increasing/decreasing patterns
```

#### 2. **Exponential Smoothing**
```
Formula: S_t = α*X_t + (1-α)*S_(t-1)
Use: Emphasizes recent data (α=0.3)
Best for: Seasonal data with recent shifts
```

---

## 💾 Database Schema

### Expenses Table
```sql
id          INTEGER PRIMARY KEY
user_id     INTEGER
category    TEXT
amount      FLOAT
date        DATE
description TEXT
is_flagged  BOOLEAN
created_at  TIMESTAMP
```

### Budget Table
```sql
id           INTEGER PRIMARY KEY
user_id      INTEGER
category     TEXT
budget_limit FLOAT
month        DATE
```

### Predictions Table
```sql
id                INTEGER PRIMARY KEY
user_id           INTEGER
category          TEXT
predicted_amount  FLOAT
month             DATE
confidence        FLOAT
```

---

## 🎓 Learning Outcomes

### For Beginners
- ✅ Full-stack web development
- ✅ REST API design
- ✅ Database design and SQL
- ✅ Frontend-backend communication
- ✅ Machine learning basics

### For Intermediate
- ✅ Advanced SQL queries
- ✅ ML model evaluation
- ✅ API documentation
- ✅ Error handling & validation
- ✅ Testing strategies

### For Advanced
- ✅ Scalable architecture
- ✅ Production deployment
- ✅ Performance optimization
- ✅ Security best practices
- ✅ Monitoring & logging

---

## 🔧 Configuration

### Backend Config (`config.py`)

```python
ANOMALY_STD_DEV_THRESHOLD = 2.0      # Z-score threshold
ANOMALY_WINDOW_DAYS = 90              # Historical window
MIN_DATA_POINTS_FOR_PREDICTION = 5    # Min samples needed
PREDICTION_MONTHS = 1                 # Forecast period
```

### Frontend Config (`.env`)

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_DEBUG=true
```

---

## 📊 Sample Data

### Adding Test Expenses

```python
# In Python console
from backend.app import create_app
from backend.models import db, Expense
from datetime import datetime

app = create_app()
with app.app_context():
    expense = Expense(
        user_id=1,
        category='Food & Dining',
        amount=250.50,
        date=datetime.now().date(),
        description='Restaurant'
    )
    db.session.add(expense)
    db.session.commit()
```

---

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Port 5000 in use | Change port in `app.py` |
| CORS errors | Update `CORS_ORIGINS` in config |
| Database errors | Delete `database.db` and restart |
| Module not found | Activate virtual environment |
| npm errors | Delete `node_modules` and reinstall |

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed troubleshooting.

---

## 🚢 Deployment

### Local Development
```bash
# Backend
cd backend && python app.py

# Frontend
cd frontend && npm start
```

### Production Build
```bash
# Frontend
cd frontend && npm run build

# Deploy build/ folder to hosting service
```

### Cloud Deployment Options
- **Heroku** - Simple Python/Node.js hosting
- **AWS** - Scalable cloud platform
- **Google Cloud** - ML-friendly infrastructure
- **Azure** - Enterprise solutions
- **Railway/Render** - Modern deployment

---

## 📝 Features Roadmap

### Current (v1.0)
- ✅ Basic expense tracking
- ✅ Anomaly detection
- ✅ Basic predictions
- ✅ Simple analytics

### Planned (v2.0)
- 🔄 Multi-user support
- 🔄 Budget goals
- 🔄 Expense sharing
- 🔄 Advanced charts
- 🔄 Mobile app

### Future (v3.0)
- 🔄 Bank integration
- 🔄 Receipt scanning
- 🔄 Investment analysis
- 🔄 Financial health score
- 🔄 AI chatbot assistance

---

## 📖 Documentation

- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Installation & setup
- [API_DOCS.md](API_DOCS.md) - Complete API reference
- [ML_MODELS.md](ML_MODELS.md) - AI/ML algorithm details
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

---

## 📜 License

MIT License - See LICENSE file for details

---

## 👥 Credits & Acknowledgments

- **AI/ML**: Scikit-learn, Pandas, NumPy, SciPy
- **Web**: Flask, React
- **Database**: SQLAlchemy, SQLite
- **Icons**: React Icons

---

## 🙋 Support & Questions

- 📧 Email: support@expenseanalyzer.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourrepo/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourrepo/discussions)
- 📚 Documentation: See /docs folder

---

## 🎉 Getting Started

1. **Clone & Setup** - Follow [SETUP_GUIDE.md](SETUP_GUIDE.md)
2. **Add Expenses** - Use the form to add transactions
3. **View Analytics** - Check anomalies and insights
4. **Plan Budget** - Use predictions for next month
5. **Customize** - Modify for your needs

---

## 📈 Project Statistics

- **Lines of Code**: ~2500
- **Backend Routes**: 10
- **Frontend Components**: 4
- **Database Models**: 3
- **ML Algorithms**: 3+

---

**Last Updated**: January 2024  
**Version**: 1.0.0  
**Status**: ✅ Production Ready

---

**Made with ❤️ for Smart Spending** 💰