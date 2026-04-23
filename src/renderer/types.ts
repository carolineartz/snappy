export interface SnapItem {
  id: string;
  name: string | null;
  filePath: string;
  thumbPath: string;
  sourceApp: string | null;
  width: number;
  height: number;
  isOpen: number;
  createdAt: string;
  annotations: string | null;
  thumbnailUpdatedAt: string | null;
  ocrText: string | null;
  classificationLabels: string | null;
}
