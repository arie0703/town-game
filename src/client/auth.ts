import type { Me } from '../shared/types';
import { api, ApiError } from './api';

export async function fetchMe(): Promise<Me | null> {
  try {
    return await api.get<Me>('/me');
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}

// ログイン必須の画面で呼ぶ。未ログインならトップへ戻して null を返す
export async function requireLogin(): Promise<Me | null> {
  const me = await fetchMe();
  if (!me) location.hash = '#/';
  return me;
}
