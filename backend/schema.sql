-- Auto-generated from backend/config/schema.js (do not edit by hand).
-- Run `node scripts/export-schema.js` to regenerate.
-- MySQL dialect.

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('user','vendor','branch_admin','super_admin') DEFAULT 'user',
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  province_id INT NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (name),
  INDEX idx_branches_province (province_id)
);

CREATE TABLE IF NOT EXISTS user_branches (
  user_id INT NOT NULL,
  branch_id INT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, branch_id)
);

CREATE TABLE IF NOT EXISTS vendors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  branch_id INT,
  business_name VARCHAR(255),
  owner_name VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  service_region TEXT,
  address TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_jobs INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  INDEX idx_vendors_user (user_id),
  INDEX idx_vendors_status (status),
  INDEX idx_vendors_branch (branch_id)
);

CREATE TABLE IF NOT EXISTS vendor_vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  name VARCHAR(100),
  plate_number VARCHAR(50),
  vehicle_type VARCHAR(50),
  capacity_tonnes DECIMAL(5,2) DEFAULT 0,
  driver_name VARCHAR(100),
  driver_phone VARCHAR(20),
  status VARCHAR(50) DEFAULT 'available',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  INDEX idx_vendor_vehicles_vendor (vendor_id),
  INDEX idx_vendor_vehicles_type (vehicle_type)
);

CREATE TABLE IF NOT EXISTS vendor_routes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  from_province VARCHAR(100) NOT NULL,
  from_district VARCHAR(100),
  to_province VARCHAR(100) NOT NULL,
  to_district VARCHAR(100),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  INDEX idx_vendor_routes_vendor (vendor_id),
  INDEX idx_vendor_routes_from (from_province, from_district),
  INDEX idx_vendor_routes_to (to_province, to_district)
);

CREATE TABLE IF NOT EXISTS shipments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  branch_id INT NOT NULL,
  booking_id VARCHAR(50) UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  mobile_number VARCHAR(20),
  alternate_mobile VARCHAR(20),
  email VARCHAR(255),
  pickup_province VARCHAR(100),
  pickup_district VARCHAR(100),
  pickup_city VARCHAR(100),
  pickup_ward VARCHAR(50),
  pickup_floor VARCHAR(50),
  pickup_lane_access VARCHAR(50),
  pickup_address TEXT,
  drop_province VARCHAR(100),
  drop_district VARCHAR(100),
  drop_city VARCHAR(100),
  drop_ward VARCHAR(50),
  drop_floor VARCHAR(50),
  drop_address TEXT,
  home_size VARCHAR(50),
  selected_items TEXT,
  fragile_items TEXT,
  vehicle_type VARCHAR(100),
  add_on_services TEXT,
  move_date DATE,
  alternate_date DATE,
  preferred_time_slot VARCHAR(50),
  move_reason VARCHAR(255),
  preferred_contact TEXT,
  payment_method VARCHAR(50),
  how_found_us VARCHAR(255),
  special_notes TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  final_quote DECIMAL(12,2),
  commission_amount DECIMAL(12,2),
  distance_km DECIMAL(10,2),
  estimated_duration VARCHAR(50),
  transaction_id VARCHAR(100),
  payment_status VARCHAR(50) DEFAULT 'pending',
  assigned_vendor_id INT,
  approval_status VARCHAR(50) DEFAULT 'pending',
  approved_by INT,
  approved_at DATETIME,
  last_vendor_decline_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (assigned_vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
  INDEX idx_shipments_user (user_id),
  INDEX idx_shipments_branch (branch_id),
  INDEX idx_shipments_email (email),
  INDEX idx_shipments_vendor (assigned_vendor_id),
  INDEX idx_shipments_approval (approval_status),
  INDEX idx_shipments_transaction (transaction_id),
  INDEX idx_shipments_booking (booking_id)
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('open','resolved','closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  INDEX idx_tickets_vendor (vendor_id),
  INDEX idx_tickets_status (status)
);

CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shipment_id INT NOT NULL,
  sender_user_id INT,
  sender_role ENUM('customer','vendor') NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_messages_shipment (shipment_id)
);

CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_settings_key (setting_key)
);

CREATE TABLE IF NOT EXISTS escalations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shipment_id INT NOT NULL,
  from_branch_id INT NOT NULL,
  to_branch_id INT NOT NULL,
  type ENUM('transfer','assign','delete','override_vendor') DEFAULT 'transfer',
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  requested_by INT,
  resolved_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
  FOREIGN KEY (from_branch_id) REFERENCES branches(id),
  FOREIGN KEY (to_branch_id) REFERENCES branches(id),
  INDEX idx_esc_from (from_branch_id),
  INDEX idx_esc_to (to_branch_id),
  INDEX idx_esc_status (status)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(50),
  entity_id INT,
  branch_id INT,
  meta TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_actor (actor_user_id),
  INDEX idx_audit_branch (branch_id),
  INDEX idx_audit_action (action)
);
