import { api } from "./api";
import type { GroupSummary, User } from "@/types/auth";

export interface Group extends GroupSummary {
  description: string | null;
  created_at: string;
}

export const groupsService = {
  list: () => api.get<Group[]>("/groups"),
  create: (payload: { name: string; description?: string }) =>
    api.post<Group>("/groups", payload),
  addMember: (groupId: string, userId: string) =>
    api.post<User>(`/groups/${groupId}/members/${userId}`),
  removeMember: (groupId: string, userId: string) =>
    api.delete<void>(`/groups/${groupId}/members/${userId}`),
};
