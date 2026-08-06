// Single source of truth for the database schema.
// Each table lists its columns with both a MySQL and a SQLite definition so the
// two databases can never drift apart. `ddlFor(dialect)` emits the DDL for one
// of the two dialects. `backend/scripts/export-schema.js` regenerates the
// committed schema.sql / schema.sqlite.sql files from this module.

const COLUMN = {
	id: {
		mysql: 'INT AUTO_INCREMENT PRIMARY KEY',
		sqlite: 'INTEGER PRIMARY KEY AUTOINCREMENT',
	},
	ref: (name) => ({
		mysql: 'INT NOT NULL',
		sqlite: 'INTEGER NOT NULL',
	}),
	nullableRef: (name) => ({
		mysql: 'INT',
		sqlite: 'INTEGER',
	}),
	varchar: (n) => ({
		mysql: `VARCHAR(${n})`,
		sqlite: 'TEXT',
	}),
	varcharNotNull: (n) => ({
		mysql: `VARCHAR(${n}) NOT NULL`,
		sqlite: 'TEXT NOT NULL',
	}),
	text: () => ({ mysql: 'TEXT', sqlite: 'TEXT' }),
	textNotNull: () => ({ mysql: 'TEXT NOT NULL', sqlite: 'TEXT NOT NULL' }),
	decimal: (p, s) => ({
		mysql: `DECIMAL(${p},${s})`,
		sqlite: 'NUMERIC',
	}),
	boolean: () => ({
		mysql: 'TINYINT(1)',
		sqlite: 'INTEGER',
	}),
	timestamp: () => ({
		mysql: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
		sqlite: "TEXT DEFAULT CURRENT_TIMESTAMP",
	}),
	timestampOnUpdate: () => ({
		mysql: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
		sqlite: "TEXT DEFAULT CURRENT_TIMESTAMP",
	}),
	date: () => ({ mysql: 'DATE', sqlite: 'TEXT' }),
	datetime: () => ({ mysql: 'DATETIME', sqlite: 'TEXT' }),
};

const UNIQUE = (col) => ({
	mysql: `VARCHAR(255) NOT NULL UNIQUE`,
	sqlite: 'TEXT NOT NULL UNIQUE',
});

// Define a column whose type is shared but which needs extra per-dialect
// attributes (defaults, checks). Kept explicit so both files match.
const column = (def) => def;

const TABLES = [
	{
		name: 'users',
		columns: [
			{ name: 'id', ...COLUMN.id },
			{ name: 'name', ...COLUMN.varcharNotNull(255) },
			{ name: 'email', ...UNIQUE('email') },
			{ name: 'password', ...COLUMN.varcharNotNull(255) },
			{
				name: 'role',
				mysql: "ENUM('user','vendor','admin') DEFAULT 'user'",
				sqlite: "TEXT DEFAULT 'user' CHECK (role IN ('user','vendor','admin'))",
			},
			{ name: 'phone', ...COLUMN.varchar(20) },
			{ name: 'created_at', ...COLUMN.timestamp() },
		],
		constraints: [],
		indexes: [],
	},
	{
		name: 'vendors',
		columns: [
			{ name: 'id', ...COLUMN.id },
			{ name: 'user_id', ...COLUMN.ref('users') },
			{ name: 'business_name', ...COLUMN.varchar(255) },
			{ name: 'owner_name', ...COLUMN.varchar(255) },
			{ name: 'phone', ...COLUMN.varchar(20) },
			{ name: 'email', ...COLUMN.varchar(255) },
			{ name: 'service_region', ...COLUMN.text() },
			{ name: 'address', ...COLUMN.text() },
			{ name: 'status', ...COLUMN.varchar(50), mysqlDefault: "'pending'", sqliteDefault: "'pending'" },
			{ name: 'rating', ...COLUMN.decimal(3, 2), mysqlDefault: '0.00', sqliteDefault: '0.00' },
			{ name: 'total_jobs', mysql: 'INT', sqlite: 'INTEGER', mysqlDefault: '0', sqliteDefault: '0' },
			{ name: 'created_at', ...COLUMN.timestamp() },
		],
		constraints: [
			'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
		],
		indexes: [
			{ name: 'idx_vendors_user', cols: ['user_id'] },
			{ name: 'idx_vendors_status', cols: ['status'] },
		],
	},
	{
		name: 'vendor_vehicles',
		columns: [
			{ name: 'id', ...COLUMN.id },
			{ name: 'vendor_id', ...COLUMN.ref('vendors') },
			{ name: 'name', ...COLUMN.varchar(100) },
			{ name: 'plate_number', ...COLUMN.varchar(50) },
			{ name: 'vehicle_type', ...COLUMN.varchar(50) },
			{ name: 'capacity_tonnes', ...COLUMN.decimal(5, 2), mysqlDefault: '0', sqliteDefault: '0' },
			{ name: 'driver_name', ...COLUMN.varchar(100) },
			{ name: 'driver_phone', ...COLUMN.varchar(20) },
			{ name: 'status', ...COLUMN.varchar(50), mysqlDefault: "'available'", sqliteDefault: "'available'" },
			{ name: 'is_active', ...COLUMN.boolean(), mysqlDefault: '1', sqliteDefault: '1' },
			{ name: 'created_at', ...COLUMN.timestamp() },
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
		name: 'shipments',
		columns: [
			{ name: 'id', ...COLUMN.id },
			{ name: 'user_id', ...COLUMN.nullableRef('users') },
			{ name: 'booking_id', ...COLUMN.varchar(50), unique: true },
			{ name: 'first_name', ...COLUMN.varchar(100) },
			{ name: 'last_name', ...COLUMN.varchar(100) },
			{ name: 'mobile_number', ...COLUMN.varchar(20) },
			{ name: 'alternate_mobile', ...COLUMN.varchar(20) },
			{ name: 'email', ...COLUMN.varchar(255) },
			{ name: 'pickup_province', ...COLUMN.varchar(100) },
			{ name: 'pickup_district', ...COLUMN.varchar(100) },
			{ name: 'pickup_city', ...COLUMN.varchar(100) },
			{ name: 'pickup_ward', ...COLUMN.varchar(50) },
			{ name: 'pickup_floor', ...COLUMN.varchar(50) },
			{ name: 'pickup_lane_access', ...COLUMN.varchar(50) },
			{ name: 'pickup_address', ...COLUMN.text() },
			{ name: 'drop_province', ...COLUMN.varchar(100) },
			{ name: 'drop_district', ...COLUMN.varchar(100) },
			{ name: 'drop_city', ...COLUMN.varchar(100) },
			{ name: 'drop_ward', ...COLUMN.varchar(50) },
			{ name: 'drop_floor', ...COLUMN.varchar(50) },
			{ name: 'drop_address', ...COLUMN.text() },
			{ name: 'home_size', ...COLUMN.varchar(50) },
			{ name: 'selected_items', ...COLUMN.text() },
			{ name: 'fragile_items', ...COLUMN.text() },
			{ name: 'vehicle_type', ...COLUMN.varchar(100) },
			{ name: 'add_on_services', ...COLUMN.text() },
			{ name: 'move_date', ...COLUMN.date() },
			{ name: 'alternate_date', ...COLUMN.date() },
			{ name: 'preferred_time_slot', ...COLUMN.varchar(50) },
			{ name: 'move_reason', ...COLUMN.varchar(255) },
			{ name: 'preferred_contact', ...COLUMN.text() },
			{ name: 'payment_method', ...COLUMN.varchar(50) },
			{ name: 'how_found_us', ...COLUMN.varchar(255) },
			{ name: 'special_notes', ...COLUMN.text() },
			{ name: 'status', ...COLUMN.varchar(50), mysqlDefault: "'pending'", sqliteDefault: "'pending'" },
			{ name: 'final_quote', ...COLUMN.decimal(12, 2) },
			{ name: 'distance_km', ...COLUMN.decimal(10, 2) },
			{ name: 'estimated_duration', ...COLUMN.varchar(50) },
			{ name: 'transaction_id', ...COLUMN.varchar(100) },
			{ name: 'payment_status', ...COLUMN.varchar(50), mysqlDefault: "'pending'", sqliteDefault: "'pending'" },
			{ name: 'assigned_vendor_id', ...COLUMN.nullableRef('vendors') },
			{ name: 'approval_status', ...COLUMN.varchar(50), mysqlDefault: "'pending'", sqliteDefault: "'pending'" },
			{ name: 'approved_by', ...COLUMN.nullableRef('users') },
			{ name: 'approved_at', ...COLUMN.datetime() },
			{ name: 'created_at', ...COLUMN.timestamp() },
		],
		constraints: [
			'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
			'FOREIGN KEY (assigned_vendor_id) REFERENCES vendors(id) ON DELETE SET NULL',
		],
		indexes: [
			{ name: 'idx_shipments_user', cols: ['user_id'] },
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
			{ name: 'id', ...COLUMN.id },
			{ name: 'vendor_id', ...COLUMN.ref('vendors') },
			{ name: 'subject', ...COLUMN.varcharNotNull(255) },
			{ name: 'message', ...COLUMN.textNotNull() },
			{
				name: 'status',
				mysql: "ENUM('open','resolved','closed') DEFAULT 'open'",
				sqlite: "TEXT DEFAULT 'open' CHECK (status IN ('open','resolved','closed'))",
			},
			{ name: 'created_at', ...COLUMN.timestamp() },
			{ name: 'updated_at', ...COLUMN.timestampOnUpdate() },
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
		name: 'settings',
		columns: [
			{ name: 'id', ...COLUMN.id },
			{
				name: 'setting_key',
				mysql: 'VARCHAR(100) NOT NULL UNIQUE',
				sqlite: 'TEXT NOT NULL UNIQUE',
			},
			{ name: 'setting_value', ...COLUMN.textNotNull() },
			{ name: 'updated_at', ...COLUMN.timestampOnUpdate() },
		],
		constraints: [],
		indexes: [
			{ name: 'idx_settings_key', cols: ['setting_key'] },
		],
	},
	// Sync infrastructure: tombstones for deleted rows so a delete performed
	// while the other database was down is not resurrected on the next
	// reconciliation. Not part of the application domain.
	{
		name: 'sync_deletions',
		columns: [
			{ name: 'id', ...COLUMN.id },
			{ name: 'table_name', ...COLUMN.varcharNotNull(100) },
			{ name: 'row_id', mysql: 'INT NOT NULL', sqlite: 'INTEGER NOT NULL' },
			{ name: 'deleted_at', ...COLUMN.timestamp() },
		],
		constraints: ['UNIQUE (table_name, row_id)'],
		indexes: [],
	},
];

const TABLE_ORDER = TABLES.map((t) => t.name);

// Render a column's full SQL for a given dialect, honoring defaults/unique.
const renderColumn = (col, dialect) => {
	let sql = col[dialect];
	if (col.unique) {
		sql += ' UNIQUE';
	}
	if (col.mysqlDefault !== undefined || col.sqliteDefault !== undefined) {
		const def = dialect === 'mysql' ? col.mysqlDefault : col.sqliteDefault;
		if (def !== undefined) {
			sql += ` DEFAULT ${def}`;
		}
	}
	return sql;
};

export const ddlFor = (dialect) => {
	const statements = [];
	for (const table of TABLES) {
		const columnLines = table.columns.map(
			(col) => `  ${col.name} ${renderColumn(col, dialect)}`,
		);
		const constraintLines = table.constraints.map((c) => `  ${c}`);
		const indexLines =
			dialect === 'mysql'
				? table.indexes.map(
						(idx) => `  INDEX ${idx.name} (${idx.cols.join(', ')})`,
				  )
				: [];
		const allLines = [
			...columnLines,
			...constraintLines,
			...indexLines,
		];
		statements.push(
			`CREATE TABLE IF NOT EXISTS ${table.name} (\n${allLines.join(',\n')}\n);`,
		);
		if (dialect === 'sqlite') {
			for (const idx of table.indexes) {
				statements.push(
					`CREATE INDEX IF NOT EXISTS ${idx.name} ON ${table.name} (${idx.cols.join(', ')});`,
				);
			}
		}
	}
	return statements;
};

export const getTables = () => TABLE_ORDER;
