"use client";

import { useCallback, useEffect, useState } from "react";
import { filesService } from "@/services/files";
import type { FileItem } from "@/types/file";

export function useFiles() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await filesService.list();
      setFiles(data);
    } catch {
      setError("Couldn't load files.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upload = useCallback(async (file: File, groupIds: string[] = []) => {
    setIsUploading(true);
    try {
      const uploaded = await filesService.upload(file, groupIds);
      setFiles((prev) => [uploaded, ...prev]);
      return uploaded;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const remove = useCallback(async (fileId: string) => {
    await filesService.delete(fileId);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const updateGroups = useCallback(async (fileId: string, groupIds: string[]) => {
    const updated = await filesService.updateGroups(fileId, groupIds);
    setFiles((prev) => prev.map((f) => (f.id === fileId ? updated : f)));
    return updated;
  }, []);

  return { files, isLoading, error, isUploading, refresh, upload, remove, updateGroups };
}
