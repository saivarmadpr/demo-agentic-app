export interface UploadedFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  content: string;
  uploadedBy: string;
  uploadedAt: number;
}

const fileStore = new Map<string, UploadedFile>();

export function storeFile(
  originalName: string,
  mimeType: string,
  content: string,
  uploadedBy: string
): UploadedFile {
  const id = `file_${crypto.randomUUID().slice(0, 8)}`;
  const file: UploadedFile = {
    id,
    originalName,
    mimeType,
    size: Buffer.byteLength(content, "utf-8"),
    content,
    uploadedBy,
    uploadedAt: Date.now(),
  };
  fileStore.set(id, file);
  return file;
}

export function getUploadedFile(
  fileId: string
): UploadedFile | null {
  return fileStore.get(fileId) ?? null;
}

export function listUploadedFiles(
  uploadedBy?: string
): UploadedFile[] {
  const all = Array.from(fileStore.values());
  if (uploadedBy)
    return all.filter((f) => f.uploadedBy === uploadedBy);
  return all;
}

export function deleteUploadedFile(fileId: string): boolean {
  return fileStore.delete(fileId);
}
