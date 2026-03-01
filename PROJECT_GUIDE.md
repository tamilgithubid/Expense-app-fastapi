# Expense Tracker — Full Stack Project Guide

## Table of Contents
1. [Project Structure](#1-project-structure)
2. [How Backend & Frontend Connect](#2-how-backend--frontend-connect)
3. [Docker Architecture](#3-docker-architecture)
4. [Docker Commands Reference](#4-docker-commands-reference)
5. [Running in Development Mode](#5-running-in-development-mode)
6. [Running in Production (Docker)](#6-running-in-production-docker)
7. [API Endpoints](#7-api-endpoints)
8. [How Authentication Works](#8-how-authentication-works)
9. [How Data Flows](#9-how-data-flows)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Project Structure

```
Python/
├── docker-compose.yml          # Orchestrates all services
│
├── backend/                    # FastAPI Python backend
│   ├── Dockerfile              # Builds the backend image
│   ├── main.py                 # All API routes
│   ├── models.py               # SQLAlchemy DB models (User, Expense)
│   ├── schemas.py              # Pydantic request/response schemas
│   ├── auth.py                 # JWT token creation & verification
│   ├── database.py             # PostgreSQL connection setup
│   ├── requirements.txt        # Python dependencies
│   └── tests/                  # Pytest test suite
│
├── frontend/                   # React + Vite frontend
│   ├── Dockerfile              # Multi-stage build (Node → Nginx)
│   ├── nginx.conf              # Nginx config (serves app + proxies API)
│   ├── vite.config.js          # Vite config (dev proxy + Tailwind)
│   ├── package.json            # Node dependencies
│   └── src/
│       ├── App.jsx             # Routes + providers
│       ├── services/api.js     # Axios instance (all API calls)
│       ├── store/              # Redux Toolkit (auth state)
│       ├── hooks/              # TanStack Query hooks (expenses)
│       ├── pages/              # Login, Register, Dashboard
│       ├── components/ui/      # shadcn-style UI components
│       └── components/reactbits/ # Animation components
```

---

## 2. How Backend & Frontend Connect

### The Key Concept: API Proxy

The frontend NEVER talks directly to `localhost:8000`. Instead, it sends all
API requests to `/api/*` on its OWN server, which then forwards them to the backend.

```
┌─────────────────────────────────────────────────────────┐
│                    User's Browser                        │
│                                                          │
│  React App (localhost:3000)                              │
│    │                                                     │
│    ├── GET  /login          → Serves index.html (SPA)    │
│    ├── GET  /dashboard      → Serves index.html (SPA)    │
│    │                                                     │
│    ├── POST /api/login      ──┐                          │
│    ├── POST /api/register   ──┤  API requests            │
│    ├── GET  /api/expenses   ──┤                          │
│    └── POST /api/expenses   ──┘                          │
└───────────────────────────────┼──────────────────────────┘
                                │
                    Nginx strips "/api" prefix
                    and forwards to backend
                                │
                                ▼
┌─────────────────────────────────────────────────────────┐
│  FastAPI Backend (port 8000)                             │
│                                                          │
│    POST /login      → Returns JWT token                  │
│    POST /register   → Creates user                       │
│    GET  /expenses   → Returns user's expenses            │
│    POST /expenses   → Creates new expense                │
└─────────────────────────────────────────────────────────┘
```

### How the Proxy Works

**In Production (Docker)** — Nginx handles it:

```nginx
# frontend/nginx.conf

location / {
    try_files $uri $uri/ /index.html;    # Serve React app
}

location /api/ {
    proxy_pass http://app:8000/;          # Forward to backend
}
```

- `http://app:8000/` — "app" is the Docker service name (from docker-compose.yml)
- The trailing `/` in `proxy_pass` strips the `/api/` prefix
- So `/api/login` becomes `http://app:8000/login`

**In Development (npm run dev)** — Vite handles it:

```js
// frontend/vite.config.js

server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',   // Forward to backend
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  },
}
```

- Same concept, but Vite dev server does the proxying
- `/api/login` → `http://localhost:8000/login`

### Frontend API Layer

```js
// frontend/src/services/api.js

const api = axios.create({
  baseURL: "/api",              // All requests go to /api/*
})

// Auto-attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = store.getState().auth.token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

---

## 3. Docker Architecture

### Service Map

```
docker-compose.yml defines 5 services:

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   frontend   │    │     app      │    │      db      │
│   (Nginx)    │───▶│  (FastAPI)   │───▶│ (PostgreSQL) │
│  Port: 3000  │    │  Port: 8000  │    │  Port: 5433  │
└──────────────┘    └──────┬───────┘    └──────────────┘
                           │
                    ┌──────▼───────┐    ┌──────────────┐
                    │    redis     │    │   pgadmin    │
                    │   (Cache)    │    │  (DB Admin)  │
                    │  Port: 6379  │    │  Port: 5050  │
                    └──────────────┘    └──────────────┘
```

### How Services Find Each Other

Docker Compose creates a shared network. Services use their **service name**
as hostname:

| From          | To Connect To  | Use Hostname       |
|---------------|----------------|--------------------|
| frontend      | backend        | `http://app:8000`  |
| app (backend) | database       | `db:5432`          |
| app (backend) | redis          | `redis:6379`       |
| pgadmin       | database       | `db:5432`          |

### Port Mapping (host:container)

| Service    | Container Port | Your Machine Port | URL                    |
|------------|---------------|-------------------|------------------------|
| frontend   | 80 (nginx)    | 3000              | http://localhost:3000   |
| app        | 8000          | 8000              | http://localhost:8000   |
| db         | 5432          | 5433              | localhost:5433          |
| redis      | 6379          | 6379              | localhost:6379          |
| pgadmin    | 80            | 5050              | http://localhost:5050   |

### Volumes (Persistent Data)

```yaml
volumes:
  pgdata:       # PostgreSQL data — survives container restarts
  redisdata:    # Redis data — survives container restarts
```

### Dockerfile Breakdown

**Backend Dockerfile** (`backend/Dockerfile`):
```dockerfile
FROM python:3.12-slim        # Base image
WORKDIR /app                 # Working directory inside container
COPY requirements.txt .      # Copy deps first (for caching)
RUN pip install -r requirements.txt
COPY . .                     # Copy all source code
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Frontend Dockerfile** (`frontend/Dockerfile`) — Multi-stage:
```dockerfile
# Stage 1: Build the React app
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci                   # Install dependencies
COPY . .
RUN npm run build            # Creates dist/ folder

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html   # Copy built files
COPY nginx.conf /etc/nginx/conf.d/default.conf       # Custom nginx config
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 4. Docker Commands Reference

### Starting Services

```bash
# Start everything (first time or after changes)
docker compose up --build

# Start in background (detached)
docker compose up -d --build

# Start only specific services
docker compose up -d db redis         # Just database & cache
docker compose up -d --build frontend # Rebuild & restart frontend only
docker compose up -d --build app      # Rebuild & restart backend only
```

### Stopping Services

```bash
# Stop all services
docker compose down

# Stop and remove volumes (DELETES ALL DATA)
docker compose down -v

# Stop a single service
docker compose stop frontend
```

### Viewing Logs

```bash
# All services
docker compose logs

# Follow logs in real-time
docker compose logs -f

# Specific service
docker compose logs -f app          # Backend logs
docker compose logs -f frontend     # Nginx logs
docker compose logs -f db           # PostgreSQL logs

# Last 50 lines only
docker compose logs --tail 50 app
```

### Checking Status

```bash
# See running containers
docker compose ps

# Detailed container info
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Rebuilding

```bash
# Rebuild a single service (after code changes)
docker compose up -d --build frontend
docker compose up -d --build app

# Rebuild everything from scratch (no cache)
docker compose build --no-cache
docker compose up -d

# Force recreate containers
docker compose up -d --force-recreate
```

### Executing Commands Inside Containers

```bash
# Open a shell in a container
docker exec -it python-app-1 bash
docker exec -it python-db-1 bash

# Run a database query
docker exec python-db-1 psql -U postgres -d expense_tracker -c "SELECT * FROM users;"

# Run backend tests
docker exec python-app-1 pytest

# Check nginx config
docker exec python-frontend-1 nginx -t
```

### Managing Data

```bash
# List volumes
docker volume ls

# Inspect a volume
docker volume inspect python_pgdata

# Backup database
docker exec python-db-1 pg_dump -U postgres expense_tracker > backup.sql

# Restore database
cat backup.sql | docker exec -i python-db-1 psql -U postgres expense_tracker
```

### Cleanup

```bash
# Remove stopped containers
docker compose rm

# Remove unused images
docker image prune

# Remove everything unused (images, containers, networks)
docker system prune

# Nuclear option — remove ALL Docker data
docker system prune -a --volumes
```

---

## 5. Running in Development Mode

Development mode gives you hot-reload (instant updates without rebuilding).

### Step 1: Start backend services

```bash
docker compose up -d db redis    # Start database & cache
```

### Step 2: Run backend locally

```bash
cd backend
pip install -r requirements.txt
export DATABASE_URL=postgresql://postgres:2233@localhost:5433/expense_tracker
export REDIS_URL=redis://localhost:6379/0
uvicorn main:app --reload --port 8000
```

### Step 3: Run frontend locally

```bash
cd frontend
npm install
npm run dev                      # Starts on http://localhost:5173
```

Vite's proxy config forwards `/api/*` → `localhost:8000` automatically.

### Dev URLs

| Service        | URL                      |
|----------------|--------------------------|
| Frontend (dev) | http://localhost:5173     |
| Backend        | http://localhost:8000     |
| API docs       | http://localhost:8000/docs|
| pgAdmin        | http://localhost:5050     |

---

## 6. Running in Production (Docker)

### Start everything

```bash
cd /Users/tamil/Python
docker compose up -d --build
```

### Production URLs

| Service   | URL                      |
|-----------|--------------------------|
| Frontend  | http://localhost:3000     |
| Backend   | http://localhost:8000     |
| API docs  | http://localhost:8000/docs|
| pgAdmin   | http://localhost:5050     |

### After code changes

```bash
# Frontend changes only
docker compose up -d --build frontend

# Backend changes only
docker compose up -d --build app

# Both
docker compose up -d --build app frontend
```

---

## 7. API Endpoints

| Method | Endpoint         | Auth Required | Body                                  | Response                |
|--------|------------------|---------------|---------------------------------------|-------------------------|
| GET    | /                | No            | —                                     | `{"message": "..."}` |
| POST   | /register        | No            | `{"username", "email", "password"}`   | User object             |
| POST   | /login           | No            | Form data: `username` + `password`    | `{"access_token": "..."}` |
| GET    | /expenses        | Yes (Bearer)  | —                                     | Array of expenses       |
| POST   | /expenses        | Yes (Bearer)  | `{"title", "amount", "category"}`     | Created expense         |

### Testing with curl

```bash
# Health check
curl http://localhost:3000/api/

# Register
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@test.com","password":"pass123"}'

# Login (returns JWT token)
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=john&password=pass123"

# Get expenses (replace TOKEN with actual JWT)
curl http://localhost:3000/api/expenses \
  -H "Authorization: Bearer TOKEN"

# Create expense
curl -X POST http://localhost:3000/api/expenses \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Coffee","amount":4.50,"category":"Food"}'
```

---

## 8. How Authentication Works

```
1. User submits login form
   │
   ▼
2. Frontend sends POST /api/login (username + password as form data)
   │
   ▼
3. Nginx proxies to backend → POST /login
   │
   ▼
4. Backend verifies password (bcrypt hash comparison)
   │
   ├── Wrong password → 401 error → Frontend shows error toast
   │
   └── Correct → Backend creates JWT token (expires in 30 min)
       │
       ▼
5. Frontend receives { access_token: "eyJ..." }
   │
   ├── Stores token in Redux state
   ├── Stores token in localStorage (persists across refreshes)
   └── Navigates to /dashboard
       │
       ▼
6. All subsequent API calls include: Authorization: Bearer eyJ...
   │
   ├── Axios interceptor auto-attaches the token
   └── Backend validates token on every protected request
       │
       ├── Valid → Returns data
       └── Invalid/Expired → 401 → Frontend clears token → Redirect to /login
```

---

## 9. How Data Flows

### Creating an Expense

```
User clicks "Add Expense" → Fills form → Clicks submit
  │
  ▼
React component calls createExpense.mutateAsync({title, amount, category})
  │
  ▼
useCreateExpense hook (TanStack Query mutation)
  │
  ▼
api.post("/expenses", data) — Axios adds JWT header automatically
  │
  ▼
Nginx: /api/expenses → http://app:8000/expenses
  │
  ▼
FastAPI backend:
  ├── Validates JWT token → extracts user ID
  ├── Creates Expense record in PostgreSQL
  ├── Deletes Redis cache for this user (invalidation)
  └── Returns created expense
  │
  ▼
TanStack Query:
  ├── onSuccess → invalidates ["expenses"] query
  └── Triggers refetch → GET /expenses → fresh data from DB/Redis
  │
  ▼
Dashboard re-renders with new expense (animated entry)
```

### Caching Flow (Redis)

```
GET /expenses request arrives
  │
  ▼
Backend checks Redis: r.get(f"expenses:user:{user_id}")
  │
  ├── Cache HIT (within 60s) → Return cached JSON directly (fast!)
  │
  └── Cache MISS → Query PostgreSQL
      │
      ├── Store result in Redis with 60s TTL
      └── Return result
```

---

## 10. Troubleshooting

### Frontend shows blank page
```bash
docker compose logs frontend     # Check nginx errors
docker exec python-frontend-1 ls /usr/share/nginx/html  # Check files exist
```

### API calls return 502 Bad Gateway
```bash
docker compose logs app          # Backend might have crashed
docker compose restart app       # Restart backend
```

### Can't connect to database
```bash
docker compose logs db           # Check PostgreSQL logs
docker compose ps                # Make sure db container is running
docker exec python-db-1 pg_isready  # Check if PostgreSQL is ready
```

### After code changes, old version still showing
```bash
# Force full rebuild (no cache)
docker compose build --no-cache frontend
docker compose up -d frontend

# Clear browser cache (Ctrl+Shift+R)
```

### Container keeps restarting
```bash
docker compose logs --tail 50 app   # Check error logs
docker compose stop app             # Stop it first
docker compose up app               # Start in foreground to see errors
```

### Reset everything from scratch
```bash
docker compose down -v              # Stop all + delete data
docker compose up -d --build        # Rebuild everything fresh
```
