from decimal import Decimal

from sqlalchemy.orm import Session

from app.models import Recipe, User
from app.schemas import (
    ConsumedProductItem,
    CookRecipeResult,
    MissingIngredientItem,
)
from app.services.matcher import match_product_with_ingredient


def execute_cook_recipe(
    recipe: Recipe,
    user: User,
    servings: int | None,
    db: Session,
) -> CookRecipeResult:
    servings_to_cook = servings or recipe.servings or 1
    base_servings = recipe.servings or 1
    scale = Decimal(str(servings_to_cook)) / Decimal(str(base_servings))

    consumed_items: list[ConsumedProductItem] = []
    missing_items: list[MissingIngredientItem] = []

    for ri in recipe.ingredients:
        needed_amount = Decimal(str(ri.amount)) * scale
        ing_display = ri.ingredient.name_normalized if ri.ingredient else f"ingredient_{ri.ingredient_id}"

        # Используем match_product_with_ingredient — он уже лемматизирует
        matching_products = [
            p for p in user.products if match_product_with_ingredient(p, ri)
        ]
        matching_products.sort(key=lambda p: (p.expires_at, p.id))

        if not matching_products:
            missing_items.append(
                MissingIngredientItem(
                    name=ing_display,
                    amount_needed=needed_amount,
                    unit=ri.unit,
                )
            )
            continue

        remaining_needed = needed_amount
        for p in matching_products:
            if remaining_needed <= Decimal("0"):
                break

            if p.quantity is not None and p.quantity > Decimal("0"):
                if p.quantity <= remaining_needed:
                    deducted = p.quantity
                    remaining_needed -= p.quantity
                    consumed_items.append(
                        ConsumedProductItem(
                            product_id=p.id,
                            product_name=p.product_name,
                            amount_deducted=deducted,
                            unit=p.unit or ri.unit,
                            remaining_quantity=Decimal("0"),
                            completely_consumed=True,
                        )
                    )
                    user.products.remove(p)
                else:
                    deducted = remaining_needed
                    p.quantity -= remaining_needed
                    remaining_needed = Decimal("0")
                    consumed_items.append(
                        ConsumedProductItem(
                            product_id=p.id,
                            product_name=p.product_name,
                            amount_deducted=deducted,
                            unit=p.unit or ri.unit,
                            remaining_quantity=p.quantity,
                            completely_consumed=False,
                        )
                    )
            else:
                consumed_items.append(
                    ConsumedProductItem(
                        product_id=p.id,
                        product_name=p.product_name,
                        amount_deducted=remaining_needed,
                        unit=p.unit or ri.unit,
                        remaining_quantity=Decimal("0"),
                        completely_consumed=True,
                    )
                )
                user.products.remove(p)
                remaining_needed = Decimal("0")

        if remaining_needed > Decimal("0"):
            missing_items.append(
                MissingIngredientItem(
                    name=ing_display,
                    amount_needed=remaining_needed,
                    unit=ri.unit,
                )
            )

    db.commit()

    msg = (
        f"Блюдо '{recipe.title}' приготовлено ({servings_to_cook} порц.). "
        f"Списано продуктов: {len(consumed_items)}. "
        f"Не хватило ингредиентов: {len(missing_items)}."
    )
    return CookRecipeResult(
        recipe_id=recipe.id,
        recipe_title=recipe.title,
        servings_cooked=servings_to_cook,
        consumed_products=consumed_items,
        missing_ingredients=missing_items,
        message=msg,
    )
