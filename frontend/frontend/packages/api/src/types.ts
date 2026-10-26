/**
 * ============================================================
 * TYPES — MintKitchen API
 * ============================================================
 * 
 * ДЛЯ БЭКЕНДЕРА: 
 * Это контракт между фронтендом и бэкендом.
 * Все ответы API должны соответствовать этим типам.
 * Если тип не совпадает — фронт сломается.
 */

// ---------- Пользователь ----------
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: string; // ISO 8601: '2025-03-15T10:00:00Z'
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string; // JWT
}

// ---------- Продукт ----------
export interface Product {
  id: string;
  name: string;
  expiresAt: string; // ISO 8601: '2025-05-12'
  createdAt: string;
  userId: string;    // владелец продукта
}

export interface ProductInput {
  name: string;
  expiresAt: string;
}

// ---------- Рецепт (письменный) ----------
export interface RecipeIngredient {
  name: string;
  amount: string;    // '100 мл', '3 шт'
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  photoUrl?: string;
  cookTime: number;         // минуты
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: RecipeIngredient[];
  steps: string[];
  videoUrl?: string;        // ссылка на видео-рецепт (YouTube)
  createdAt: string;
}

// ---------- Видео-рецепт ----------
export interface VideoRecipe {
  id: string;
  title: string;
  categoryId: string;
  videoUrl: string;         // ссылка на видео
  duration: string;         // '12:40'
  thumbnailUrl?: string;
  createdAt: string;
}

export interface VideoRecipeInput {
  title: string;
  categoryId: string;
  videoUrl: string;
}

// ---------- Категория ----------
export interface Category {
  id: string;
  name: string;             // 'Супы', 'Макароны'
  icon?: string;            // emoji
}

export interface CategoryInput {
  name: string;
  icon?: string;
}

// ---------- Общие ответы ----------
export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
}