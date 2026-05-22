import { expect, test } from '@playwright/test';

/**
 * SC-004 baseline：99% 登入請求 p99 < 2000 ms。
 *
 * 本測試不走瀏覽器，純打 backend `/api/v1/auth/login` 端點 100 次（成功與失敗交錯），
 * 量測 wall-clock latency 並 assert p99 < 2000 ms。
 *
 * 前置：spec-kit-app 容器運行於 :8000，並先註冊 perf-test@example.com / Strong1pass 並驗證。
 * 為避免 5/min throttle 干擾，採用「成功 + 不同 email 失敗」混合策略以及小幅 sleep。
 */

import { request as pwRequest } from '@playwright/test';

const BACKEND = 'http://localhost:8000';
const MAILPIT_API = 'http://localhost:8026/api/v1';

async function getLatestVerificationLink(toEmail: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${MAILPIT_API}/search?query=` + encodeURIComponent(`to:${toEmail}`));
    if (res.ok) {
      const data = (await res.json()) as { messages: Array<{ ID: string }> };
      if (data.messages.length > 0) {
        const id = data.messages[0].ID;
        const detail = (await (await fetch(`${MAILPIT_API}/message/${id}`)).json()) as {
          HTML: string;
          Text: string;
        };
        const body = `${detail.HTML}\n${detail.Text}`;
        const match = body.match(/\/verify-email\?token=([A-Za-z0-9]+)/);
        if (match) return match[1];
      }
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('找不到 verification 信件');
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo);
}

test('SC-004：/api/v1/auth/login 100 次 p99 < 2000 ms', async ({ request }) => {
  test.setTimeout(180_000);

  const email = `perf-${Date.now()}@example.com`;
  const password = 'Strong1pass';

  // 1. 註冊 + 驗證
  await request.delete(`${MAILPIT_API}/messages`).catch(() => undefined);
  const reg = await request.post(`${BACKEND}/api/v1/auth/register`, {
    data: { email, password, display_name: 'Perf' },
  });
  expect(reg.status()).toBe(201);

  const token = await getLatestVerificationLink(email);
  const verify = await request.post(`${BACKEND}/api/v1/auth/email/verify`, {
    data: { token },
  });
  expect(verify.status()).toBe(200);

  // 2. 連打 100 次 login；為避免 throttle 鎖死，每個 request 用獨立 APIRequestContext（無 cookie 共享、IP 同但 email key 變化）
  const latencies: number[] = [];

  for (let i = 0; i < 100; i++) {
    // 成功與失敗交錯：90% 成功（perf 帳號用 cycling email avoidance via cooldown）
    // 為簡化：每 5 次使用獨立 email 故意失敗，避免相同 email throttle 集中
    const useReal = i % 10 !== 0;
    const ctx = await pwRequest.newContext();
    const start = performance.now();
    const res = await ctx.post(`${BACKEND}/api/v1/auth/login`, {
      data: {
        email: useReal ? email : `noexist-${i}@example.com`,
        password: useReal ? password : 'WrongPass1',
      },
    });
    const ms = performance.now() - start;
    latencies.push(ms);

    // 容忍 422/200，但若連續 429 表示 throttle 介入 → 跳出
    if (res.status() === 429 && useReal) {
      await ctx.dispose();
      throw new Error(`Unexpected throttle on real login at iter ${i}`);
    }
    await ctx.dispose();

    // 每次間隔 30ms 避免單瞬間打爆 throttle window
    await new Promise((r) => setTimeout(r, 30));
  }

  latencies.sort((a, b) => a - b);
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);

  console.log(`[login-perf] n=${latencies.length} p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms p99=${p99.toFixed(1)}ms`);

  expect(p99).toBeLessThan(2000);
});
