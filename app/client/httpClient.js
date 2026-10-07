const TOKEN_KEY = 'resonance_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

async function req(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`);
  return data;
}

export const api = {
  health: () => req('/api/health'),
  login: (body) => req('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => req('/api/auth/me'),
  comfort: (body) => req('/api/comfort', { method: 'POST', body: JSON.stringify(body) }),
  memoryList: () => req('/api/memory'),
  memorySave: (body) => req('/api/memory', { method: 'POST', body: JSON.stringify(body) }),
  memoryClear: () => req('/api/memory', { method: 'DELETE' }),
  memoryDelete: (id) => req(`/api/memory/${id}`, { method: 'DELETE' }),
  resonanceMatch: (body) => req('/api/resonance/match', { method: 'POST', body: JSON.stringify(body) }),
  resonanceShare: (body) => req('/api/resonance/share', { method: 'POST', body: JSON.stringify(body) }),
};
