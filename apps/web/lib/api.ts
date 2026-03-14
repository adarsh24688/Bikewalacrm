const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { token?: string }
): Promise<T> {
  const { token, ...init } = options || {};

  if (!token) {
    throw new ApiError("Not authenticated", 401);
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    ...(init.headers as Record<string, string>),
  };

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(error.message || `API Error: ${res.status}`, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function apiUpload<T>(
  path: string,
  file: File,
  token: string
): Promise<T> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(error.message || `Upload Error: ${res.status}`, res.status);
  }

  return res.json();
}
