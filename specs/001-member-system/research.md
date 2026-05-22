# Phase 0 Research: Member System

**Feature**: 001-member-system
**Date**: 2026-05-22
**Status**: All NEEDS CLARIFICATION resolved

依 plan.md Technical Context 與 spec.md Clarifications（2026-05-21）整理出 7 項待決議題，逐項記錄決策、理由與被否決方案。

---

## R1. 後端框架與版本

**Decision**: Laravel 12.x（PHP 8.3+）

**Rationale**:
- 使用者輸入即指名 Laravel，無需重新評估框架族
- Laravel 12 自 2025-02 發布，截至 2026-05 已穩定一年，社群套件兼容良好
- 內建 Eloquent、Migrations、Mail、Queue、RateLimiter、Schedule 直接支撐 FR-001~016 各條
- PHP 8.3 對 readonly properties、typed enums 支援完整，可直接用於 entity 模型化

**Alternatives considered**:
- Laravel 11 LTS：可行但較舊；無壓力情境下選最新穩定即可
- Symfony：底盤更純但需自組 auth/queue，違反 YAGNI

---

## R2. 認證機制（Sanctum SPA vs Sanctum Token vs Passport）

**Decision**: Laravel Sanctum SPA cookie session + Fortify 流程元件

**Rationale**:
- React SPA 與 Laravel 部署於同一 top-level domain（dev：`localhost:8000` API + Vite proxy；prod：同一 root domain 子路徑或子網域），cookie session 是最簡選擇
- Sanctum SPA mode 自動處理 CSRF（XSRF-TOKEN cookie + X-XSRF-TOKEN header），Vite 設 proxy 後前端 fetch 預設帶 cookie 即生效
- Fortify 預設提供 register / login / logout / password-reset / email-verification 端點與事件，與 spec FR-001~010 對應一一映射；可關閉其 Blade view，僅留 JSON 流程
- 「記住我」(FR-016) 由 Fortify `remember` 參數 + Laravel session cookie lifetime 雙軌實現

**Alternatives considered**:
- Sanctum personal access token：適合行動 App / 第三方 API，本期是同網域 SPA，cookie session 更安全（無需把 token 存 localStorage）
- Passport OAuth2：對單一前端來說殺雞用牛刀；spec 也明示不做社交登入

---

## R3. 資料庫

**Decision**: MySQL 8.4 LTS

**Rationale**:
- Laravel 預設、driver 與遷移皆無摩擦
- spec Scale < 1000 同時上線 → 單機 InnoDB 綽綽有餘
- 8.4 LTS 直到 2032 支援，side project 不需追新版

**Alternatives considered**:
- PostgreSQL 17：型別系統更強、JSONB 更佳，但本期 entity 無進階查詢需求，沿用 Laravel 默認的 MySQL 路徑摩擦更低
- SQLite：dev 可用，但 prod queue 與多進程下不適合並發寫入

---

## R4. 寄信服務（Email transport）

**Decision**: Dev 用 Mailpit（docker），Prod 用 Resend

**Rationale**:
- Mailpit 是 Laravel 11+ Sail 預設 SMTP catcher，零設定可在 `http://localhost:8025` 看到驗證信／重設信，加速 P1/P3 開發
- Resend 對 side project 提供免費 3000 封/月，API + SMTP 雙協議，Laravel 11/12 有官方 transport（`resend/resend-php` + `resend/resend-laravel`），與 Notification 類別整合一行設定
- 兩者皆以 Laravel Notification 抽象呼叫，可在 .env 切換不動程式

**Alternatives considered**:
- Mailgun：免費額度需綁卡，自 2023 起對小流量帳號收費
- Postmark：交付率高但無持續免費方案
- 自架 Postfix／SES：違反 spec Assumption「不自行架設 MTA」

---

## R5. 寄信非同步化與 Queue Driver

**Decision**: 所有 Mail / Notification 走 queue；Queue driver dev 用 database，Prod 用 Redis

**Rationale**:
- 寄信若同步執行會使註冊／忘記密碼 API 受外部供應商延遲影響，違反 SC-004（2 秒回應）
- Laravel Notification 加 `ShouldQueue` interface 即可非同步
- database queue 零相依，docker-compose 已含 mysql；Redis 可在 prod 階段加入
- queue worker 故障時可從 `jobs.failed_jobs` 追溯，符合 Constitution V (Observability)

**Alternatives considered**:
- 同步寄信：違反 SC-004
- 只用 Redis：dev 多一個服務，無收益

---

## R6. 頭像儲存

**Decision**: Laravel Storage `public` disk，存於 `storage/app/public/avatars/{member_uuid}.{ext}`，部署時 `php artisan storage:link`

**Rationale**:
- side project + < 1000 會員，本機 disk 已可承載
- Laravel `Storage::disk('public')` 抽象使日後切到 S3 / R2 僅需改 config，不動 code
- 限制：上傳 ≤ 2 MB，格式 jpg/png/webp（FR-007），由 FormRequest 規則驗證
- 檔名以 member UUID 為主鍵避免衝突；副檔名由內容類型偵測決定，避免使用者送上的 .exe 偽裝
- 舊頭像替換時刪除舊檔（service 層處理），避免孤兒檔

**Alternatives considered**:
- 直接存 DB BLOB：不利 CDN，無收益
- 一開始就 S3：side project 不必引入 AWS 帳號管理

---

## R7. 前端 SPA Stack

**Decision**: Vite 6 + React 19 + React Router 7 (data router) + TanStack Query 5 + react-hook-form 7 + Zod 3 + Tailwind CSS v4

**Rationale**:
- React 19 stable 自 2024-12 起，2026 已普及；server actions 與 form action 在 SPA 模式下不啟用，本期僅用 client features
- React Router 7 data router 提供 loader / action / `useRouteLoaderData`，可實作 FR-011（受保護頁面攔截 → 登入後返回原頁，搭配 `redirectTo` query）
- TanStack Query 5 處理 session 狀態查詢與 invalidation（登入/登出/變更密碼後自動 refetch /me）
- react-hook-form + Zod：表單驗證與後端 FormRequest 規則一致（密碼強度 FR-002、Email 唯一 FR-001 用 server error map 顯示）
- Tailwind v4 zero-config + Lightning CSS：side project 切版速度快，無需 design system

**Alternatives considered**:
- Next.js (App Router)：使用者明示「Laravel + React」分離，引入 Next.js 反而要重新切割 API/Server Component 邊界
- Inertia.js：與 Laravel 整合度高但會把後端與前端綁死，不符 spec 既定分離取向
- Redux Toolkit：本期狀態僅 session + 表單，TanStack Query 足夠，YAGNI

---

## R8. 防濫用（CSRF / Rate limit / 帳號枚舉防護）

**Decision**:
- **CSRF**：依 Sanctum SPA mode 預設（XSRF-TOKEN cookie + `X-XSRF-TOKEN` header）；前端 fetch wrapper 自動帶 header
- **Rate limit**：用 Laravel RateLimiter `for('register')` 與 `for('password-reset')` 定義；FR-015 數值（IP/h ≤10、Email/h ≤3 重設）以 `Limit::perHour(N)->by($request->ip())` 與 `->by($request->input('email'))` 雙鍵組合
- **登入鎖定**：Fortify 內建 ThrottleRequests middleware；上限 5 次/分鐘/IP，超過後 60 秒鎖定（spec FR-004 「設定上限次數」具體值在此落地）
- **帳號枚舉防護**：忘記密碼端點無論 Email 是否存在皆回應相同訊息（Fortify 預設行為已符合 FR-009）；登入錯誤統一回 "認證失敗"（FR-012）

**Rationale**: 全部使用 Laravel 內建機制，無自製造輪，符合 YAGNI；Fortify + Sanctum 已涵蓋 OWASP A07 (Identification & Authentication Failures) 主要面向

**Alternatives considered**:
- 加上 reCAPTCHA：spec Q4 已決議只做基本節流，CAPTCHA 列入未來範圍
- 自製 lockout 邏輯：Fortify 已提供，重寫無收益

---

## 結論

7 項決策全部完成，plan.md Technical Context 已無 `NEEDS CLARIFICATION`，可進入 Phase 1 設計。
