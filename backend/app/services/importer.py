from collections.abc import Iterable
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Ingredient, IngredientSynonym, Recipe, RecipeIngredient, RecipeStep


def import_recipes(
    session: Session, payload: dict[str, Any], on_conflict: str = "overwrite"
) -> dict[str, int]:
    recipes = payload.get("recipes")
    if not isinstance(recipes, list):
        raise ValueError("JSON must contain a 'recipes' array")

    ingredient_cache: dict[str, Ingredient] = {}
    recipes_processed = 0
    recipes_skipped = 0
    recipe_ingredients_processed = 0

    for recipe_data in recipes:
        recipe_id = str(recipe_data["id"])
        recipe = session.get(Recipe, recipe_id)
        if recipe is not None and on_conflict == "skip":
            recipes_skipped += 1
            continue

        if recipe is None:
            recipe = Recipe(id=recipe_id)
            session.add(recipe)

        recipe.title = recipe_data["title"]
        recipe.description = recipe_data.get("description")
        recipe.prep_time_min = recipe_data.get("prep_time_min")
        recipe.cook_time_min = recipe_data.get("cook_time_min")
        recipe.servings = recipe_data.get("servings")
        recipe.image_url = recipe_data.get("image_url")
        recipe.video_url = recipe_data.get("video_url") or None

        recipe.steps.clear()
        recipe.ingredients.clear()
        session.flush()

        for step_no, instruction in enumerate(recipe_data.get("instructions", []), start=1):
            recipe.steps.append(RecipeStep(step_no=step_no, instruction=instruction))

        for position, ingredient_data in enumerate(recipe_data.get("ingredients", []), start=1):
            name = ingredient_data["name_normalized"].strip().lower()
            ingredient = ingredient_cache.get(name)
            if ingredient is None:
                ingredient = session.scalar(select(Ingredient).where(Ingredient.name_normalized == name))
                if ingredient is None:
                    ingredient = Ingredient(name_normalized=name, category=ingredient_data.get("category"))
                    session.add(ingredient)
                ingredient_cache[name] = ingredient

            if ingredient.category is None:
                ingredient.category = ingredient_data.get("category")
            existing_synonyms = {synonym.synonym for synonym in ingredient.synonyms}
            for synonym in _non_empty_strings(ingredient_data.get("synonyms", [])):
                if synonym not in existing_synonyms:
                    ingredient.synonyms.append(IngredientSynonym(synonym=synonym))
                    existing_synonyms.add(synonym)

            recipe.ingredients.append(
                RecipeIngredient(
                    ingredient=ingredient,
                    position=position,
                    amount=ingredient_data["amount"],
                    unit=ingredient_data["unit"],
                    is_core=ingredient_data["is_core"],
                )
            )
            recipe_ingredients_processed += 1
        recipes_processed += 1

    session.commit()
    return {
        "recipes_processed": recipes_processed,
        "recipes_skipped": recipes_skipped,
        "ingredients_processed": len(ingredient_cache),
        "recipe_ingredients_processed": recipe_ingredients_processed,
    }


def _non_empty_strings(values: Iterable[Any]) -> Iterable[str]:
    return (value.strip().lower() for value in values if isinstance(value, str) and value.strip())
