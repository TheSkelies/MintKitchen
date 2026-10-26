from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.dependencies import require_user
from app.db import get_db
from app.models import Recipe, RecipeIngredient, User, UserFavoriteRecipe
from app.schemas import UserFavoriteRecipeRead
from app.services.matcher import recipe_to_read

router = APIRouter(prefix="/users/me/favorites", tags=["Favorites"])


@router.get("", response_model=list[UserFavoriteRecipeRead])
def list_favorites(
    current_user: Annotated[User, Depends(require_user)],
    db: Session = Depends(get_db),
) -> list[UserFavoriteRecipeRead]:
    """Список избранных рецептов текущего пользователя."""
    query = (
        select(UserFavoriteRecipe)
        .where(UserFavoriteRecipe.user_id == current_user.id)
        .options(
            selectinload(UserFavoriteRecipe.recipe)
            .selectinload(Recipe.steps),
            selectinload(UserFavoriteRecipe.recipe)
            .selectinload(Recipe.ingredients)
            .selectinload(RecipeIngredient.ingredient),
        )
        .order_by(UserFavoriteRecipe.created_at.desc())
    )
    favorites = db.scalars(query).all()
    return [
        UserFavoriteRecipeRead(
            recipe=recipe_to_read(fav.recipe),
            favorited_at=fav.created_at,
        )
        for fav in favorites
    ]


@router.post("/{recipe_id}", status_code=status.HTTP_201_CREATED)
def add_favorite(
    recipe_id: str,
    current_user: Annotated[User, Depends(require_user)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Добавить рецепт в избранное. Если уже есть — 200 (идемпотентно)."""
    recipe = db.get(Recipe, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")

    existing = db.scalar(
        select(UserFavoriteRecipe).where(
            UserFavoriteRecipe.user_id == current_user.id,
            UserFavoriteRecipe.recipe_id == recipe_id,
        )
    )
    if existing is not None:
        return {"ok": True, "already_favorited": True, "recipe_id": recipe_id}

    fav = UserFavoriteRecipe(user_id=current_user.id, recipe_id=recipe_id)
    db.add(fav)
    db.commit()
    return {"ok": True, "already_favorited": False, "recipe_id": recipe_id}


@router.delete("/{recipe_id}")
def remove_favorite(
    recipe_id: str,
    current_user: Annotated[User, Depends(require_user)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Убрать рецепт из избранного. Если нет — 200 (идемпотентно)."""
    fav = db.scalar(
        select(UserFavoriteRecipe).where(
            UserFavoriteRecipe.user_id == current_user.id,
            UserFavoriteRecipe.recipe_id == recipe_id,
        )
    )
    if fav is None:
        return {"ok": True, "was_favorited": False, "recipe_id": recipe_id}

    db.delete(fav)
    db.commit()
    return {"ok": True, "was_favorited": True, "recipe_id": recipe_id}
