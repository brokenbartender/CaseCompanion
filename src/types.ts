export interface TeleportSignal {
  page: number;
  bbox?: number[] | null; // [x, y, w, h] normalized 0-1000
  bates?: string;
  nonce?: number;
  requestedAt?: number;
  switchCompletedAt?: number;
}
