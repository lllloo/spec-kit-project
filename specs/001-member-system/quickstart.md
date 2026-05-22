# Quickstart: Member System Dev 環境

**Feature**: 001-member-system
**Date**: 2026-05-22
**目標**：5–10 分鐘從 clone 到本機跑通 P1（註冊 → 驗證 → 登入）。

## 前置需求

| 工具 | 版本 | 備註 |
|---|---|---|
| Docker Desktop / Podman | 任意現行版 | 跑 MySQL、Mailpit、Redis |
| PHP | 8.3+ | 走 Laravel Sail 時可省略本機安裝 |
| Composer | 2.7+ | |
| Node.js | 22 LTS | 配合 React 19 / Vite 6 |
| pnpm | 9+ | 前端套件管理（npm/yarn 亦可） |

## 啟動步驟

### 1. 取得程式並安裝相依

```powershell
git clone <repo-url>
cd spec-kit-project
git switch 001-member-system

# 後端
cd backend
composer install
copy .env.example .env
php artisan key:generate

# 前端
cd ..\frontend
pnpm install
```

### 2. 啟動基礎服務（docker-compose）

repo 根目錄：

```powershell
docker compose up -d mysql mailpit redis
```

- MySQL 8.4 在 `localhost:3306`（DB: `member_system`, user/pass: `sail/password`）
- Mailpit Web UI: <http://localhost:8025>（攔截所有寄出的信）
- Redis 在 `localhost:6379`

### 3. Backend 初始化

```powershell
cd backend
php artisan migrate
php artisan storage:link    # 頭像對外可訪問
php artisan serve           # 8000
# 另一個 terminal：
php artisan queue:work      # 寄信非同步
```

### 4. Frontend 啟動

```powershell
cd frontend
pnpm dev    # 5173, 已設 proxy 將 /api → http://localhost:8000
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
| 註冊後沒收到信 | queue worker 未啟動 | 開 `php artisan queue:work` |
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
