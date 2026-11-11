import type { User } from './types';

export const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
export const SERVER_URL = BASE_URL.replace(/\/api$/, '');

const TOKEN_KEY = 'vs_token';
const USER_KEY = 'vs_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parse(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text || res.statusText };
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const isForm = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isForm ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      `Can't reach the server at ${BASE_URL}. Check that the backend is running.`,
      0
    );
  }

  const data = await parse(res);

  // Session expired: clear it and send the person back to sign in
  if (res.status === 401 && token) {
    clearAuth();
    window.dispatchEvent(new Event('vs:logout'));
  }
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  /** Downloads a protected file (sends the auth header) and saves it */
  async download(path: string, fallbackName: string) {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    });
    if (!res.ok) {
      const data = await parse(res);
      throw new ApiError(data.error || 'Download failed', res.status);
    }
    const blob = await res.blob();
    const match = res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = match?.[1] || fallbackName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};

/** Turns a stored path like /uploads/videos/x.mp4 into a full URL */
export function mediaUrl(url: string | null) {
  if (!url) return '';
  return url.startsWith('/') ? `${SERVER_URL}${url}` : url;
}

export function setAuthData(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function saveUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): User | null {
  try {
    const u = localStorage.getItem(USER_KEY);
    return u && getToken() ? (JSON.parse(u) as User) : null;
  } catch {
    return null;
  }
}
