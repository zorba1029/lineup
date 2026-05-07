import { authStore } from './auth';
import type { ApiErrorBody, ApiErrorCode, RefreshResponse } from './types';

const API_BASE = '/api/v1';

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode | 'unknown';

  constructor(status: number, code: ApiErrorCode | 'unknown', message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export interface ApiFetchInit extends Omit<RequestInit, 'body'> {
  /** body가 객체이면 자동으로 JSON 직렬화 + Content-Type 추가. string/FormData 등은 그대로. */
  body?: unknown;
  /** signup/login/refresh 자체에서 사용. Authorization 헤더를 붙이지 않음. */
  skipAuth?: boolean;
  /** 내부 재귀 가드: 401 → refresh → 재시도 시 무한루프 방지. */
  _isRetry?: boolean;
}

function buildHeaders(init: ApiFetchInit, hasJsonBody: boolean): Headers {
  const headers = new Headers(init.headers);
  if (hasJsonBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!init.skipAuth) {
    const token = authStore.getAccessToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }
  return headers;
}

function isJsonBody(body: unknown): boolean {
  if (body == null) return false;
  if (typeof body === 'string') return false;
  if (body instanceof FormData) return false;
  if (body instanceof Blob) return false;
  if (body instanceof ArrayBuffer) return false;
  if (body instanceof URLSearchParams) return false;
  return typeof body === 'object';
}

async function parseErrorBody(res: Response): Promise<ApiError> {
  let code: ApiErrorCode | 'unknown' = 'unknown';
  let message = res.statusText || '요청에 실패했습니다.';
  try {
    const data = (await res.json()) as Partial<ApiErrorBody>;
    if (data && typeof data === 'object') {
      if (data.error) code = data.error;
      if (data.message) message = data.message;
    }
  } catch {
    /* 본문이 JSON이 아닐 수도 있음 — 무시 */
  }
  return new ApiError(res.status, code, message);
}

/**
 * 401 응답을 받으면 한 번만 refresh 시도.
 * 동시에 여러 요청이 401을 받을 수 있으므로 in-flight refresh promise를 공유한다.
 */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = authStore.getRefreshToken();
  if (!refreshToken) return null;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        authStore.clear();
        return null;
      }
      const data = (await res.json()) as RefreshResponse;
      if (!data.accessToken) {
        authStore.clear();
        return null;
      }
      authStore.setAccessToken(data.accessToken);
      return data.accessToken;
    } catch {
      authStore.clear();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const hasJson = isJsonBody(init.body);
  const headers = buildHeaders(init, hasJson);

  const fetchInit: RequestInit = {
    ...init,
    headers,
    body: hasJson
      ? JSON.stringify(init.body)
      : (init.body as BodyInit | null | undefined),
  };
  // RequestInit에는 없는 커스텀 필드 제거
  delete (fetchInit as ApiFetchInit).skipAuth;
  delete (fetchInit as ApiFetchInit)._isRetry;

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, fetchInit);

  if (res.status === 401 && !init.skipAuth && !init._isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch<T>(path, { ...init, _isRetry: true });
    }
    // refresh 실패 → 토큰은 이미 clear됨. 에러로 던짐.
    throw await parseErrorBody(res);
  }

  if (!res.ok) {
    throw await parseErrorBody(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  // 응답 본문이 비어 있을 수 있는 케이스 보호
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
