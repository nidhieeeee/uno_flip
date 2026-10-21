'use client';

const TOKEN_KEY = 'uno_player_token';

export function getClientPlayerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setClientPlayerToken(token: string) {
  if (typeof window === 'undefined' || !token) return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getClientPlayerToken();
  const headers = new Headers(init?.headers);
  if (token && !headers.has('x-player-token')) {
    headers.set('x-player-token', token);
  }
  return fetch(input, {
    ...init,
    headers,
  });
}
