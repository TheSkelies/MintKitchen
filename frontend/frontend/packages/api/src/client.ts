import axios from 'axios';

// TODO BACKEND: замени на реальный адрес бэкенда
export const BASE_URL = 'http://localhost:8000';

export const client = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Автоматически добавляем JWT-токен в каждый запрос
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('mk_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================================
// FALLBACK НА СЛУЧАЙ ОТСУТСТВИЯ БЭКЕНДА
// ============================================================
// Пока бэкендер не поднял сервер, запросы будут падать с ERR_NETWORK.
// Этот интерцептор возвращает пустой ответ, чтобы UI не ломался.
//
// TODO BACKEND: когда сервер заработает — УДАЛИ этот интерцептор.
// ============================================================
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNREFUSED' ||
      error.message?.includes('Network Error')
    ) {
      console.warn('[MintKitchen] Бэкенд недоступен:', error.config?.url);

      const method = error.config?.method?.toUpperCase();
      const url = error.config?.url || '';

      // Для GET — пустой массив
      if (method === 'GET') {
        return Promise.resolve({ data: [] as any });
      }
      // Для POST/PATCH — заглушка с id
      if (method === 'POST' || method === 'PATCH') {
        return Promise.resolve({
          data: {
            id: `local-${Date.now()}`,
            product_name: 'Локальный продукт',
            expires_at: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            user_id: 'local',
          } as any,
        });
      }
      // Для DELETE — пустой ответ
      return Promise.resolve({ data: null as any });
    }
    return Promise.reject(error);
  }
);