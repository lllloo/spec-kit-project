# Quickstart: Member System Dev 環境

**Feature**: 001-member-system
**Date**: 2026-05-22
**目標**：5–10 分鐘從 clone 到本機跑通 P1（註冊 → 驗證 → 登入）。

## 前置需求

| 工具 | 版本 | 備註 |
|---|---|---|
| Docker Desktop / Podman | 任意現行版 | **同時跑 PHP/Composer**（透過容器，host 不需 PHP） |
| Node.js | 22 LTS | 配合 React 19 / Vite 8（host 端） |
| pnpm | 11+ | 前端套件管理（`volta install pnpm`） |

> host 不需安裝 PHP 與 Composer，皆由 docker-compose `app` 服務提供（image: `spec-kit/backend`，PHP 8.4 + Composer 2 + pdo_mysql/gd/zip/intl 等擴充）。

## 啟動步驟

### 1. 取得程式並安裝前端相依

```powershell
git clone <repo-url>
cd spec-kit-project
git switch 001-member-system

# 前端（host 跑）
cd frontend
pnpm install
cd ..
```

### 2. 啟動全部服務（單一 docker compose 指令）

repo 根目錄：

```powershell
docker compose up -d
```

| 服務 | host port | 說明 |
|---|---|---|
| app（Laravel） | 8000 | `php artisan serve --host=0.0.0.0 --port=8000` |
| queue | — | `php artisan queue:work` 常駐 |
| mysql | 3306 | DB `member_system`，user/pass `sail/password` |
| mailpit | 1025 (SMTP) / **8026** (Web UI) | host 8025 已被 boilerplate 站台占用，本 stack 改 8026 |
| redis | 6379 | |

### 3. Backend 一次性指令（透過 app 容器）

```powershell
docker compose exec app php artisan migrate
# storage:link 已在 image 啟動時或於 setup 階段完成；如需重做：
docker compose exec app php artisan storage:link

# （選用）建立固定測試帳號，免每次手動註冊 + 收驗證信
docker compose exec app php artisan db:seed
```

> **測試帳號**（`db:seed` 後可用）：Email `test@example.com` / 密碼 `Password123`，狀態已驗證，可於 <http://localhost:5173/login> 直接登入。`db:seed` 可重複執行（已做存在性保護）。

未來 artisan / composer 一律前綴 `docker compose exec app`：

```powershell
docker compose exec app php artisan tinker
docker compose exec app composer require some/package
docker compose exec app php artisan test
```

### 4. Frontend 啟動

```powershell
cd frontend
pnpm dev    # 5173；已設 proxy 將 /api、/sanctum → http://localhost:8000
```

開瀏覽器 <http://localhost:5173>。

## 驗收 P1（手動）

1. 註冊頁輸入新 Email + 強密碼 → 提交
2. 開 <http://localhost:8025> 查 Mailpit 收到的驗證信
3. 點驗證連結 → 自動帶 token 到前端 `/verify-email` route → 成功訊息
4. 回登入頁，輸入剛才憑證 → 進入 `/dashboard`
5. 觀察：
   - `backend/storage/logs/laravel.log` 是否有 `login.success` audit event
   - DB `audit_events` 表是否有 `registration` 與 `email.verification.complete` 兩筆

## 跑測試

```powershell
# Backend（Pest）
cd backend
php artisan test

# Frontend（Vitest）
cd ..\frontend
pnpm test

# E2E（Playwright）
cd ..\e2e
pnpm exec playwright install --with-deps   # 首次
pnpm test
```

## 常見問題

| 症狀 | 原因 | 對策 |
|---|---|---|
| 註冊後沒收到信 | queue 服務 crash 或卡訊息 | `docker compose logs -f queue`；必要時 `docker compose restart queue` |
| 登入後立刻被踢回登入頁 | CSRF cookie 未取得 | 確認前端 fetch wrapper 首次呼叫 `/sanctum/csrf-cookie` |
| 驗證連結點開 410 | token 已被新申請作廢（FR-013） | 從信箱拿最新一封驗證信 |
| `pnpm dev` 後 API 502 | Vite proxy 未轉發 | 檢查 `vite.config.ts` `server.proxy['/api']` |

## 設定切換

| 變數 | Dev 預設 | Prod | 說明 |
|---|---|---|---|
| `MAIL_MAILER` | `smtp` (Mailpit) | `resend` | R4 |
| `QUEUE_CONNECTION` | `database` | `redis` | R5 |
| `SESSION_DRIVER` | `database` | `redis` | session 表 |
| `FILESYSTEM_DISK` | `public` | `s3`（未來） | R6 |
| `SANCTUM_STATEFUL_DOMAINS` | `localhost:5173` | 前端 domain | Sanctum SPA cookie 必填 |

## 下一步

完成 Phase 1，執行 `/speckit-tasks` 產出 tasks.md（依 P1/P2/P3 切 phase）。
