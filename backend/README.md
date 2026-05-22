# Backend — Member System API

Laravel 12 + Sanctum SPA cookie session + Fortify primitives，提供 `/api/v1/auth/*`、`/api/v1/profile/*` 端點。

詳細功能規格見 [`../specs/001-member-system/spec.md`](../specs/001-member-system/spec.md)、技術設計見 [`../specs/001-member-system/plan.md`](../specs/001-member-system/plan.md)、契約見 [`../specs/001-member-system/contracts/`](../specs/001-member-system/contracts/)。

## 環境需求

- Docker Desktop / Podman（推薦，自帶 PHP 8.4 + Composer + 擴充）
- 或 host 直裝 PHP 8.4 + Composer 2（不推薦，需自行裝 `pdo_mysql`/`gd`/`zip`/`intl`/`bcmath`）

## 安裝

從 repo root 啟動全部服務（MySQL 8.4、Mailpit、Redis、Laravel app、queue worker）：

```powershell
docker compose up -d
docker compose exec app php artisan migrate
docker compose exec app php artisan storage:link
```

API 服務於 <http://localhost:8000>。Mailpit Web UI <http://localhost:8026>。

## 常用 artisan 指令

一律前綴 `docker compose exec app`：

```powershell
docker compose exec app php artisan migrate              # 跑 migration
docker compose exec app php artisan migrate:fresh        # 砍 schema 重建（會清資料）
docker compose exec app php artisan tinker               # REPL
docker compose exec app php artisan queue:work --once    # 處理一筆 job
docker compose exec app php artisan members:prune-audit-events
                                                          # 手動清理 30 天前 audit（routes/console.php 已排程 daily）
```

## 測試

```powershell
docker compose exec app php artisan test                 # 全部
docker compose exec app php artisan test --filter=Auth   # 篩名
docker compose exec app ./vendor/bin/pint                # 程式碼風格修正
docker compose exec app ./vendor/bin/pint --test         # 只檢查
```

測試走 Pest 3 + `RefreshDatabase`，每個 feature test 使用獨立 transaction，不污染主資料庫。

## 設定要點

- `config/auth.php`：`users` provider model 改為 `App\Models\Member`、`passwords.members.expire = 60`（FR-010）
- `config/sanctum.php`：`SANCTUM_STATEFUL_DOMAINS` 環境變數需含前端 origin（dev：`localhost:5173`）
- `config/session.php`：`expire_on_close = true`，未勾「記住我」session cookie 隨關閉瀏覽器失效（FR-016）
- `config/fortify.php`：`features` 啟用 `registration / resetPasswords / emailVerification / updateProfileInformation / updatePasswords`；**不啟用** 2FA（spec Clarifications Q2）
- `AppServiceProvider::configureRateLimiters()`：定義 `register`（10/h/IP）、`password-reset`（10/h/IP + 3/h/email）
- `FortifyServiceProvider::boot()`：定義 `login`（5/min/email+IP）

## 目錄結構（重點）

```text
app/
├── Console/Commands/PruneAuditEventsCommand.php
├── Http/
│   ├── Controllers/Api/V1/{Auth,Profile,Password}Controller.php
│   ├── Middleware/SlidingRememberCookie.php
│   ├── Requests/{Auth,Profile,Password}/*FormRequest.php
│   └── Resources/MemberResource.php
├── Models/{Member,Credential,EmailVerificationToken,PasswordResetToken,AuditEvent}.php
├── Notifications/{VerifyEmail,ResetPassword}Notification.php
├── Rules/PasswordPolicy.php
└── Services/{Audit,Registration,Login,EmailVerification,Profile,Avatar,ChangePassword,ForgotPassword,ResetPassword}Service.php

routes/
├── api.php         # /api/v1/* 路由
└── console.php     # daily prune-audit-events 排程

database/
├── migrations/     # members / credentials / *_tokens / sessions / audit_events
└── factories/MemberFactory.php

tests/Feature/
├── Auth/           # Register / EmailVerification / Login / Logout / Me / ResendVerification
├── Profile/        # Show / Update / UploadAvatar
├── Password/       # Change / Forgot / Reset
└── Security/       # BruteForce
```
