import type { GroupSummary } from "./auth";

// Shape returned directly by the backend (FileResponse).
export interface FileResponse {
  id: string;
  filename: string;
  blob_storage_path: string;
  vector_storage_path: string | null;
  mime_type: string | null;
  size: number | null;
  user_id: string | null;
  groups: GroupSummary[];
  created_at: string;
}

// UI-facing shape.
export interface FileItem {
  id: string;
  name: string;
  mimeType?: string;
  size?: number;
  uploadedAt?: string;
  createdAt?: string;
  vectorIndexed?: boolean;
  userId?: string;
  groups: GroupSummary[];
}

export function toFileItem(res: FileResponse): FileItem {
  return {
    id: res.id,
    name: res.filename,
    mimeType: res.mime_type ?? undefined,
    size: res.size ?? undefined,
    createdAt: res.created_at,
    uploadedAt: res.created_at,
    vectorIndexed: !!res.vector_storage_path,
    userId: res.user_id ?? undefined,
    groups: res.groups,
  };
}
