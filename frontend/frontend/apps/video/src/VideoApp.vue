<script setup lang="ts">
import { onMounted } from 'vue';
import { useVideoStore } from './store';

const store = useVideoStore();

onMounted(() => {
  store.loadCategories();
});
</script>

<template>
  <div style="padding: 48px; display: flex; flex-direction: column; gap: 20px;">
    <h1 style="font-size: 32px; font-weight: 700; color: var(--mk-coffee);">Видео-рецепты</h1>
    <p style="font-size: 14px; color: var(--mk-muted); margin-top: -12px;">Готовь вместе с нами</p>

    <!-- Категория -->
    <div style="display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 14px; color: var(--mk-muted);">Категория:</span>
      <select
        v-model="store.selectedCategoryId"
        style="padding: 10px 16px; border-radius: 12px; border: 1px solid var(--mk-border); background: white; color: var(--mk-coffee); font-size: 14px;"
      >
        <option v-for="c in store.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <!-- Кнопка -->
    <div style="display: flex; justify-content: center;">
      <button
        @click="store.loadVideos"
        :disabled="store.loading"
        style="padding: 16px 32px; background: var(--mk-coffee); color: white; border: none; border-radius: 16px; font-size: 16px; font-weight: 600; cursor: pointer; display: flex; gap: 10px; align-items: center;"
      >
        🎬 {{ store.loading ? 'Загружаем...' : 'Получить рецепты' }}
      </button>
    </div>

    <!-- Сетка видео — 3 в ряд -->
    <div style="display: flex; flex-wrap: wrap; gap: 20px;">
      <div
        v-for="v in store.videos"
        :key="v.id"
        style="width: 300px; background: white; border-radius: 20px; border: 1px solid var(--mk-border); overflow: hidden; box-shadow: 0 8px 24px rgba(105,77,75,0.06);"
      >
        <!-- Превью -->
        <div style="position: relative; width: 300px; height: 170px; background: var(--mk-mint);">
          <div style="position: absolute; left: 128px; top: 62px; width: 56px; height: 56px; border-radius: 28px; background: white; display: flex; align-items: center; justify-content: center; font-size: 20px; color: var(--mk-coffee);">
            ▶
          </div>
        </div>

        <!-- Инфо -->
        <div style="padding: 14px 16px;">
          <div style="font-size: 16px; font-weight: 700; color: var(--mk-coffee);">{{ v.title }}</div>
          <div style="font-size: 12px; color: var(--mk-muted); margin-top: 4px;">⏱ {{ v.duration }}</div>
        </div>
      </div>

      <div v-if="store.videos.length === 0 && !store.loading" style="color: var(--mk-muted); padding: 20px;">
        Выбери категорию и нажми «Получить рецепты».
      </div>
    </div>
  </div>
</template>