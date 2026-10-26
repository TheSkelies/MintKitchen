from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import require_user
from app.db import get_db
from app.models import User, UserProduct
from app.schemas import UserProductCreate, UserProductRead, UserProductUpdate

router = APIRouter(tags=["User Products"])


# --- Clean REST: /users/me/products ---

@router.get("/users/me/products", response_model=list[UserProductRead])
def list_my_products(
    current_user: Annotated[User, Depends(require_user)],
    expiring_before: date | None = Query(default=None),
) -> list[UserProduct]:
    products = current_user.products
    if expiring_before is not None:
        products = [p for p in products if p.expires_at <= expiring_before]
    return sorted(products, key=lambda p: (p.expires_at, p.id))


@router.post(
    "/users/me/products",
    response_model=UserProductRead,
    status_code=status.HTTP_201_CREATED,
)
def add_my_product(
    product: UserProductCreate,
    current_user: Annotated[User, Depends(require_user)],
    db: Session = Depends(get_db),
) -> UserProduct:
    new_product = UserProduct(**product.model_dump())
    current_user.products.append(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product


@router.patch("/users/me/products/{product_id}", response_model=UserProductRead)
def update_my_product(
    product_id: int,
    product_update: UserProductUpdate,
    current_user: Annotated[User, Depends(require_user)],
    db: Session = Depends(get_db),
) -> UserProduct:
    target_product = next((p for p in current_user.products if p.id == product_id), None)
    if target_product is None:
        raise HTTPException(status_code=404, detail="Product not found in your pantry")

    data = product_update.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(target_product, key, value)

    db.commit()
    db.refresh(target_product)
    return target_product


@router.delete("/users/me/products/{product_id}")
def delete_my_product(
    product_id: int,
    current_user: Annotated[User, Depends(require_user)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    target_product = next((p for p in current_user.products if p.id == product_id), None)
    if target_product is None:
        raise HTTPException(status_code=404, detail="Product not found in your pantry")

    current_user.products.remove(target_product)
    db.commit()
    return {"ok": True, "deleted_product_id": product_id}


# --- Backward-compatible endpoints for /users/{user_id}/products ---

@router.get("/users/{user_id}/products", response_model=list[UserProductRead])
def list_user_products(
    user_id: int,
    expiring_before: date | None = Query(default=None),
    current_user: Annotated[User, Depends(require_user)] = None,
    db: Session = Depends(get_db),
) -> list[UserProduct]:
    if current_user and current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden: You can only view your own products")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    query = select(UserProduct).where(UserProduct.user_id == user_id)
    if expiring_before is not None:
        query = query.where(UserProduct.expires_at <= expiring_before)
    query = query.order_by(UserProduct.expires_at, UserProduct.id)
    return list(db.scalars(query))


@router.post(
    "/users/{user_id}/products",
    response_model=UserProductRead,
    status_code=status.HTTP_201_CREATED,
)
def add_user_product(
    user_id: int,
    product: UserProductCreate,
    current_user: Annotated[User, Depends(require_user)] = None,
    db: Session = Depends(get_db),
) -> UserProduct:
    if current_user and current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden: You can only add products to your own pantry")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user_product = UserProduct(**product.model_dump())
    user.products.append(user_product)
    db.commit()
    db.refresh(user_product)
    return user_product


@router.patch("/users/{user_id}/products/{product_id}", response_model=UserProductRead)
def update_user_product(
    user_id: int,
    product_id: int,
    product_update: UserProductUpdate,
    current_user: Annotated[User, Depends(require_user)] = None,
    db: Session = Depends(get_db),
) -> UserProduct:
    if current_user and current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden: You can only modify your own products")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    target_product = next((p for p in user.products if p.id == product_id), None)
    if target_product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    data = product_update.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(target_product, key, value)

    db.commit()
    db.refresh(target_product)
    return target_product


@router.delete("/users/{user_id}/products/{product_id}")
def delete_user_product(
    user_id: int,
    product_id: int,
    current_user: Annotated[User, Depends(require_user)] = None,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if current_user and current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden: You can only delete your own products")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    target_product = next((p for p in user.products if p.id == product_id), None)
    if target_product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    user.products.remove(target_product)
    db.commit()
    return {"ok": True, "deleted_product_id": product_id}
