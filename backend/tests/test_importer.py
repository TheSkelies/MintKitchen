import json
import unittest
from datetime import date
from decimal import Decimal
from pathlib import Path

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.auth import create_access_token, decode_access_token, hash_password, verify_password
from app.config import Settings
from app.db import Base
from app.importer import import_recipes
from app.models import Ingredient, Recipe, RecipeIngredient, User, UserProduct

ROOT = Path(__file__).resolve().parents[1]


class TestRecipeBackend(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)

    def test_imports_recipe_json(self):
        payload = json.loads((ROOT / "final_recipes_ru.json").read_text(encoding="utf-8"))
        with Session(self.engine) as session:
            result = import_recipes(session, payload)
            self.assertEqual(result["recipes_processed"], 29)
            self.assertEqual(session.scalar(select(func.count(Recipe.id))), 29)
            self.assertGreater(session.scalar(select(func.count(Ingredient.id))), 0)
            self.assertEqual(session.scalar(select(func.count(RecipeIngredient.id))), 337)

    def test_import_on_conflict_skip(self):
        payload = {
            "recipes": [
                {
                    "id": "test_1",
                    "title": "Old Title",
                    "instructions": ["Step 1"],
                    "ingredients": [
                        {
                            "name_normalized": "сахар",
                            "amount": 10,
                            "unit": "г",
                            "is_core": False,
                        }
                    ],
                }
            ]
        }
        with Session(self.engine) as session:
            # First import
            res1 = import_recipes(session, payload)
            self.assertEqual(res1["recipes_processed"], 1)

            # Second import with new title and on_conflict="skip"
            payload["recipes"][0]["title"] = "New Title"
            res2 = import_recipes(session, payload, on_conflict="skip")
            self.assertEqual(res2["recipes_skipped"], 1)
            self.assertEqual(res2["recipes_processed"], 0)

            # Ensure old title remained
            recipe = session.get(Recipe, "test_1")
            self.assertEqual(recipe.title, "Old Title")

            # Third import with on_conflict="overwrite"
            res3 = import_recipes(session, payload, on_conflict="overwrite")
            self.assertEqual(res3["recipes_processed"], 1)
            self.assertEqual(res3["recipes_skipped"], 0)
            recipe = session.get(Recipe, "test_1")
            self.assertEqual(recipe.title, "New Title")

    def test_password_hash_and_token(self):
        pwd = "secretpassword123"
        hashed = hash_password(pwd)
        self.assertTrue(verify_password(pwd, hashed))
        self.assertFalse(verify_password("wrongpassword", hashed))

        token = create_access_token({"sub": "42", "role": "admin", "username": "chef_admin"})
        payload = decode_access_token(token)
        self.assertEqual(payload["sub"], "42")
        self.assertEqual(payload["role"], "admin")
        self.assertEqual(payload["username"], "chef_admin")

    def test_user_products_collection(self):
        with Session(self.engine) as session:
            user = User(username="alice", role="user")
            session.add(user)
            session.flush()

            # Add using collection append
            p1 = UserProduct(product_name="молоко", expires_at=date(2026, 10, 1), quantity=Decimal("1.5"), unit="л")
            p2 = UserProduct(product_name="сыр", expires_at=date(2026, 10, 5), quantity=Decimal("200"), unit="г")
            user.products.append(p1)
            user.products.append(p2)
            session.commit()

            self.assertEqual(len(user.products), 2)
            self.assertEqual(p1.user_id, user.id)

            # Update item in collection
            p1.product_name = "молоко 3.2%"
            session.commit()
            self.assertEqual(user.products[0].product_name, "молоко 3.2%")

            # Delete item from collection
            user.products.remove(p2)
            session.commit()
            self.assertEqual(len(user.products), 1)
            self.assertIsNone(session.get(UserProduct, p2.id))

    def test_suggestions_and_cook_recipe(self):
        with Session(self.engine) as session:
            # 1. Create ingredients
            egg = Ingredient(name_normalized="яйцо")
            milk = Ingredient(name_normalized="молоко")
            cheese = Ingredient(name_normalized="сыр")
            session.add_all([egg, milk, cheese])
            session.flush()

            # 2. Create recipe: Omelette (egg, milk, cheese)
            omelette = Recipe(id="omelette_1", title="Омлет", servings=2)
            omelette.ingredients.append(RecipeIngredient(ingredient=egg, position=1, amount=Decimal("2"), unit="шт"))
            omelette.ingredients.append(RecipeIngredient(ingredient=milk, position=2, amount=Decimal("100"), unit="мл"))
            omelette.ingredients.append(RecipeIngredient(ingredient=cheese, position=3, amount=Decimal("50"), unit="г"))
            session.add(omelette)

            # 3. Create user with products: has egg and milk, missing cheese
            user = User(username="cook_user", role="user")
            p_egg = UserProduct(product_name="яйцо", quantity=Decimal("4"), unit="шт", expires_at=date(2026, 10, 2))
            p_milk = UserProduct(product_name="молоко 3.2%", quantity=Decimal("500"), unit="мл", expires_at=date(2026, 9, 30))
            user.products.append(p_egg)
            user.products.append(p_milk)
            session.add(user)
            session.commit()

            # Match ratio: 2 out of 3 = 0.667
            from app.services import execute_cook_recipe, get_matching_suggestions, match_product_with_ingredient
            matched = [ri for ri in omelette.ingredients if any(match_product_with_ingredient(p, ri) for p in user.products)]
            self.assertEqual(len(matched), 2)

            # Test suggestions service
            suggestions = get_matching_suggestions(user.products, session)
            self.assertEqual(len(suggestions), 1)
            self.assertEqual(suggestions[0].match_ratio, 0.667)
            self.assertEqual(suggestions[0].matched_count, 2)
            self.assertIn("яйцо", suggestions[0].matched_ingredients)
            self.assertIn("сыр", suggestions[0].missing_ingredients)

            # 4. Cook recipe service: test deducting quantities
            # Omelette requires 2 eggs, 100 ml milk.
            cook_result = execute_cook_recipe(omelette, user, servings=2, db=session)
            self.assertEqual(len(cook_result.consumed_products), 2)
            self.assertEqual(len(cook_result.missing_ingredients), 1)
            self.assertEqual(cook_result.missing_ingredients[0].name, "сыр")

            self.assertEqual(p_egg.quantity, Decimal("2"))
            self.assertEqual(p_milk.quantity, Decimal("400"))

    def test_settings_postgresql_default_and_override(self):
        # Default should be PostgreSQL
        s = Settings(_env_file=None)
        self.assertTrue(s.database_url.startswith("postgresql://"))

        # Custom DATABASE_URL should be respected
        custom = Settings(_env_file=None, database_url="postgresql://myuser:mypass@db.host:5432/mydb")
        self.assertEqual(custom.database_url, "postgresql://myuser:mypass@db.host:5432/mydb")


if __name__ == "__main__":
    unittest.main()
