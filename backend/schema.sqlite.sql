-- Auto-generated from backend/config/schema.js (do not edit by hand).
-- Run `node scripts/export-schema.js` to regenerate.
-- sqlite dialect.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user','vendor','admin')),
  phone TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  business_name TEXT,
  owner_name TEXT,
  phone TEXT,
  email TEXT,
  service_region TEXT,
  address TEXT,
  status TEXT DEFAULT 'pending',
  rating NUMERIC DEFAULT 0.00,
  total_jobs INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vendors_user ON vendors (user_id);

CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors (status);

CREATE TABLE IF NOT EXISTS vendor_vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id INTEGER NOT NULL,
  name TEXT,
  plate_number TEXT,
  vehicle_type TEXT,
  capacity_tonnes NUMERIC DEFAULT 0,
  driver_name TEXT,
  driver_phone TEXT,
  status TEXT DEFAULT 'available',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vendor_vehicles_vendor ON vendor_vehicles (vendor_id);

CREATE INDEX IF NOT EXISTS idx_vendor_vehicles_type ON vendor_vehicles (vehicle_type);

CREATE TABLE IF NOT EXISTS vendor_routes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id INTEGER NOT NULL,
  from_province TEXT NOT NULL,
  from_district TEXT,
  to_province TEXT NOT NULL,
  to_district TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vendor_routes_vendor ON vendor_routes (vendor_id);

CREATE INDEX IF NOT EXISTS idx_vendor_routes_from ON vendor_routes (from_province, from_district);

CREATE INDEX IF NOT EXISTS idx_vendor_routes_to ON vendor_routes (to_province, to_district);

CREATE TABLE IF NOT EXISTS shipments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  booking_id TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  mobile_number TEXT,
  alternate_mobile TEXT,
  email TEXT,
  pickup_province TEXT,
  pickup_district TEXT,
  pickup_city TEXT,
  pickup_ward TEXT,
  pickup_floor TEXT,
  pickup_lane_access TEXT,
  pickup_address TEXT,
  drop_province TEXT,
  drop_district TEXT,
  drop_city TEXT,
  drop_ward TEXT,
  drop_floor TEXT,
  drop_address TEXT,
  home_size TEXT,
  selected_items TEXT,
  fragile_items TEXT,
  vehicle_type TEXT,
  add_on_services TEXT,
  move_date TEXT,
  alternate_date TEXT,
  preferred_time_slot TEXT,
  move_reason TEXT,
  preferred_contact TEXT,
  payment_method TEXT,
  how_found_us TEXT,
  special_notes TEXT,
  status TEXT DEFAULT 'pending',
  final_quote NUMERIC,
  distance_km NUMERIC,
  estimated_duration TEXT,
  transaction_id TEXT,
  payment_status TEXT DEFAULT 'pending',
  assigned_vendor_id INTEGER,
  approval_status TEXT DEFAULT 'pending',
  approved_by INTEGER,
  approved_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_shipments_user ON shipments (user_id);

CREATE INDEX IF NOT EXISTS idx_shipments_email ON shipments (email);

CREATE INDEX IF NOT EXISTS idx_shipments_vendor ON shipments (assigned_vendor_id);

CREATE INDEX IF NOT EXISTS idx_shipments_approval ON shipments (approval_status);

CREATE INDEX IF NOT EXISTS idx_shipments_transaction ON shipments (transaction_id);

CREATE INDEX IF NOT EXISTS idx_shipments_booking ON shipments (booking_id);

CREATE TABLE IF NOT EXISTS support_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','resolved','closed')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tickets_vendor ON support_tickets (vendor_id);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets (status);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_id INTEGER NOT NULL,
  sender_user_id INTEGER,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer','vendor')),
  message TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_shipment ON messages (shipment_id);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings (setting_key);

CREATE TABLE IF NOT EXISTS sync_deletions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  row_id INTEGER NOT NULL,
  deleted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (table_name, row_id)
);
