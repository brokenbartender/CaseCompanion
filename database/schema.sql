-- JusticeAutomator case facts storage
CREATE TABLE IF NOT EXISTS case_facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plaintiff_name TEXT NOT NULL,
  defendant_name TEXT NOT NULL,
  incident_date TEXT,
  damages_claimed REAL DEFAULT 0,
  venue TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
