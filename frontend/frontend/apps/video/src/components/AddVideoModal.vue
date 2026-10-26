<script setup lang="ts">
import { ref } from 'vue';
import { videosApi, categoriesApi, type Category } from '@mintkitchen/api';

const emit = defineEmits<{ close: []; created: [] }>();

const categories = ref<Category[]>([]);
const selectedCategoryId = ref('');
const newCategoryName = ref('');
const videoUrl = ref('');

// Загружаем категории при открытии
import { onMounted } from 'vue';
onMounted(async () => {
  try {
    // TODO BACKEND: GET /api/categories
    categories.value = await categoriesApi.getAll();
    if (categories.value.length) selectedCategoryId.value = categories.value[0].id;
  } catch (e) { console.error(e); }
});

const createCategory = async () => {
  if (!newCategoryName.value.trim()) return;
  try {
    // TODO BACKEND: POST /api/categories  body: { name }
    const created = await categoriesApi.create({ name: newCategoryName.value });
    categories.value.push(created);
    selectedCategoryId.value = created.id;
    newCategoryName.value = '';
  } catch (e) { console.error(e); }
};

const submit = async () => {
  try {
    // TODO BACKEND: POST /api/videos  body: { title, categoryId, videoUrl }
    // Внимание: поле title подтяни из своего источника (URL или ручной ввод).
    await videosApi.create({
      title: videoUrl.value.split('/').pop() || 'Без названия',
      categoryId: selectedCategoryId.value,
      videoUrl: videoUrl.value,
    });
    emit('created');
    emit('close');
  } catch (e) { console.error(e); }
};
</script>

<template>
  <div
    style="position: fixed; inset: 0; background: rgba(80,55,53,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000;"
    @click.self="$emit('close')"
  >
    <div style="width: 480px; background: white; border-radius: 24px; padding: 32px; box-shadow: 0 24px 60px rgba(105,77,75,0.18); display: flex; flex-direction: column; gap: 16px;">
      <div style="background: var(--mk-coffee); color: white; padding: 14px 16px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; font-weight: 700;">
        <span>Новый видео-рецепт</span>
        <span style="cursor: pointer; color: var(--mk-mint);" @click="$emit('close')">✕</span>
      </div>

      <div>
        <label style="font-size: 13px; font-weight: 600; color: var(--mk-coffee);">Категория</label>
        <select v-model="selectedCategoryId" style="width: 100%; height: 48px; margin-top: 6px; padding: 0 16px; border-radius: 12px; border: 1px solid var(--mk-border); background: var(--mk-bg-blue); color: var(--mk-coffee);">
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>

      <div>
        <label style="font-size: 13px; color: var(--mk-muted);">или создать новую категорию:</label>
        <div style="display: flex; gap: 8px; margin-top: 6px;">
          <input v-model="newCategoryName" placeholder="Название" style="flex: 1; height: 44px; padding: 0 16px; border-radius: 12px; border: 1px solid var(--mk-border); background: var(--mk-bg-blue); color: var(--mk-coffee);" />
          <button @click="createCategory" style="width: 72px; height: 44px; border: none; border-radius: 12px; background: var(--mk-mint); color: var(--mk-coffee); font-weight: 700; cursor: pointer;">+</button>
        </div>
      </div>

      <div>
        <label style="font-size: 13px; font-weight: 600; color: var(--mk-coffee);">Ссылка на видео</label>
        <input v-model="videoUrl" placeholder="https://youtube.com/..." style="width: 100%; height: 48px; margin-top: 6px; padding: 0 16px; border-radius: 12px; border: 1px solid var(--mk-border); background: var(--mk-bg-blue); color: var(--mk-coffee);" />
      </div>

      <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px;">
        <button @click="$emit('close')" style="padding: 12px 24px; border-radius: 12px; border: 1px solid var(--mk-border); background: white; color: var(--mk-coffee); cursor: pointer;">Отмена</button>
        <button @click="submit" style="padding: 12px 24px; border-radius: 12px; border: none; background: var(--mk-mint); color: var(--mk-coffee); font-weight: 600; cursor: pointer;">Сохранить</button>
      </div>
    </div>
  </div>
</template>