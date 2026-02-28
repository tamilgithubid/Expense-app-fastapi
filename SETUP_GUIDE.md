# Expense Tracker API — Complete Setup Guide

A step-by-step guide to set up, run, test, and deploy the FastAPI Expense Tracker with PostgreSQL, Redis, JWT Authentication, and CI/CD.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Prerequisites](#2-prerequisites)
3. [Project Structure](#3-project-structure)
4. [Step 1 — Install Docker on macOS](#step-1--install-docker-on-macos)
5. [Step 2 — Database Configuration](#step-2--database-configuration)
6. [Step 3 — SQLAlchemy Models](#step-3--sqlalchemy-models)
7. [Step 4 — Pydantic Schemas](#step-4--pydantic-schemas)
8. [Step 5 — JWT Authentication](#step-5--jwt-authentication)
9. [Step 6 — FastAPI Application](#step-6--fastapi-application)
10. [Step 7 — Docker Setup](#step-7--docker-setup)
11. [Step 8 — Build & Run](#step-8--build--run)
12. [Step 9 — Testing with Pytest](#step-9--testing-with-pytest)
13. [Step 10 — CI/CD with GitHub Actions](#step-10--cicd-with-github-actions)
14. [API Reference](#api-reference)
15. [Environment Variables](#environment-variables)
16. [Useful Commands](#useful-commands)
17. [Troubleshooting](#troubleshooting)

---

## 1. Project Overview

| Component    | Technology         | Purpose                |
|-------------|-------------------|------------------------|
| Framework   | FastAPI 0.134.0   | REST API               |
| Database    | PostgreSQL 17     | Primary data store     |
| Cache       | Redis 7 (Alpine)  | Response caching       |
| ORM         | SQLAlchemy 2.0.47 | Database abstraction   |
| Auth        | JWT (python-jose) | Token authentication   |
| Hashing     | bcrypt (passlib)  | Password security      |
| Validation  | Pydantic 2.12.5   | Request/response models|
| Server      | Uvicorn 0.41.0    | ASGI server            |
| Container   | Docker + Compose  | Containerization       |
| Tests       | Pytest + httpx    | Unit/integration tests |
| CI/CD       | GitHub Actions    | Automated pipeline     |

---

## 2. Prerequisites

- **macOS** with Apple Silicon (M1/M2/M3/M4)
- **Python 3.12+**
- **Homebrew** — [brew.sh](https://brew.sh)
- **Git** — `brew install git`

---

## 3. Project Structure

```
expense-tracker/
├── main.py                        # FastAPI app, all routes
├── database.py                    # SQLAlchemy engine & session
├── models.py                      # User & Expense ORM models
├── schemas.py                     # Pydantic request/response schemas
├── auth.py                        # JWT auth & password hashing
├── requirements.txt               # Python dependencies
├── Dockerfile                     # App container definition
├── docker-compose.yml             # Multi-container orchestration
├── .dockerignore                  # Files excluded from Docker
├── tests/
│   ├── __init__.py                # Package marker
│   ├── conftest.py                # Test fixtures & config
│   └── test_main.py              # 19 test cases
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI pipeline
└── README.md                      # Project documentation
```

---

## Step 1 — Install Docker on macOS

### 1.1 Install Docker CLI, Compose, Buildx, and Colima

```bash
brew install docker
brew install docker-compose
brew install docker-buildx
brew install colima
```

### 1.2 Configure Docker plugins

Edit `~/.docker/config.json`:

```json
{
  "auths": {},
  "currentContext": "colima",
  "cliPluginsExtraDirs": [
    "/opt/homebrew/lib/docker/cli-plugins"
  ]
}
```

### 1.3 Start Colima (Docker runtime)

```bash
colima start
```

### 1.4 Verify installation

```bash
docker --version            # Docker version 29.x
docker compose version      # Docker Compose version 5.x
colima status               # colima is running
```

---

## Step 2 — Database Configuration

**File: `database.py`**

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:2233@localhost:5433/expense_tracker"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
```

**What it does:**
- Reads `DATABASE_URL` from environment (set by `docker-compose.yml` in containers)
- Falls back to `localhost:5433` for local development without Docker
- `SessionLocal` creates database sessions with manual commit control
- `Base` is the parent class for all ORM models

---

## Step 3 — SQLAlchemy Models

**File: `models.py`**

```python
from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now())

    expenses = relationship("Expense", back_populates="owner")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    amount = Column(Numeric)
    category = Column(String)
    created_at = Column(DateTime(timezone=True), default=func.now())
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    owner = relationship("User", back_populates="expenses")
```

**Database tables:**

```
┌──────────────────────┐       ┌──────────────────────────┐
│       users          │       │        expenses           │
├──────────────────────┤       ├──────────────────────────┤
│ id (PK)              │───┐   │ id (PK)                  │
│ username (unique)    │   │   │ title                    │
│ email (unique)       │   │   │ amount                   │
│ hashed_password      │   └──>│ owner_id (FK -> users.id)│
│ created_at           │       │ category                 │
└──────────────────────┘       │ created_at               │
                               └──────────────────────────┘
```

---

## Step 4 — Pydantic Schemas

**File: `schemas.py`**

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class ExpenseCreate(BaseModel):
    title: str
    amount: float
    category: str


class ExpenseResponse(BaseModel):
    id: int
    title: str
    amount: float
    category: str
    created_at: Optional[datetime] = None
    owner_id: int

    class Config:
        from_attributes = True
```

**Schema usage:**

| Schema | Used In | Purpose |
|--------|---------|---------|
| `UserCreate` | POST /register | Accepts username, email, password |
| `UserResponse` | POST /register response | Returns user without password |
| `Token` | POST /login response | Returns JWT access token |
| `ExpenseCreate` | POST /expenses | Accepts title, amount, category |
| `ExpenseResponse` | GET/POST /expenses | Returns expense with owner_id |

---

## Step 5 — JWT Authentication

**File: `auth.py`**

```python
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os

import models
from database import SessionLocal

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user
```

**Authentication flow:**

```
1. User registers    POST /register  →  password hashed with bcrypt  →  stored in DB
2. User logs in      POST /login     →  verify password  →  return JWT token
3. User makes request with header:   Authorization: Bearer <token>
4. get_current_user  →  decode JWT   →  extract username  →  query DB  →  return User
5. Protected route receives the User object via Depends(get_current_user)
```

**JWT token structure:**
```json
{
  "sub": "testuser",       // username
  "exp": 1772307103        // expiration (30 min from creation)
}
```

---

## Step 6 — FastAPI Application

**File: `main.py`**

```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import os
import json
import redis
from fastapi.middleware.cors import CORSMiddleware

from schemas import UserCreate, UserResponse, Token, ExpenseCreate, ExpenseResponse
from auth import hash_password, verify_password, create_access_token, get_current_user

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

r = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Public ---

@app.get("/")
def home():
    return {"message": "PostgreSQL Connected"}


# --- Auth ---

@app.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(
        (models.User.username == user.username) | (models.User.email == user.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hash_password(user.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


# --- Protected ---

@app.get("/expenses", response_model=list[ExpenseResponse])
def get_expenses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    cache_key = f"expenses:user:{current_user.id}"
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    expenses = db.query(models.Expense).filter(
        models.Expense.owner_id == current_user.id
    ).all()
    result = [
        {
            "id": e.id,
            "title": e.title,
            "amount": float(e.amount),
            "category": e.category,
            "created_at": e.created_at.isoformat() if e.created_at else None,
            "owner_id": e.owner_id,
        }
        for e in expenses
    ]
    r.set(cache_key, json.dumps(result), ex=60)
    return result


@app.post("/expenses", response_model=ExpenseResponse)
def add_expense(
    expense: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    new_expense = models.Expense(**expense.model_dump(), owner_id=current_user.id)
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    r.delete(f"expenses:user:{current_user.id}")
    return new_expense
```

**Redis caching strategy:**

```
GET /expenses (with Bearer token)
    │
    ├─ Check Redis: key = "expenses:user:{user_id}"
    │   ├─ HIT  → return cached JSON (skip DB)
    │   └─ MISS → query PostgreSQL → cache result for 60s → return
    │
POST /expenses (with Bearer token)
    │
    └─ After insert → r.delete("expenses:user:{user_id}") → cache busted
```

---

## Step 7 — Docker Setup

### 7.1 Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Build layers (optimized for caching):**
1. Copy `requirements.txt` first (changes rarely)
2. Install dependencies (cached if requirements unchanged)
3. Copy app code last (changes frequently)

### 7.2 docker-compose.yml

```yaml
services:
  db:
    image: postgres:17
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: 2233
      POSTGRES_DB: expense_tracker
    ports:
      - "5433:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

  app:
    build: .
    restart: always
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://postgres:2233@db:5432/expense_tracker
      REDIS_URL: redis://redis:6379/0
      JWT_SECRET_KEY: your-super-secret-key-change-this
    depends_on:
      - db
      - redis

volumes:
  pgdata:
  redisdata:
```

**Container network:**

```
┌─────────────────────────────────────────────────┐
│                Docker Network                    │
│                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐    │
│  │ db       │   │ redis    │   │ app      │    │
│  │ :5432    │◄──│ :6379    │◄──│ :8000    │    │
│  │ postgres │   │ redis    │   │ uvicorn  │    │
│  └──────────┘   └──────────┘   └──────────┘    │
│       │              │              │            │
└───────┼──────────────┼──────────────┼────────────┘
        │              │              │
   Host:5433      Host:6379      Host:8000
```

### 7.3 .dockerignore

```
venv
__pycache__
.env
*.pyc
tests
htmlcov
.github
.pytest_cache
.coverage
```

Excludes test files, caches, and secrets from the production Docker image.

### 7.4 requirements.txt

```
fastapi==0.134.0
uvicorn==0.41.0
sqlalchemy==2.0.47
psycopg2-binary==2.9.11
python-dotenv==1.2.1
pydantic==2.12.5
redis==5.2.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
bcrypt==4.0.1
python-multipart==0.0.20
pytest==8.3.4
httpx==0.28.1
pytest-cov==6.0.0
```

---

## Step 8 — Build & Run

### First time setup

```bash
# Start Colima (Docker runtime)
colima start

# Build and start all containers
docker compose up --build
```

### Run in background

```bash
docker compose up --build -d
```

### Verify everything is running

```bash
# Check container status
docker compose ps

# Test health endpoint
curl http://localhost:8000/

# Open Swagger docs in browser
open http://localhost:8000/docs
```

### Test the full auth flow

```bash
# 1. Register a user
curl -X POST http://localhost:8000/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"secret123"}'

# 2. Login and get JWT token
curl -X POST http://localhost:8000/login \
  -d "username=testuser&password=secret123"
# Copy the access_token from response

# 3. Create an expense (replace <TOKEN> with your token)
curl -X POST http://localhost:8000/expenses \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Coffee","amount":4.50,"category":"Food"}'

# 4. Get your expenses
curl http://localhost:8000/expenses \
  -H "Authorization: Bearer <TOKEN>"

# 5. Try without token (should return 401)
curl http://localhost:8000/expenses
```

---

## Step 9 — Testing with Pytest

### 9.1 Test architecture

Tests run **without Docker** — they use SQLite in-memory and mocked Redis.

```
tests/
├── __init__.py        # Package marker
├── conftest.py        # Fixtures: test DB, mock Redis, auth helpers
└── test_main.py       # 19 test cases
```

### 9.2 Test configuration (`tests/conftest.py`)

**Key design decisions:**

1. **Environment variables set before imports** — prevents `database.py` and `main.py` from connecting to real PostgreSQL/Redis at import time.

2. **SQLite in-memory with `StaticPool`** — same connection reused across the test (SQLite in-memory DBs are per-connection).

3. **Both `get_db` functions overridden** — `main.get_db` for routes AND `auth.get_db` for `get_current_user`. Missing either one will cause tests to fail.

4. **Redis mocked with `MagicMock`** — `main.r` is replaced with a mock that simulates cache misses.

5. **Fresh tables per test** — `autouse=True` fixture creates/drops all tables before/after every test.

```python
import os

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"
os.environ["JWT_SECRET_KEY"] = "test-secret-key"

from unittest.mock import MagicMock
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from database import Base
from main import app, get_db
from auth import get_db as auth_get_db

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

mock_redis = MagicMock()
mock_redis.get.return_value = None
mock_redis.set.return_value = True
mock_redis.delete.return_value = True

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture()
def client():
    import main
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[auth_get_db] = override_get_db
    main.r = mock_redis
    mock_redis.reset_mock()
    mock_redis.get.return_value = None
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture()
def registered_user(client):
    user_data = {"username": "testuser", "email": "test@example.com", "password": "testpassword123"}
    response = client.post("/register", json=user_data)
    assert response.status_code == 200
    return user_data

@pytest.fixture()
def auth_headers(client, registered_user):
    response = client.post("/login", data={"username": registered_user["username"], "password": registered_user["password"]})
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

### 9.3 Test cases (`tests/test_main.py`)

| # | Test | What it verifies |
|---|------|-----------------|
| 1 | `test_home_returns_200` | Health check returns 200 |
| 2 | `test_home_response_body` | Response content is correct |
| 3 | `test_register_success` | User created, password not leaked |
| 4 | `test_register_duplicate_username` | 400 on duplicate username |
| 5 | `test_register_duplicate_email` | 400 on duplicate email |
| 6 | `test_login_success` | Returns JWT token |
| 7 | `test_login_wrong_password` | 401 on wrong password |
| 8 | `test_login_nonexistent_user` | 401 on unknown user |
| 9 | `test_create_expense_success` | Expense created with correct fields |
| 10 | `test_create_expense_invalidates_cache` | Redis `r.delete()` called |
| 11 | `test_create_expense_unauthenticated` | 401 without token |
| 12 | `test_get_expenses_empty` | Empty list for new user |
| 13 | `test_get_expenses_returns_own` | Returns user's expenses |
| 14 | `test_get_expenses_user_isolation` | User A's data invisible to User B |
| 15 | `test_get_expenses_unauthenticated` | 401 without token |
| 16 | `test_get_expenses_calls_redis` | Cache lookup attempted |
| 17 | `test_get_expenses_no_token` | 401 without token |
| 18 | `test_post_expenses_no_token` | 401 without token |
| 19 | `test_invalid_token` | 401 on garbage token |

### 9.4 Run tests

```bash
# Install dependencies (first time)
pip install -r requirements.txt

# Run all tests with verbose output
pytest tests/ -v

# Run with coverage report
pytest tests/ -v --cov=. --cov-report=term-missing

# Run a specific test class
pytest tests/test_main.py::TestUserLogin -v

# Run a single test
pytest tests/test_main.py::TestCreateExpense::test_create_expense_success -v
```

**Expected output:**

```
tests/test_main.py::TestHealthCheck::test_home_returns_200 PASSED
tests/test_main.py::TestHealthCheck::test_home_response_body PASSED
tests/test_main.py::TestUserRegistration::test_register_success PASSED
tests/test_main.py::TestUserRegistration::test_register_duplicate_username PASSED
tests/test_main.py::TestUserRegistration::test_register_duplicate_email PASSED
tests/test_main.py::TestUserLogin::test_login_success PASSED
tests/test_main.py::TestUserLogin::test_login_wrong_password PASSED
tests/test_main.py::TestUserLogin::test_login_nonexistent_user PASSED
tests/test_main.py::TestCreateExpense::test_create_expense_success PASSED
tests/test_main.py::TestCreateExpense::test_create_expense_invalidates_cache PASSED
tests/test_main.py::TestCreateExpense::test_create_expense_unauthenticated PASSED
tests/test_main.py::TestGetExpenses::test_get_expenses_empty PASSED
tests/test_main.py::TestGetExpenses::test_get_expenses_returns_own PASSED
tests/test_main.py::TestGetExpenses::test_get_expenses_user_isolation PASSED
tests/test_main.py::TestGetExpenses::test_get_expenses_unauthenticated PASSED
tests/test_main.py::TestGetExpenses::test_get_expenses_calls_redis PASSED
tests/test_main.py::TestUnauthenticatedAccess::test_get_expenses_no_token PASSED
tests/test_main.py::TestUnauthenticatedAccess::test_post_expenses_no_token PASSED
tests/test_main.py::TestUnauthenticatedAccess::test_invalid_token PASSED

19 passed — 96% coverage
```

---

## Step 10 — CI/CD with GitHub Actions

### 10.1 Pipeline configuration (`.github/workflows/ci.yml`)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python 3.12
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Cache pip dependencies
        uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ hashFiles('requirements.txt') }}
          restore-keys: |
            ${{ runner.os }}-pip-

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run tests with coverage
        env:
          DATABASE_URL: "sqlite://"
          REDIS_URL: "redis://localhost:6379/0"
          JWT_SECRET_KEY: "ci-test-secret-key"
        run: pytest tests/ -v --cov=. --cov-report=term-missing --cov-report=html

      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: htmlcov/

  docker-build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t expense-tracker:ci .
```

### 10.2 What the pipeline does

Two jobs run **in parallel**:

**Job 1: `test`**
1. Checkout code
2. Set up Python 3.12
3. Cache pip dependencies (faster subsequent runs)
4. Install all requirements
5. Run pytest with coverage (uses SQLite + mock Redis, no Docker needed)
6. Upload HTML coverage report as artifact

**Job 2: `docker-build`**
1. Checkout code
2. Build Docker image (verifies Dockerfile works)

### 10.3 Push to GitHub

```bash
# Initialize git (if not done)
git init
git add .
git commit -m "Expense tracker with auth, tests, and CI/CD"

# Create GitHub repo and push
gh repo create expense-tracker --public --push
# OR
git remote add origin https://github.com/<your-username>/expense-tracker.git
git push -u origin main
```

### 10.4 Verify CI

After pushing:
1. Go to your repo on GitHub
2. Click the **Actions** tab
3. Watch both `test` and `docker-build` jobs pass
4. Download the coverage report from the build artifacts

---

## API Reference

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/docs` | Swagger UI (interactive API docs) |

### Auth Endpoints

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/register` | `{"username","email","password"}` | User object (no password) |
| POST | `/login` | Form: `username` + `password` | `{"access_token","token_type"}` |

### Protected Endpoints (require `Authorization: Bearer <token>`)

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/expenses` | — | List of user's expenses |
| POST | `/expenses` | `{"title","amount","category"}` | Created expense |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:2233@localhost:5433/expense_tracker` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection |
| `JWT_SECRET_KEY` | `dev-secret-change-in-production` | JWT signing secret |

For production, generate a strong secret:

```bash
openssl rand -hex 32
```

---

## Useful Commands

### Docker

```bash
colima start                       # Start Docker runtime
docker compose up --build          # Build and start all containers
docker compose up --build -d       # Start in background
docker compose down                # Stop containers
docker compose down -v             # Stop and delete all data
docker compose logs -f             # Follow all logs
docker compose logs -f app         # Follow app logs only
docker compose ps                  # List running containers
docker compose up --build app      # Rebuild only the app
```

### Testing

```bash
pytest tests/ -v                                    # Run tests
pytest tests/ -v --cov=. --cov-report=term-missing  # With coverage
pytest tests/test_main.py::TestUserLogin -v         # Single class
pytest tests/test_main.py -k "register" -v          # Filter by name
```

### Database

```bash
# Connect to PostgreSQL inside Docker
psql -h localhost -p 5433 -U postgres -d expense_tracker

# Inside psql
\dt           # List tables
SELECT * FROM users;
SELECT * FROM expenses;
\q            # Quit
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `docker compose` not found | `brew install docker-compose` and update `~/.docker/config.json` |
| `unknown flag: --build` | Use `docker-compose up --build` (hyphen) or upgrade Docker |
| `colima is not running` | Run `colima start` |
| `buildx plugin not found` | Run `brew install docker-buildx` |
| `password cannot be longer than 72 bytes` | Pin `bcrypt==4.0.1` in `requirements.txt` |
| `Form data requires python-multipart` | Add `python-multipart` to `requirements.txt` |
| App can't connect to DB | Use `db` (not `localhost`) as hostname inside Docker |
| Port already in use | Change host port in `docker-compose.yml` (e.g., `5434:5432`) |
| Tests fail with `ModuleNotFoundError` | Run `pip install -r requirements.txt` first |
| Old data causing schema errors | Run `docker compose down -v` to reset volumes |
