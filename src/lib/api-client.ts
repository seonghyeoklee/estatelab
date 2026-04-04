/**
 * 외부 API 호출 공통 래퍼
 * - 타임아웃
 * - 재시도 (지수 백오프)
 * - 구조화된 에러 로깅
 */

const DEFAULT_TIMEOUT = 15000;
const DEFAULT_RETRIES = 2;

interface ApiCallOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  label?: string; // 로깅용 라벨 (예: "공공데이터_실거래")
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly label?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 외부 API 호출 — 타임아웃 + 재시도 + 에러 로깅
 */
export async function apiCall(
  url: string,
  options: ApiCallOptions = {},
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, retries = DEFAULT_RETRIES, headers, label } = options;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(url, {
        headers: { 'User-Agent': 'EstateLab/1.0', ...headers },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        throw new ApiError(`HTTP ${res.status}`, res.status, label);
      }

      return res;
    } catch (err) {
      const isLast = attempt > retries;
      const errMsg = err instanceof Error ? err.message : String(err);

      if (isLast) {
        console.error(JSON.stringify({
          level: 'error',
          type: 'api_call_failed',
          label,
          url: url.split('?')[0], // 쿼리 파라미터(API키 등) 제거
          attempt,
          error: errMsg,
        }));
        throw err;
      }

      const delay = attempt * 2000;
      console.warn(JSON.stringify({
        level: 'warn',
        type: 'api_call_retry',
        label,
        attempt,
        delay,
        error: errMsg,
      }));
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error('unreachable');
}

/**
 * JSON 응답 외부 API 호출
 */
export async function apiCallJson<T>(
  url: string,
  options: ApiCallOptions = {},
): Promise<T> {
  const res = await apiCall(url, options);
  return res.json() as Promise<T>;
}
