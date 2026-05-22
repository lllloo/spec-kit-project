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
  await fetch('/sanctum/csrf-cookie', { credentials: 'include' });
  csrfReady = true;
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

  const res = await fetch(path.startsWith('/') ? path : `/${path}`, {
    method,
    credentials: 'include',
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    ...extraInit,
  });

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
