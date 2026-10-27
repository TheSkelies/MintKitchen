🌿 MintKitchen — Frontend
Микрофронтенд-приложение для учёта продуктов и подбора рецептов.
React (host) + Vue (remotes) через Module Federation.

📋 Требования
Node.js 18+ (скачать)

pnpm 8+ (npm install -g pnpm)

Windows 10/11, macOS или Linux

🚀 Быстрый старт
1. Установка зависимостей
bash
pnpm install
2. Разрешение скриптов сборки (только первый раз)
bash
pnpm approve-builds
В появившемся меню:

Нажми a (выбрать все пакеты)

Нажми Enter

Если спросит Do you approve? — ответь y

3. Сборка всех модулей
bash
pnpm build:all
Дождись, пока все 6 приложений соберутся (будет 6 раз ✓ built in Xms).

4. Запуск
bash
pnpm start
Открой в браузере: http://localhost:5000

📦 Команды
Команда	Что делает
pnpm install	Установить зависимости
pnpm approve-builds	Разрешить скрипты сборки (первый раз)
pnpm build:all	Собрать все 6 приложений
pnpm start	Сборка + запуск (рекомендуется)
pnpm preview:all	Запустить без пересборки
pnpm --filter <name> build	Пересобрать конкретный модуль
🏗 Архитектура
Приложение	Порт	Технология	Роль
host	5000	React	Оболочка (роутинг, сайдбар)
auth	5001	React	Вход, регистрация, профиль
home	5002	React	Продукты
recipes	5003	Vue	Рецепты
video	5004	Vue	Видео-рецепты
admin	5005	Vue	Админ-панель
Стек
React 18 + Vue 3

Vite + @originjs/vite-plugin-federation

TypeScript

Zustand (React-модули) / Pinia (Vue-модули)

React Router v6 (host)

📁 Структура проекта
text
mintkitchen-frontend/
├── apps/
│   ├── host/         # React — оболочка, роутинг
│   ├── auth/         # React — Login, Register, Profile
│   ├── home/         # React — Продукты + модалка
│   ├── recipes/      # Vue — Рецепты + модалка
│   ├── video/        # Vue — Видео-рецепты
│   └── admin/        # Vue — Админ-панель
├── packages/
│   ├── api/          # Типы и API-эндпоинты
│   ├── theme/        # Палитра MintKitchen
│   └── ui/           # Общие UI-компоненты
├── package.json
└── pnpm-workspace.yaml
🔌 API
Бэкенд: FastAPI на http://localhost:8000.

Базовый URL — в packages/api/src/client.ts:

typescript
export const BASE_URL = 'http://localhost:8000';
Если бэкенд не запущен — фронт работает, показывая пустые списки (с предупреждениями в консоли).

Все эндпоинты и типы — в packages/api/src/endpoints.ts и packages/api/src/types.ts.

🎨 Палитра
Все цвета — в packages/theme/src/colors.ts и packages/theme/src/theme.css.

Цвет	HEX	Где используется
Мята	#9AF0D8	Сайдбар, акцентные кнопки
Голубой	#94C8F6	Вторичные акценты
Кофе	#694D4B	Текст, тёмные кнопки
Белый	#FFFFFF	Карточки
Фон	#FAFDFC	Фон страниц
🧪 Проверка работы
Профиль
Открой http://localhost:5000/profile

Нажми ✏️ Редактировать

Измени имя → Сохранить

Имя в карточке должно обновиться

Избранное
Открой http://localhost:5000/recipes

Нажми «Получить рецепты»

Клик по рецепту → ⭐ В избранное

Перейди в /profile → вкладка ⭐ Избранное → рецепт там

Поиск по ингредиентам
Открой http://localhost:5000/recipes

Добавь ингредиент «яйцо» → «Получить рецепты»

Добавь «яйца» → результат должен быть таким же (лемматизация на бэкенде)

Перенос продуктов
Открой http://localhost:5000/ → 🟢 Все продукты

Перейди в /recipes → ингредиенты подтянулись

🛠 Возможные проблемы
Port 5000 is already in use
powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
Белый экран в браузере
Открой F12 → Console — там ошибка.

Проверь, что все 6 портов запущены (терминал должен показать Local: http://localhost:500X/).

Убедись, что pnpm build:all завершился успешно.

ERR_PNPM_IGNORED_BUILDS
bash
pnpm approve-builds
# → a → Enter → y
Cannot find module 'vite'
bash
pnpm install
Ошибки CORS
Бэкенд должен разрешать origins http://localhost:5000 – http://localhost:5005.

🛑 Остановка
В терминале нажми Ctrl + C. На вопрос Завершить выполнение пакетного файла [Y/N]? — ответь Y.

🔁 Следующий запуск
После перезагрузки компьютера:

bash
cd mintkitchen-frontend
pnpm start
Не нужно повторять install и approve-builds.