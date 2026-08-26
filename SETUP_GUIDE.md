# AI EXPENSE ANALYZER - Complete Setup Guide

## 📋 Prerequisites

Before starting, ensure you have these installed on your system:

- **Python 3.8+** - [Download](https://www.python.org/downloads/)
- **Node.js 14+ & npm** - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)
- **Virtual Environment** - `python -m venv`

## 🚀 Quick Start (5 Minutes)

### Step 1: Clone & Setup Folder Structure

```bash
# Create project directory
mkdir expense-analyzer
cd expense-analyzer

# Create backend folder
mkdir backend
cd backend

# Copy all Python files (app.py, models.py, config.py, etc.) here
```

### Step 2: Setup Backend (Python)

```bash
# Navigate to backend folder
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run Flask server
python app.py
```

**Expected Output:**
```
============================================================
🚀 AI EXPENSE ANALYZER API STARTING
============================================================
Environment: development
Debug Mode: True
CORS Origins: ['http://localhost:3000', 'http://localhost:5000']
============================================================
 * Running on http://0.0.0.0:5000
```

### Step 3: Setup Frontend (React)

Open **new terminal** in project root:

```bash
# Create frontend folder
mkdir frontend
cd frontend

# Initialize Node project (copy package.json here)
npm init -y

# Install dependencies (copy frontend_package.json content to package.json)
npm install

# Start React development server
npm start
```

**Expected Output:**
```
Compiled successfully!

You can now view expense-analyzer in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

### Step 4: Access Application

Open browser and go to: **http://localhost:3000**

🎉 **Application is running!**

---

## 📁 File Organization Guide

```
expense-analyzer/
│
├── backend/
│   ├── venv/                    # Virtual environment (auto-created)
│   ├── app.py                   # Main Flask app
│   ├── models.py                # Database models
│   ├── config.py                # Configuration
│   ├── routes.py                # API endpoints
│   ├── ai_engine.py             # AI/ML logic
│   ├── utils.py                 # Helper functions
│   ├── requirements.txt          # Python dependencies
│   └── database.db              # SQLite database (auto-created)
│
├── frontend/
│   ├── node_modules/            # Dependencies (auto-created)
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js               # Main React component
│   │   ├── App.css              # Global styles
│   │   ├── index.js
│   │   └── components/
│   │       ├── Dashboard.js
│   │       ├── ExpenseForm.js
│   │       ├── Analytics.js
│   │       └── Predictions.js
│   └── package.json
│
└── README.md                    # Project documentation
```

---

## 🛠️ Development Workflow

### Terminal 1 - Backend (Python)

```bash
cd backend
source venv/bin/activate        # Activate virtual env
python app.py
```

**Runs on:** `http://localhost:5000`

### Terminal 2 - Frontend (React)

```bash
cd frontend
npm start
```

**Runs on:** `http://localhost:3000`

---

## 📝 Environment Variables

Create `.env` file in backend folder:

```bash
# .env file for backend
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///database.db
```

---

## 🗄️ Database Operations

### View Database (SQLite)

```bash
# Install SQLite browser (optional)
# https://sqlitebrowser.org/

# Or use command line
sqlite3 database.db
```

### Reset Database

```bash
# Delete database file (data will be lost)
rm database.db

# Restart app to create fresh database
python app.py
```

### Backup Database

```bash
# Copy database.db to safe location
cp backend/database.db backend/database_backup.db
```

---

## 🧪 Testing the API

### Using cURL

```bash
# Get all expenses
curl http://localhost:5000/api/expenses

# Add new expense
curl -X POST http://localhost:5000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Food & Dining",
    "amount": 250.50,
    "date": "2024-01-15",
    "description": "Lunch"
  }'

# Get anomalies
curl http://localhost:5000/api/analysis/anomalies

# Get predictions
curl http://localhost:5000/api/predictions
```

### Using Postman

1. Download [Postman](https://www.postman.com/downloads/)
2. Create requests for each endpoint
3. Import the API URL: `http://localhost:5000/api`

### Using Python

```python
import requests

# Get all expenses
response = requests.get('http://localhost:5000/api/expenses')
print(response.json())

# Add expense
data = {
    'category': 'Food & Dining',
    'amount': 250.50,
    'date': '2024-01-15',
    'description': 'Lunch'
}
response = requests.post('http://localhost:5000/api/expenses', json=data)
print(response.json())
```

---

## 🐛 Troubleshooting

### Issue: `Port 5000 already in use`

**Solution:**
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or use different port
python app.py --port 5001
```

### Issue: `npm modules not found`

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: `Database locked`

**Solution:**
```bash
# Restart Flask app
# Make sure only one instance is running
```

### Issue: `CORS Error`

**Solution:**
The backend allows requests from:
- `http://localhost:3000`
- `http://localhost:5000`

Add your domain to `CORS_ORIGINS` in `config.py` if different.

### Issue: `Module not found` (Python)

**Solution:**
```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Reinstall requirements
pip install -r requirements.txt
```

---

## 📦 Dependencies Explained

### Backend (Python)

| Package | Purpose |
|---------|---------|
| Flask | Web framework |
| Flask-CORS | Handle cross-origin requests |
| Flask-SQLAlchemy | Database ORM |
| Pandas | Data analysis |
| Scikit-learn | Machine learning |
| Numpy | Numerical computations |
| SciPy | Statistical analysis |
| Statsmodels | Time series forecasting |

### Frontend (React)

| Package | Purpose |
|---------|---------|
| React | UI framework |
| Axios | HTTP requests |
| Chart.js | Chart library |
| React-ChartJS-2 | React charts |
| date-fns | Date utilities |
| React-Icons | Icon library |

---

## 🚢 Deployment

### For Development (Local)

```bash
# Terminal 1
cd backend
python app.py

# Terminal 2
cd frontend
npm start
```

### For Production (Simple)

#### Backend Deployment (Heroku Example)

```bash
# Install Heroku CLI
# Create Procfile
echo "web: python app.py" > backend/Procfile

# Deploy
cd backend
heroku create your-app-name
git push heroku main
```

#### Frontend Deployment (Vercel/Netlify)

```bash
# Build React app
cd frontend
npm run build

# Deploy build folder to Vercel/Netlify
```

---

## 📊 Adding Sample Data

Create `sample_data.py` in backend:

```python
from app import create_app
from models import db, Expense
from datetime import datetime, timedelta

app = create_app()

with app.app_context():
    # Add sample expenses
    expenses = [
        Expense(user_id=1, category='Food & Dining', amount=250.50, date=datetime.now().date()),
        Expense(user_id=1, category='Transportation', amount=500, date=(datetime.now() - timedelta(days=1)).date()),
        Expense(user_id=1, category='Shopping', amount=1500, date=(datetime.now() - timedelta(days=2)).date()),
    ]
    
    for expense in expenses:
        db.session.add(expense)
    
    db.session.commit()
    print("✓ Sample data added!")
```

Run:
```bash
python sample_data.py
```

---

## 🔒 Security Notes

⚠️ **For Development Only:**
- Change `SECRET_KEY` in config.py for production
- Use environment variables for sensitive data
- Enable HTTPS in production
- Use stronger database (PostgreSQL instead of SQLite)

---

## 📚 Learning Resources

- [Flask Documentation](https://flask.palletsprojects.com/)
- [React Documentation](https://react.dev/)
- [SQLAlchemy Tutorial](https://docs.sqlalchemy.org/)
- [Scikit-learn Guide](https://scikit-learn.org/)

---

## ❓ FAQ

**Q: How do I see the database?**
A: Use SQLite Browser or access via Python scripts.

**Q: Can I use PostgreSQL instead of SQLite?**
A: Yes! Change `SQLALCHEMY_DATABASE_URI` in config.py

**Q: How do I add more users?**
A: Currently supports single user (user_id=1). Modify routes to support multi-user.

**Q: How often does the AI analyze data?**
A: On-demand via API calls. You can add scheduled tasks with `APScheduler`.

**Q: Can I deploy to AWS/GCP?**
A: Yes! Follow their Python/Node.js deployment guides.

---

## 🎯 Next Steps

1. ✅ Complete basic setup
2. 📝 Add sample expenses
3. 📊 Explore Analytics page
4. 🔮 Check Predictions
5. 🚀 Customize and deploy

**Happy expense tracking! 💰**