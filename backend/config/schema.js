// Single source of truth for the MySQL database schema.
// `ddlFor()` emits the DDL used at startup; the committed backend/schema.sql is
// regenerated from this module by backend/scripts/export-schema.js.

const COLUMN = {
	id: 'INT AUTO_INCREMENT PRIMARY KEY',
	ref: () => 'INT NOT NULL',
	nullableRef: () => 'INT',
	varchar: (n) => `VARCHAR(${n})`,
	varcharNotNull: (n) => `VARCHAR(${n}) NOT NULL`,
	text: () => 'TEXT',
	textNotNull: () => 'TEXT NOT NULL',
	decimal: (p, s) => `DECIMAL(${p},${s})`,
	boolean: () => 'TINYINT(1)',
	timestamp: () => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
	timestampOnUpdate: () => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
	date: () => 'DATE',
	datetime: () => 'DATETIME',
};

const UNIQUE = () => 'VARCHAR(255) NOT NULL UNIQUE';

const TABLES = [
	{
		name: 'users',
		columns: [
			{ name: 'id', type: COLUMN.id },
			{ name: 'name', type: COLUMN.varcharNotNull(255) },
			{ name: 'email', type: UNIQUE() },
			{ name: 'password', type: COLUMN.varcharNotNull(255) },
			{ name: 'role', type: "ENUM('user','vendor','branch_admin','super_admin')", def: "'user'" },
			{ name: 'phone', type: COLUMN.varchar(20) },
			{ name: 'created_at', type: COLUMN.timestamp() },
		],
		constraints: [],
		indexes: [],
	},
	{
		name: 'branches',
		columns: [
			{ name: 'id', type: COLUMN.id },
			{ name: 'name', type: COLUMN.varcharNotNull(100) },
			{ name: 'province_id', type: 'INT NOT NULL UNIQUE' },
			{ name: 'is_active', type: COLUMN.boolean(), def: '1' },
			{ name: 'created_at', type: COLUMN.timestamp() },
		],
		constraints: ['UNIQUE (name)'],
		indexes: [],
	},
	{
		name: 'user_branches',
		columns: [
			{ name: 'user_id', type: COLUMN.ref() },
			{ name: 'branch_id', type: COLUMN.ref() },
		],
		constraints: [
			'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
			'FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE',
			'PRIMARY KEY (user_id, branch_id)',
		],
		indexes: [],
	},
	{
		name: 'vendors',
		columns: [
			{ name: 'id', type: COLUMN.id },
			{ name: 'user_id', type: COLUMN.ref() },
			{ name: 'branch_id', type: COLUMN.nullableRef() },
			{ name: 'business_name', type: COLUMN.varchar(255) },
			{ name: 'owner_name', type: COLUMN.varchar(255) },
			{ name: 'phone', type: COLUMN.varchar(20) },
			{ name: 'email', type: COLUMN.varchar(255) },
			{ name: 'service_region', type: COLUMN.text() },
			{ name: 'address', type: COLUMN.text() },
			{ name: 'status', type: COLUMN.varchar(50), def: "'pending'" },
			{ name: 'rating', type: COLUMN.decimal(3, 2), def: '0.00' },
			{ name: 'total_jobs', type: 'INT', def: '0' },
			{ name: 'created_at', type: COLUMN.timestamp() },
		],
		constraints: [
			'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
			'FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL',
		],
		indexes: [
			{ name: 'idx_vendors_user', cols: ['user_id'] },
			{ name: 'idx_vendors_status', cols: ['status'] },
			{ name: 'idx_vendors_branch', cols: ['branch_id'] },
		],
	},
	{
		name: 'vendor_vehicles',
		columns: [
			{ name: 'id', type: COLUMN.id },
			{ name: 'vendor_id', type: COLUMN.ref() },
			{ name: 'name', type: COLUMN.varchar(100) },
			{ name: 'plate_number', type: COLUMN.varchar(50) },
			{ name: 'vehicle_type', type: COLUMN.varchar(50) },
			{ name: 'capacity_tonnes', type: COLUMN.decimal(5, 2), def: '0' },
			{ name: 'driver_name', type: COLUMN.varchar(100) },
			{ name: 'driver_phone', type: COLUMN.varchar(20) },
			{ name: 'status', type: COLUMN.varchar(50), def: "'available'" },
			{ name: 'is_active', type: COLUMN.boolean(), def: '1' },
			{ name: 'created_at', type: COLUMN.timestamp() },
		],
		constraints: [
			'FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE',
		],
		indexes: [
			{ name: 'idx_vendor_vehicles_vendor', cols: ['vendor_id'] },
			{ name: 'idx_vendor_vehicles_type', cols: ['vehicle_type'] },
		],
	},
	{
		name: 'vendor_routes',
		columns: [
			{ name: 'id', type: COLUMN.id },
			{ name: 'vendor_id', type: COLUMN.ref() },
			{ name: 'from_province', type: COLUMN.varcharNotNull(100) },
			{ name: 'from_district', type: COLUMN.varchar(100) },
			{ name: 'to_province', type: COLUMN.varcharNotNull(100) },
			{ name: 'to_district', type: COLUMN.varchar(100) },
			{ name: 'is_active', type: COLUMN.boolean(), def: '1' },
			{ name: 'created_at', type: COLUMN.timestamp() },
		],
		constraints: [
			'FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE',
		],
		indexes: [
			{ name: 'idx_vendor_routes_vendor', cols: ['vendor_id'] },
			{ name: 'idx_vendor_routes_from', cols: ['from_province', 'from_district'] },
			{ name: 'idx_vendor_routes_to', cols: ['to_province', 'to_district'] },
		],
	},
	{
		name: 'shipments',
		columns: [
			{ name: 'id', type: COLUMN.id },
			{ name: 'user_id', type: COLUMN.nullableRef() },
			{ name: 'branch_id', type: COLUMN.ref() },
			{ name: 'booking_id', type: COLUMN.varchar(50), unique: true },
			{ name: 'first_name', type: COLUMN.varchar(100) },
			{ name: 'last_name', type: COLUMN.varchar(100) },
			{ name: 'mobile_number', type: COLUMN.varchar(20) },
			{ name: 'alternate_mobile', type: COLUMN.varchar(20) },
			{ name: 'email', type: COLUMN.varchar(255) },
			{ name: 'pickup_province', type: COLUMN.varchar(100) },
			{ name: 'pickup_district', type: COLUMN.varchar(100) },
			{ name: 'pickup_city', type: COLUMN.varchar(100) },
			{ name: 'pickup_ward', type: COLUMN.varchar(50) },
			{ name: 'pickup_floor', type: COLUMN.varchar(50) },
			{ name: 'pickup_lane_access', type: COLUMN.varchar(50) },
			{ name: 'pickup_address', type: COLUMN.text() },
			{ name: 'drop_province', type: COLUMN.varchar(100) },
			{ name: 'drop_district', type: COLUMN.varchar(100) },
			{ name: 'drop_city', type: COLUMN.varchar(100) },
			{ name: 'drop_ward', type: COLUMN.varchar(50) },
			{ name: 'drop_floor', type: COLUMN.varchar(50) },
			{ name: 'drop_address', type: COLUMN.text() },
			{ name: 'home_size', type: COLUMN.varchar(50) },
			{ name: 'selected_items', type: COLUMN.text() },
			{ name: 'fragile_items', type: COLUMN.text() },
			{ name: 'vehicle_type', type: COLUMN.varchar(100) },
			{ name: 'add_on_services', type: COLUMN.text() },
			{ name: 'move_date', type: COLUMN.date() },
			{ name: 'alternate_date', type: COLUMN.date() },
			{ name: 'preferred_time_slot', type: COLUMN.varchar(50) },
			{ name: 'move_reason', type: COLUMN.varchar(255) },
			{ name: 'preferred_contact', type: COLUMN.text() },
			{ name: 'payment_method', type: COLUMN.varchar(50) },
			{ name: 'how_found_us', type: COLUMN.varchar(255) },
			{ name: 'special_notes', type: COLUMN.text() },
			{ name: 'status', type: COLUMN.varchar(50), def: "'pending'" },
			{ name: 'final_quote', type: COLUMN.decimal(12, 2) },
			{ name: 'commission_amount', type: COLUMN.decimal(12, 2) },
			{ name: 'distance_km', type: COLUMN.decimal(10, 2) },
			{ name: 'estimated_duration', type: COLUMN.varchar(50) },
			{ name: 'transaction_id', type: COLUMN.varchar(100) },
			{ name: 'payment_status', type: COLUMN.varchar(50), def: "'pending'" },
			{ name: 'assigned_vendor_id', type: COLUMN.nullableRef() },
			{ name: 'approval_status', type: COLUMN.varchar(50), def: "'pending'" },
			{ name: 'approved_by', type: COLUMN.nullableRef() },
			{ name: 'approved_at', type: COLUMN.datetime() },
			{ name: 'created_at', type: COLUMN.timestamp() },
		],
		constraints: [
			'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
			'FOREIGN KEY (branch_id) REFERENCES branches(id)',
			'FOREIGN KEY (assigned_vendor_id) REFERENCES vendors(id) ON DELETE SET NULL',
		],
		indexes: [
			{ name: 'idx_shipments_user', cols: ['user_id'] },
			{ name: 'idx_shipments_branch', cols: ['branch_id'] },
			{ name: 'idx_shipments_email', cols: ['email'] },
			{ name: 'idx_shipments_vendor', cols: ['assigned_vendor_id'] },
			{ name: 'idx_shipments_approval', cols: ['approval_status'] },
			{ name: 'idx_shipments_transaction', cols: ['transaction_id'] },
			{ name: 'idx_shipments_booking', cols: ['booking_id'] },
		],
	},
	{
		name: 'support_tickets',
		columns: [
			{ name: 'id', type: COLUMN.id },
			{ name: 'vendor_id', type: COLUMN.ref() },
			{ name: 'subject', type: COLUMN.varcharNotNull(255) },
			{ name: 'message', type: COLUMN.textNotNull() },
			{ name: 'status', type: "ENUM('open','resolved','closed')", def: "'open'" },
			{ name: 'created_at', type: COLUMN.timestamp() },
			{ name: 'updated_at', type: COLUMN.timestampOnUpdate() },
		],
		constraints: [
			'FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE',
		],
		indexes: [
			{ name: 'idx_tickets_vendor', cols: ['vendor_id'] },
			{ name: 'idx_tickets_status', cols: ['status'] },
		],
	},
	{
		name: 'messages',
		columns: [
			{ name: 'id', type: COLUMN.id },
			{ name: 'shipment_id', type: COLUMN.ref() },
			{ name: 'sender_user_id', type: COLUMN.nullableRef() },
			{ name: 'sender_role', type: "ENUM('customer','vendor') NOT NULL" },
			{ name: 'message', type: COLUMN.textNotNull() },
			{ name: 'created_at', type: COLUMN.timestamp() },
		],
		constraints: [
			'FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE',
			'FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE SET NULL',
		],
		indexes: [
			{ name: 'idx_messages_shipment', cols: ['shipment_id'] },
		],
	},
	{
		name: 'settings',
		columns: [
			{ name: 'id', type: COLUMN.id },
			{ name: 'setting_key', type: 'VARCHAR(100) NOT NULL UNIQUE' },
			{ name: 'setting_value', type: COLUMN.textNotNull() },
			{ name: 'updated_at', type: COLUMN.timestampOnUpdate() },
		],
		constraints: [],
		indexes: [
			{ name: 'idx_settings_key', cols: ['setting_key'] },
		],
	},
	{
		name: 'escalations',
		columns: [
			{ name: 'id', type: COLUMN.id },
			{ name: 'shipment_id', type: COLUMN.ref() },
			{ name: 'from_branch_id', type: COLUMN.ref() },
			{ name: 'to_branch_id', type: COLUMN.ref() },
			{ name: 'type', type: "ENUM('transfer','assign','delete','override_vendor')", def: "'transfer'" },
			{ name: 'reason', type: COLUMN.text() },
			{ name: 'status', type: COLUMN.varchar(20), def: "'pending'" },
			{ name: 'requested_by', type: COLUMN.nullableRef() },
			{ name: 'resolved_by', type: COLUMN.nullableRef() },
			{ name: 'created_at', type: COLUMN.timestamp() },
			{ name: 'resolved_at', type: COLUMN.datetime() },
		],
		constraints: [
			'FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE',
			'FOREIGN KEY (from_branch_id) REFERENCES branches(id)',
			'FOREIGN KEY (to_branch_id) REFERENCES branches(id)',
		],
		indexes: [
			{ name: 'idx_esc_from', cols: ['from_branch_id'] },
			{ name: 'idx_esc_to', cols: ['to_branch_id'] },
			{ name: 'idx_esc_status', cols: ['status'] },
		],
	},
	{
		name: 'audit_logs',
		columns: [
			{ name: 'id', type: COLUMN.id },
			{ name: 'actor_user_id', type: COLUMN.nullableRef() },
			{ name: 'action', type: COLUMN.varcharNotNull(100) },
			{ name: 'entity', type: COLUMN.varchar(50) },
			{ name: 'entity_id', type: COLUMN.nullableRef() },
			{ name: 'branch_id', type: COLUMN.nullableRef() },
			{ name: 'meta', type: COLUMN.text() },
			{ name: 'created_at', type: COLUMN.timestamp() },
		],
		constraints: [],
		indexes: [
			{ name: 'idx_audit_actor', cols: ['actor_user_id'] },
			{ name: 'idx_audit_branch', cols: ['branch_id'] },
			{ name: 'idx_audit_action', cols: ['action'] },
		],
	},
];

const TABLE_ORDER = TABLES.map((t) => t.name);

const renderColumn = (col) => {
	let sql = col.type;
	if (col.unique) {
		sql += ' UNIQUE';
	}
	if (col.def !== undefined) {
		sql += ` DEFAULT ${col.def}`;
	}
	return sql;
};

export const ddlFor = () => {
	const statements = [];
	for (const table of TABLES) {
		const columnLines = table.columns.map((col) => `  ${col.name} ${renderColumn(col)}`);
		const constraintLines = table.constraints.map((c) => `  ${c}`);
		const indexLines = table.indexes.map(
			(idx) => `  INDEX ${idx.name} (${idx.cols.join(', ')})`,
		);
		statements.push(
			`CREATE TABLE IF NOT EXISTS ${table.name} (\n${[...columnLines, ...constraintLines, ...indexLines].join(',\n')}\n);`,
		);
	}
	return statements;
};

export const getTables = () => TABLE_ORDER;