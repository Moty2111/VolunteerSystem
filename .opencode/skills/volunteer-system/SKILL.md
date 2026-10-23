---
name: volunteerer-system
description: Используй для любой работы в репозитории VolunteerSystem — запуск, архитектура, БД, тестовые аккаунты, правила проекта. Загружается автоматически для всех агентов в этом проекте.
---

# VolunteerSystem — контекст проекта

Система управления волонтёрами. Курсовой проект: .NET 10 (ASP.NET Core) + React (Vite) + SQL Server LocalDB.

## Запуск
- `npm run dev` из корня `D:\Visual Project\VolunteerSystem` — поднимает API (http://localhost:5084) и фронтенд (https://localhost:61000), ждёт готовности. Остановка — Ctrl+C.
- Раздельно: `npm run dev:api`, `npm run dev:web` (из корня).
- Проверка: `http://localhost:5084/api/health`, Swagger: `http://localhost:5084/swagger`.

## Структура
- `VolunteerSystem.Server/` — ASP.NET Core: `Controllers/`, `Models/`, `Dtos/`, `Data/DbInitializer.cs` (схема + демо-данные + апгрейд-скрипты), `Services/` (JwtService, MedBookStorage и др.), `Program.cs`.
- `volunteersystem.client/` — React 19 + Vite: `src/pages/`, `src/components/`, `src/api/`, `src/types/`, `src/utils/`, `src/index.css` (вся стилизация, тёмная/светлая тема).
- `scripts/dev.mjs` — единый запуск.

## БД
- SQL Server LocalDB `(localdb)\MSSQLLocalDB`, база `IS_Volunteer`.
- Инициализация: `DbInitializer` — при первом запуске создаёт схему и демо-данные; при изменении `CurrentDemoDataVersion` применяет `DemoUpgradeScript` (идемпотентные ALTER/CREATE).
- Версия демо-данных сейчас: 4.
- Медкнижка: колонки `med_book_*` в `Volunteer`, статусы: Не загружена / На проверке / Подтверждена / Отклонена / Просрочена. Триггер `trg_assignment_medbook` блокирует назначения на соц/благотв/образовательные события без действующей книжки.

## Тестовые аккаунты
- `admin/admin123` (Администратор), `manager1/manager1123` (Менеджер), `ivanov/ivanov123` (Волонтёр).
- Дополнительные (версия 2+): `admin2/admin2123`, `manager2/manager2123`, `nikitin/nikitin123` и др.
- Пароли — открытым текстом (требование курсового), JWT: claims `UserId`, `VolunteerId`, роль в `role`.

## Эндпоинты ключевые
- `/api/auth/login|register|me|change-password` (регистрация — multipart, может содержать `medBookScan` + `medBookValidUntil`).
- `/api/volunteers` (+ `/medbook`, `/medbook/scan`, `/medbook/verify`).
- `/api/assignments`, `/api/events`, `/api/skills`, `/api/partners`, `/api/reports`, `/api/users`, `/api/audit`.

## Правила разработки
- PowerShell искажает кириллицу — читать/править файлы инструментами Read/Edit (UTF-8).
- После изменений: `dotnet build` (сервер), `npm run build` + `npm run lint` (клиент).
- Не менять: хранение паролей открытым текстом (требование), даты медкнижек в демо-данных (относительно GETDATE()).
- Изменения в схеме БД — через `DbInitializer` + поднятие `CurrentDemoDataVersion`.
