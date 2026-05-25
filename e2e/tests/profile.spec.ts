import { expect, test } from '@playwright/test';

/**
 * US2：個資管理 + 頭像上傳。
 * 假設：docker compose up + frontend Vite dev + 已有測試用會員可註冊登入。
 */

test('US2：登入後改 display_name + 上傳 png 頭像；未登入訪 /profile 被導回 /login', async ({ page }) => {
  const email = `e2e-p2-${Date.now()}@example.com`;
  const password = 'Strong1pass';

  // 1. 訪客直接訪 /profile → 應被導回 /login?redirectTo=/profile
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login\?redirectTo=/);

  // 2. 註冊一個會員（需要 verified；改成直接從 API 註冊 + 用 backend seeder 設 verified）
  // 簡化：用 register API + 直接從 DB 標為 verified（透過 artisan tinker 或測試 seeder）
  // 此 spec 假設先跑 registration.spec.ts 完成過註冊+驗證
  // 為獨立可跑：透過 frontend 流程
  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('密碼').fill(password);
  await page.getByLabel('顯示名稱（選填）').fill('P2 User');
  await page.getByRole('button', { name: '註冊' }).click();
  await expect(page.getByText(/註冊成功/)).toBeVisible({ timeout: 10_000 });

  // 取信驗證（寄信為非同步 queue job，需輪詢等待信件抵達）
  let link: string | undefined;
  for (let i = 0; i < 30 && !link; i++) {
    const mailRes = await page.request.get(
      `http://localhost:8026/api/v1/search?query=${encodeURIComponent('to:' + email)}`,
    );
    const mailData = (await mailRes.json()) as { messages: Array<{ ID: string }> };
    if (mailData.messages.length > 0) {
      const msgDetail = await page.request.get(
        `http://localhost:8026/api/v1/message/${mailData.messages[0].ID}`,
      );
      const body = (await msgDetail.json()) as { HTML: string; Text: string };
      link = (body.HTML + '\n' + body.Text).match(
        /http[s]?:\/\/[^\s"]+\/verify-email\?token=[A-Za-z0-9]+/,
      )?.[0];
    }
    if (!link) await page.waitForTimeout(300);
  }
  if (!link) throw new Error('無驗證連結');
  await page.goto(link);
  await expect(page.getByText(/Email 已驗證完成/)).toBeVisible();

  // 3. 登入
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('密碼').fill(password);
  await page.getByRole('button', { name: '登入' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // 4. 進個資頁
  await page.getByRole('link', { name: /個人資料/ }).click();
  await expect(page).toHaveURL(/\/profile$/);

  // 5. 改 display_name
  await page.getByLabel('顯示名稱').fill('P2 Edited');
  await page.getByLabel('聯絡資訊').fill('Discord: edited#0001');
  await page.getByRole('button', { name: '儲存變更' }).click();
  await expect(page.getByText('已儲存')).toBeVisible();

  // 6. 上傳頭像（內建 1x1 png；avoid __dirname，Playwright 以 ESM 執行）
  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORk5CYII=',
    'base64',
  );
  await page
    .locator('[data-testid="avatar-input"]')
    .setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: pngBuffer });
  await expect(page.getByAltText('頭像預覽')).toBeVisible();

  // 7. 重整頁面，變更仍在
  await page.reload();
  await expect(page.getByLabel('顯示名稱')).toHaveValue('P2 Edited');
  await expect(page.getByAltText('頭像預覽')).toBeVisible();
});
