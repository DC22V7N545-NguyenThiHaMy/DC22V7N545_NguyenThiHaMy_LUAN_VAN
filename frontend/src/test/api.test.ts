import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../api';

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('api client', () => {
  it('prefixes /api, sends JSON and keeps the session cookie', async () => {
    const fetchMock = mockFetch(200, { ok: true });
    await api('/cart', { method: 'POST', body: { variant_id: 3, quantity: 2 } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/cart');
    expect(init.credentials).toBe('same-origin');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"variant_id":3,"quantity":2}');
  });

  it('does not set a JSON content type for FormData uploads', async () => {
    const fetchMock = mockFetch(200, {});
    const form = new FormData();
    form.append('file', new Blob(['x']), 'a.png');
    await api('/admin/uploads', { method: 'POST', body: form });
    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBeUndefined();
    expect(fetchMock.mock.calls[0][1].body).toBe(form);
  });

  it('turns FastAPI validation errors into one readable message', async () => {
    mockFetch(422, { detail: [{ loc: ['body', 'password'], msg: 'too short' }, { loc: ['body', 'email'], msg: 'invalid' }] });
    await expect(api('/auth/register', { method: 'POST', body: {} })).rejects.toMatchObject({ message: 'password: too short · email: invalid', status: 422 });
  });

  it('exposes structured details such as email_unverified', async () => {
    mockFetch(403, { detail: { code: 'email_unverified', email: 'a@b.vn', message: 'Email chưa được xác nhận.' } });
    const error = await api('/auth/login', { method: 'POST', body: {} }).catch(e => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Email chưa được xác nhận.');
    expect(error.detail.code).toBe('email_unverified');
  });
});
