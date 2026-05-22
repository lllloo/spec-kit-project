# Implementation Plan: Member System

**Branch**: `001-member-system` | **Date**: 2026-05-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-member-system/spec.md`

## Summary

提供以 Email + 密碼 為主的會員系統（註冊、Email 驗證、登入/登出、個人資料維護、密碼變更、密碼重設），含基本防濫用節流、稽核紀錄、「記住我」滑動續期。技術上採 Laravel 12（Sanctum SPA cookie session + Fortify 流程）後端與 React 19 (Vite + Tailwind v4 + React Router 7) 前端，monorepo 形式分置於 `backend/` 與 `frontend/`，資料層 MySQL 8.4，開發信箱用 Mailpit、production 用 Resend。詳見 [research.md](./research.md)。

## Technical Context

**Language/Version**: PHP 8.3 (Laravel 12) / TypeScript 5.6 (React 19)

**Primary Dependencies**:
- Backend：Laravel 12, Laravel Fortify（auth 流程基礎元件）, Laravel Sanctum（SPA cookie session）, Spatie laravel-permission（保留擴充點，本期不啟用 role），Pest 3（測試）
- Frontend：React 19, Vite 6, React Router 7（data router）, TanStack Query 5, react-hook-form 7, Tailwind CSS v4, Zod 3
- E2E：Playwright 1.49

**Storage**: MySQL 8.4 LTS（會員/憑證/token/session/audit）+ 本機 disk via Laravel Storage（頭像，路徑 `storage/app/public/avatars`，符號連結至 `public/storage`）

**Testing**: Backend Pest 3（unit + feature/integration，含 RefreshDatabase），Frontend Vitest 2 + React Testing Library 16，E2E Playwright（涵蓋 P1 全流程）

**Target Platform**: Linux 容器（Laravel Sail / docker-compose），SPA 部署任意靜態 host（dev 走 Vite dev server）

**Project Type**: Web application（separated frontend + backend monorepo）

**Performance Goals**:
- SC-004：99% 登入請求 p99 < 2s（含網路）→ backend 路由 p95 < 200ms
- 頭像上傳：< 2MB，p95 < 1s
- 列表 / 個資查詢 API p95 < 100ms

**Constraints**:
- 同時上線會員 < 1000（spec Assumptions）→ 單機 Laravel + MySQL 即可
- Audit log 至少保留 30 天（FR-014），超過可清除 → 用 daily job 清理
- 一致回應訊息避免帳號枚舉（FR-009、FR-012、FR-015）
- 寄信為非同步 queue job，避免阻塞 HTTP 回應

**Scale/Scope**: ~16 條 FR、6 個 entity、3 個 user story（P1/P2/P3）、~10 個 REST 端點、~8 個 React route

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | 證據 |
|---|---|---|
| I. Spec-First (NON-NEGOTIABLE) | PASS | spec.md 已含 prioritized stories、acceptance scenarios、measurable SC；無 `[NEEDS CLARIFICATION]` |
| II. Test-First (NON-NEGOTIABLE) | PASS | 後端 Pest、前端 Vitest、整合 Playwright；tasks.md 將強制 test-first ordering |
| III. Independent Testability | PASS | P1/P2/P3 已具獨立 Independent Test；plan 不引入 cross-story 必要依賴（P2/P3 可在 P1 完成後個別交付） |
| IV. Simplicity & YAGNI | PASS | 2 個專案（backend + frontend）由 spec 既定技術（Laravel + React）直接決定；不引入 microservices / event bus / 自製抽象層 |
| V. Observability & SemVer | PASS | Laravel Monolog（structured JSON to stderr）、AuditEvent 表（FR-014）、React error boundary；API 以 `/v1/...` prefix 行 SemVer |

**Initial Gate Result**: PASS — 無 violations，無需 Complexity Tracking。
**Post-Design Gate Result**: PASS（Phase 1 完成後重評，無新增違規，見 research.md / data-model.md / contracts/）。

## Project Structure

### Documentation (this feature)

```text
specs/001-member-system/
├── plan.md              # This file
├── research.md          # Phase 0 output (技術選型決策)
├── data-model.md        # Phase 1 output (entities + state machines)
├── quickstart.md        # Phase 1 output (dev 環境 5 分鐘啟動)
├── contracts/           # Phase 1 output (OpenAPI 3.1)
│   ├── auth.openapi.yaml
│   └── profile.openapi.yaml
├── checklists/
│   └── requirements.md  # /speckit-specify 產出
└── tasks.md             # Phase 2 (/speckit-tasks 產出，本指令不建立)
```

### Source Code (repository root)

```text
backend/                                    # Laravel 12 應用
├── app/
│   ├── Http/Controllers/Api/V1/
│   │   ├── AuthController.php              # 註冊/登入/登出/驗證
│   │   ├── PasswordController.php          # 變更/忘記/重設
│   │   └── ProfileController.php           # 查/改個資、頭像上傳
│   ├── Http/Middleware/                    # Sanctum, 節流
│   ├── Http/Requests/                      # FormRequest 驗證
│   ├── Models/
│   │   ├── Member.php                      # 對應 users table
│   │   ├── EmailVerificationToken.php
│   │   ├── PasswordResetToken.php
│   │   └── AuditEvent.php
│   ├── Services/                           # AuthService、AuditService、AvatarService
│   ├── Notifications/                      # VerifyEmail、ResetPassword（queue）
│   └── Console/Commands/                   # PruneAuditEvents (30 天清理)
├── config/                                 # auth.php, fortify.php, sanctum.php
├── database/
│   ├── migrations/                         # 6 個 entity 的 schema
│   └── factories/                          # Pest 用
├── routes/
│   ├── api.php                             # /v1/* 路由
│   └── channels.php
├── tests/
│   ├── Feature/                            # Pest feature/integration（含 P1/P2/P3）
│   └── Unit/
└── composer.json

frontend/                                   # React 19 SPA
├── src/
│   ├── routes/                             # React Router 7 file routes
│   │   ├── (auth)/login.tsx
│   │   ├── (auth)/register.tsx
│   │   ├── (auth)/verify-email.tsx
│   │   ├── (auth)/forgot-password.tsx
│   │   ├── (auth)/reset-password.tsx
│   │   ├── _protected/dashboard.tsx
│   │   ├── _protected/profile.tsx
│   │   └── _protected/password.tsx
│   ├── components/                         # ui/, forms/
│   ├── lib/
│   │   ├── api.ts                          # fetch wrapper（含 CSRF cookie）
│   │   ├── auth.ts                         # session 狀態（TanStack Query）
│   │   └── schemas.ts                      # Zod schemas，與 contracts 對齊
│   └── main.tsx
├── tests/                                  # Vitest + RTL
├── index.html
├── vite.config.ts
└── package.json

e2e/                                        # Playwright（跨 backend+frontend）
├── tests/
│   ├── registration.spec.ts                # P1
│   ├── profile.spec.ts                     # P2
│   └── password-reset.spec.ts              # P3
└── playwright.config.ts

docker-compose.yml                          # mysql:8.4 + mailpit + redis（queue）
```

**Structure Decision**: 採 monorepo + 雙專案結構（`backend/` Laravel API、`frontend/` React SPA），契合 spec 既定 stack。Sanctum 走 SPA cookie session 而非 token，因此 backend 與 frontend 部署於同一 top-level domain（dev 走 `localhost:8000` API + `localhost:5173` Vite proxy）。E2E 獨立資料夾跨兩端執行。Q1 (合規) 與 Q2 (2FA) 結果使本期不引入 GDPR 模組與 TOTP，項目樹相對簡潔。

## Complexity Tracking

> 無 violations，本表保留空白。
