# GateBox Sponsor Access Platform

Production-ready платформа на `Node.js + TypeScript + Fastify + Telegraf + Prisma + PostgreSQL + Redis`.

## Что реализовано

- 3 роли: пользователь, админ, спонсор.
- Редирект `GET /go/:token` -> Telegram бот с антифродом по IP/UA/rate-limit.
- Telegram webhook-бот (Telegraf), русские тексты, чистые inline-клавиатуры.
- Ротация спонсоров до 7 кампаний, логирование impression.
- Проверка подписок через Telegram API с понятным статусом (`SUCCESS`, `PARTIAL`, `CHECK_UNAVAILABLE`).
- Идемпотентная финансовая логика в транзакциях БД:
  - 1 Telegram user = 1 оплачиваемый уникальный зачёт на оффер.
  - Админу начисляется 1 ₽ только один раз за `user + offer`.
  - Лимиты кампаний не превышаются.
- Ручная модерация оплат (`approve/reject`) + загрузка proof.
- Swagger/OpenAPI (`/docs`).
- Prisma schema + SQL migration + seed.
- Unit tests для ротации и расчёта денег.

## Архитектура

- `Nginx (bothost domain)`
- `Fastify API + Telegram webhook`
- `PostgreSQL`
- `Redis`

Поток:

1. `https://bot1234.bothost.ru/go/ABC123`
2. Проверка токена + антифрод + click log
3. Редирект в `https://t.me/<bot>?start=ABC123`
4. Бот показывает спонсоров
5. Проверка подписок
6. Выдача файла и финансовые начисления

## Быстрый старт (Docker Compose)

1. Скопируйте окружение:

```bash
cp .env.example .env
```

2. Поднимите стек:

```bash
docker compose up -d --build
```

3. Примените миграции:

```bash
docker compose exec app npx prisma migrate deploy
```

4. Заполните базу тестовыми данными:

```bash
docker compose exec app npm run prisma:seed
```

5. Проверьте:

```bash
curl http://localhost/health
curl http://localhost/docs
```

## Локальный запуск без Docker

1. Поднять PostgreSQL/Redis отдельно.
2. Установить зависимости:

```bash
npm install
```

3. Сгенерировать Prisma Client и миграции:

```bash
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed
```

4. Запуск:

```bash
npm run dev
```

## Деплой на bothost

1. Домен укажите в `.env`:
   - `DOMAIN_BASE=https://gatebox.bothost.ru`
2. Настройте DNS для `GateBox.bothost.ru`.
3. Поднимите проект через `docker compose` на сервере.
4. Поставьте SSL (Let's Encrypt / bothost cert).
5. Убедитесь, что Telegram webhook доступен по HTTPS:
   - `https://gatebox.bothost.ru/telegram/webhook/<TELEGRAM_WEBHOOK_SECRET>`

## Telegram команды

### Пользователь

- `/start <token>`
- Кнопки: `Показать спонсоров`, `Проверить`

### Админ

- `/admin`
- `/admin_create <title>|<description>|<file_url>`
- `/admin_stats`
- `/admin_withdraw <amount>`

### Спонсор

- `/start sponsor`
- `/sponsor_packages`
- `/sponsor_create <@channel> <package_id> <CRYPTOBOT|YOOMONEY_MANUAL>`
- `/sponsor_proof <payment_id> <url_or_note>`
- `/sponsor_stats`
- `/sponsor_withdraw <amount>`

## API endpoints

- `GET /go/:token`
- `GET /api/offers/:token`
- `POST /api/subscription/check`
- `POST /api/admin/offers`
- `GET /api/admin/stats`
- `POST /api/sponsor/campaigns`
- `POST /api/sponsor/payments/proof`
- `POST /api/moderation/payments/:id/approve`
- `POST /api/moderation/payments/:id/reject`
- `GET /api/sponsor/stats`
- `POST /api/admin/withdraw`
- `POST /api/sponsor/withdraw`
- `GET /health`

Дополнительно:

- `GET /api/admin/traffic-packages`
- `POST /api/admin/traffic-packages` (super-admin)
- `GET /docs` (Swagger UI)

## Антифрод

- Rate limit кликов по IP (Redis).
- Защита от слишком частых повторных кликов.
- Хэширование IP/UA + click logs.
- Fraud flags при блокировке.
- Повторный успешный вход пользователя по офферу не оплачивается повторно.

## Финансы

Хранится отдельно:

- `gross_amount`
- `payment_fee_amount`
- `net_amount`
- `platform_commission`
- `admin_reward_total`

Комиссии payment methods хранятся в БД (`PaymentMethodConfig`) и могут быть изменены без хардкода.

## Seed что создаёт

- Super-admin по `TELEGRAM_SUPER_ADMIN_ID`
- Тестовый админ (telegram id `1111111111`)
- Тестовый спонсор (telegram id `2222222222`)
- Пакеты трафика:
  - 500 = 600 ₽
  - 1000 = 1250 ₽
  - 1500 = 1875 ₽
  - 2000 = 2500 ₽
  - 3000 = 3750 ₽
  - 4000 = 5000 ₽
  - 5000 = 6250 ₽
  - 7000 = 8750 ₽
  - 10000 = 12500 ₽

## Тесты и проверка

```bash
npm run lint
npm test
npm run build
```

## Важные замечания

- В текущей версии СБП отключён (по вашему требованию).
- CryptoBot и ЮMoney реализованы в manual-proof режиме с базой для будущего API-перехода.
- ЮKassa можно включить позже через `YOOKASSA_ENABLED=true` и ключи.
