CREATE TABLE IF NOT EXISTS car_movement (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  destination_lat DOUBLE PRECISION NOT NULL,
  destination_lng DOUBLE PRECISION NOT NULL,
  route_name TEXT,
  remaining_distance_km DOUBLE PRECISION NOT NULL,
  received_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_car_movement_order_id ON car_movement (order_id, received_at DESC);
