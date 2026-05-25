/**
 * Sanctum SPA cookie session fetch wrapper。
 * - 首次呼叫自動先取 /sanctum/csrf-cookie
 * - 自動把 XSRF-TOKEN cookie 解碼塞回 X-XSRF-TOKEN header
 * - credentials: 'include' 確保 cookie 被傳回後端
 * - 統一錯誤格式 ApiError
 */

export type ApiErrorBody = {
  message: string;
  errors?: Record<string, string[]>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  /** 把 422 field errors flatten 給 react-hook-form setError 用 */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    if (this.body.errors) {
      for (const [field, msgs] of Object.entries(this.body.errors)) {
        out[field] = msgs[0] ?? '';
      }
    }
    return out;
  }
}

let csrfReady = false;

async function ensureCsrf(): Promise<void> {
  if (csrfReady) return;
  // CSRF 是冪等 GET：對暫時性失敗（如 dev server 載入高峰時 proxy 回 503 或掛起）退避重試，
  // 逾時保護避免單次請求卡死。耗盡才丟錯，讓 UI fail fast 而非永久 pending。
  let lastError = '';
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch('/sanctum/csrf-cookie', { credentials: 'include', signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        csrfReady = true;
        return;
      }
      lastError = `HTTP ${res.status}`;
    } catch (e) {
      lastError = e instanceof Error && e.name === 'AbortError' ? '逾時' : '連線失敗';
    }
    await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
  }
  throw new ApiError(503, { message: `無法建立連線（CSRF token 取得失敗：${lastError}），請稍後再試` });
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export async function api<T = unknown>(
  method: Method,
  path: string,
  body?: unknown,
  extraInit: RequestInit = {},
): Promise<T> {
  const send = async (): Promise<Response> => {
    // 任何非 GET 都需要 CSRF token
    if (method !== 'GET') await ensureCsrf();

    const headers = new Headers(extraInit.headers);
    headers.set('Accept', 'application/json');

    const isFormData = body instanceof FormData;
    if (body !== undefined && !isFormData) {
      headers.set('Content-Type', 'application/json');
    }

    const xsrf = getCookie('XSRF-TOKEN');
    if (xsrf) headers.set('X-XSRF-TOKEN', xsrf);

    return fetch(path.startsWith('/') ? path : `/${path}`, {
      method,
      credentials: 'include',
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      ...extraInit,
    });
  };

  let res = await send();

  // 419 = CSRF token 過期（如改密碼/登出後 session 輪替，舊 XSRF cookie 失效）。
  // 重置旗標 → 重取新 token → 重試一次，避免使用者被一次性的 token mismatch 卡住。
  if (res.status === 419 && method !== 'GET') {
    csrfReady = false;
    res = await send();
  }

  if (res.status === 204) return undefined as T;

  const ct = res.headers.get('content-type') ?? '';
  const payload = ct.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const errBody: ApiErrorBody =
      typeof payload === 'object' && payload !== null && 'message' in payload
        ? (payload as ApiErrorBody)
        : { message: typeof payload === 'string' ? payload : '請求失敗' };
    throw new ApiError(res.status, errBody);
  }

  return payload as T;
}
