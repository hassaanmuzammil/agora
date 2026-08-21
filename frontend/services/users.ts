import { api } from "./api";
import type { User } from "@/types/auth";

export const usersService = {
  list: () => api.get<User[]>("/users"),
};
