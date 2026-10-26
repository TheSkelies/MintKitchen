import json
import uuid
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.dependencies import require_admin, require_user
from app.db import get_db
from app.models import Ingredient, Recipe, RecipeIngredient, RecipeStep, User
from app.schemas import (
    CookRecipeRequest,
    CookRecipeResult,
    ImportResult,
    RecipeCreate,
    RecipeRead,
    RecipeSuggestionItem,
    RecipeUpdate,
)
from app.services.cooker import execute_cook_recipe
from app.services.importer import import_recipes
from app.services.matcher import get_matching_suggestions, recipe_to_read, search_recipes_by_ingredients

router = APIRouter(prefix="/recipes", tags=["Recipes"])


@router.get("", response_model=list[RecipeRead])
def list_recipes(
    q: str | None = Query(default=None, description="Search by title substring"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[RecipeRead]:
    query = (
        select(Recipe)
        .options(selectinload(Recipe.steps), selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient))
        .order_by(Recipe.title)
    )
    if q:
        query = query.where(Recipe.title.ilike(f"%{q}%"))
    query = query.limit(limit).offset(offset)
    recipes = db.scalars(query).all()
    return [recipe_to_read(r) for r in recipes]


@router.get(
    "/suggestions",
    response_model=list[RecipeSuggestionItem],
    summary="Get recipe suggestions based on user products or ingredients",
)
def get_recipe_suggestions(
    current_user: Annotated[User, Depends(require_user)],
    ingredients: str | None = Query(
        default=None,
        description="Comma-separated list of ingredient names to search by",
    ),
    product_ids: list[int] | None = Query(
        default=None,
        description="Filter specific product IDs from user pantry. If not provided, all user products are used.",
    ),
    prioritize_expiring: bool = Query(
        default=False,
        description="If true, prioritizes recipes that use products expiring soonest.",
    ),
    min_match_ratio: float = Query(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Minimum match ratio (0.0 to 1.0) to include in suggestions.",
    ),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[RecipeSuggestionItem]:
    # Если передан список ингредиентов — фильтруем по ним (с лемматизацией)
    if ingredients:
        ingredient_list = [i.strip() for i in ingredients.split(",") if i.strip()]
        return search_recipes_by_ingredients(
            ingredient_names=ingredient_list,
            db=db,
            prioritize_expiring=prioritize_expiring,
            min_match_ratio=min_match_ratio,
            limit=limit,
        )

    # Иначе — по продуктам пользователя
    if product_ids is not None:
        p_ids_set = set(product_ids)
        available_products = [p for p in current_user.products if p.id in p_ids_set]
    else:
        available_products = list(current_user.products)

    return get_matching_suggestions(
        available_products=available_products,
        db=db,
        prioritize_expiring=prioritize_expiring,
        min_match_ratio=min_match_ratio,
        limit=limit,
    )


@router.get("/{recipe_id}", response_model=RecipeRead)
def get_recipe(recipe_id: str, db: Session = Depends(get_db)) -> RecipeRead:
    query = (
        select(Recipe)
        .where(Recipe.id == recipe_id)
        .options(selectinload(Recipe.steps), selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient))
    )
    recipe = db.scalar(query)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe_to_read(recipe)


@router.post(
    "",
    response_model=RecipeRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create recipe (Admin only)",
)
def create_recipe(
    recipe_in: RecipeCreate,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
) -> RecipeRead:
    recipe_id = recipe_in.id or uuid.uuid4().hex[:12]
    if db.get(Recipe, recipe_id) is not None:
        raise HTTPException(status_code=400, detail=f"Recipe with id '{recipe_id}' already exists")

    recipe = Recipe(
        id=recipe_id,
        title=recipe_in.title,
        description=recipe_in.description,
        prep_time_min=recipe_in.prep_time_min,
        cook_time_min=recipe_in.cook_time_min,
        servings=recipe_in.servings,
        image_url=recipe_in.image_url,
        video_url=recipe_in.video_url,
    )
    db.add(recipe)

    # Add steps
    for step_no, instruction in enumerate(recipe_in.instructions, start=1):
        recipe.steps.append(RecipeStep(step_no=step_no, instruction=instruction))

    # Add ingredients
    for position, ing_data in enumerate(recipe_in.ingredients, start=1):
        ingredient = None
        if ing_data.ingredient_id:
            ingredient = db.get(Ingredient, ing_data.ingredient_id)
        elif ing_data.name_normalized:
            clean_name = ing_data.name_normalized.strip().lower()
            ingredient = db.scalar(select(Ingredient).where(Ingredient.name_normalized == clean_name))
            if ingredient is None:
                ingredient = Ingredient(name_normalized=clean_name, category=ing_data.category)
                db.add(ingredient)
                db.flush()

        if ingredient is None:
            raise HTTPException(
                status_code=400,
                detail=f"Ingredient at position {position} must provide an existing ingredient_id or valid name_normalized",
            )

        recipe.ingredients.append(
            RecipeIngredient(
                ingredient=ingredient,
                position=position,
                amount=ing_data.amount,
                unit=ing_data.unit,
                is_core=ing_data.is_core,
            )
        )

    db.commit()
    db.refresh(recipe)
    return recipe_to_read(recipe)


@router.put("/{recipe_id}", response_model=RecipeRead, summary="Update recipe (Admin only)")
def update_recipe(
    recipe_id: str,
    recipe_in: RecipeUpdate,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
) -> RecipeRead:
    recipe = db.get(Recipe, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")

    if recipe_in.title is not None:
        recipe.title = recipe_in.title
    if recipe_in.description is not None:
        recipe.description = recipe_in.description
    if recipe_in.prep_time_min is not None:
        recipe.prep_time_min = recipe_in.prep_time_min
    if recipe_in.cook_time_min is not None:
        recipe.cook_time_min = recipe_in.cook_time_min
    if recipe_in.servings is not None:
        recipe.servings = recipe_in.servings
    if recipe_in.image_url is not None:
        recipe.image_url = recipe_in.image_url
    if recipe_in.video_url is not None:
        recipe.video_url = recipe_in.video_url

    if recipe_in.instructions is not None:
        recipe.steps.clear()
        for step_no, instruction in enumerate(recipe_in.instructions, start=1):
            recipe.steps.append(RecipeStep(step_no=step_no, instruction=instruction))

    if recipe_in.ingredients is not None:
        recipe.ingredients.clear()
        for position, ing_data in enumerate(recipe_in.ingredients, start=1):
            ingredient = None
            if ing_data.ingredient_id:
                ingredient = db.get(Ingredient, ing_data.ingredient_id)
            elif ing_data.name_normalized:
                clean_name = ing_data.name_normalized.strip().lower()
                ingredient = db.scalar(select(Ingredient).where(Ingredient.name_normalized == clean_name))
                if ingredient is None:
                    ingredient = Ingredient(name_normalized=clean_name, category=ing_data.category)
                    db.add(ingredient)
                    db.flush()

            if ingredient is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Ingredient at position {position} must provide an existing ingredient_id or valid name_normalized",
                )

            recipe.ingredients.append(
                RecipeIngredient(
                    ingredient=ingredient,
                    position=position,
                    amount=ing_data.amount,
                    unit=ing_data.unit,
                    is_core=ing_data.is_core,
                )
            )

    db.commit()
    db.refresh(recipe)
    return recipe_to_read(recipe)


@router.delete("/{recipe_id}", summary="Delete recipe (Admin only)")
def delete_recipe(
    recipe_id: str,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    recipe = db.get(Recipe, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")

    db.delete(recipe)
    db.commit()
    return {"ok": True, "deleted_recipe_id": recipe_id}


@router.post("/import", response_model=ImportResult, summary="Batch import recipes from JSON (Admin only)")
def upload_recipes(
    file: Annotated[UploadFile, File(description="JSON file with a recipes array")],
    on_conflict: Literal["overwrite", "skip"] = Query(
        default="overwrite",
        description="Behavior when recipe ID exists: 'overwrite' or 'skip'",
    ),
    current_admin: Annotated[User, Depends(require_admin)] = None,
    db: Session = Depends(get_db),
) -> dict[str, int]:
    if file.content_type not in {"application/json", "text/json", None}:
        raise HTTPException(status_code=415, detail="Expected a JSON file")
    try:
        payload = json.loads(file.file.read())
        return import_recipes(db, payload, on_conflict=on_conflict)
    except (UnicodeDecodeError, json.JSONDecodeError, KeyError, TypeError, ValueError) as error:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Invalid recipes JSON: {error}") from error


@router.post(
    "/{recipe_id}/cook",
    response_model=CookRecipeResult,
    summary="Mark recipe as cooked and deduct consumed ingredients from user pantry",
)
def cook_recipe(
    recipe_id: str,
    cook_req: CookRecipeRequest = CookRecipeRequest(),
    current_user: Annotated[User, Depends(require_user)] = None,
    db: Session = Depends(get_db),
) -> CookRecipeResult:
    recipe = db.scalar(
        select(Recipe)
        .where(Recipe.id == recipe_id)
        .options(
            selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient).selectinload(Ingredient.synonyms)
        )
    )
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")

    return execute_cook_recipe(
        recipe=recipe,
        user=current_user,
        servings=cook_req.servings,
        db=db,
    )
