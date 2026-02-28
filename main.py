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
