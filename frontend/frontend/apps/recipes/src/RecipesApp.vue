<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRecipesStore } from './store';
import RecipeDetailModal from './components/RecipeDetailModal.vue';
import type { Recipe } from '@mintkitchen/api';

const store = useRecipesStore();
const newIngredient = ref('');
const selectedRecipe = ref<Recipe | null>(null);

const handleAdd = () => {
  store.addIngredient(newIngredient.value.trim());
  newIngredient.value = '';
};

const OPEN_RECIPE_KEY = 'mk_open_recipe_id';

onMounted(async () => {
  store.loadTransferred();
  store.setupEventListener();

  if (store.recipes.length === 0) {
    await store.search();
  }

  const toOpenId = localStorage.getItem(OPEN_RECIPE_KEY);
  if (toOpenId) {
    localStorage.removeItem(OPEN_RECIPE_KEY);
    const recipe = store.recipes.find((r) => String(r.id) === String(toOpenId));
    if (recipe) {
      selectedRecipe.value = recipe;
    }
  }
});

const difficultyLabels: Record<string, string> = {
  easy: 'Легко', medium: 'Средне', hard: 'Сложно',
};

const difficultyColors: Record<string, string> = {
  easy: 'var(--mk-mint-soft)',
  medium: 'var(--mk-blue-soft)',
  hard: '#FFE5E0',
};
</script>

<template>
  <div style="padding: 48px; display: flex; flex-direction: column; gap: 20px;">
    <h1 style="font-size: 32px; font-weight: 700; color: var(--mk-coffee);">Рецепты</h1>
    <p style="font-size: 14px; color: var(--mk-muted); margin-top: -12px;">
      Собери рецепт из своих ингредиентов
    </p>

    <div style="background: white; border-radius: 20px; padding: 24px; border: 1px solid var(--mk-border); display: flex; flex-direction: column; gap: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 18px; font-weight: 700; color: var(--mk-coffee);">Мои ингредиенты</div>
        <div style="font-size: 13px; color: var(--mk-muted);">{{ store.ingredients.length }} выбрано</div>
      </div>

      <div style="display: flex; flex-wrap: wrap; gap: 10px;">
        <div
          v-for="ing in store.ingredients"
          :key="ing"
          style="display: flex; gap: 10px; align-items: center; padding: 10px 16px; border-radius: 999px; background: var(--mk-mint-soft); color: var(--mk-coffee); font-weight: 600; font-size: 14px;"
        >
          <span>{{ ing }}</span>
          <span style="cursor: pointer; color: var(--mk-coffee-light);" @click="store.removeIngredient(ing)">✕</span>
        </div>
      </div>

      <div style="display: flex; gap: 8px;">
        <input
          v-model="newIngredient"
          @keyup.enter="handleAdd"
          placeholder="Новый ингредиент..."
          style="flex: 1; height: 42px; padding: 0 14px; border: 1px solid var(--mk-border); border-radius: 10px; font-size: 14px; color: var(--mk-coffee);"
        />
        <button
          @click="handleAdd"
          style="padding: 0 18px; background: white; border: 1px solid var(--mk-coffee); color: var(--mk-coffee); border-radius: 10px; font-weight: 600; cursor: pointer;"
        >
          + Добавить
        </button>
      </div>

      <div style="display: flex; align-items: center; gap: 8px; padding-top: 12px; border-top: 1px solid var(--mk-border);">
        <span style="font-size: 13px; color: var(--mk-muted);">Режим фильтра:</span>
        <button
          @click="store.filterMode = 'any'"
          :style="{
            padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            border: '1px solid ' + (store.filterMode === 'any' ? 'var(--mk-coffee)' : 'var(--mk-border)'),
            background: store.filterMode === 'any' ? 'var(--mk-mint)' : 'white',
            color: 'var(--mk-coffee)',
          }"
        >
          Хотя бы 1 совпадает
        </button>
        <button
          @click="store.filterMode = 'all'"
          :style="{
            padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            border: '1px solid ' + (store.filterMode === 'all' ? 'var(--mk-coffee)' : 'var(--mk-border)'),
            background: store.filterMode === 'all' ? 'var(--mk-mint)' : 'white',
            color: 'var(--mk-coffee)',
          }"
        >
          Все совпадают
        </button>
      </div>
    </div>

    <div style="display: flex; justify-content: center;">
      <button
        @click="store.search"
        :disabled="store.loading"
        style="padding: 16px 32px; background: var(--mk-coffee); color: white; border: none; border-radius: 16px; font-size: 16px; font-weight: 600; cursor: pointer; display: flex; gap: 10px; align-items: center;"
      >
        🍳 {{ store.loading ? 'Ищем...' : 'Получить рецепты' }}
      </button>
    </div>

    <div style="display: flex; flex-direction: column; gap: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="font-size: 18px; font-weight: 700; color: var(--mk-coffee);">
          Найденные рецепты
          <span style="font-size: 14px; font-weight: 400; color: var(--mk-muted); margin-left: 10px;">
            {{ store.filteredRecipes.length }} из {{ store.recipes.length }}
          </span>
        </div>

        <select
          v-model="store.sortMode"
          style="padding: 10px 16px; border-radius: 12px; border: 1px solid var(--mk-border); background: white; color: var(--mk-coffee); font-size: 14px; cursor: pointer;"
        >
          <option value="default">Сортировка: по умолчанию</option>
          <option value="difficulty-asc">Сложность: Легко → Сложно</option>
          <option value="difficulty-desc">Сложность: Сложно → Легко</option>
        </select>
      </div>

      <div
        v-for="r in store.filteredRecipes"
        :key="r.id"
        @click="selectedRecipe = r"
        style="background: white; border: 1px solid var(--mk-border); border-radius: 20px; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; gap: 16px;"
      >
        <div style="flex: 1;">
          <div style="font-size: 20px; font-weight: 700; color: var(--mk-coffee); margin-bottom: 6px;">
            🍳 {{ r.title }}
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <span
              :style="{
                padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                background: difficultyColors[r.difficulty] || 'var(--mk-mint-soft)',
                color: 'var(--mk-coffee)',
              }"
            >
              🔥 {{ difficultyLabels[r.difficulty] || r.difficulty }}
            </span>
            <span style="padding: 4px 10px; border-radius: 999px; font-size: 12px; background: var(--mk-mint-soft); color: var(--mk-coffee); font-weight: 600;">
              ⏱ {{ r.cookTime }} мин
            </span>
          </div>
        </div>
        <div style="font-size: 14px; color: var(--mk-coffee-light);">›</div>
      </div>

      <div v-if="store.filteredRecipes.length === 0 && !store.loading" style="color: var(--mk-muted); padding: 20px;">
        {{ store.recipes.length === 0
          ? 'Нажми «Получить рецепты», чтобы увидеть подборку.'
          : 'По выбранным ингредиентам ничего не найдено. Попробуй другой режим фильтра.' }}
      </div>
    </div>

    <RecipeDetailModal
      v-if="selectedRecipe"
      :recipe="selectedRecipe"
      @close="selectedRecipe = null"
    />
  </div>
</template>
