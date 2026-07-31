import type { AdminLoginResponse } from "@faqchatbot/contracts";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { createApiClient, type ApiClient } from "./api-client.js";

const ACCESS_TOKEN_KEY = "faqchatbot_admin_access_token";
const REFRESH_TOKEN_KEY = "faqchatbot_admin_refresh_token";
const USER_KEY = "faqchatbot_admin_user";

export type AuthUser = AdminLoginResponse["user"];

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  apiClient: ApiClient;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const readStoredUser = (): AuthUser | null => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const tokenRef = useRef<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY));
  const [accessToken, setAccessTokenState] = useState<string | null>(tokenRef.current);
  const [user, setUser] = useState<AuthUser | null>(() => (tokenRef.current ? readStoredUser() : null));

  const apiClient = useMemo(() => createApiClient(() => tokenRef.current), []);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await apiClient.post<AdminLoginResponse>("/v1/auth/login", { email, password });
      tokenRef.current = response.accessToken;
      localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      setAccessTokenState(response.accessToken);
      setUser(response.user);
    },
    [apiClient],
  );

  const logout = useCallback(() => {
    tokenRef.current = null;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAccessTokenState(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: accessToken !== null, login, logout, apiClient }),
    [user, accessToken, login, logout, apiClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
