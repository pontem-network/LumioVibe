# LumioVibe - Design Document

> Vibe Coding Tool для создания Move смарт-контрактов и фронтенда на Lumio Network

## Статус проекта

| Фаза | Статус | Прогресс |
|------|--------|----------|
| Фаза 1: Microagents | 🟢 Done | 100% |
| Фаза 2: Project Templates | 🟢 Done | 100% |
| Фаза 3: Runtime с Lumio CLI | 🟢 Done | 100% |
| Фаза 4: Workflow Enforcement | 🟢 Done | 100% |
| Фаза 5: Browser Integration | 🔴 Not Started | 0% |

**Легенда:** 🔴 Not Started | 🟡 In Progress | 🟢 Done

---

## 1. Обзор продукта

### 1.1 Цель
Создать специализированный AI-инструмент для vibe coding, который позволяет разработчикам создавать Move смарт-контракты и React фронтенды для Lumio Network через естественный язык.

### 1.2 Ограничения скоупа
Инструмент **НЕ** является универсальным AI-ассистентом. Он специализирован на:
- ✅ Move смарт-контракты для Lumio
- ✅ React фронтенды с Pontem Wallet интеграцией
- ❌ Другие блокчейны (Ethereum, Solana, etc.)
- ❌ Бэкенд серверы
- ❌ Мобильные приложения

### 1.3 Ключевые принципы
1. **Итеративность** - агент не останавливается на ошибках, а исправляет их
2. **Полнота** - каждый контракт получает работающий фронтенд
3. **Предсказуемость** - фиксированный стек технологий
4. **Документирование** - автоматическая страница с описанием контракта

---

## 2. Технический стек

### 2.1 Lumio/Move
| Компонент | Значение | Примечания |
|-----------|----------|------------|
| CLI | `lumio` v7.8.0 | Fork Aptos CLI |
| Testnet API | `https://api.testnet.lumio.io/v1` | Chain ID: 2 |
| Faucet | `https://faucet.testnet.lumio.io` | |
| Native Coin | `0x1::lumio_coin::LumioCoin` | Вместо AptosCoin |
| Account Module | `0x1::lumio_account` | Вместо aptos_account |
| Framework | Загружается автоматически через `lumio` | |

### 2.2 Frontend
| Компонент | Значение |
|-----------|----------|
| Framework | React 19 |
| Build Tool | Vite 6 |
| Language | TypeScript 5.x |
| Styling | TailwindCSS 4.x |
| Wallet | Pontem Wallet |
| Port | Автоопределение (5173+) |

### 2.3 Решения по архитектуре
| Вопрос | Решение | Обоснование |
|--------|---------|-------------|
| Network | Только Testnet | Безопасно для vibe coding, нет риска потери средств |
| Wallet | Pontem Wallet | Хорошая интеграция с Move экосистемой |
| Контракты | Один проект, несколько модулей | Гибкость без усложнения структуры |
| Git | Автоматический init + .gitignore | Готовый проект для version control |

---

## 3. Архитектура

### 3.0 Принципы взаимодействия с пользователем

**Explicit Assumptions Pattern:**
Агент не угадывает требования молча. Вместо этого:
1. Собирает базовые требования
2. Формулирует ЯВНЫЕ предположения
3. Показывает их пользователю для корректировки
4. Получает ЯВНОЕ подтверждение
5. Только потом начинает писать код

**Checkpoints Before Irreversible Actions:**
- Перед deploy контракта - обязательный checkpoint
- Пользователь должен явно подтвердить что будет задеплоено

**Smart Retry:**
- После 2-х неудачных попыток - спросить пользователя вместо бесконечного цикла
- Предложить альтернативные подходы

### 3.1 Структура генерируемого проекта

```
project-name/
├── contract/                      # Move контракт
│   ├── Move.toml                  # Конфигурация пакета
│   ├── sources/
│   │   └── main.move              # Основной код контракта
│   └── build/                     # Артефакты компиляции
│       └── project-name/
│           └── bytecode_modules/
│
├── frontend/                      # React приложение
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── pages/
│       │   ├── Home.tsx           # Главная страница
│       │   └── Documentation.tsx  # Описание контракта
│       ├── components/
│       │   └── ...                # UI компоненты
│       └── hooks/
│           ├── usePontem.ts       # Хук для Pontem Wallet
│           └── useContract.ts     # Хук для работы с контрактом
│
└── spec.md                        # Спецификация проекта
```

### 3.2 Workflow агента (v4.0 - с Checkpoints)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER REQUEST                                  │
│         "Создай контракт для NFT маркетплейса"                      │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 0: DISCOVERY & ASSUMPTIONS                                    │
│                                                                      │
│  Step 0.1: Gather basic requirements                                │
│  - Project name, core features, users                               │
│                                                                      │
│  Step 0.2: Generate ASSUMPTIONS document                            │
│  - Data structures with types                                       │
│  - Access control model                                             │
│  - Functions with signatures                                        │
│  - Edge cases & error handling                                      │
│  - Frontend components                                              │
│  - ❓ Questions for user                                            │
│                                                                      │
│  Step 0.3: ⏸️ CHECKPOINT - Wait for user confirmation               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Show assumptions → User confirms OR corrects               │    │
│  │  Loop until explicit "confirmed" / "да" / "ok"              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Step 0.4: Generate spec.md from confirmed assumptions              │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 1: ENVIRONMENT SETUP                                          │
│                                                                      │
│  bash /openhands/templates/scaffold-fast.sh {project_name}          │
│  - Creates account, funds from faucet                               │
│  - Sets up project with Move.toml                                   │
│  - Compiles example (caches framework)                              │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 2: IMPLEMENT CONTRACT                                         │
│                                                                      │
│  Write contract based on confirmed spec.md                          │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  SMART COMPILE LOOP                                         │    │
│  │                                                             │    │
│  │  Attempt 1-2: Fix and retry                                 │    │
│  │  Attempt 3: ⏸️ ASK USER: "Error is X. Try approach Y?"     │    │
│  │  Attempt 4-5: Only with user's explicit direction           │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 2.5: ⏸️ PRE-DEPLOY CHECKPOINT                                │
│                                                                      │
│  Show user exactly what will be deployed:                           │
│  - Module name                                                      │
│  - All public functions                                             │
│  - All data structures                                              │
│                                                                      │
│  "This will be deployed to Lumio Testnet (IRREVERSIBLE)."          │
│  Wait for explicit "deploy" / "да" / "proceed"                      │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 3: DEPLOY CONTRACT                                            │
│                                                                      │
│  lumio move publish --package-dir . --assume-yes                    │
│  Save contract address to spec.md                                   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 4: FRONTEND                                                   │
│                                                                      │
│  Build React app with Pontem Wallet, integrate with contract        │
│  Run dev server, smart retry: ask user after 2 failures             │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           DONE                                       │
│                                                                      │
│  ✅ User confirmed assumptions (Phase 0)                            │
│  ✅ User approved deployment (Phase 2.5)                            │
│  ✅ Contract deployed to Lumio Testnet                              │
│  ✅ Frontend running on http://localhost:5173                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Детальный план реализации

### Фаза 1: Microagents и System Prompt

**Цель:** Дать агенту знания о Lumio/Move без изменения кода.

#### Задачи:

- [ ] **1.1** Создать `.openhands/microagents/lumio-overview.md`
  - Что такое Lumio (fork Aptos)
  - Отличия от Aptos (lumio_coin, lumio_account)
  - Testnet endpoints

- [ ] **1.2** Создать `.openhands/microagents/move-syntax.md`
  - Базовый синтаксис Move
  - Структуры, ресурсы, abilities
  - Entry functions vs View functions
  - Типичные паттерны

- [ ] **1.3** Создать `.openhands/microagents/lumio-cli.md`
  - Команды lumio CLI
  - lumio move init/compile/test/publish
  - lumio account fund-with-faucet
  - Профили и конфигурация

- [ ] **1.4** Создать `.openhands/microagents/frontend-template.md`
  - Структура React проекта
  - Интеграция с wallet adapter
  - Страница Documentation

- [ ] **1.5** Создать `.openhands/microagents/workflow.md`
  - Полный workflow агента
  - Правила retry при ошибках
  - Критерии успеха каждой фазы

#### Критерий завершения:
Агент может создать простой Move контракт, задеплоить его и сгенерировать клиент, следуя инструкциям из microagents.

---

### Фаза 2: Project Templates

**Цель:** Готовые шаблоны для быстрого старта проектов.

#### Задачи:

- [ ] **2.1** Создать `templates/move/Move.toml.template`
  - Правильные зависимости для Lumio
  - Плейсхолдеры для имени и адреса

- [ ] **2.2** Создать `templates/move/sources/main.move.template`
  - Базовая структура модуля
  - Примеры entry/view функций
  - Комментарии-инструкции

- [ ] **2.3** Создать `templates/frontend/` полный шаблон
  - Vite config
  - TailwindCSS config
  - Wallet adapter setup
  - Базовые компоненты
  - Страница Documentation.tsx

#### Критерий завершения:
Шаблоны можно скопировать и сразу запустить (после подстановки значений).

---

### Фаза 3: Runtime с Lumio CLI

**Цель:** Docker runtime с установленным Lumio CLI.

#### Задачи:

- [ ] **3.1** Изучить текущий Dockerfile runtime
- [ ] **3.2** Добавить установку Lumio CLI
  - Скачать бинарник или собрать
  - Добавить в PATH
- [ ] **3.3** Настроить lumio профиль для testnet
  - Создать ~/.lumio/config.yaml
  - Добавить testnet endpoints
- [ ] **3.4** Добавить Node.js 22 и pnpm
- [ ] **3.5** Протестировать runtime
  - lumio move init
  - lumio move compile
  - lumio move publish
  - pnpm create vite

#### Критерий завершения:
В Docker runtime работают все команды lumio и pnpm.

---

### Фаза 4: Workflow Enforcement

**Цель:** Агент автоматически следует workflow и не сдаётся при ошибках.

#### Задачи:

- [ ] **4.1** Изучить как работает system prompt в CodeActAgent
- [ ] **4.2** Создать специализированный prompt для LumioVibe
  - Строгие инструкции по workflow
  - Правила retry
  - Обязательные шаги (тесты, документация)
- [ ] **4.3** Опционально: создать MoveDevAgent наследуя от CodeActAgent
  - Переопределить get_tools() если нужны специальные tools
- [ ] **4.4** Добавить валидацию результатов
  - Проверка что контракт задеплоен
  - Проверка что тесты прошли
  - Проверка что фронтенд собирается

#### Критерий завершения:
Агент автоматически проходит все фазы workflow и retry при ошибках.

---

### Фаза 5: Browser Integration

**Цель:** Автоматически открывать фронтенд в встроенном браузере.

#### Задачи:

- [ ] **5.1** Изучить как работает BrowserTool в OpenHands
- [ ] **5.2** Реализовать автоопределение свободного порта
- [ ] **5.3** Интегрировать с запуском vite dev server
- [ ] **5.4** Автоматически открывать URL в браузере агента
- [ ] **5.5** Отображать URL пользователю для внешнего доступа

#### Критерий завершения:
После запуска фронтенда браузер агента автоматически открывает приложение.

---

## 5. Тестовые сценарии

### Сценарий 1: Простой Counter
```
User: "Создай контракт счётчика с функциями increment и get_count"

Expected:
- Contract: counter модуль с resource Counter, entry increment(), view get_count()
- Frontend: UI с кнопкой Increment и отображением текущего значения
```

### Сценарий 2: NFT Collection
```
User: "Создай контракт для NFT коллекции с возможностью mint и transfer"

Expected:
- Contract: nft модуль с Token struct, mint(), transfer()
- Frontend: Галерея NFT, формы для mint и transfer
```

### Сценарий 3: Simple DEX
```
User: "Создай простой DEX для обмена двух токенов"

Expected:
- Contract: dex модуль с Pool struct, add_liquidity(), swap()
- Frontend: Swap interface, liquidity management
```

---

## 6. Риски и митигация

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| @aptos-labs/ts-sdk несовместим с некоторыми Lumio функциями | Средняя | Высокое | Создать wrapper/adapter |
| Агент застревает в бесконечном retry loop | Средняя | Среднее | Добавить max_retries (5) |
| Lumio testnet нестабилен | Низкая | Высокое | Fallback на локальную ноду |
| Размер Docker image слишком большой | Средняя | Низкое | Multi-stage build, оптимизация |

---

## 7. Метрики успеха

1. **Time to First Deploy** - время от запроса пользователя до задеплоенного контракта
   - Target: < 5 минут для простого контракта

2. **Success Rate** - % успешных генераций без ручного вмешательства
   - Target: > 80%

3. **Retry Count** - среднее количество retry до успеха
   - Target: < 3

4. **User Satisfaction** - качественная оценка
   - Target: Пользователь может взаимодействовать с контрактом через UI

---

## 8. Changelog

| Дата | Версия | Изменения |
|------|--------|-----------|
| 2024-12-08 | 0.1 | Начальная версия документа |
| 2024-12-08 | 0.2 | Фаза 1 завершена: созданы microagents |
| 2024-12-08 | 0.3 | Фаза 2 завершена: созданы project templates (move, frontend) |
| 2024-12-10 | 1.0 | Фаза 3 & 4 завершены: Runtime с Lumio CLI + Workflow Enforcement через системные промпты |
| 2024-12-11 | 2.0 | **Explicit Assumptions Pattern:** Phase 0 расширена с этапом предположений. Добавлены checkpoints перед deploy. Smart retry (спрашивать после 2 неудач). Workflow обновлён до 7 фаз. |

---

## 9. Решённые вопросы

| Вопрос | Решение | Дата |
|--------|---------|------|
| Wallet Integration | Pontem Wallet | 2024-12-08 |
| Network Support | Только Testnet | 2024-12-08 |
| Multi-contract Projects | Один проект, несколько модулей в sources/ | 2024-12-08 |
| Git Integration | Да, автоматический init + .gitignore | 2024-12-08 |

## 10. Открытые вопросы

*(Пока нет)*
