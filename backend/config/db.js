import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { ddlFor } from './schema.js';

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

const seed = async () => {
	console.log('[db] seeding demo data...');
	const salt = await bcrypt.genSalt(10);
	const hash = (pw) => bcrypt.hash(pw, salt);

	const adminPass = await hash('adminpass123');
	const vendorPass = await hash('vendorpass123');
	const customerPass = await hash('customerpass123');
	const branchAdminPass = await hash('branchadminpass123');

	// 7 branches (one per Nepali province).
	const branchNames = [
		['Koshi Province', 1],
		['Madhesh Province', 2],
		['Bagmati Province', 3],
		['Gandaki Province', 4],
		['Lumbini Province', 5],
		['Karnali Province', 6],
		['Sudurpashchim Province', 7],
	];
	const branchRows = {};
	for (const [name, provinceId] of branchNames) {
		const [b] = await execute('INSERT INTO branches (name, province_id) VALUES (?, ?)', [name, provinceId]);
		branchRows[name] = b.insertId;
	}
	const bagmatiBranchId = branchRows['Bagmati Province'];

	const adminId = await insertUser('Admin User', 'admin@test.com', adminPass, 'super_admin', null);
	const vendorUserId = await insertUser('Himalayan Movers', 'vendor@test.com', vendorPass, 'vendor', '9800000001');
	const customerUserId = await insertUser('Demo Customer', 'customer@test.com', customerPass, 'user', '9800000002');
	const branchAdminUserId = await insertUser('Bagmati Branch Admin', 'branchadmin@test.com', branchAdminPass, 'branch_admin', '9800000003');
	await execute('INSERT INTO user_branches (user_id, branch_id) VALUES (?, ?)', [branchAdminUserId, bagmatiBranchId]);

	const [vendorResult] = await execute(
		`INSERT INTO vendors (user_id, branch_id, business_name, owner_name, phone, email, service_region, address, status, rating, total_jobs)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[vendorUserId, bagmatiBranchId, 'Himalayan Movers', 'Ramesh Shrestha', '9800000001', 'vendor@test.com', 'Kathmandu Valley', 'Baneshwor, Kathmandu', 'active', 4.5, 12],
	);
	const vendorId = vendorResult.insertId;

	await execute(
		`INSERT INTO vendor_vehicles (vendor_id, name, plate_number, vehicle_type, capacity_tonnes, driver_name, driver_phone, status, is_active)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[vendorId, 'Tata Ace', 'BA 1 KA 1234', 'Cargo Tempo', 1.0, 'Suresh Lama', '9812345678', 'available', 1],
	);

	await execute(
		`INSERT INTO vendor_routes (vendor_id, from_province, from_district, to_province, to_district)
		 VALUES (?, ?, ?, ?, ?)`,
		[vendorId, 'Bagmati Province', 'Kathmandu', 'Bagmati Province', 'Lalitpur'],
	);
	await execute(
		`INSERT INTO vendor_routes (vendor_id, from_province, from_district, to_province, to_district)
		 VALUES (?, ?, ?, ?, ?)`,
		[vendorId, 'Bagmati Province', null, 'Gandaki Province', null],
	);

	await execute(
		`INSERT INTO shipments (
			booking_id, user_id, branch_id, first_name, last_name, mobile_number, email,
			pickup_province, pickup_district, pickup_city, drop_province, drop_district, drop_city,
			home_size, selected_items, vehicle_type, move_date, payment_method,
			status, approval_status, approved_by, assigned_vendor_id, transaction_id, payment_status, distance_km, estimated_duration
		 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			`MG-${Date.now()}`, customerUserId, bagmatiBranchId, 'Demo', 'Customer', '9800000002', 'customer@test.com',
			'Bagmati Province', 'Kathmandu', 'Baneshwor', 'Bagmati Province', 'Lalitpur', 'Patan',
			'1 BHK', JSON.stringify(['Sofa', 'Bed']), 'Cargo Tempo', '2026-08-15', 'esewa',
			'delivered', 'approved', adminId, vendorId, `TXN-${Date.now()}`, 'paid', 8.5, '3 hours',
		],
	);
	console.log('[db] demo data seeded (admin@test.com / adminpass123, branchadmin@test.com / branchadminpass123)');
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