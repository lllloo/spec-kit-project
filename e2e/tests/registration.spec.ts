import { expect, test } from '@playwright/test';

/**
 * US1 P1 MVP：訪客註冊 → Email 驗證 → 登入 → 看到 dashboard → 登出 → 受保護頁攔截
 *
 * 前置條件：
 * - docker compose up（mysql, mailpit, redis, app, queue）
 * - frontend Vite dev server（webServer 自動啟動於 :5173）
 * - app artisan migrate:fresh 後重設過資料庫
 */

const MAILPIT_API = 'http://localhost:8026/api/v1';

async function getLatestVerificationLink(toEmail: string): Promise<string> {
  // 輪詢 Mailpit API 找到寄給 toEmail 的最新一封信
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${MAILPIT_API}/search?query=` + encodeURIComponent(`to:${toEmail}`));
    if (res.ok) {
      const data = (await res.json()) as { messages: Array<{ ID: string }> };
      if (data.messages.length > 0) {
        const id = data.messages[0].ID;
        const detail = (await (
          await fetch(`${MAILPIT_API}/message/${id}`)
        ).json()) as { HTML: string; Text: string };
        const body = `${detail.HTML}\n${detail.Text}`;
        const match = body.match(/http[s]?:\/\/[^\s"]+\/verify-email\?token=[A-Za-z0-9]+/);
        if (match) return match[0];
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('找不到 verification 信件');
}

test('US1：訪客註冊 → 驗證 Email → 登入 → 抵達 dashboard → 登出 → 攔截受保護頁', async ({
  page,
  request,
}) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = 'Strong1pass';

  // 0. 清空既有 Mailpit 信箱（避免干擾）
  await request.delete(`${MAILPIT_API}/messages`).catch(() => undefined);

  // 1. 註冊
  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('密碼').fill(password);
  await page.getByLabel('顯示名稱（選填）').fill('E2E User');
  await page.getByRole('button', { name: '註冊' }).click();
  await expect(page.getByText(/註冊成功/)).toBeVisible({ timeout: 10_000 });

  // 2. 取信並點驗證連結
  const verifyLink = await getLatestVerificationLink(email);
  await page.goto(verifyLink);
  await expect(page.getByText(/Email 已驗證完成/)).toBeVisible({ timeout: 10_000 });

  // 3. 登入
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('密碼').fill(password);
  await page.getByRole('button', { name: '登入' }).click();

  // 4. 抵達 dashboard
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: '會員首頁' })).toBeVisible();
  await expect(page.getByText('E2E User', { exact: false })).toBeVisible();

  // 5. 登出
  await page.getByRole('button', { name: '登出' }).click();
  await expect(page).toHaveURL(/\/login/);

  // 6. 直接訪問受保護頁 → 應被導回 /login?redirectTo
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?redirectTo=/);
});
