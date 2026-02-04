export interface TimeEntry {
  id: string;
  matterId: string;
  task: string;
  minutes: number;
  createdAt: string;
}

export interface DeadlineEntry {
  id: string;
  title: string;
  date: string;
  court: string;
}

export interface ReviewItem {
  id: string;
  name: string;
  reviewer: string;
  status: "queued" | "in-review" | "completed" | "qc-hold";
}

const KEYS = {
  time: "lexipro_time_entries_v1",
  deadlines: "lexipro_deadlines_v1",
  review: "lexipro_review_queue_v1",
  connectors: "lexipro_connectors_v1"
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const opsStore = {
  getTimeEntries(): TimeEntry[] {
    return read(KEYS.time, []);
  },
  saveTimeEntries(entries: TimeEntry[]) {
    write(KEYS.time, entries);
  },
  getDeadlines(): DeadlineEntry[] {
    return read(KEYS.deadlines, []);
  },
  saveDeadlines(entries: DeadlineEntry[]) {
    write(KEYS.deadlines, entries);
  },
  getReviewQueue(): ReviewItem[] {
    return read(KEYS.review, []);
  },
  saveReviewQueue(items: ReviewItem[]) {
    write(KEYS.review, items);
  },
  getConnectors(): { dms: boolean; email: boolean } {
    return read(KEYS.connectors, { dms: false, email: false });
  },
  saveConnectors(next: { dms: boolean; email: boolean }) {
    write(KEYS.connectors, next);
  }
};
