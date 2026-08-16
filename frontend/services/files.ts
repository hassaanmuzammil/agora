import { api, getBlob } from "./api";
import { toFileItem } from "@/types/file";
import type { FileItem, FileResponse } from "@/types/file";

export const filesService = {
  list: async (): Promise<FileItem[]> => {
    const res = await api.get<FileResponse[]>("/files");
    return res.map(toFileItem);
  },

  upload: async (file: File, groupIds: string[] = []): Promise<FileItem> => {
    const formData = new FormData();
    formData.append("file", file);
    for (const groupId of groupIds) {
      formData.append("group_ids", groupId);
    }
    const res = await api.post<FileResponse>("/files", formData);
    return toFileItem(res);
  },

  updateGroups: async (fileId: string, groupIds: string[]): Promise<FileItem> => {
    const res = await api.put<FileResponse>(`/files/${fileId}/groups`, { group_ids: groupIds });
    return toFileItem(res);
  },

  get: async (fileId: string): Promise<FileItem> => {
    const res = await api.get<FileResponse>(`/files/${fileId}`);
    return toFileItem(res);
  },

  delete: (fileId: string) => api.delete<void>(`/files/${fileId}`),

  preview: async (fileId: string): Promise<void> => {
    const blob = await getBlob(`/files/${fileId}/content`);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },

  download: async (fileId: string, filename: string): Promise<void> => {
    const blob = await getBlob(`/files/${fileId}/content`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
