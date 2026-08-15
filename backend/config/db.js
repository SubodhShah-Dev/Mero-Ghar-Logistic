import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { ddlFor } from './schema.js';
import { DISTRICTS } from './districts.js';

dotenv.config();

const usesTls = () =>
	process.env.DB_SSL === 'true' ||
	process.env.MYSQL_SSL === 'true' ||
	process.env.MYSQL_SSL_MODE === 'REQUIRED';

const mysqlConfig = (database) => ({
	host: process.env.MYSQLHOST || process.env.DB_HOST || '127.0.0.1',
	user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
	password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
	database,
	port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10),
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
	connectTimeout: 5000,
	decimalNumbers: true,
	// Public MySQL-compatible clouds (TiDB Cloud Starter) require TLS.
	ssl: usesTls() ? { rejectUnauthorized: false } : undefined,
});

const DB_NAME = process.env.MYSQL_DATABASE || process.env.DB_NAME || 'meroghar_db';

let mysqlPool = null;
let inited = false;

// Create the database if it does not exist yet (XAMPP ships an empty server).
const ensureDatabase = async () => {
	const conn = await mysql.createConnection(mysqlConfig(null));
	try {
		await conn.query(
			`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
		);
	} finally {
		await conn.end().catch(() => {});
	}
};

const ensureSchema = async () => {
	for (const statement of ddlFor()) {
		await mysqlPool.query(statement);
	}
	// Migrations for existing databases: CREATE TABLE IF NOT EXISTS never alters
	// an existing table, so new columns must be added explicitly. MySQL/TiDB
	// reject duplicate columns, so the error is swallowed when already applied.
	try {
		await mysqlPool.query(
			'ALTER TABLE shipments ADD COLUMN last_vendor_decline_at DATETIME NULL',
		);
	} catch {
		/* column already exists */
	}
};

// Unified statement executor passing straight through to mysql2's pool.
//   SELECT -> [rows, fields];  DML -> [ResultSetHeader, fields]
const execute = async (query, params = []) => mysqlPool.execute(query, params);

// Transaction connection.
const getConnection = async () => {
	const conn = await mysqlPool.getConnection();
	return {
		execute: (query, params = []) => conn.execute(query, params),
		beginTransaction: () => conn.beginTransaction(),
		commit: () => conn.commit(),
		rollback: () => conn.rollback(),
		release: () => conn.release(),
	};
};

// ── Demo seed (non-production only) ──

// District -> provincial plate prefix (must match the app's plate regex).
const PLATE_PREFIX_BY_PROVINCE = { 1: 'KH', 2: 'JA', 3: 'BA', 4: 'GA', 5: 'LU', 6: 'KA', 7: 'SU' };

const VEHICLE_MODELS = [
	['Tata Ace', 'Cargo Tempo', 1.0],
	['Tata 407', 'Mini Truck', 2.0],
	['Tata 909', 'Large Truck', 5.0],
];

const OWNER_FIRST_NAMES = [
	'Ramesh', 'Sita', 'Hari', 'Gita', 'Kiran', 'Nirmala', 'Prakash', 'Sarita',
	'Bikash', 'Anita', 'Dipak', 'Maya', 'Rajan', 'Sunita', 'Krishna', 'Puja',
	'Suresh', 'Laxmi',
];

const OWNER_LAST_NAMES = [
	'Shrestha', 'Rai', 'Thapa', 'Yadav', 'Gurung', 'Karki', 'Maharjan', 'Tamang',
	'Bista', 'Chaudhary', 'Lama', 'Magar',
];

const seed = async () => {
	console.log('[db] seeding demo data...');
	const salt = await bcrypt.genSalt(10);
	const hash = (pw) => bcrypt.hash(pw, salt);

	const adminPass = await hash('adminpass123');
	const vendorPass = await hash('vendorpass123');
	const customerPass = await hash('customerpass123');
	const branchAdminPass = await hash('branchadminpass123');

	// 77 district branches (one branch per district; name === district name).
	const branchRows = {};
	for (const { province_id, name } of DISTRICTS) {
		const [b] = await execute('INSERT INTO branches (name, province_id) VALUES (?, ?)', [name, province_id]);
		branchRows[name] = b.insertId;
	}
	const kathmanduBranchId = branchRows['Kathmandu'];

	const adminId = await insertUser('Admin User', 'admin@test.com', adminPass, 'super_admin', null);
	const customerUserId = await insertUser('Demo Customer', 'customer@test.com', customerPass, 'user', '9800000002');

	// One Branch Admin + one active Vendor for every district except Kathmandu
	// (which uses the flagship demo accounts below). Vendors are seeded with all
	// three vehicle types and NO routes — a route-less mover covers any route, so
	// every booking type auto-assigns to the pickup district's vendor. Format:
	// [branch(province_id, name), adminEmail, vendorEmail, businessName, owner]
	let districtIndex = 0;
	for (const { province_id, name } of DISTRICTS) {
		if (name === 'Kathmandu') continue;
		const prefix = PLATE_PREFIX_BY_PROVINCE[province_id];
		const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
		const adminEmail = `ba.${slug}@test.com`;
		const vendorEmail = `vendor.${slug}@test.com`;
		const adminPhone = `98${String(20000000 + districtIndex * 11).slice(0, 8)}`;
		const phone = `98${String(10000000 + districtIndex * 7).slice(0, 8)}`;
		const ownerName = `${OWNER_FIRST_NAMES[districtIndex % OWNER_FIRST_NAMES.length]} ${OWNER_LAST_NAMES[districtIndex % OWNER_LAST_NAMES.length]}`;
		const businessName = `${name} Movers`;

		const districtAdminId = await insertUser(`${name} Branch Admin`, adminEmail, branchAdminPass, 'branch_admin', adminPhone);
		await execute('INSERT INTO user_branches (user_id, branch_id) VALUES (?, ?)', [districtAdminId, branchRows[name]]);

		const vendorUserId = await insertUser(businessName, vendorEmail, vendorPass, 'vendor', phone);
		const [rv] = await execute(
			`INSERT INTO vendors (user_id, branch_id, business_name, owner_name, phone, email, service_region, address, status, rating, total_jobs, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[vendorUserId, branchRows[name], businessName, ownerName, phone, vendorEmail, name, `${name}, Nepal`, 'active', 4.0, 3, new Date(Date.parse('2026-08-12T10:00:00Z') + districtIndex * 60000).toISOString().slice(0, 19).replace('T', ' ')],
		);
		const vendorId = rv.insertId;
		for (let vi = 0; vi < VEHICLE_MODELS.length; vi++) {
			const [model, vehicleType, capacity] = VEHICLE_MODELS[vi];
			const districtLetters = name.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || 'NP';
			const plate = `${prefix} ${vi + 1} ${districtLetters} ${1000 + districtIndex * 3 + vi + 1}`;
			await execute(
				`INSERT INTO vendor_vehicles (vendor_id, name, plate_number, vehicle_type, capacity_tonnes, driver_name, driver_phone, status, is_active)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[vendorId, model, plate, vehicleType, capacity, `${businessName} Driver`, phone, 'available', 1],
			);
		}
		districtIndex++;
	}

	// Kathmandu flagship pair — created last so Himalayan Movers is the most
	// recent vendor row and appears first in admin listings (created_at DESC);
	// route-aware tests rely on it being the picked active mover for Kathmandu
	// bookings.
	const vendorUserId = await insertUser('Himalayan Movers', 'vendor@test.com', vendorPass, 'vendor', '9800000001');
	const branchAdminUserId = await insertUser('Kathmandu Branch Admin', 'branchadmin@test.com', branchAdminPass, 'branch_admin', '9800000003');
	await execute('INSERT INTO user_branches (user_id, branch_id) VALUES (?, ?)', [branchAdminUserId, kathmanduBranchId]);

	const [vendorResult] = await execute(
		`INSERT INTO vendors (user_id, branch_id, business_name, owner_name, phone, email, service_region, address, status, rating, total_jobs, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[vendorUserId, kathmanduBranchId, 'Himalayan Movers', 'Ramesh Shrestha', '9800000001', 'vendor@test.com', 'Kathmandu Valley', 'Baneshwor, Kathmandu', 'active', 4.5, 12, '2026-08-12 12:00:00'],
	);
	const vendorId = vendorResult.insertId;

	await execute(
		`INSERT INTO vendor_vehicles (vendor_id, name, plate_number, vehicle_type, capacity_tonnes, driver_name, driver_phone, status, is_active)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[vendorId, 'Tata Ace', 'BA 1 KA 1234', 'Cargo Tempo', 1.0, 'Suresh Lama', '9812345678', 'available', 1],
	);

	await execute(
		`INSERT INTO vendor_vehicles (vendor_id, name, plate_number, vehicle_type, capacity_tonnes, driver_name, driver_phone, status, is_active)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[vendorId, 'Tata 407', 'BA 1 KA 1235', 'Mini Truck', 2.0, 'Suresh Lama', '9812345678', 'available', 1],
	);

	await execute(
		`INSERT INTO vendor_vehicles (vendor_id, name, plate_number, vehicle_type, capacity_tonnes, driver_name, driver_phone, status, is_active)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[vendorId, 'Tata 909', 'BA 1 KA 1236', 'Large Truck', 5.0, 'Suresh Lama', '9812345678', 'available', 1],
	);

	await execute(
		`INSERT INTO shipments (
			booking_id, user_id, branch_id, first_name, last_name, mobile_number, email,
			pickup_province, pickup_district, pickup_city, drop_province, drop_district, drop_city,
			home_size, selected_items, vehicle_type, move_date, payment_method,
			status, approval_status, approved_by, assigned_vendor_id, transaction_id, payment_status, distance_km, estimated_duration,
			final_quote, commission_amount
		 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			`MG-${Date.now()}`, customerUserId, kathmanduBranchId, 'Demo', 'Customer', '9800000002', 'customer@test.com',
			'Bagmati Province', 'Kathmandu', 'Baneshwor', 'Bagmati Province', 'Lalitpur', 'Patan',
			'1 BHK', JSON.stringify(['Sofa', 'Bed']), 'Cargo Tempo', '2026-08-15', 'esewa',
			'delivered', 'approved', adminId, vendorId, `TXN-${Date.now()}`, 'paid', 8.5, '3 hours',
			1050, 105,
		],
	);
	console.log('[db] demo data seeded: admin@test.com / adminpass123 (super_admin); ba.<district>@test.com + branchadmin@test.com (Kathmandu) / branchadminpass123 (branch_admin); vendor.<district>@test.com + vendor@test.com (Himalayan Movers, Kathmandu) / vendorpass123 (vendor); customer@test.com / customerpass123 (user)');
};

const insertUser = async (name, email, password, role, phone) => {
	const [result] = await execute(
		'INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
		[name, email, password, role, phone],
	);
	return result.insertId;
};

// ── Init ──

export const init = async () => {
	if (inited) return;

	try {
		await ensureDatabase();
	} catch (err) {
		throw new Error(
			'Could not reach MySQL. Start XAMPP ("lampp startmysql") and check DB_HOST/DB_USER/DB_PASSWORD/DB_PORT in backend/.env. ' + err.message,
		);
	}

	mysqlPool = mysql.createPool(mysqlConfig(DB_NAME));
	await ensureSchema();

	const isProduction = process.env.NODE_ENV === 'production';
	const seedExplicit = process.env.SEED_DEMO_DATA === 'true';
	const shouldSeed =
		seedExplicit || (!isProduction && process.env.SEED_DEMO_DATA !== 'false');
	if (shouldSeed) {
		const [rows] = await execute('SELECT COUNT(*) as c FROM users');
		if (Number(rows[0].c) === 0) {
			await seed();
		}
	}

	inited = true;
	console.log(`[db] active driver: mysql (database: ${DB_NAME} @ ${mysqlConfig(DB_NAME).host})`);
};

const pool = { execute, getConnection };

export default pool;