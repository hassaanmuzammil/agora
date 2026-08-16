import { api } from "./api";
import type { LoginPayload, LoginResponse, User } from "@/types/auth";
import { setToken, clearToken } from "@/lib/auth";

export const authService = {
  me: () => api.get<User>("/auth/me"),

  login: async (payload: LoginPayload) => {
    const response = await api.post<LoginResponse>("/auth/login", payload);

    setToken(response.token);

    return response;
  },

  logout: async () => {
    await api.post<void>("/auth/logout");

    clearToken();
  },
};