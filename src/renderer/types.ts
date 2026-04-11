export interface SnapItem {
  id: string;
  filePath: string;
  thumbPath: string;
  sourceApp: string | null;
  width: number;
  height: number;
  isOpen: number;
  createdAt: string;
  annotations: string | null;
  thumbnailUpdatedAt: string | null;
}
