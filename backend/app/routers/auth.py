from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db import get_db
from app.models import User
from app.schemas import Token, UserCreate, UserRead, UserRegister, UserUpdate

router = APIRouter(tags=["Auth"])


@router.post("/auth/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)) -> User:
    existing = db.scalar(select(User).where(User.username == user_in.username))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{user_in.username}' is already registered",
        )

    user = User(
        username=user_in.username,
        hashed_password=hash_password(user_in.password),
        role=user_in.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/auth/login", response_model=Token)
async def login(request: Request, db: Session = Depends(get_db)) -> Token:
    content_type = request.headers.get("content-type", "")
    username = None
    password = None

    if "application/json" in content_type:
        body = await request.json()
        username = body.get("username")
        password = body.get("password")
    else:
        form = await request.form()
        username = form.get("username")
        password = form.get("password")

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password are required",
        )

    user = db.scalar(select(User).where(User.username == str(username)))
    if not user or not user.hashed_password or not verify_password(str(password), user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username, "role": user.role}
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        user_id=user.id,
        username=user.username,
    )


@router.get("/auth/me", response_model=UserRead)
def get_me(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    return current_user


@router.patch("/auth/me", response_model=UserRead)
def update_me(
    user_in: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> User:
    """
    Обновление профиля текущего пользователя.
    Любое поле опционально — можно передать только то, что меняется.
    """
    # Проверка: новый username не занят другим пользователем
    if user_in.username and user_in.username != current_user.username:
        existing = db.scalar(select(User).where(User.username == user_in.username))
        if existing is not None and existing.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Username '{user_in.username}' is already taken",
            )
        current_user.username = user_in.username

    # Проверка: новый email не занят
    if user_in.email is not None and user_in.email != current_user.email:
        if user_in.email:
            existing = db.scalar(select(User).where(User.email == user_in.email))
            if existing is not None and existing.id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Email '{user_in.email}' is already taken",
                )
        current_user.email = user_in.email or None

    if user_in.display_name is not None:
        current_user.display_name = user_in.display_name

    if user_in.password:
        current_user.hashed_password = hash_password(user_in.password)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED, tags=["Users"])
def create_user(user_in: UserCreate, db: Session = Depends(get_db)) -> User:
    hashed_pwd = hash_password(user_in.password) if user_in.password else None
    user = User(username=user_in.username, hashed_password=hashed_pwd, role=user_in.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
