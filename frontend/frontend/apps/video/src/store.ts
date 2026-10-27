/**
 * Стейт видео-рецептов и категорий (Pinia).
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { videosApi, categoriesApi, type VideoRecipe, type Category } from '@mintkitchen/api';

export const useVideoStore = defineStore('video', () => {
  const categories = ref<Category[]>([]);
  const videos = ref<VideoRecipe[]>([]);
  const selectedCategoryId = ref<string>('');
  const loading = ref(false);

  const loadCategories = async () => {
    try {
      // TODO BACKEND: GET /api/categories
      categories.value = await categoriesApi.getAll();
      if (categories.value.length > 0 && !selectedCategoryId.value) {
        selectedCategoryId.value = categories.value[0].id;
      }
    } catch (e) {
      console.error('Не удалось загрузить категории', e);
    }
  };

  const loadVideos = async () => {
    loading.value = true;
    try {
      // TODO BACKEND: GET /api/videos?categoryId=xxx
      videos.value = await videosApi.getAll(selectedCategoryId.value);
    } catch (e) {
      console.error('Не удалось загрузить видео', e);
    } finally {
      loading.value = false;
    }
  };

  return { categories, videos, selectedCategoryId, loading, loadCategories, loadVideos };
});