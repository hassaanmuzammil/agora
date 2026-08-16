import { api } from "./api";
import type { GroupSummary } from "@/types/auth";

export interface Group extends GroupSummary {
  description: string | null;
  created_at: string;
}

export const groupsService = {
  list: () => api.get<Group[]>("/groups"),
};
