from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


# --- Auth & User Schemas ---

class UserCreate(BaseModel):
    username: str | None = None
    password: str | None = None
    role: str = "user"


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=4, max_length=100)
    role: Literal["user", "admin"] = "user"


class UserLogin(BaseModel):
    username: str
    password: str


class UserUpdate(BaseModel):
    """Обновление профиля. Любое поле опционально."""
    username: str | None = Field(default=None, min_length=3, max_length=50)
    email: str | None = Field(default=None, max_length=255)
    display_name: str | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, min_length=4, max_length=100)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    username: str | None = None


class UserRead(BaseModel):
    id: int
    username: str | None = None
    email: str | None = None
    display_name: str | None = None
    role: str = "user"
    created_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


# --- User Product Schemas ---

class UserProductCreate(BaseModel):
    product_name: str = Field(min_length=1, max_length=255)
    ingredient_id: int | None = None
    quantity: Decimal | None = Field(default=None, ge=0)
    unit: str | None = Field(default=None, max_length=50)
    expires_at: date


class UserProductUpdate(BaseModel):
    product_name: str | None = Field(default=None, min_length=1, max_length=255)
    ingredient_id: int | None = None
    quantity: Decimal | None = Field(default=None, ge=0)
    unit: str | None = Field(default=None, max_length=50)
    expires_at: date | None = None


class UserProductRead(UserProductCreate):
    id: int
    user_id: int
    model_config = ConfigDict(from_attributes=True)


# --- Recipe Schemas ---

class RecipeStepItem(BaseModel):
    step_no: int
    instruction: str
    model_config = ConfigDict(from_attributes=True)


class RecipeIngredientItem(BaseModel):
    ingredient_id: int | None = None
    name_normalized: str | None = None
    amount: Decimal
    unit: str
    is_core: bool = False
    category: str | None = None
    model_config = ConfigDict(from_attributes=True)


class RecipeCreate(BaseModel):
    id: str | None = None
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    prep_time_min: int | None = None
    cook_time_min: int | None = None
    servings: int | None = None
    image_url: str | None = None
    video_url: str | None = None
    instructions: list[str] = Field(default_factory=list)
    ingredients: list[RecipeIngredientItem] = Field(default_factory=list)


class RecipeUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    prep_time_min: int | None = None
    cook_time_min: int | None = None
    servings: int | None = None
    image_url: str | None = None
    video_url: str | None = None
    instructions: list[str] | None = None
    ingredients: list[RecipeIngredientItem] | None = None


class RecipeRead(BaseModel):
    id: str
    title: str
    description: str | None = None
    prep_time_min: int | None = None
    cook_time_min: int | None = None
    servings: int | None = None
    image_url: str | None = None
    video_url: str | None = None
    steps: list[RecipeStepItem] = Field(default_factory=list)
    ingredients: list[RecipeIngredientItem] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)


# --- Favorites ---

class UserFavoriteRecipeRead(BaseModel):
    """Избранный рецепт — с полными данными."""
    recipe: RecipeRead
    favorited_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- Recipe Matching & Cooking Schemas ---

class RecipeSuggestionItem(BaseModel):
    recipe: RecipeRead
    match_ratio: float
    matched_count: int
    total_count: int
    matched_ingredients: list[str]
    missing_ingredients: list[str]
    earliest_product_expiration: date | None = None
    expiring_soon_count: int = 0


class RecipeSearchRequest(BaseModel):
    """Запрос поиска рецептов по ингредиентам."""
    ingredients: list[str] = Field(default_factory=list, description="Список ингредиентов для поиска")
    prioritize_expiring: bool = False
    min_match_ratio: float = Field(default=0.0, ge=0.0, le=1.0)
    limit: int = Field(default=20, ge=1, le=100)


class CookRecipeRequest(BaseModel):
    servings: int | None = Field(default=None, ge=1)


class ConsumedProductItem(BaseModel):
    product_id: int
    product_name: str
    amount_deducted: Decimal | None = None
    unit: str | None = None
    remaining_quantity: Decimal | None = None
    completely_consumed: bool


class MissingIngredientItem(BaseModel):
    name: str
    amount_needed: Decimal
    unit: str


class CookRecipeResult(BaseModel):
    recipe_id: str
    recipe_title: str
    servings_cooked: int | None = None
    consumed_products: list[ConsumedProductItem]
    missing_ingredients: list[MissingIngredientItem]
    message: str


# --- Import & Health ---

class ImportResult(BaseModel):
    recipes_processed: int
    recipes_skipped: int = 0
    ingredients_processed: int
    recipe_ingredients_processed: int


class HealthRead(BaseModel):
    status: str
    