# spec-kit-project — Member System

以 [Spec Kit](https://github.com/github/spec-kit) 流程開發的會員系統 monorepo：

- **Backend**：Laravel 12（Sanctum SPA cookie session + Fortify primitives + Pest 3）
- **Frontend**：React 19（Vite 8 + React Router 7 + TanStack Query + Tailwind v4 + Zod）
- **E2E**：Playwright（跨 backend + frontend）
- **Infra**：MySQL 8.4、Mailpit、Redis（docker-compose）

提供 Email + 密碼 為主的會員流程：註冊 → Email 驗證 → 登入 / 登出 → 個資 / 頭像維護 → 變更密碼 / 忘記密碼重設，含節流、稽核、「記住我」滑動續期。

## 文件

| 主題 | 連結 |
|---|---|
| Quickstart（5–10 分鐘啟動） | [`specs/001-member-system/quickstart.md`](specs/001-member-system/quickstart.md) |
| 功能規格 | [`specs/001-member-system/spec.md`](specs/001-member-system/spec.md) |
| 技術設計 | [`specs/001-member-system/plan.md`](specs/001-member-system/plan.md) |
| Data model | [`specs/001-member-system/data-model.md`](specs/001-member-system/data-model.md) |
| API 契約 (OpenAPI 3.1) | [`specs/001-member-system/contracts/`](specs/001-member-system/contracts/) |
| 任務清單 | [`specs/001-member-system/tasks.md`](specs/001-member-system/tasks.md) |
| Backend 說明 | [`backend/README.md`](backend/README.md) |
| Frontend 說明 | [`frontend/README.md`](frontend/README.md) |

## 目錄結構

```text
spec-kit-project/
├── backend/          # Laravel 12 API
├── frontend/         # React 19 SPA
├── e2e/              # Playwright tests
├── specs/            # Spec Kit 產出（spec / plan / tasks / contracts）
├── docker-compose.yml
└── README.md
```

## 一鍵啟動

```powershell
git clone <repo-url>
cd spec-kit-project

# 後端服務群（MySQL / Mailpit / Redis / Laravel app / queue）
docker compose up -d
docker compose exec app php artisan migrate
docker compose exec app php artisan storage:link

# 前端
cd frontend
pnpm install
pnpm dev    # http://localhost:5173
```

服務端口：

| 服務 | host port | 說明 |
|---|---|---|
| frontend (Vite dev) | 5173 | |
| backend (Laravel) | 8000 | API root `/api/v1` |
| MySQL | 3306 | DB: `member_system` |
| Mailpit SMTP | 1025 | |
| Mailpit Web UI | **8026** | 開發收信介面 |
| Redis | 6379 | |

## 跑測試

```powershell
# Backend
docker compose exec app php artisan test

# Frontend
cd frontend && pnpm test

# E2E（需 frontend + backend 都啟動）
cd e2e
pnpm exec playwright install --with-deps  # 首次
pnpm test
```

## 章程

設計與實作受 [`.specify/memory/constitution.md`](.specify/memory/constitution.md) 五大原則約束：

1. Spec-First（NON-NEGOTIABLE）
2. Test-First（NON-NEGOTIABLE）
3. Independent Testability per user story
4. Simplicity & YAGNI
5. Observability & SemVer
