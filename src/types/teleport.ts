export type TeleportTarget = {
  exhibitId: string;
  anchorId: string;
  pageNumber: number; // 1-based
  bbox?: [number, number, number, number] | null; // [x, y, w, h] top-left origin
};
