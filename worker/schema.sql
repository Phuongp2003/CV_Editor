CREATE TABLE IF NOT EXISTS shares (
  id TEXT PRIMARY KEY,
  hash TEXT UNIQUE NOT NULL,
  payload TEXT NOT NULL,
  size INTEGER NOT NULL,
  renew_token_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shares_expires_at ON shares (expires_at);

CREATE TABLE IF NOT EXISTS ip_daily_usage (
  ip_hash TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, day)
);

CREATE INDEX IF NOT EXISTS idx_ip_daily_usage_day ON ip_daily_usage (day);

CREATE TABLE IF NOT EXISTS global_daily_usage (
  day TEXT PRIMARY KEY,
  requests INTEGER NOT NULL DEFAULT 0,
  writes INTEGER NOT NULL DEFAULT 0,
  reads INTEGER NOT NULL DEFAULT 0
);
