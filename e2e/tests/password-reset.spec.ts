import { expect, test } from '@playwright/test';

/**
 * US3 P3：密碼變更與重設
 *
 * 流程 A：登入 → /password 變更密碼 → 登出 → 用新密碼登入成功
 * 流程 B：/forgot-password 輸入 email → Mailpit 取信點連結 → /reset-password?token=… →
 *         設新密碼 → 用新密碼登入成功
 *
 * 前置：與 registration.spec.ts 相同（docker compose up、frontend dev server、migrate:fresh）
 */

const MAILPIT_API = 'http://localhost:8026/api/v1';

async function getLatestResetLink(toEmail: string): Promise<string> {
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
        const match = body.match(/http[s]?:\/\/[^\s"]+\/reset-password\?token=[A-Za-z0-9]+/);
        if (match) return match[0];
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('找不到 password reset 信件');
}

async function getLatestVerificationLink(toEmail: string): Promise<string> {
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

async function registerAndVerify(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('密碼').fill(password);
  await page.getByLabel('顯示名稱（選填）').fill('P3 User');
  await page.getByRole('button', { name: '註冊' }).click();
  await expect(page.getByText(/註冊成功/)).toBeVisible({ timeout: 10_000 });

  const verifyLink = await getLatestVerificationLink(email);
  await page.goto(verifyLink);
  await expect(page.getByText(/Email 已驗證完成/)).toBeVisible({ timeout: 10_000 });
}

async function login(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('密碼').fill(password);
  await page.getByRole('button', { name: '登入' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('US3 流程 A：登入 → 變更密碼 → 用新密碼重新登入', async ({ page, request }) => {
  const email = `p3a-${Date.now()}@example.com`;
  const oldPassword = 'Old1pass!!';
  const newPassword = 'New1pass!!';

  await request.delete(`${MAILPIT_API}/messages`).catch(() => undefined);
  await registerAndVerify(page, email, oldPassword);
  await login(page, email, oldPassword);

  // 前往變更密碼頁
  await page.goto('/password');
  await page.getByLabel('目前密碼').fill(oldPassword);
  await page.getByLabel('新密碼').fill(newPassword);
  await page.getByRole('button', { name: '變更密碼' }).click();

  // 密碼變更成功會主動登出（session 失效），導回 /login
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

  // 用舊密碼登入應失敗
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('密碼').fill(oldPassword);
  await page.getByRole('button', { name: '登入' }).click();
  await expect(page.getByText(/認證失敗/)).toBeVisible({ timeout: 10_000 });

  // 用新密碼登入成功
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('密碼').fill(newPassword);
  await page.getByRole('button', { name: '登入' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('US3 流程 B：忘記密碼 → 收信 → 重設 → 新密碼登入', async ({ page, request }) => {
  const email = `p3b-${Date.now()}@example.com`;
  const oldPassword = 'Old1pass!!';
  const newPassword = 'Brand2new!!';

  await request.delete(`${MAILPIT_API}/messages`).catch(() => undefined);
  await registerAndVerify(page, email, oldPassword);

  // 申請忘記密碼
  await request.delete(`${MAILPIT_API}/messages`).catch(() => undefined);
  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: '寄出重設連結' }).click();
  await expect(page.getByText(/若該帳號存在/)).toBeVisible({ timeout: 10_000 });

  // 取連結 → 重設
  const resetLink = await getLatestResetLink(email);
  await page.goto(resetLink);
  await page.getByLabel('新密碼').fill(newPassword);
  await page.getByRole('button', { name: '重設密碼' }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

  // 新密碼登入成功
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('密碼').fill(newPassword);
  await page.getByRole('button', { name: '登入' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
