CREATE TABLE IF NOT EXISTS order_status (
  order_id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL,
  status TEXT NOT NULL,
  route_name TEXT,
  duration_ms BIGINT,
  occurred_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
