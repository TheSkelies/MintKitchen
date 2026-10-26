from datetime import date
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Ingredient, Recipe, RecipeIngredient, UserProduct
from app.schemas import (
    RecipeIngredientItem,
    RecipeRead,
    RecipeStepItem,
    RecipeSuggestionItem,
)
from app.services.lemmatizer import is_match, lemmatize


def recipe_to_read(recipe: Recipe) -> RecipeRead:
    steps = [
        RecipeStepItem(step_no=s.step_no, instruction=s.instruction)
        for s in sorted(recipe.steps, key=lambda s: s.step_no)
    ]
    ingredients = [
        RecipeIngredientItem(
            ingredient_id=ri.ingredient_id,
            name_normalized=ri.ingredient.name_normalized if ri.ingredient else None,
            category=ri.ingredient.category if ri.ingredient else None,
            amount=ri.amount,
            unit=ri.unit,
            is_core=ri.is_core,
        )
        for ri in sorted(recipe.ingredients, key=lambda ri: ri.position)
    ]
    return RecipeRead(
        id=recipe.id,
        title=recipe.title,
        description=recipe.description,
        prep_time_min=recipe.prep_time_min,
        cook_time_min=recipe.cook_time_min,
        servings=recipe.servings,
        image_url=recipe.image_url,
        video_url=recipe.video_url,
        steps=steps,
        ingredients=ingredients,
    )


def match_product_with_ingredient(product: UserProduct, recipe_ingredient: RecipeIngredient) -> bool:
    """Проверяет соответствие продукта ингредиенту рецепта (с лемматизацией)."""
    if product.ingredient_id is not None and product.ingredient_id == recipe_ingredient.ingredient_id:
        return True

    if not product.product_name:
        return False

    if recipe_ingredient.ingredient:
        ing_name = recipe_ingredient.ingredient.name_normalized or ""
        if is_match(product.product_name, ing_name):
            return True

        for syn in recipe_ingredient.ingredient.synonyms:
            if syn.synonym and is_match(product.product_name, syn.synonym):
                return True

    return False


def match_ingredient_name(recipe_ingredient: RecipeIngredient, ingredient_names: list[str]) -> bool:
    """
    Проверяет, соответствует ли ингредиент рецепта одному из переданных имён.
    Использует лемматизацию — «яйцо» и «яйца» совпадут.
    """
    if not recipe_ingredient.ingredient:
        return False

    ing_name = recipe_ingredient.ingredient.name_normalized or ""
    
    # Проверка по имени ингредиента
    for name in ingredient_names:
        if is_match(ing_name, name):
            return True
    
    # Проверка по синонимам
    for syn in recipe_ingredient.ingredient.synonyms:
        if syn.synonym:
            for name in ingredient_names:
                if is_match(syn.synonym, name):
                    return True
    
    return False


def get_matching_suggestions(
    available_products: Sequence[UserProduct],
    db: Session,
    prioritize_expiring: bool = False,
    min_match_ratio: float = 0.0,
    limit: int = 20,
) -> list[RecipeSuggestionItem]:
    """Поиск рецептов по продуктам пользователя."""
    query = select(Recipe).options(
        selectinload(Recipe.steps),
        selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient).selectinload(Ingredient.synonyms),
    )
    recipes = db.scalars(query).all()

    today = date.today()
    suggestions: list[RecipeSuggestionItem] = []

    for recipe in recipes:
        total_count = len(recipe.ingredients)
        if total_count == 0:
            continue

        matched_names: list[str] = []
        missing_names: list[str] = []
        matched_products: list[UserProduct] = []

        for ri in recipe.ingredients:
            ing_name = ri.ingredient.name_normalized if ri.ingredient else f"ingredient_{ri.ingredient_id}"
            matched_p = next((p for p in available_products if match_product_with_ingredient(p, ri)), None)
            if matched_p is not None:
                matched_names.append(ing_name)
                matched_products.append(matched_p)
            else:
                missing_names.append(ing_name)

        matched_count = len(matched_names)
        match_ratio = round(matched_count / total_count, 3)

        if match_ratio < min_match_ratio:
            continue

        earliest_exp: date | None = None
        expiring_soon_count = 0
        if matched_products:
            exp_dates = [p.expires_at for p in matched_products]
            earliest_exp = min(exp_dates)
            expiring_soon_count = sum(1 for d in exp_dates if (d - today).days <= 3)

        suggestions.append(
            RecipeSuggestionItem(
                recipe=recipe_to_read(recipe),
                match_ratio=match_ratio,
                matched_count=matched_count,
                total_count=total_count,
                matched_ingredients=matched_names,
                missing_ingredients=missing_names,
                earliest_product_expiration=earliest_exp,
                expiring_soon_count=expiring_soon_count,
            )
        )

    if prioritize_expiring:
        def expiry_sort_key(item: RecipeSuggestionItem):
            days_to_exp = (item.earliest_product_expiration - today).days if item.earliest_product_expiration else 9999
            return (days_to_exp, -item.match_ratio, -item.matched_count)
        suggestions.sort(key=expiry_sort_key)
    else:
        def match_sort_key(item: RecipeSuggestionItem):
            days_to_exp = (item.earliest_product_expiration - today).days if item.earliest_product_expiration else 9999
            return (-item.match_ratio, -item.matched_count, days_to_exp)
        suggestions.sort(key=match_sort_key)

    return suggestions[:limit]


def search_recipes_by_ingredients(
    ingredient_names: list[str],
    db: Session,
    prioritize_expiring: bool = False,
    min_match_ratio: float = 0.0,
    limit: int = 20,
) -> list[RecipeSuggestionItem]:
    """
    Поиск рецептов по списку названий ингредиентов.
    Лемматизирует и сравнивает — «яйцо» и «яйца» совпадут.
    """
    if not ingredient_names:
        return []

    query = select(Recipe).options(
        selectinload(Recipe.steps),
        selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient).selectinload(Ingredient.synonyms),
    )
    recipes = db.scalars(query).all()

    today = date.today()
    suggestions: list[RecipeSuggestionItem] = []

    for recipe in recipes:
        total_count = len(recipe.ingredients)
        if total_count == 0:
            continue

        matched_names: list[str] = []
        missing_names: list[str] = []

        for ri in recipe.ingredients:
            ing_name = ri.ingredient.name_normalized if ri.ingredient else f"ingredient_{ri.ingredient_id}"
            if match_ingredient_name(ri, ingredient_names):
                matched_names.append(ing_name)
            else:
                missing_names.append(ing_name)

        matched_count = len(matched_names)
        if matched_count == 0:
            continue  # Нет ни одного совпадения — пропускаем

        match_ratio = round(matched_count / total_count, 3)

        if match_ratio < min_match_ratio:
            continue

        suggestions.append(
            RecipeSuggestionItem(
                recipe=recipe_to_read(recipe),
                match_ratio=match_ratio,
                matched_count=matched_count,
                total_count=total_count,
                matched_ingredients=matched_names,
                missing_ingredients=missing_names,
                earliest_product_expiration=None,
                expiring_soon_count=0,
            )
        )

    if prioritize_expiring:
        def expiry_sort_key(item: RecipeSuggestionItem):
            return (-item.match_ratio, -item.matched_count)
        suggestions.sort(key=expiry_sort_key)
    else:
        def match_sort_key(item: RecipeSuggestionItem):
            return (-item.match_ratio, -item.matched_count)
        suggestions.sort(key=match_sort_key)

    return suggestions[:limit]
