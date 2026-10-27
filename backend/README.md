# SPO Products Backend

Полнофункциональный backend для каталога рецептов и учёта продуктов пользователя с ролевой моделью доступа (RBAC):

- **FastAPI** для HTTP API и автогенерации OpenAPI/Swagger.
- **SQLAlchemy 2.x** для реляционной базы (PostgreSQL по умолчанию, настраивается через `DATABASE_URL` в `.env`).
- **Аутентификация по JWT и PBKDF2-SHA256**: безопасное хеширование паролей со солью и stateless Bearer-токены.
- **Ролевая модель доступа**:
  - `user` (по умолчанию) — управление своими продуктами (`/users/me/products`).
  - `admin` — создание, редактирование, удаление и пакетный импорт рецептов.

## Быстрый запуск

1. **Настройка переменных окружения (`.env`)**:
   Скопируйте пример файла конфигурации или отредактируйте `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
   В `.env` укажите параметры подключения к базе данных PostgreSQL:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mintkitchen
   ```

2. **Установка зависимостей и запуск**:
```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

Swagger UI документация доступна по адресу: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).
В Swagger UI можно нажать кнопку **Authorize** и ввести логин/пароль для автоматического использования JWT-токена.

---

## Архитектура и структура проекта

Проект организован по слоистой модульной архитектуре (Layered / Router-Service pattern):

```text
app/
├── core/                  # Безопасность, токены и внедрение зависимостей (DI)
│   ├── security.py        # PBKDF2 хеширование паролей, генерация и валидация JWT
│   └── dependencies.py    # get_current_user, require_admin, require_user
├── db.py                  # Инициализация SQLAlchemy Engine, SessionLocal, get_db
├── config.py              # Настройки окружения (Pydantic Settings)
├── models.py              # Реляционные модели БД (User, Recipe, Ingredient, UserProduct)
├── schemas.py             # Pydantic схемы (DTO) для валидации запросов и ответов
├── services/              # Чистая бизнес-логика (не зависящая напрямую от HTTP)
│   ├── importer.py        # Парсинг и импорт рецептов из JSON
│   ├── matcher.py         # Алгоритм подбора рецептов по продуктам и срокам годности
│   └── cooker.py          # Логика списания продуктов из холодильника при готовке
├── routers/               # Тонкие эндпоинты FastAPI (APIRouter)
│   ├── auth.py            # /auth/register, /auth/login, /auth/me, /users
│   ├── recipes.py         # /recipes (CRUD, import, /suggestions, /{id}/cook)
│   ├── products.py        # /users/me/products, /users/{id}/products
│   └── system.py          # /health
└── main.py                # Точка входа: сборка FastAPI приложения и роутеров
```

---

## 1. Аутентификация и пользователи (`/auth`)

### Регистрация (`POST /auth/register`)
По умолчанию создаётся пользователь с ролью `user`. Также можно явно передать `role: "admin"`:
```json
POST /auth/register
{
  "username": "ivan",
  "password": "mypassword123",
  "role": "user"
}
```

### Вход (`POST /auth/login`)
Принимает JSON или Form-данные (OAuth2 form). Возвращает токен:
```json
POST /auth/login
{
  "username": "ivan",
  "password": "mypassword123"
}
```
Ответ:
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "role": "user",
  "user_id": 1,
  "username": "ivan"
}
```

### Текущий профиль (`GET /auth/me`)
Требует заголовок `Authorization: Bearer <token>`.

---

## 2. Управление рецептами (`/recipes`)

* Чтение рецептов доступно всем (`GET /recipes`, `GET /recipes/{id}`).
* Модификация, создание, удаление и импорт защищены ролью **`admin`**.

### Добавление рецепта (`POST /recipes`) — *Только Admin*
```json
POST /recipes
Authorization: Bearer <ADMIN_TOKEN>
{
  "title": "Омлет с сыром",
  "description": "Быстрый сытный завтрак",
  "prep_time_min": 5,
  "cook_time_min": 10,
  "servings": 2,
  "instructions": [
    "Взбейте яйца с молоком и солью.",
    "Вылейте на горячую сковороду и посыпьте тертым сыром.",
    "Сложите пополам и подавайте."
  ],
  "ingredients": [
    {
      "name_normalized": "яйцо",
      "amount": 3,
      "unit": "шт",
      "is_core": true,
      "category": "яйца"
    },
    {
      "name_normalized": "сыр",
      "amount": 50,
      "unit": "г",
      "is_core": true,
      "category": "молочное"
    }
  ]
}
```

### Изменение рецепта (`PUT /recipes/{recipe_id}`) — *Только Admin*
Позволяет обновить любые поля, список шагов или ингредиентов.

### Удаление рецепта (`DELETE /recipes/{recipe_id}`) — *Только Admin*

### Импорт рецептов из JSON (`POST /recipes/import`) — *Только Admin*
Параметр `on_conflict` управляет поведением при совпадении ID:
* `on_conflict=overwrite` *(по умолчанию)* — перезаписывает поля, шаги и ингредиенты существующего рецепта.
* `on_conflict=skip` — пропускает уже существующие рецепты (считает их в `recipes_skipped`).

```powershell
curl.exe -X POST "http://127.0.0.1:8000/recipes/import?on_conflict=skip" `
  -H "Authorization: Bearer <ADMIN_TOKEN>" `
  -F "file=@final_recipes_ru.json;type=application/json"
```

Ответ:
```json
{
  "recipes_processed": 0,
  "recipes_skipped": 29,
  "ingredients_processed": 0,
  "recipe_ingredients_processed": 0
}
```

---

## 3. Подбор рецептов по продуктам (`GET /recipes/suggestions`)

Ручка анализирует продукты в холодильнике пользователя и рассчитывает релевантность по формуле:
$$\text{match\_ratio} = \frac{\text{кол-во имеющихся ингредиентов}}{\text{всего ингредиентов в рецепте}}$$

Доступно авторизованным пользователям (`user`, `admin`).

### Параметры запроса:
* `product_ids` *(опционально)*: список ID конкретных продуктов из холодильника (например, `?product_ids=1&product_ids=3`). По умолчанию берутся **все** продукты пользователя.
* `prioritize_expiring` *(bool, по умолчанию `false`)*:
  * Если `true`, рецепты ранжируются по тому, **как скоро испортятся продукты** (первыми идут рецепты, спасающие продукты с ближайшим сроком годности `expires_at`).
  * Если `false`, рецепты сортируются по проценту совпадения (`match_ratio` от 1.0 к 0.0).
* `min_match_ratio` *(float, по умолчанию `0.0`)*: минимальный порог совпадения (например, `0.5`, чтобы показывать рецепты, где есть хотя бы половина ингредиентов).
* `limit` *(int, по умолчанию `20`)*.

### Пример запроса:
```
GET /recipes/suggestions?prioritize_expiring=true&min_match_ratio=0.3
Authorization: Bearer <USER_TOKEN>
```

### Пример ответа:
```json
[
  {
    "match_ratio": 0.75,
    "matched_count": 3,
    "total_count": 4,
    "matched_ingredients": ["яйцо", "молоко", "соль"],
    "missing_ingredients": ["сыр"],
    "earliest_product_expiration": "2026-09-30",
    "expiring_soon_count": 1,
    "recipe": {
      "id": "omelette_1",
      "title": "Омлет",
      "servings": 2,
      ...
    }
  }
]
```

---

## 4. Приготовление рецепта и списание продуктов (`POST /recipes/{recipe_id}/cook`)

Отмечает, что рецепт приготовлен, и автоматически обновляет/списывает продукты из холодильника пользователя:
* Учитывает масштаб порций (`servings`).
* Списывает в первую очередь те продукты, срок годности которых наступает раньше всего.
* Если продукта хватает с запасом — уменьшает поле `quantity` (`PATCH`).
* Если продукт полностью израсходован (или количество не было указано) — **автоматически удаляет его из коллекции холодильника** (`DELETE`).
* Возвращает список фактически списанных продуктов и список недостающих ингредиентов.

### Пример запроса:
```json
POST /recipes/omelette_1/cook
Authorization: Bearer <USER_TOKEN>
{
  "servings": 4
}
```

### Пример ответа:
```json
{
  "recipe_id": "omelette_1",
  "recipe_title": "Омлет",
  "servings_cooked": 4,
  "consumed_products": [
    {
      "product_id": 12,
      "product_name": "Яйца С0",
      "amount_deducted": 4.0,
      "unit": "шт",
      "remaining_quantity": 2.0,
      "completely_consumed": false
    },
    {
      "product_id": 15,
      "product_name": "Молоко 3.2%",
      "amount_deducted": 200.0,
      "unit": "мл",
      "remaining_quantity": 0.0,
      "completely_consumed": true
    }
  ],
  "missing_ingredients": [
    {
      "name": "сыр",
      "amount_needed": 100.0,
      "unit": "г"
    }
  ],
  "message": "Блюдо 'Омлет' приготовлено (4 порц.). Списано продуктов: 2. Не хватило ингредиентов: 1."
}
```

---

## 5. Продукты пользователя (`/users/me/products`)

Все ручки защищены ролью **`user`** (или `admin`). Каждый пользователь работает со **своей коллекцией продуктов**.

### Добавить продукт в свой холодильник (`POST /users/me/products`)
```json
POST /users/me/products
Authorization: Bearer <USER_TOKEN>
{
  "product_name": "Молоко 3.2%",
  "quantity": 1.0,
  "unit": "л",
  "expires_at": "2026-10-05"
}
```

### Список своих продуктов (`GET /users/me/products`)
Поддерживает фильтр `expiring_before`:
```
GET /users/me/products?expiring_before=2026-10-01
Authorization: Bearer <USER_TOKEN>
```

### Изменить свой продукт (`PATCH /users/me/products/{product_id}`)
```json
PATCH /users/me/products/1
Authorization: Bearer <USER_TOKEN>
{
  "quantity": 0.5,
  "expires_at": "2026-10-08"
}
```

### Удалить свой продукт (`DELETE /users/me/products/{product_id}`)
```
DELETE /users/me/products/1
Authorization: Bearer <USER_TOKEN>
```
Товар удаляется непосредственно из коллекции пользователя через связь `user.products.remove()`.

---

## Запуск тестов

```powershell
pytest
```
Тесты покрывают импорт с логикой `on_conflict` (`overwrite` / `skip`), генерацию и валидацию паролей/токенов, а также операции с коллекцией `user.products`.
