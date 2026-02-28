# Expense Tracker API

A FastAPI-based REST API for tracking expenses, backed by PostgreSQL and Redis caching, fully containerized with Docker.

---

## Tech Stack

| Technology   | Purpose                  | Version |
|-------------|--------------------------|---------|
| FastAPI     | Web framework            | 0.134.0 |
| PostgreSQL  | Primary database         | 17      |
| Redis       | Caching layer            | 7 (Alpine) |
| SQLAlchemy  | ORM                      | 2.0.47  |
| Pydantic    | Data validation          | 2.12.5  |
| Uvicorn     | ASGI server              | 0.41.0  |
| Docker      | Containerization         | 29.x    |

---

## Project Structure

```
expense-tracker/
├── main.py              # FastAPI app, routes, Redis caching
├── database.py          # SQLAlchemy engine & session config
├── models.py            # Database models (Expense table)
├── requirements.txt     # Python dependencies
├── Dockerfile           # App container build instructions
├── docker-compose.yml   # Multi-container orchestration
├── .dockerignore        # Files excluded from Docker build
└── README.md            # This file
```

---

## Prerequisites

- **macOS** (Apple Silicon M4)
- **Homebrew** installed ([brew.sh](https://brew.sh))
- **Docker** and **Colima** (lightweight Docker runtime for macOS)

---

## Step 1: Install Docker & Dependencies

### 1.1 Install Docker CLI, Compose, and Buildx

```bash
brew install docker
brew install docker-compose
brew install docker-buildx
```

### 1.2 Install Colima (Docker runtime for macOS)

```bash
brew install colima
```

### 1.3 Configure Docker to find plugins

Edit `~/.docker/config.json` and add the `cliPluginsExtraDirs` field:

```json
{
  "auths": {},
  "currentContext": "colima",
  "cliPluginsExtraDirs": [
    "/opt/homebrew/lib/docker/cli-plugins"
  ]
}
```

### 1.4 Start Colima

```bash
colima start
```

### 1.5 Verify installation

```bash
docker --version          # Docker version 29.x
docker compose version    # Docker Compose version 5.x
colima status             # colima is running
```

---

## Step 2: Project Configuration

### 2.1 database.py — Database Connection

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:2233@localhost:5433/expense_tracker")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
```

**How it works:**
- Loads `DATABASE_URL` from environment variables (set in `docker-compose.yml`)
- Falls back to `localhost:5433` for local development without Docker
- Creates a SQLAlchemy engine and session factory

### 2.2 models.py — Database Schema

```python
from sqlalchemy import Column, Integer, String, Numeric, DateTime
from sqlalchemy.sql import func
from database import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    amount = Column(Numeric)
    category = Column(String)
    created_at = Column(DateTime(timezone=True), default=func.now())
```

**Table: `expenses`**

| Column     | Type      | Description              |
|-----------|-----------|--------------------------|
| id        | Integer   | Auto-increment primary key |
| title     | String    | Expense name             |
| amount    | Numeric   | Expense amount           |
| category  | String    | Expense category         |
| created_at| DateTime  | Auto-set to current time |

### 2.3 main.py — API Application

```python
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import os
import json
import redis
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

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

class ExpenseCreate(BaseModel):
    title: str
    amount: float
    category: str

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Key concepts:**
- `models.Base.metadata.create_all(bind=engine)` — auto-creates the `expenses` table on startup
- `redis.from_url(...)` — connects to Redis using the `REDIS_URL` env variable
- `CORSMiddleware` — allows requests from any origin (for frontend integration)
- `get_db()` — dependency injection that provides a database session per request

---

## Step 3: API Endpoints

### GET `/` — Health Check

```bash
curl http://localhost:8000/
```

Response:
```json
{"message": "PostgreSQL Connected 🚀"}
```

### GET `/expenses` — List All Expenses (Redis Cached)

```bash
curl http://localhost:8000/expenses
```

Response:
```json
[
  {
    "id": 1,
    "title": "Coffee",
    "amount": 4.5,
    "category": "Food",
    "created_at": "2026-02-28T18:09:13.947680+00:00"
  }
]
```

**Caching flow:**
1. Check Redis for cached `expenses` key
2. If cached, return immediately (no DB query)
3. If not cached, query PostgreSQL, cache result for **60 seconds**, then return

### POST `/expenses` — Create an Expense

```bash
curl -X POST http://localhost:8000/expenses \
  -H "Content-Type: application/json" \
  -d '{"title": "Coffee", "amount": 4.50, "category": "Food"}'
```

Response:
```json
{
  "amount": 4.5,
  "title": "Coffee",
  "category": "Food",
  "id": 1,
  "created_at": "2026-02-28T18:09:13.947680+00:00"
}
```

**After creating:** Redis cache is invalidated (`r.delete("expenses")`) so the next GET fetches fresh data.

### Swagger UI (Interactive Docs)

Open in browser: **http://localhost:8000/docs**

---

## Step 4: Docker Configuration

### 4.1 Dockerfile — App Container

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Build steps:**
1. Uses `python:3.12-slim` base image (lightweight)
2. Copies `requirements.txt` first (for Docker layer caching)
3. Installs dependencies
4. Copies the rest of the app code
5. Exposes port 8000 and starts Uvicorn

### 4.2 docker-compose.yml — Multi-Container Setup

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
    depends_on:
      - db
      - redis

volumes:
  pgdata:
  redisdata:
```

**Services explained:**

| Service | Image | Host Port | Container Port | Purpose |
|---------|-------|-----------|----------------|---------|
| db      | postgres:17 | 5433 | 5432 | Primary database |
| redis   | redis:7-alpine | 6379 | 6379 | Caching layer |
| app     | python:3.12-slim (built) | 8000 | 8000 | FastAPI application |

**Key points:**
- `db` uses hostname inside Docker network — the app connects to `db:5432`, not `localhost`
- `pgdata` and `redisdata` volumes persist data across container restarts
- `depends_on` ensures db and redis start before the app
- Port `5433` on host maps to `5432` in the container (avoids conflict with local PostgreSQL)

### 4.3 .dockerignore — Excluded Files

```
venv
__pycache__
.env
*.pyc
```

Keeps the Docker image clean by excluding virtual environment, cache files, and secrets.

---

## Step 5: Run the Application

### Start all services

```bash
docker compose up --build
```

### Start in background (detached mode)

```bash
docker compose up --build -d
```

### View logs

```bash
docker compose logs -f          # All services
docker compose logs -f app      # App only
docker compose logs -f db       # PostgreSQL only
docker compose logs -f redis    # Redis only
```

### Stop all services

```bash
docker compose down
```

### Stop and delete all data (volumes)

```bash
docker compose down -v
```

### Rebuild only the app (after code changes)

```bash
docker compose up --build app
```

---

## Step 6: Verify Everything Works

```bash
# 1. Health check
curl http://localhost:8000/

# 2. Create an expense
curl -X POST http://localhost:8000/expenses \
  -H "Content-Type: application/json" \
  -d '{"title": "Lunch", "amount": 12.00, "category": "Food"}'

# 3. List expenses (first call hits DB, subsequent calls hit Redis cache)
curl http://localhost:8000/expenses

# 4. Check running containers
docker compose ps

# 5. Connect to PostgreSQL directly
psql -h localhost -p 5433 -U postgres -d expense_tracker
```

---

## Environment Variables

| Variable      | Default Value | Description |
|--------------|---------------|-------------|
| DATABASE_URL | `postgresql://postgres:2233@localhost:5433/expense_tracker` | PostgreSQL connection string |
| REDIS_URL    | `redis://localhost:6379/0` | Redis connection string |

These are set in `docker-compose.yml` for containerized mode. For local development, create a `.env` file:

```env
DATABASE_URL=postgresql://postgres:2233@localhost:5433/expense_tracker
REDIS_URL=redis://localhost:6379/0
```

---

## Local Development (Without Docker)

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start only db and redis via Docker
docker compose up -d db redis

# Run the app locally
uvicorn main:app --reload --port 8000
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `docker compose` not found | Run `brew install docker-compose` and update `~/.docker/config.json` |
| `unknown flag: --build` | You have Docker Compose V1. Use `docker-compose up --build` (with hyphen) or upgrade |
| `colima is not running` | Run `colima start` |
| `buildx plugin not found` | Run `brew install docker-buildx` |
| App can't connect to DB | Ensure `depends_on` is set and use `db` (not `localhost`) as hostname in `DATABASE_URL` |
| Port already in use | Change the host port in `docker-compose.yml` (e.g., `5434:5432`) |
| Data lost after restart | Ensure `volumes` are defined in `docker-compose.yml` |
