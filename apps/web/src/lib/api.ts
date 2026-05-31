const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? '';

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { accessToken?: string } = {},
): Promise<T> {
  const { accessToken, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: string } };
    const message = body.error?.message ?? res.statusText;
    const error = new Error(message) as Error & { code?: string; status?: number };
    error.code = body.error?.code;
    error.status = res.status;
    throw error;
  }

  return res.json() as Promise<T>;
}
