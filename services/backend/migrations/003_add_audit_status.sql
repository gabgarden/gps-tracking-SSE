ALTER TABLE order_status ADD COLUMN IF NOT EXISTS audit_status TEXT NOT NULL DEFAULT 'pending';
