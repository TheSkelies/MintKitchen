/**
 * ============================================================
 * ENDPOINTS — все запросы к API в одном месте
 * ============================================================
 * 
 * Адаптировано под реальный бэкенд (FastAPI, порт 8000).
 */

import { client } from './client';
import type {
  User,
  LoginInput,
  RegisterInput,
  AuthResponse,
  Product,
  ProductInput,
  Recipe,
  VideoRecipe,
  VideoRecipeInput,
  Category,
  CategoryInput,
} from './types';

// ============================================================
// AUTH
// ============================================================
export const authApi = {
  login: (data: LoginInput) =>
    client.post<any>('/auth/login', {
      username: data.email,
      password: data.password,
    }).then(r => {
      const token = r.data.access_token;
      localStorage.setItem('mk_token', token);
      const user: User = {
        id: String(r.data.user_id),
        email: r.data.username || '',
        name: r.data.username || '',
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('mk_user', JSON.stringify(user));
      return { user, token } as AuthResponse;
    }),

  register: (data: RegisterInput) =>
    client.post<any>('/auth/register', {
      username: data.email,
      password: data.password,
      role: 'user',
    }).then(async (r) => {
      const loginResp = await client.post<any>('/auth/login', {
        username: data.email,
        password: data.password,
      });
      const token = loginResp.data.access_token;
      localStorage.setItem('mk_token', token);
      const user: User = {
        id: String(r.data.id),
        email: r.data.username || '',
        name: data.name || r.data.username || '',
        createdAt: r.data.created_at || new Date().toISOString(),
      };
      localStorage.setItem('mk_user', JSON.stringify(user));
      return { user, token } as AuthResponse;
    }),

  me: () =>
    client.get<any>('/auth/me').then(r => {
      const user: User = {
        id: String(r.data.id),
        email: r.data.email || r.data.username || '',
        name: r.data.display_name || r.data.username || '',
        createdAt: r.data.created_at || new Date().toISOString(),
      };
      localStorage.setItem('mk_user', JSON.stringify(user));
      return user;
    }),

  updateMe: (data: { name?: string; email?: string; password?: string }) =>
    client.patch<any>('/auth/me', {
      display_name: data.name,
      email: data.email,
      password: data.password,
    }).then(r => {
      const user: User = {
        id: String(r.data.id),
        email: r.data.email || '',
        name: r.data.display_name || r.data.username || '',
        createdAt: r.data.created_at || new Date().toISOString(),
      };
      localStorage.setItem('mk_user', JSON.stringify(user));
      return user;
    }),

  logout: () => {
    localStorage.removeItem('mk_token');
    localStorage.removeItem('mk_user');
    return Promise.resolve();
  },
};

// ============================================================
// PRODUCTS
// ============================================================
export const productsApi = {
  getAll: () =>
    client.get<any[]>('/users/me/products').then(r =>
      r.data.map(p => ({
        id: String(p.id),
        name: p.product_name,
        expiresAt: p.expires_at,
        createdAt: p.created_at || new Date().toISOString(),
        userId: String(p.user_id),
      } as Product))
    ),

  getSorted: (by: 'expiresAt' | 'name') =>
    productsApi.getAll().then(products => {
      const sorted = [...products];
      if (by === 'expiresAt') {
        sorted.sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
      } else {
        sorted.sort((a, b) => a.name.localeCompare(b.name));
      }
      return sorted;
    }),

  create: (data: ProductInput) =>
    client.post<any>('/users/me/products', {
      product_name: data.name,
      expires_at: data.expiresAt,
      quantity: null,
      unit: null,
    }).then(r => ({
      id: String(r.data.id),
      name: r.data.product_name,
      expiresAt: r.data.expires_at,
      createdAt: r.data.created_at || new Date().toISOString(),
      userId: String(r.data.user_id),
    } as Product)),

  update: (id: string, data: ProductInput) =>
    client.patch<any>(`/users/me/products/${id}`, {
      product_name: data.name,
      expires_at: data.expiresAt,
    }).then(r => ({
      id: String(r.data.id),
      name: r.data.product_name,
      expiresAt: r.data.expires_at,
      createdAt: r.data.created_at || new Date().toISOString(),
      userId: String(r.data.user_id),
    } as Product)),

  remove: (id: string) =>
    client.delete(`/users/me/products/${id}`).then(r => r.data),
};

// ============================================================
// RECIPES
// ============================================================
export const recipesApi = {
  // ОБНОВЛЕНО: отправляем ингредиенты на бэкенд для фильтрации с лемматизацией
  search: async (ingredients: string[]) => {
    try {
      const ingredientsParam = ingredients.map(i => i.trim()).filter(Boolean).join(',');

      const resp = await client.get<any[]>('/recipes/suggestions', {
        params: {
          prioritize_expiring: false,
          limit: 50,
          ...(ingredientsParam ? { ingredients: ingredientsParam } : {}),
        },
      });

      return resp.data.map((item: any) => {
        const r = item.recipe;
        return {
          id: r.id,
          title: r.title,
          description: r.description || '',
          photoUrl: r.image_url || undefined,
          cookTime: r.cook_time_min || r.prep_time_min || 0,
          servings: r.servings || 1,
          difficulty: 'easy' as const,
          ingredients: (r.ingredients || []).map((ing: any) => ({
            name: ing.name_normalized || '',
            amount: `${ing.amount} ${ing.unit || ''}`.trim(),
          })),
          steps: (r.steps || []).map((s: any) => s.instruction),
          videoUrl: r.video_url || undefined,
          createdAt: new Date().toISOString(),
        } as Recipe;
      });
    } catch (e) {
      console.warn('Не удалось получить рецепты', e);
      return [];
    }
  },

  getById: (id: string) =>
    client.get<any>(`/recipes/${id}`).then(r => r.data),

  importFile: (file: File, onConflict: 'overwrite' | 'skip' = 'skip') => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post<any>(
      `/recipes/import?on_conflict=${onConflict}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ).then(r => r.data);
  },

  create: (data: any) =>
    client.post<any>('/recipes', data).then(r => r.data),
};

// ============================================================
// FAVORITES — Избранные рецепты
// ============================================================
export const favoritesApi = {
  getAll: () =>
    client.get<any[]>('/users/me/favorites').then(r =>
      r.data.map((item: any) => {
        const r = item.recipe;
        return {
          id: r.id,
          title: r.title,
          description: r.description || '',
          photoUrl: r.image_url || undefined,
          cookTime: r.cook_time_min || r.prep_time_min || 0,
          servings: r.servings || 1,
          difficulty: 'easy' as const,
          ingredients: (r.ingredients || []).map((ing: any) => ({
            name: ing.name_normalized || '',
            amount: `${ing.amount} ${ing.unit || ''}`.trim(),
          })),
          steps: (r.steps || []).map((s: any) => s.instruction),
          videoUrl: r.video_url || undefined,
          createdAt: new Date().toISOString(),
        } as Recipe;
      })
    ),

  add: (recipeId: string) =>
    client.post(`/users/me/favorites/${recipeId}`).then(r => r.data),

  remove: (recipeId: string) =>
    client.delete(`/users/me/favorites/${recipeId}`).then(r => r.data),
};

// ============================================================
// VIDEOS (заглушки)
// ============================================================
export const videosApi = {
  getAll: (categoryId?: string) => Promise.resolve([] as VideoRecipe[]),
  create: (data: VideoRecipeInput) => Promise.resolve({} as VideoRecipe),
};

// ============================================================
// CATEGORIES (заглушки)
// ============================================================
export const categoriesApi = {
  getAll: () => Promise.resolve([] as Category[]),
  create: (data: CategoryInput) => Promise.resolve({ id: '1', name: data.name } as Category),
};
