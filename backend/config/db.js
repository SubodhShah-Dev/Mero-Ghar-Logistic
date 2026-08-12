import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { ddlFor, getTables } from './schema.js';
import {
	buildMirrorOp,
	applyOps,
	reconcileAll,
} from './syncService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

// Live binding so models can branch on the active dialect.
export let dialect = 'sqlite';

const DB_DRIVER = (process.env.DB_DRIVER || 'auto').toLowerCase();
const DB_PATH =
	process.env.DB_PATH || path.join(__dirname, '..', 'data', 'meroghar.db');

const mysqlConfig = () => {
	const ssl = process.env.MYSQL_SSL === 'true' || process.env.MYSQL_SSL === '1';
	let ca;
	if (process.env.MYSQL_SSL_CA) {
		ca = fs.readFileSync(process.env.MYSQL_SSL_CA, 'utf8');
	} else if (process.env.MYSQL_SSL_CA_B64) {
		ca = Buffer.from(process.env.MYSQL_SSL_CA_B64, 'base64').toString('utf8');
	}
	return {
		host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
		user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
		password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
		database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'meroghar_db',
		port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10),
		waitForConnections: true,
		connectionLimit: 10,
		queueLimit: 0,
		connectTimeout: 5000,
		...(ssl ? { ssl: ca ? { ca } : {} } : {}),
	};
};

let mysqlPool = null;
let sqliteDb = null;
let inited = false;

const IS_READ = /^\s*(SELECT|PRAGMA|WITH|EXPLAIN)\b/i;

// Application tables that can be tombstoned (never the sync infrastructure).
const APP_TABLES = getTables();

const DELETE_RE = /^\s*DELETE\s+FROM\s+`?(\w+)`?\s*(?:WHERE\s+([\s\S]+?))?\s*;?\s*$/i;
const parseDelete = (query) => {
	const m = query.match(DELETE_RE);
	if (!m) return null;
	return { table: m[1], where: m[2] || null };
};

const TOMBSTONE_SQL = 'INSERT INTO sync_deletions (table_name, row_id) VALUES (?, ?)';

// Record tombstones for rows removed by a DELETE executed on MySQL, and mirror
// them to SQLite so the other side never resurrects them. `ids` is captured
// BEFORE the delete runs.
const recordTombstonesMysql = async (parsed, ids) => {
	for (const r of ids) {
		const [tr] = await mysqlPool.execute(TOMBSTONE_SQL, [parsed.table, r.id]);
		const op = buildMirrorOp(TOMBSTONE_SQL, [parsed.table, r.id], tr.insertId);
		if (op) applyOps(sqliteDb, [op]);
	}
};

const recordTombstonesSqlite = (parsed, ids) => {
	for (const r of ids) {
		sqliteExec(TOMBSTONE_SQL, [parsed.table, r.id]);
	}
};

const openSqlite = () => {
	fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
	sqliteDb = new DatabaseSync(DB_PATH);
	sqliteDb.exec('PRAGMA foreign_keys = ON');
	sqliteDb.exec('PRAGMA journal_mode = WAL');
};

// node:sqlite rejects `undefined` bindings; treat them as NULL so callers that
// pass optional fields (e.g. reject reason, vendor_id) never crash with a 500.
const normalizeParams = (params = []) =>
	params.map((p) => (p === undefined ? null : p));

const sqliteExec = (query, params = []) => {
	params = normalizeParams(params);
	const stmt = sqliteDb.prepare(query);
	if (IS_READ.test(query)) {
		return [stmt.all(...params), []];
	}
	const info = stmt.run(...params);
	return [
		{
			affectedRows: Number(info.changes),
			insertId: Number(info.lastInsertRowid),
		},
		[],
	];
};

// Try a throwaway MySQL connection; returns true only if the server answers.
const mysqlAvailable = async () => {
	let conn;
	try {
		conn = await mysql.createConnection({ ...mysqlConfig(), connectTimeout: 2500 });
		await conn.query('SELECT 1');
		return true;
	} catch {
		return false;
	} finally {
		if (conn) await conn.end().catch(() => {});
	}
};

const ensureSchema = async (dialectName) => {
	for (const statement of ddlFor(dialectName)) {
		if (dialectName === 'mysql') {
			await mysqlPool.query(statement);
		} else {
			sqliteDb.exec(statement);
		}
	}
};

// Unified statement executor with mysql2-shaped returns:
//   SELECT -> [rows, fields];  DML -> [{ affectedRows, insertId }, fields]
const execute = async (query, params = []) => {
	if (dialect === 'mysql') {
		const del = parseDelete(query);
		const ids =
			del && APP_TABLES.includes(del.table)
				? (
						await mysqlPool.execute(
							`SELECT id FROM ${del.table} WHERE ${del.where || '1=1'}`,
							params,
						)
					)[0]
				: [];
		const [result, fields] = await mysqlPool.execute(query, params);
		if (!IS_READ.test(query)) {
			if (del) {
				// Mirror the DELETE itself, then record tombstones for the ids.
				const op = buildMirrorOp(query, params, null);
				if (op) applyOps(sqliteDb, [op]);
				await recordTombstonesMysql(del, ids);
			} else {
				const op = buildMirrorOp(query, params, result.insertId);
				if (op) applyOps(sqliteDb, [op]);
			}
		}
		return [result, fields];
	}
	const del = parseDelete(query);
	const ids =
		del && APP_TABLES.includes(del.table)
			? sqliteExec(`SELECT id FROM ${del.table} WHERE ${del.where || '1=1'}`, params)[0]
			: [];
	const result = sqliteExec(query, params);
	if (!IS_READ.test(query)) {
		if (del) recordTombstonesSqlite(del, ids);
	}
	return result;
};

// Transaction connection. On MySQL, mirrored DML is queued and flushed to
// SQLite only after commit (so a rollback never leaks mirrored rows).
const getConnection = async () => {
	if (dialect === 'mysql') {
		const conn = await mysqlPool.getConnection();
		let queue = [];
		return {
			execute: async (query, params = []) => {
				if (IS_READ.test(query)) {
					return conn.execute(query, params);
				}
				const del = parseDelete(query);
				if (del && APP_TABLES.includes(del.table)) {
					const [ids] = await conn.execute(
						`SELECT id FROM ${del.table} WHERE ${del.where || '1=1'}`,
						params,
					);
					const [result, fields] = await conn.execute(query, params);
					queue.push({ query, params, insertId: result.insertId });
					for (const r of ids) {
						const [tr] = await conn.execute(TOMBSTONE_SQL, [del.table, r.id]);
						queue.push({ query: TOMBSTONE_SQL, params: [del.table, r.id], insertId: tr.insertId });
					}
					return [result, fields];
				}
				const [result, fields] = await conn.execute(query, params);
				queue.push({ query, params, insertId: result.insertId });
				return [result, fields];
			},
			beginTransaction: () => conn.beginTransaction(),
			commit: async () => {
				await conn.commit();
				const ops = queue.map((q) =>
					buildMirrorOp(q.query, q.params, q.insertId),
				);
				applyOps(sqliteDb, ops);
				queue = [];
			},
			rollback: () => {
				queue = [];
				return conn.rollback();
			},
			release: () => conn.release(),
		};
	}
	return {
		execute: sqliteExec,
		beginTransaction: () => sqliteDb.exec('BEGIN'),
		commit: () => sqliteDb.exec('COMMIT'),
		rollback: () => sqliteDb.exec('ROLLBACK'),
		release: () => {},
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

	const adminId = await insertUser('Admin User', 'admin@test.com', adminPass, 'admin', null);
	const vendorUserId = await insertUser('Himalayan Movers', 'vendor@test.com', vendorPass, 'vendor', '9800000001');
	const customerUserId = await insertUser('Demo Customer', 'customer@test.com', customerPass, 'user', '9800000002');

	const [vendorResult] = await execute(
		`INSERT INTO vendors (user_id, business_name, owner_name, phone, email, service_region, address, status, rating, total_jobs)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[vendorUserId, 'Himalayan Movers', 'Ramesh Shrestha', '9800000001', 'vendor@test.com', 'Kathmandu Valley', 'Baneshwor, Kathmandu', 'active', 4.5, 12],
	);
	const vendorId = vendorResult.insertId;

	await execute(
		`INSERT INTO vendor_vehicles (vendor_id, name, plate_number, vehicle_type, capacity_tonnes, driver_name, driver_phone, status, is_active)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[vendorId, 'Tata Ace', 'BA 1 KA 1234', 'Cargo Tempo', 1.0, 'Suresh Lama', '9812345678', 'available', 1],
	);

	await execute(
		`INSERT INTO shipments (
			booking_id, user_id, first_name, last_name, mobile_number, email,
			pickup_province, pickup_district, pickup_city, drop_province, drop_district, drop_city,
			home_size, selected_items, vehicle_type, move_date, payment_method,
			status, approval_status, approved_by, assigned_vendor_id, transaction_id, payment_status, distance_km, estimated_duration
		 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			`MG-${Date.now()}`, customerUserId, 'Demo', 'Customer', '9800000002', 'customer@test.com',
			'Bagmati', 'Kathmandu', 'Baneshwor', 'Bagmati', 'Lalitpur', 'Patan',
			'1 BHK', JSON.stringify(['Sofa', 'Bed']), 'Cargo Tempo', '2026-08-15', 'esewa',
			'delivered', 'approved', adminId, vendorId, `TXN-${Date.now()}`, 'paid', 8.5, '3 hours',
		],
	);
	console.log('[db] demo data seeded (admin@test.com / adminpass123)');
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

	openSqlite();

	let useMysql = false;
	if (DB_DRIVER === 'sqlite') {
		useMysql = false;
	} else if (DB_DRIVER === 'mysql') {
		if (!(await mysqlAvailable())) {
			throw new Error('DB_DRIVER=mysql but no MySQL server is reachable');
		}
		useMysql = true;
	} else {
		useMysql = await mysqlAvailable();
	}

	if (useMysql) {
		mysqlPool = mysql.createPool(mysqlConfig());
		dialect = 'mysql';
		await ensureSchema('mysql');
		await ensureSchema('sqlite');
	} else {
		dialect = 'sqlite';
		await ensureSchema('sqlite');
	}

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

	// Once MySQL is the primary, converge the SQLite mirror to the merged state.
	if (dialect === 'mysql') {
		await reconcileAll(
			(query, params) => mysqlPool.execute(query, params),
			sqliteDb,
		);
	}

	inited = true;
	console.log(
		`[db] active driver: ${dialect}${dialect === 'sqlite' ? ` (file: ${DB_PATH})` : ''} (MySQL + SQLite sync enabled)`,
	);
};

const pool = { execute, getConnection };

export default pool;
