# Frontend — Member System SPA

React 19 + Vite 8 + React Router 7 + TanStack Query 5 + Tailwind CSS v4 + Zod，搭配 Sanctum SPA cookie session 與 backend API 對話。

詳細功能規格見 [`../specs/001-member-system/spec.md`](../specs/001-member-system/spec.md)。

## 環境需求

- Node.js 22 LTS
- pnpm 11+
- backend API（docker compose `app` 服務）已起在 <http://localhost:8000>

## 安裝

```powershell
pnpm install
```

## 常用指令

```powershell
pnpm dev              # Vite dev server @ http://localhost:5173
pnpm build            # tsc -b + vite build → dist/
pnpm preview          # 預覽 build 結果
pnpm test             # Vitest 跑一次
pnpm test:watch       # Vitest watch 模式
pnpm lint             # ESLint
pnpm exec tsc --noEmit # 純 type check
```

dev server 已設 proxy：`/api`、`/sanctum` → `http://localhost:8000`（見 `vite.config.ts`），所以 fetch 路徑直接寫 `/api/v1/...` 即可。

## 目錄結構

```text
src/
├── components/
│   ├── AvatarUploader.tsx
│   ├── ErrorBoundary.tsx              # 頂層 React error boundary（章程 V）
│   ├── ProtectedRoute.tsx             # 未登入 → /login?redirectTo
│   ├── forms/{Login,Register,Profile,ChangePassword,ForgotPassword,ResetPassword}Form.tsx
│   └── ui/{Alert,Button,FormField,Input}.tsx
├── lib/
│   ├── api.ts                         # fetch wrapper（CSRF cookie、credentials:include、ApiError）
│   ├── auth.ts                        # useSession() TanStack Query
│   ├── queryClient.ts                 # QueryClient (staleTime 30s)
│   └── schemas.ts                     # Zod schemas（與 backend FormRequest 對齊）
├── routes/
│   ├── auth/{Login,Register,VerifyEmail,ForgotPassword,ResetPassword}Page.tsx
│   └── protected/{Dashboard,Profile,Password}Page.tsx
├── App.tsx                            # ErrorBoundary > QueryClientProvider > RouterProvider
├── main.tsx
└── router.tsx

tests/
├── components/                        # ui 元件單元測試
├── forms/                             # 表單行為（含 422 / 429 / 410 處理）
├── routes/                            # 路由級行為（VerifyEmail 等）
├── setup.ts
└── test-utils.tsx                     # renderWithProviders helper
```

## 與後端對話的約定

- fetch wrapper 會在第一次非 GET 請求前自動 `GET /sanctum/csrf-cookie`，並把 `XSRF-TOKEN` cookie 解碼塞回 `X-XSRF-TOKEN` header
- 422 錯誤格式：`{ message, errors: { field: [msg, ...] } }` → 透過 `ApiError.fieldErrors()` flatten 給 `react-hook-form.setError()`
- 401：自動由 `ProtectedRoute` 攔截導向 `/login?redirectTo=<原路徑>`
- 429：表單統一顯示「請求過於頻繁」訊息
- 410：驗證 / 重設連結失效

## 測試備註

- Vitest 環境為 jsdom；`tests/setup.ts` 引入 `@testing-library/jest-dom`
- 測試以 `vi.stubGlobal('fetch', ...)` mock fetch，並在 `beforeEach` reset
- E2E 測試不在此專案，於 `../e2e/`（Playwright）
