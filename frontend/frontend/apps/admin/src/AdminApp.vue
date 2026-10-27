<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { recipesApi, videosApi, categoriesApi, type Category } from '@mintkitchen/api';

// ============================================================
// Состояние модалки «Добавить видео»
// ============================================================
const showVideoModal = ref(false);
const categories = ref<Category[]>([]);
const selectedCategoryId = ref('');
const newCategoryName = ref('');
const videoUrl = ref('');
const videoTitle = ref('');

// ============================================================
// Состояние импорта JSON
// ============================================================
const importing = ref(false);
const importResult = ref<{
  recipes_processed: number;
  recipes_skipped: number;
  ingredients_processed: number;
  recipe_ingredients_processed: number;
} | null>(null);
const importError = ref<string | null>(null);
const onConflict = ref<'overwrite' | 'skip'>('skip');
const fileInput = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  try {
    // TODO BACKEND: GET /api/categories
    categories.value = await categoriesApi.getAll();
    if (categories.value.length) selectedCategoryId.value = categories.value[0].id;
  } catch (e) {
    console.error(e);
  }
});

// ============================================================
// Импорт JSON-файла рецептов
// ============================================================
const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  importing.value = true;
  importResult.value = null;
  importError.value = null;

  try {
    // POST /recipes/import?on_conflict=skip
    // Body: multipart/form-data с файлом
    const result = await recipesApi.importFile(file, onConflict.value);
    importResult.value = result;
  } catch (e: any) {
    importError.value = e?.response?.data?.detail || e?.message || 'Ошибка импорта';
  } finally {
    importing.value = false;
    // Сбрасываем input, чтобы можно было загрузить тот же файл снова
    if (fileInput.value) fileInput.value.value = '';
  }
};

const openFileDialog = () => {
  fileInput.value?.click();
};

// ============================================================
// Добавление видео (модалка)
// ============================================================
const createCategory = async () => {
  if (!newCategoryName.value.trim()) return;
  try {
    const created = await categoriesApi.create({ name: newCategoryName.value });
    categories.value.push(created);
    selectedCategoryId.value = created.id;
    newCategoryName.value = '';
  } catch (e) {
    console.error(e);
  }
};

const submitVideo = async () => {
  if (!videoUrl.value || !selectedCategoryId.value) return;
  try {
    await videosApi.create({
      title: videoTitle.value || videoUrl.value.split('/').pop() || 'Без названия',
      categoryId: selectedCategoryId.value,
      videoUrl: videoUrl.value,
    });
    showVideoModal.value = false;
    videoUrl.value = '';
    videoTitle.value = '';
  } catch (e) {
    console.error(e);
  }
};
</script>

<template>
  <div style="padding: 48px; display: flex; flex-direction: column; gap: 28px;">
    <div>
      <h1 style="font-size: 32px; font-weight: 700; color: var(--mk-coffee);">Админ-панель</h1>
      <p style="font-size: 14px; color: var(--mk-muted); margin-top: 4px;">
        Управление рецептами и видео-контентом
      </p>
    </div>

    <!-- ============================================================
         Секция 1: Импорт рецептов из JSON
    ============================================================ -->
    <div style="background: white; border-radius: 20px; padding: 28px; border: 1px solid var(--mk-border); display: flex; flex-direction: column; gap: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 18px; font-weight: 700; color: var(--mk-coffee);">
            📦 Импорт рецептов из JSON
          </div>
          <div style="font-size: 13px; color: var(--mk-muted); margin-top: 4px;">
            Загрузи файл вида <code>final_recipes_ru.json</code> — рецепты появятся в базе
          </div>
        </div>
      </div>

      <!-- Настройки импорта -->
      <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 13px; color: var(--mk-muted);">При совпадении ID:</span>
          <select
            v-model="onConflict"
            style="padding: 8px 14px; border-radius: 10px; border: 1px solid var(--mk-border); background: white; color: var(--mk-coffee); font-size: 13px; cursor: pointer;"
          >
            <option value="skip">Пропустить (skip)</option>
            <option value="overwrite">Перезаписать (overwrite)</option>
          </select>
        </div>

        <button
          @click="openFileDialog"
          :disabled="importing"
          style="padding: 12px 22px; background: var(--mk-mint); color: var(--mk-coffee); border: none; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; opacity: 1;"
          :style="{ opacity: importing ? 0.6 : 1, cursor: importing ? 'wait' : 'pointer' }"
        >
          {{ importing ? 'Импортируем...' : '📁 Выбрать файл и импортировать' }}
        </button>

        <!-- Скрытый input -->
        <input
          ref="fileInput"
          type="file"
          accept=".json,application/json"
          @change="handleFileSelect"
          style="display: none;"
        />
      </div>

      <!-- Результат импорта -->
      <div
        v-if="importResult"
        style="padding: 16px; border-radius: 12px; background: var(--mk-mint-soft); color: var(--mk-coffee); font-size: 14px; line-height: 1.6;"
      >
        <div style="font-weight: 700; margin-bottom: 6px;">✅ Импорт завершён</div>
        <div>Обработано рецептов: <b>{{ importResult.recipes_processed }}</b></div>
        <div>Пропущено (уже были): <b>{{ importResult.recipes_skipped }}</b></div>
        <div>Добавлено ингредиентов: <b>{{ importResult.ingredients_processed }}</b></div>
        <div>Связок рецепт-ингредиент: <b>{{ importResult.recipe_ingredients_processed }}</b></div>
      </div>

      <!-- Ошибка -->
      <div
        v-if="importError"
        style="padding: 16px; border-radius: 12px; background: #FFE0E0; color: #B00020; font-size: 14px;"
      >
        ❌ {{ importError }}
      </div>

      <!-- Пример формата -->
      <details style="font-size: 13px; color: var(--mk-coffee-light);">
        <summary style="cursor: pointer; font-weight: 600;">Показать ожидаемый формат файла</summary>
        <pre style="margin-top: 10px; padding: 14px; background: var(--mk-bg-blue); border-radius: 10px; overflow-x: auto; font-size: 12px; line-height: 1.5;">{{ `{
  "recipes": [
    {
      "id": "52834",
      "title": "Бефстроганов",
      "description": "...",
      "prep_time_min": 15,
      "cook_time_min": 30,
      "servings": 4,
      "image_url": "https://...",
      "video_url": "https://youtube.com/...",
      "instructions": ["Шаг 1", "Шаг 2"],
      "ingredients": [
        {
          "name_normalized": "говядина",
          "synonyms": ["говяжья вырезка"],
          "amount": 500,
          "unit": "г",
          "is_core": true,
          "category": "мясо"
        }
      ]
    }
  ]
}` }}</pre>
      </details>
    </div>

    <!-- ============================================================
         Секция 2: Добавить видео-рецепт
    ============================================================ -->
    <div style="background: white; border-radius: 20px; padding: 28px; border: 1px solid var(--mk-border); display: flex; flex-direction: column; gap: 14px;">
      <div>
        <div style="font-size: 18px; font-weight: 700; color: var(--mk-coffee);">
          🎬 Видео-рецепты
        </div>
        <div style="font-size: 13px; color: var(--mk-muted); margin-top: 4px;">
          Добавление видео-инструкций по категориям
        </div>
      </div>

      <button
        @click="showVideoModal = true"
        style="align-self: flex-start; padding: 14px 28px; background: var(--mk-mint); color: var(--mk-coffee); border: none; border-radius: 14px; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 6px 20px rgba(154,240,216,0.4);"
      >
        +  Добавить видео-рецепт
      </button>
    </div>

    <!-- ============================================================
         Модалка добавления видео
    ============================================================ -->
    <div
      v-if="showVideoModal"
      style="position: fixed; inset: 0; background: rgba(80,55,53,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000;"
      @click.self="showVideoModal = false"
    >
      <div style="width: 480px; background: white; border-radius: 24px; padding: 32px; box-shadow: 0 24px 60px rgba(105,77,75,0.18); display: flex; flex-direction: column; gap: 16px;">
        <div style="background: var(--mk-coffee); color: white; padding: 14px 16px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; font-weight: 700;">
          <span>Новый видео-рецепт</span>
          <span style="cursor: pointer; color: var(--mk-mint);" @click="showVideoModal = false">✕</span>
        </div>

        <div>
          <label style="font-size: 13px; font-weight: 600; color: var(--mk-coffee);">Название</label>
          <input v-model="videoTitle" placeholder="Куриный суп" style="width: 100%; height: 48px; margin-top: 6px; padding: 0 16px; border-radius: 12px; border: 1px solid var(--mk-border); background: var(--mk-bg-blue); color: var(--mk-coffee);" />
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
          <button @click="showVideoModal = false" style="padding: 12px 24px; border-radius: 12px; border: 1px solid var(--mk-border); background: white; color: var(--mk-coffee); cursor: pointer;">Отмена</button>
          <button @click="submitVideo" style="padding: 12px 24px; border-radius: 12px; border: none; background: var(--mk-mint); color: var(--mk-coffee); font-weight: 600; cursor: pointer;">Сохранить</button>
        </div>
      </div>
    </div>
  </div>
</template>