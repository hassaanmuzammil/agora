"use client";

import { useCallback, useEffect, useState } from "react";
import { groupsService } from "@/services/groups";
import type { Group } from "@/services/groups";
import { usersService } from "@/services/users";
import type { User } from "@/types/auth";

export function useGroupMembers() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [groupsData, usersData] = await Promise.all([groupsService.list(), usersService.list()]);
      setGroups(groupsData);
      setUsers(usersData);
    } catch {
      setError("Couldn't load groups and users.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createGroup = useCallback(async (name: string) => {
    const group = await groupsService.create({ name });
    setGroups((prev) => [...prev, group]);
    return group;
  }, []);

  const toggleMember = useCallback(async (groupId: string, user: User) => {
    const isMember = user.groups.some((g) => g.id === groupId);

    if (isMember) {
      await groupsService.removeMember(groupId, user.id);
    } else {
      await groupsService.addMember(groupId, user.id);
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== user.id) return u;
        return {
          ...u,
          groups: isMember
            ? u.groups.filter((g) => g.id !== groupId)
            : [...u.groups, { id: groupId, name: groups.find((g) => g.id === groupId)?.name ?? "" }],
        };
      }),
    );
  }, [groups]);

  return { groups, users, isLoading, error, createGroup, toggleMember };
}
