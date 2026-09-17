CREATE TABLE IF NOT EXISTS audit_event (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  status TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  route_name TEXT,
  duration_ms BIGINT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_event_status ON audit_event (status);
CREATE INDEX IF NOT EXISTS idx_audit_event_order_id ON audit_event (order_id);
