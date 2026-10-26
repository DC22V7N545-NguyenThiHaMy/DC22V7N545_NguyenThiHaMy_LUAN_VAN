export class ApiError extends Error {
  status: number;
  detail: any;
  constructor(message: string, status: number, detail: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

interface Options { method?: string; body?: unknown; headers?: Record<string, string> }

// Same-origin JSON client. FormData bodies are sent as-is; the session cookie travels with every call.
export async function api<T = any>(url: string, options: Options = {}): Promise<T> {
  const { body } = options;
  const isForm = body instanceof FormData;
  const response = await fetch('/api' + url, {
    method: options.method,
    credentials: 'same-origin',
    headers: { ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    body: body === undefined ? undefined : isForm || typeof body === 'string' ? (body as BodyInit) : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({ detail: 'Không thể kết nối máy chủ.' }));
  if (!response.ok) {
    const detail = data.detail;
    const message = Array.isArray(detail) ? detail.map((x: any) => `${x.loc?.at(-1) || ''}: ${x.msg}`).join(' · ') : detail?.message || detail;
    throw new ApiError(message || 'Có lỗi xảy ra. Vui lòng thử lại.', response.status, detail);
  }
  return data as T;
}

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Có lỗi xảy ra. Vui lòng thử lại.');
