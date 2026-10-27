/**
 * Стейт рецептов (Pinia).
 * 
 * Фильтрация по ингредиентам — на бэкенде (с лемматизацией через pymorphy3).
 * На фронте — только сортировка.
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { recipesApi, type Recipe } from '@mintkitchen/api';

// TODO BACKEND: УДАЛИТЬ, когда API заработает. Демо-рецепты для отладки.
const DEMO_RECIPES: Recipe[] = [
  {
    id: 'demo-1', title: 'Омлет с молоком', description: 'Пышный омлет с молоком — классика завтрака.',
    cookTime: 10, servings: 2, difficulty: 'easy',
    ingredients: [{ name: 'Молоко', amount: '100 мл' }, { name: 'Яйца', amount: '3 шт' }, { name: 'Соль', amount: 'щепотка' }],
    steps: ['Взбить яйца с молоком и солью до однородности.', 'Разогреть сковороду, растопить масло.', 'Влить смесь, готовить 3–4 минуты.', 'Сложить омлет пополам, подавать горячим.'],
    videoUrl: 'https://www.youtube.com/embed/9Q8wW2YnQxk', createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-2', title: 'Блины', description: 'Тонкие блины на молоке — идеальные для начинки.',
    cookTime: 25, servings: 4, difficulty: 'medium',
    ingredients: [{ name: 'Мука', amount: '200 г' }, { name: 'Молоко', amount: '500 мл' }, { name: 'Яйца', amount: '2 шт' }, { name: 'Сахар', amount: '1 ст. л' }],
    steps: ['Смешать муку, молоко, яйца и сахар.', 'Дать тесту постоять 15 минут.', 'Жарить по 1–2 минуты с каждой стороны.'],
    videoUrl: 'https://www.youtube.com/embed/q3XG4rHqy7g', createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-3', title: 'Панкейки', description: 'Пышные американские оладьи на завтрак.',
    cookTime: 20, servings: 3, difficulty: 'easy',
    ingredients: [{ name: 'Мука', amount: '200 г' }, { name: 'Молоко', amount: '250 мл' }, { name: 'Яйца', amount: '2 шт' }, { name: 'Мёд', amount: '2 ст. л' }],
    steps: ['Смешать сухие ингредиенты отдельно, жидкие — отдельно.', 'Соединить, перемешать до однородности.', 'Жарить на среднем огне до пузырьков, перевернуть.'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-4', title: 'Сырный суп с грибами', description: 'Сложный, но очень вкусный суп с плавленым сыром.',
    cookTime: 45, servings: 4, difficulty: 'hard',
    ingredients: [{ name: 'Грибы', amount: '300 г' }, { name: 'Плавленый сыр', amount: '200 г' }, { name: 'Картофель', amount: '3 шт' }, { name: 'Лук', amount: '1 шт' }],
    steps: ['Обжарить грибы с луком.', 'Сварить картофель в бульоне.', 'Добавить грибы и сыр, варить до расплавления.', 'Подавать с гренками.'],
    createdAt: new Date().toISOString(),
  },
];

const TRANSFER_KEY = 'mk_transfer_ingredients';

export const useRecipesStore = defineStore('recipes', () => {
  const ingredients = ref<string[]>([]);
  const recipes = ref<Recipe[]>([]);
  const loading = ref(false);
  const filterMode = ref<'any' | 'all'>('any');
  const sortMode = ref<'default' | 'difficulty-asc' | 'difficulty-desc'>('default');

  const loadTransferred = () => {
    try {
      const raw = localStorage.getItem(TRANSFER_KEY);
      if (!raw) return;
      const list: string[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const name of list) {
          if (name && !ingredients.value.includes(name)) {
            ingredients.value.push(name);
          }
        }
        localStorage.removeItem(TRANSFER_KEY);
      }
    } catch (e) {
      console.warn('Не удалось прочитать перенесённые ингредиенты', e);
    }
  };

  const setupEventListener = () => {
    window.addEventListener('mk:transfer-ingredients', ((e: CustomEvent) => {
      const list: string[] = e.detail?.ingredients || [];
      for (const name of list) {
        if (name && !ingredients.value.includes(name)) {
          ingredients.value.push(name);
        }
      }
    }) as EventListener);
  };

  const addIngredient = (name: string) => {
    if (name && !ingredients.value.includes(name)) {
      ingredients.value.push(name);
    }
  };

  const removeIngredient = (name: string) => {
    ingredients.value = ingredients.value.filter((i) => i !== name);
  };

  const search = async () => {
    loading.value = true;
    try {
      const data = await recipesApi.search(ingredients.value);
      recipes.value = data && data.length > 0 ? data : DEMO_RECIPES;
    } catch (e) {
      console.error('Не удалось получить рецепты', e);
      recipes.value = DEMO_RECIPES;
    } finally {
      loading.value = false;
    }
  };

  // Фильтрация — на бэкенде. На фронте только сортировка.
  const filteredRecipes = computed(() => {
    let list = [...recipes.value];

    if (sortMode.value === 'difficulty-asc') {
      const order = { easy: 0, medium: 1, hard: 2 };
      list.sort((a, b) => order[a.difficulty] - order[b.difficulty]);
    } else if (sortMode.value === 'difficulty-desc') {
      const order = { easy: 0, medium: 1, hard: 2 };
      list.sort((a, b) => order[b.difficulty] - order[a.difficulty]);
    }
    return list;
  });

  return {
    ingredients, recipes, loading,
    filterMode, sortMode, filteredRecipes,
    addIngredient, removeIngredient, search,
    loadTransferred, setupEventListener,
  };
});
