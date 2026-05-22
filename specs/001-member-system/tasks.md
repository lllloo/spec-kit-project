---
description: "Implementation tasks for 001-member-system"
---

# Tasks: Member System

**Input**: Design documents from `/specs/001-member-system/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: 包含——本專案章程 II. Test-First 為 NON-NEGOTIABLE，每個 user story 必須以「先寫測試、確認失敗、再實作」順序進行（Pest feature / Vitest / Playwright）。

**Organization**: 任務依 user story 分 phase，每個 phase 可獨立交付與驗收（章程 III）。

## Format: `[ID] [P?] [Story] Description`

- **[P]**：可並行（不同檔案、無未完成依賴）
- **[Story]**：所屬 user story（US1/US2/US3）；Setup / Foundational / Polish 無 story label
- 每條任務含明確絕對路徑（從 repo root 起）

## Path Conventions（依 plan.md）

- Backend：`backend/app/...`、`backend/database/...`、`backend/tests/...`
- Frontend：`frontend/src/...`、`frontend/tests/...`
- E2E：`e2e/tests/...`

---

## Phase 1: Setup（共享基礎建設）

**Purpose**：建立 monorepo 結構、初始化兩端框架與基礎工具鏈

- [X] T001 建立 monorepo 目錄結構（`backend/`、`frontend/`、`e2e/`），於 repo root 建 `docker-compose.yml`（mysql:8.4、mailpit、redis 三服務，對應 R3/R4/R5）
- [X] T002 [P] 初始化 Laravel 12 專案於 `backend/`（`composer create-project laravel/laravel . "^12.0"`），裝 Fortify 與 Sanctum：`composer require laravel/fortify laravel/sanctum`
- [X] T003 [P] 初始化 Vite + React 19 專案於 `frontend/`（`pnpm create vite . --template react-ts`），裝核心依賴：`pnpm add react-router@^7 @tanstack/react-query@^5 react-hook-form@^7 zod@^3 tailwindcss@^4 @tailwindcss/vite`
- [X] T004 [P] 初始化 Playwright 專案於 `e2e/`（`pnpm create playwright@latest`），設定 `e2e/playwright.config.ts` baseURL = `http://localhost:5173`
- [X] T005 [P] 設 backend lint/format：`composer require --dev laravel/pint pestphp/pest pestphp/pest-plugin-laravel`，加 `backend/pint.json`
- [X] T006 [P] 設 frontend lint/format：`pnpm add -D eslint prettier eslint-plugin-react-hooks vitest @testing-library/react @testing-library/jest-dom jsdom`；建立 `frontend/eslint.config.js`、`frontend/.prettierrc`
- [X] T007 [P] 設定 `frontend/vite.config.ts`：Tailwind v4 plugin、`server.proxy['/api'] = 'http://localhost:8000'`、`server.proxy['/sanctum'] = 'http://localhost:8000'`
- [X] T008 [P] 設定 `frontend/src/index.css` 引入 `@import "tailwindcss";`、`frontend/tailwind.config.ts`（v4 zero-config 可選）
- [X] T009 複製 `backend/.env.example` → `backend/.env` 並設定：`APP_URL=http://localhost:8000`、`SANCTUM_STATEFUL_DOMAINS=localhost:5173`、`SESSION_DOMAIN=localhost`、`SESSION_DRIVER=database`、`QUEUE_CONNECTION=database`、`MAIL_MAILER=smtp`、`MAIL_HOST=localhost`、`MAIL_PORT=1025`、`DB_*` 對應 docker-compose
- [X] T010 跑 `docker compose up -d`、`backend>php artisan key:generate`、`backend>php artisan storage:link`，驗證 mysql/mailpit 可連線

---

## Phase 2: Foundational（阻塞前置；US1/2/3 共用）

**Purpose**：所有 user story 共用的 schema、auth pipeline、API 骨架、測試基線

**⚠️ CRITICAL**：完成此 phase 前不得開始任何 US 工作

### Backend — 共用 schema 與模型

- [X] T011 建立 Member migration `backend/database/migrations/2026_05_22_000001_create_members_table.php`（依 data-model.md E1 全欄位 + collation utf8mb4_unicode_ci + soft delete）
- [X] T012 建立 Credential migration `backend/database/migrations/2026_05_22_000002_create_credentials_table.php`（一對一 FK to members）
- [X] T013 [P] 建立 sessions migration：執行 `php artisan session:table` 由 artisan 產出檔案於 `backend/database/migrations/`（檔名 timestamp 由 artisan 決定），欄位對齊 data-model.md E5
- [X] T014 [P] 建立 AuditEvent migration `backend/database/migrations/2026_05_22_000006_create_audit_events_table.php`（依 E6，含 INDEX(created_at)）
- [X] T015 跑 `php artisan migrate` 驗證 schema
- [X] T016 [P] 建立 `backend/app/Models/Member.php`（uuid 自動產生 + `Notifiable`、`SoftDeletes`、`hasOne(Credential::class)`、`hasMany(AuditEvent::class)`、隱藏 password 欄位；本期走 Sanctum SPA cookie session，不需 `HasApiTokens`）
- [X] T017 [P] 建立 `backend/app/Models/Credential.php`（belongsTo Member、bcrypt mutator on `password_hash`）
- [X] T018 [P] 建立 `backend/app/Models/AuditEvent.php`（fillable: member_id, event_type, result, ip_address, user_agent, metadata；無 update）
- [X] T019 [P] 建立 Factory `backend/database/factories/MemberFactory.php`（含 `verified()`、`unverified()`、`locked()` states）

### Backend — Auth pipeline 設定

- [X] T020 發佈 Fortify config：`php artisan vendor:publish --provider="Laravel\Fortify\FortifyServiceProvider"`；於 `backend/config/fortify.php` 關閉所有 views（`'views' => false`，純 JSON）、`features` 明列為 `[registration, resetPasswords, emailVerification, updateProfileInformation, updatePasswords]`，**明確不啟用** `twoFactorAuthentication`（spec Clarifications Q2）
- [X] T021 發佈 Sanctum config：`php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"`；於 `backend/config/sanctum.php` 啟用 stateful domains by env
- [X] T022 設定 `backend/config/auth.php` 將 `users` provider model 改為 `App\Models\Member`，table 改為 `members`
- [X] T023 註冊 Sanctum middleware 於 `backend/bootstrap/app.php` API stack：`EnsureFrontendRequestsAreStateful::class`
- [X] T024 建立 `backend/app/Services/AuditService.php`（單一寫入入口 `record(string $event, string $result, ?Member $member, array $metadata = [])`，自動帶 ip/ua）
- [X] T025 於 `backend/app/Providers/AppServiceProvider.php` 註冊 RateLimiter：`Limit::perHour(10)->by($req->ip())` 鍵 `register`、`Limit::perHour(10)->by($req->ip())->by($req->input('email'))` 鍵 `password-reset`（FR-015）
- [X] T026 建立 `backend/routes/api.php` 套用 `prefix('v1')`、`middleware('api')` 並掛 `auth:sanctum` 群組

### Backend — 共用 FormRequest 與例外處理

- [X] T027 [P] 建立 `backend/app/Exceptions/Handler.php`（或於 bootstrap renderable）統一 JSON 錯誤格式 `{message, errors}`，並對 ValidationException/AuthenticationException 給一致訊息（FR-012）
- [X] T028 [P] 建立共用密碼強度規則 `backend/app/Rules/PasswordPolicy.php`（≥8、含字母含數字，FR-002）

### Frontend — API client 與保護路由

- [X] T029 [P] 建立 `frontend/src/lib/api.ts`：fetch wrapper，首次呼叫 `/sanctum/csrf-cookie`、自動帶 `X-XSRF-TOKEN` header（從 cookie 讀）、`credentials: 'include'`、422/401/410/429 標準化錯誤回傳
- [X] T030 [P] 建立 `frontend/src/lib/queryClient.ts`：TanStack Query QueryClient 預設 staleTime 30s
- [X] T031 [P] 建立 `frontend/src/lib/auth.ts`：`useSession()` hook 包裝 `GET /api/v1/auth/me`、`invalidate()` 工具
- [X] T032 [P] 建立 `frontend/src/components/ProtectedRoute.tsx`：未登入時 `Navigate to="/login?redirectTo={pathname}"`（FR-011）
- [X] T033 [P] 建立 `frontend/src/main.tsx` + `App.tsx`：套上 QueryClientProvider + RouterProvider；建立 `frontend/src/router.tsx` 含 `(auth)` 與 `_protected` route groups
- [X] T034 [P] 建立 `frontend/src/components/ui/`：`Button.tsx`、`Input.tsx`、`FormField.tsx`、`Alert.tsx`（Tailwind）

### 測試基線

- [X] T035 [P] 設定 `backend/tests/Pest.php`：`uses(RefreshDatabase::class)->in('Feature')`、共用 helper `actingAsMember()`
- [X] T036 [P] 設定 `frontend/vitest.config.ts`：jsdom env、setupFiles `tests/setup.ts` 引入 `@testing-library/jest-dom`
- [X] T037 [P] 設定 `e2e/playwright.config.ts`：3 個 spec 標籤 P1/P2/P3，webServer 自動啟動 backend + frontend

**Checkpoint**：DB 已遷移、Auth pipeline 就緒、前端可呼叫受保護端點 → 三個 user story 可平行開工

---

## Phase 3: User Story 1 — 訪客註冊並登入（Priority: P1）🎯 MVP

**Goal**：訪客可註冊、收驗證信、驗證後登入，登入失敗達上限被鎖定；登入後看到 dashboard，可登出。

**Independent Test**：執行 `e2e/tests/registration.spec.ts`：開 `/register` → 提交新 Email + 強密碼 → Mailpit 取信點驗證連結 → `/login` 用憑證登入 → 抵達 `/dashboard` 顯示登入後內容；登出後再訪 `/dashboard` 被導回 `/login`。

### Tests for US1（先寫，必須失敗）⚠️

- [X] T038 [P] [US1] Backend feature test `backend/tests/Feature/Auth/RegisterTest.php`：正常註冊回 201；重複 Email 回 422；密碼太短回 422；超過 IP/h 10 次回 429
- [X] T039 [P] [US1] Backend feature test `backend/tests/Feature/Auth/EmailVerificationTest.php`：有效 token → email_verified_at 變非 NULL；過期 token → 410；舊 token 在新 token 發出後 → 410（FR-013）
- [X] T040 [P] [US1] Backend feature test `backend/tests/Feature/Auth/LoginTest.php`：正確憑證 + verified → 200 設 session cookie；未驗證 → 422 一致訊息；錯誤密碼 5 次後 → 429 lockout；勾 remember → cookie lifetime 14 天
- [X] T041 [P] [US1] Backend feature test `backend/tests/Feature/Auth/LogoutTest.php`：POST /logout 後 session 失效，/me 回 401
- [X] T042 [P] [US1] Backend feature test `backend/tests/Feature/Auth/MeTest.php`：未登入回 401；登入後回 Member resource
- [X] T043 [P] [US1] Backend feature test `backend/tests/Feature/Auth/ResendVerificationTest.php`：重發後舊 token 失效；無論 email 是否存在皆 200（FR-009 同 pattern）
- [X] T044 [P] [US1] Frontend Vitest `frontend/tests/forms/RegisterForm.test.tsx`：必填驗證、密碼強度 client 端提示、submit 後成功訊息
- [X] T045 [P] [US1] Frontend Vitest `frontend/tests/forms/LoginForm.test.tsx`：帳號鎖定錯誤訊息渲染、Remember me checkbox 行為
- [X] T046 [P] [US1] Frontend Vitest `frontend/tests/routes/VerifyEmailPage.test.tsx`：?token=xxx 自動 POST 並顯示成功/失敗
- [X] T047 [P] [US1] Playwright `e2e/tests/registration.spec.ts`：完整 P1 流程（含讀 Mailpit API 取信）

### Backend 實作 US1

- [X] T048 [US1] 建立 EmailVerificationToken migration `backend/database/migrations/2026_05_22_000003_create_email_verification_tokens_table.php`（依 E3）
- [X] T049 [US1] 建立 `backend/app/Models/EmailVerificationToken.php`（belongsTo Member、scope active）
- [X] T050 [P] [US1] 建立 `backend/app/Notifications/VerifyEmailNotification.php` implements `ShouldQueue`，內容含 frontend `/verify-email?token=...` 連結
- [X] T051 [US1] 建立 `backend/app/Services/RegistrationService.php`（建立 Member + Credential + token；觸發 Notification；寫 AuditEvent `registration`）
- [X] T052 [US1] 建立 `backend/app/Services/EmailVerificationService.php`（驗證 token、消費、更新 email_verified_at；舊 token 作廢；寫 audit）
- [X] T053 [US1] 建立 `backend/app/Services/LoginService.php`（驗證憑證、檢查 verified、檢查 locked_until、寫 audit；失敗計次與鎖定）
- [X] T054 [US1] 建立 `backend/app/Http/Requests/Auth/RegisterRequest.php`、`LoginRequest.php`（FR-001/002 驗證、Email lowercase normalize）
- [X] T055 [US1] 建立 `backend/app/Http/Controllers/Api/V1/AuthController.php`：`register`、`verifyEmail`、`resendVerification`、`login`、`logout`、`me`
- [X] T056 [US1] 於 `backend/routes/api.php` 註冊 US1 路由：POST `/v1/auth/register`（throttle:register）、POST `/v1/auth/email/verify`、POST `/v1/auth/email/resend`（throttle:register）、POST `/v1/auth/login`、POST `/v1/auth/logout`（auth:sanctum）、GET `/v1/auth/me`（auth:sanctum）
- [X] T057 [US1] 建立 `backend/app/Http/Resources/MemberResource.php`（對齊 contracts schema：uuid/email/email_verified/display_name/avatar_url/contact_info/last_login_at）
- [X] T058 [US1] 於 LoginService 實作 FR-016「記住我」+ 滑動續期：1) `backend/config/session.php` 設 `'expire_on_close' => true`，未勾 remember 時 session cookie 隨關閉瀏覽器失效；2) 呼叫 `Auth::attempt($credentials, $remember)`，`$remember=true` 時 Laravel 寫入 `remember_*` cookie；3) 建立 `backend/app/Http/Middleware/SlidingRememberCookie.php`：對**每個已驗證請求**（`Auth::viaRemember()` 或一般 authenticated 皆同），讀取目前 `remember_*` cookie 值並以 `Cookie::queue($name, $value, 60*24*14)` 重新寫入，達成「14 天滑動續期」（預設 Laravel 是 5 年一次性）；4) 於 `backend/bootstrap/app.php` 將該 middleware append 進 `web` group（Sanctum SPA 走 web stack）；補測：a) 未勾 → response cookie 無 `remember_*` Max-Age；b) 勾 → Max-Age 約 14 天；c) **滑動**：時鐘前進 7 天後再請求 → response cookie Max-Age 再次回到 14 天（用 `Carbon::setTestNow()` 模擬）

### Frontend 實作 US1

- [X] T059 [P] [US1] 建立 `frontend/src/lib/schemas.ts`（Zod schemas：registerSchema、loginSchema、verifyTokenSchema，與 contracts 對齊）
- [X] T060 [P] [US1] 建立 `frontend/src/components/forms/RegisterForm.tsx`（react-hook-form + Zod resolver、client-side 密碼強度提示、422 server error map）
- [X] T061 [P] [US1] 建立 `frontend/src/components/forms/LoginForm.tsx`（含 Remember me checkbox、429 lockout 訊息）
- [X] T062 [US1] 建立 `frontend/src/routes/(auth)/register.tsx`、`login.tsx`、`verify-email.tsx`（loader 解析 ?token、自動 POST、成功 navigate to /login）
- [X] T063 [US1] 建立 `frontend/src/routes/_protected/dashboard.tsx`（顯示「歡迎 {display_name 或 email}」、Logout 按鈕呼叫 POST /logout 後 redirect /login）
- [X] T064 [US1] 將 ProtectedRoute 套到 `_protected/*` route group；login 成功後跳 `?redirectTo` 或 `/dashboard`

**Checkpoint**：US1 全部測試綠燈 → MVP 可獨立交付（註冊→驗證→登入→登出）

---

## Phase 4: User Story 2 — 會員管理個人資料（Priority: P2）

**Goal**：已登入會員可查/改個資（顯示名稱、聯絡資訊、頭像），可登出。

**Independent Test**：執行 `e2e/tests/profile.spec.ts`：登入既有會員 → 進 `/profile` → 改 display_name + 上傳 2MB png → 儲存 → 重新整理仍顯示變更；未登入直訪 `/profile` 被導回 `/login` 並於登入後返回原頁。

### Tests for US2（先寫，必須失敗）⚠️

- [X] T065 [P] [US2] Backend feature test `backend/tests/Feature/Profile/ShowProfileTest.php`：未登入 401；登入後回 200 含 Member resource
- [X] T066 [P] [US2] Backend feature test `backend/tests/Feature/Profile/UpdateProfileTest.php`：display_name 64 字以內成功；超長 422
- [X] T067 [P] [US2] Backend feature test `backend/tests/Feature/Profile/UploadAvatarTest.php`：合法 jpg/png/webp 成功；超 2MB 422；exe 偽裝 422；上傳後舊檔刪除
- [X] T068 [P] [US2] Frontend Vitest `frontend/tests/forms/ProfileForm.test.tsx`：dirty 狀態 disabled submit；server 422 渲染欄位錯誤
- [X] T069 [P] [US2] Frontend Vitest `frontend/tests/components/AvatarUploader.test.tsx`：drag-drop 行為、preview、檔案大小驗證
- [X] T070 [P] [US2] Playwright `e2e/tests/profile.spec.ts`：完整 P2 流程

### Backend 實作 US2

- [X] T071 [US2] 建立 `backend/app/Services/ProfileService.php`（取/改個資、寫 audit）
- [X] T072 [US2] 建立 `backend/app/Services/AvatarService.php`（接收 UploadedFile → 驗證 mime+size → 存 `storage/app/public/avatars/{uuid}.{ext}` → 刪舊檔 → 更新 members.avatar_path）
- [X] T073 [US2] 建立 `backend/app/Http/Requests/Profile/UpdateProfileRequest.php`、`UploadAvatarRequest.php`（mimes:jpg,png,webp,max:2048）
- [X] T074 [US2] 建立 `backend/app/Http/Controllers/Api/V1/ProfileController.php`：`show`、`update`、`uploadAvatar`
- [X] T075 [US2] 於 `backend/routes/api.php` 註冊：GET `/v1/profile`、PATCH `/v1/profile`、POST `/v1/profile/avatar`（皆 auth:sanctum）

### Frontend 實作 US2

- [X] T076 [P] [US2] 補 `frontend/src/lib/schemas.ts`：profileSchema、avatarSchema
- [X] T077 [P] [US2] 建立 `frontend/src/components/forms/ProfileForm.tsx`（react-hook-form、dirty/disabled、optimistic update）
- [X] T078 [P] [US2] 建立 `frontend/src/components/AvatarUploader.tsx`（drag-drop、preview、size guard）
- [X] T079 [US2] 建立 `frontend/src/routes/_protected/profile.tsx`：左欄個資表單、右欄頭像；含 Logout 按鈕
- [X] T080 [US2] 於 dashboard 加入 `Link to="/profile"` 入口

**Checkpoint**：US1 + US2 皆獨立可用

---

## Phase 5: User Story 3 — 密碼變更與遺忘密碼重設（Priority: P3）

**Goal**：登入會員可變更密碼（其他 session 失效）；訪客可透過 Email 重設密碼。

**Independent Test**：執行 `e2e/tests/password-reset.spec.ts`：
- 流程 A：登入 → `/password` 改密碼 → 登出 → 用新密碼登入成功
- 流程 B：`/forgot-password` 輸入 email → Mailpit 收信點連結 → `/reset-password?token=...` 設新密碼 → 用新密碼登入成功

### Tests for US3（先寫，必須失敗）⚠️

- [ ] T081 [P] [US3] Backend feature test `backend/tests/Feature/Password/ChangePasswordTest.php`：current_password 正確 → 200；錯誤 → 422；變更後 other sessions 全失效（DB 查 sessions table）
- [ ] T082 [P] [US3] Backend feature test `backend/tests/Feature/Password/ForgotPasswordTest.php`：合法 email 200；不存在 email 也 200（FR-009）；同 email/h >3 次 429；舊 token 失效
- [ ] T083 [P] [US3] Backend feature test `backend/tests/Feature/Password/ResetPasswordTest.php`：有效 token + 強密碼 → 200；過期 → 410；已使用 → 410；重設後 other sessions 失效
- [ ] T084 [P] [US3] Frontend Vitest `frontend/tests/forms/ChangePasswordForm.test.tsx`、`ForgotPasswordForm.test.tsx`、`ResetPasswordForm.test.tsx`
- [ ] T085 [P] [US3] Playwright `e2e/tests/password-reset.spec.ts`：流程 A + B

### Backend 實作 US3

- [ ] T086 [US3] 建立 PasswordResetToken migration `backend/database/migrations/2026_05_22_000004_create_password_reset_tokens_table.php`（依 E4）
- [ ] T087 [US3] 建立 `backend/app/Models/PasswordResetToken.php`
- [ ] T088 [P] [US3] 建立 `backend/app/Notifications/ResetPasswordNotification.php` implements `ShouldQueue`
- [ ] T089 [US3] 建立 `backend/app/Services/ChangePasswordService.php`（驗證舊密碼、bcrypt 新密碼、更新 `credentials.password_changed_at`、廢除其他 sessions、寫 audit）
- [ ] T090 [US3] 建立 `backend/app/Services/ForgotPasswordService.php`（無論 email 是否存在皆走相同 latency；存在時建立 token + 寄信 + 廢除舊 token；寫 audit）
- [ ] T091 [US3] 建立 `backend/app/Services/ResetPasswordService.php`（驗證 token + 強度 → 更新密碼 + 消費 token + 廢除全部 sessions + 寫 audit）
- [ ] T092 [US3] 建立 `backend/app/Http/Requests/Password/*`：ChangePasswordRequest、ForgotPasswordRequest、ResetPasswordRequest
- [ ] T093 [US3] 建立 `backend/app/Http/Controllers/Api/V1/PasswordController.php`：`change`、`forgot`、`reset`
- [ ] T094 [US3] 於 `backend/routes/api.php` 註冊：PATCH `/v1/profile/password`（auth:sanctum）、POST `/v1/auth/password/forgot`（throttle:password-reset）、POST `/v1/auth/password/reset`

### Frontend 實作 US3

- [ ] T095 [P] [US3] 補 `frontend/src/lib/schemas.ts`：changePasswordSchema、forgotPasswordSchema、resetPasswordSchema
- [ ] T096 [P] [US3] 建立 `frontend/src/components/forms/ChangePasswordForm.tsx`、`ForgotPasswordForm.tsx`、`ResetPasswordForm.tsx`
- [ ] T097 [US3] 建立 `frontend/src/routes/_protected/password.tsx`（變更密碼頁；成功後因 session 失效自動回 login）
- [ ] T098 [US3] 建立 `frontend/src/routes/(auth)/forgot-password.tsx`、`reset-password.tsx`（後者 loader 解析 ?token）
- [ ] T099 [US3] 於 dashboard 與 profile 加入 `Link to="/password"`、登入頁加入 `Link to="/forgot-password"`

**Checkpoint**：US1/US2/US3 皆獨立可用

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**：保留期清理、可觀測性、README、安全與效能 walk-through

- [ ] T100 [P] 建立 `backend/app/Console/Commands/PruneAuditEventsCommand.php`：刪除 `created_at < now-30 days`（FR-014）；於 `backend/routes/console.php` 排程 `daily()`
- [ ] T101 [P] 設定 Laravel logging channel `stderr` JSON 格式於 `backend/config/logging.php`（章程 V）
- [ ] T102 [P] 加 frontend `frontend/src/components/ErrorBoundary.tsx` 並包在 RouterProvider 外（章程 V）
- [ ] T103 [P] 撰寫 `backend/README.md`（安裝、artisan 常用指令、測試）
- [ ] T104 [P] 撰寫 `frontend/README.md`（dev、build、test）
- [ ] T105 [P] 撰寫 repo root `README.md`（總覽、quickstart 連結）
- [ ] T106 跑 `specs/001-member-system/quickstart.md` 手動 walkthrough 確認 P1 可走通
- [ ] T107 跑全部測試 + Playwright，確認綠燈；補 missing edge case 測試
- [ ] T108 [P] 建立 `e2e/tests/login-perf.spec.ts` 對 `/v1/auth/login` 連續打 100 次（含失敗情境），量測 p99 latency 並 assert < 2000 ms（SC-004）
- [ ] T109 [P] 建立 `backend/tests/Feature/Security/BruteForceTest.php`：以 6 組錯誤密碼連打 → 確認第 6 次起回 429 lockout 且 audit `login.lockout` 已寫入（SC-006 baseline）；可選用 OWASP ZAP baseline 掃描作為 CI step（記錄於 `backend/README.md`）

---

## Dependencies & Execution Order

### Phase 依賴

- Phase 1 (Setup)：無依賴，立即可開
- Phase 2 (Foundational)：需 Phase 1 完成；**阻塞全部 US**
- Phase 3/4/5 (US1/US2/US3)：需 Phase 2 完成；理論上可並行（不同檔案），實務上 P1 → P2 → P3 漸進交付
- Phase 6 (Polish)：需所有目標 US 完成

### User Story 之間

- US1 (P1)：完全獨立
- US2 (P2)：需 US1 已建立 Member/AuditEvent/auth pipeline，但 spec 上 Independent Test 仍可單獨 seed 一個 verified member 後執行
- US3 (P3)：同樣需 Foundational + Auth pipeline；流程 A 需登入態，可 seed verified member

### Story 內部順序

- Tests（前綴 T038/T065/T081 等）**必須先寫且失敗**（章程 II）
- Migrations → Models → Services → Requests → Controllers → Routes
- Frontend：schemas → forms → routes → 入口連結

### Parallel Opportunities

- Phase 1：T002~T008 [P] 全可並行
- Phase 2：T013/T014/T016~T019 [P]、T027~T034 [P]、T035~T037 [P]
- Phase 3 Tests：T038~T047 全 [P]
- Phase 3 Frontend：T059~T061 [P]
- Phase 4 Tests：T065~T070 全 [P]
- Phase 4 Frontend：T076~T078 [P]
- Phase 5 Tests：T081~T085 全 [P]
- Phase 5 Frontend：T095/T096 [P]
- Phase 6：T100~T105、T108、T109 全 [P]

---

## Parallel Example：User Story 1 測試批次

```bash
# 一次起跑（不同檔案、互不干擾）：
Task: "Backend feature test backend/tests/Feature/Auth/RegisterTest.php"
Task: "Backend feature test backend/tests/Feature/Auth/EmailVerificationTest.php"
Task: "Backend feature test backend/tests/Feature/Auth/LoginTest.php"
Task: "Frontend Vitest frontend/tests/forms/RegisterForm.test.tsx"
Task: "Frontend Vitest frontend/tests/forms/LoginForm.test.tsx"
Task: "Playwright e2e/tests/registration.spec.ts"
```

---

## Implementation Strategy

### MVP First（僅 US1）

1. Phase 1 Setup
2. Phase 2 Foundational
3. Phase 3 US1
4. **STOP & VALIDATE**：跑 `e2e/tests/registration.spec.ts` + 手動跑 quickstart P1
5. 可 demo / 部署

### Incremental Delivery

1. Setup + Foundational
2. + US1 → 測試 + demo（MVP）
3. + US2 → 測試 + demo（會員可改個資、登出）
4. + US3 → 測試 + demo（完整密碼維護）
5. + Polish → 上線

### Parallel Team Strategy

Phase 2 完成後三人分工：
- Dev A：US1（auth + register/verify/login/logout）
- Dev B：US2（profile + avatar）
- Dev C：US3（password change/forgot/reset）
- 各自的 Phase tests 先綠燈，最後一起跑 Playwright + Polish

---

## Notes

- 章程 II（Test-First, NON-NEGOTIABLE）：每個 US 內，所有 Tests 任務必須先於 Implementation 任務完成
- 章程 III（獨立可測）：US2/US3 不得在 implementation 中對 US1 程式碼產生「移除即崩潰」的硬依賴；共用元件放 Foundational
- 章程 IV（YAGNI）：tasks 內未列入 2FA、社交登入、角色權限、帳號自刪、CAPTCHA（皆在 spec Assumptions / Clarifications 排除）
- 章程 V（Observability）：T024 AuditService、T100 PruneAuditEvents、T101 stderr JSON log、T102 ErrorBoundary 確保
- 每完成一條 task 建議 commit（保留可回溯性）；spec-kit `git-config.yml` 將 `after_implement` 設 true 可改為每次 implement 後自動 commit
- 同檔案的 task 不可平行（即便都標 [P]）；下單時注意路徑去重
