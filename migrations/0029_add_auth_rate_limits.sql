CREATE TABLE auth_rate_limits (
  scope TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  window_started_at INTEGER NOT NULL,
  attempt_count INTEGER NOT NULL CHECK (attempt_count >= 0),
  PRIMARY KEY (scope, key_hash)
);

CREATE INDEX auth_rate_limits_window_started_at
  ON auth_rate_limits(window_started_at);
