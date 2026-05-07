import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSession, User } from './types';

/**
 * 인증 토큰/유저 정보 스토어.
 * localStorage에 persist 되어 새로고침 후에도 유지된다.
 * 키: `linenb-auth`
 */
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setSession: (session: AuthSession) => void;
  setAccessToken: (token: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken }),
      setAccessToken: (token) => set({ accessToken: token }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    {
      name: 'linenb-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
);

/**
 * 컴포넌트 외부(api fetch 래퍼 등)에서 토큰을 읽기 위한 헬퍼.
 */
export const authStore = {
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  setAccessToken: (token: string) => useAuthStore.getState().setAccessToken(token),
  clear: () => useAuthStore.getState().clear(),
};
