export interface GroupSummary {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  is_admin: boolean;
  groups: GroupSummary[];
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expires_at: string;
  user: User;
}