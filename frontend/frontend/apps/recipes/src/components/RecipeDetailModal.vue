<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Recipe } from '@mintkitchen/api';
import { favoritesApi } from '@mintkitchen/api';

const props = defineProps<{ recipe: Recipe }>();
defineEmits<{ close: [] }>();

const isFavorite = ref(false);
const favoriteLoading = ref(false);
const favoriteError = ref<string | null>(null);

// При открытии — проверяем, в избранном ли рецепт
onMounted(async () => {
  try {
    const favs = await favoritesApi.getAll();
    isFavorite.value = favs.some((r) => r.id === props.recipe.id);
  } catch (e) {
    console.warn('Не удалось загрузить избранное', e);
  }
});

const toggleFavorite = async () => {
  favoriteError.value = null;
  favoriteLoading.value = true;
  try {
    if (isFavorite.value) {
      await favoritesApi.remove(props.recipe.id);
      isFavorite.value = false;
    } else {
      await favoritesApi.add(props.recipe.id);
      isFavorite.value = true;
    }
  } catch (e: any) {
    console.warn('Не удалось обновить избранное', e);
    favoriteError.value = 'Не удалось сохранить в избранное';
  } finally {
    favoriteLoading.value = false;
  }
};

const difficultyLabels: Record<string, string> = {
  easy: 'Легко', medium: 'Средне', hard: 'Сложно',
};
</script>

<template>
  <div
    style="position: fixed; inset: 0; background: rgba(80,55,53,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 24px;"
    @click.self="$emit('close')"
  >
    <div style="width: 640px; max-height: 90vh; overflow-y: auto; background: white; border-radius: 24px; box-shadow: 0 24px 60px rgba(105,77,75,0.22);">
      <!-- Хедер -->
      <div style="background: var(--mk-coffee); color: white; padding: 20px 28px; display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 20px; font-weight: 700;">🍳 {{ recipe.title }}</div>
        <button
          @click="$emit('close')"
          style="width: 36px; height: 36px; border-radius: 18px; border: none; background: var(--mk-mint); color: var(--mk-coffee); font-weight: 700; cursor: pointer;"
        >
          ✕
        </button>
      </div>

      <!-- Тело -->
      <div style="padding: 24px 28px; display: flex; flex-direction: column; gap: 16px;">
        <!-- Мета -->
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <span style="padding: 6px 12px; border-radius: 999px; background: var(--mk-mint-soft); color: var(--mk-coffee); font-size: 13px; font-weight: 600;">⏱ {{ recipe.cookTime }} мин</span>
          <span style="padding: 6px 12px; border-radius: 999px; background: var(--mk-blue-soft); color: var(--mk-coffee); font-size: 13px; font-weight: 600;">🍽 {{ recipe.servings }} порции</span>
          <span style="padding: 6px 12px; border-radius: 999px; background: var(--mk-mint-soft); color: var(--mk-coffee); font-size: 13px; font-weight: 600;">🔥 {{ difficultyLabels[recipe.difficulty] || recipe.difficulty }}</span>
        </div>

        <p style="font-size: 14px; color: var(--mk-coffee); line-height: 1.5;">{{ recipe.description }}</p>

        <!-- Ингредиенты -->
        <div>
          <div style="font-size: 11px; font-weight: 700; color: var(--mk-coffee-light); letter-spacing: 1px; margin-bottom: 10px;">ИНГРЕДИЕНТЫ</div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div v-for="(ing, i) in recipe.ingredients" :key="i" style="display: flex; gap: 10px; align-items: center; font-size: 14px; color: var(--mk-coffee);">
              <span style="width: 6px; height: 6px; border-radius: 3px; background: var(--mk-mint);"></span>
              {{ ing.name }} — {{ ing.amount }}
            </div>
          </div>
        </div>

        <!-- Шаги -->
        <div>
          <div style="font-size: 11px; font-weight: 700; color: var(--mk-coffee-light); letter-spacing: 1px; margin-bottom: 10px;">ПРИГОТОВЛЕНИЕ</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div v-for="(s, i) in recipe.steps" :key="i" style="font-size: 14px; color: var(--mk-coffee); line-height: 1.5;">
              {{ i + 1 }}. {{ s }}
            </div>
          </div>
        </div>

        <!-- Видео-рецепт -->
        <div v-if="recipe.videoUrl">
          <div style="font-size: 11px; font-weight: 700; color: var(--mk-coffee-light); letter-spacing: 1px; margin-bottom: 10px;">ВИДЕО-РЕЦЕПТ</div>
          <div style="position: relative; width: 100%; padding-bottom: 56.25%; background: var(--mk-coffee-dark); border-radius: 16px; overflow: hidden;">
            <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
              <div style="width: 76px; height: 76px; border-radius: 38px; background: var(--mk-mint); display: flex; align-items: center; justify-content: center; font-size: 28px; color: var(--mk-coffee); cursor: pointer;">
                ▶
              </div>
            </div>
          </div>
        </div>

        <!-- Ошибка -->
        <div v-if="favoriteError" style="padding: 10px 14px; border-radius: 10px; background: #FFE5E0; color: #8B3A2E; font-size: 13px;">
          {{ favoriteError }}
        </div>

        <!-- Кнопки -->
        <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px;">
          <button
            @click="toggleFavorite"
            :disabled="favoriteLoading"
            :style="{
              padding: '12px 24px',
              borderRadius: 12,
              border: isFavorite ? '1px solid var(--mk-coffee)' : 'none',
              background: isFavorite ? 'white' : 'var(--mk-mint)',
              color: 'var(--mk-coffee)',
              fontWeight: 600,
              cursor: favoriteLoading ? 'wait' : 'pointer',
              opacity: favoriteLoading ? 0.7 : 1,
            }"
          >
            {{ favoriteLoading ? '...' : isFavorite ? '💔 Убрать из избранного' : '⭐ В избранное' }}
          </button>
          <button
            @click="$emit('close')"
            style="padding: 12px 24px; border-radius: 12px; background: white; color: var(--mk-coffee); border: 1px solid var(--mk-border); cursor: pointer;"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
