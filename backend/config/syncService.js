// Live data synchronization between MySQL (primary when reachable) and SQLite
// (always-available file mirror).
//
// Two mechanisms:
//  1. Live mirror: every DML executed on MySQL is replayed on SQLite (INSERTs
//     reuse the same id so primary keys can never diverge).
//  2. Startup reconciliation: when MySQL comes back after being down, both
//     sides are merged row-by-row (rows missing on either side are copied, and
//     conflicts resolve by last-write-wins on updated_at / created_at).

const IS_DML = /^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i;
const IS_READ = /^\s*(SELECT|PRAGMA|WITH|EXPLAIN)\b/i;

// Parse a plain `INSERT INTO t (a, b, ...)` column list.
const parseInsertColumns = (query) => {
	const m = query.match(
		/^\s*(?:INSERT\s+(?:IGNORE\s+)?INTO|REPLACE\s+INTO)\s+`?(\w+)`?\s*\(([^)]*)\)/i,
	);
	if (!m) return null;
	const columns = m[2]
		.split(',')
		.map((c) => c.trim())
		.filter(Boolean);
	return { table: m[1], columns };
};

// Build the SQLite mirror statement for an op that just ran on MySQL.
// Returns { sql, params } or null when the op cannot (or need not) be mirrored.
export const buildMirrorOp = (query, params = [], insertId) => {
	if (!IS_DML.test(query)) return null;
	const insert = parseInsertColumns(query);

	if (insert) {
		// MySQL-only upsert syntax -> SQLite ON CONFLICT upsert.
		if (/ON\s+DUPLICATE\s+KEY\s+UPDATE/i.test(query)) {
			// Only settingsModel uses this today.
			if (insert.table !== 'settings') return null;
			const valuesParams = params.slice(0, insert.columns.length);
			const placeholders = ['?', ...insert.columns.map(() => '?')];
			const sql =
				`INSERT INTO settings (id, ${insert.columns.join(', ')}) ` +
				`VALUES (${placeholders.join(', ')}) ` +
				'ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value';
			return { sql, params: [insertId, ...valuesParams] };
		}

		const placeholders = ['?', ...insert.columns.map(() => '?')];
		const sql = `INSERT INTO ${insert.table} (id, ${insert.columns.join(', ')}) ` +
			`VALUES (${placeholders.join(', ')})`;
		return { sql, params: [insertId, ...params.slice(0, insert.columns.length)] };
	}

	// UPDATE / DELETE use the same syntax in both dialects; replay as-is.
	return { sql: query, params };
};

// Best-effort replay of mirrored ops onto SQLite. Never throws to the caller.
export const applyOps = (sqliteDb, ops) => {
	for (const op of ops) {
		if (!op) continue;
		try {
			const stmt = sqliteDb.prepare(op.sql);
			if (IS_READ.test(op.sql)) stmt.all(...op.params);
			else stmt.run(...op.params);
		} catch (err) {
			console.error('[sync] mirror write failed (best-effort):', err.message);
		}
	}
};

// ── Reconciliation ──

const TABLE_ORDER = [
	'users',
	'vendors',
	'vendor_vehicles',
	'shipments',
	'support_tickets',
	'settings',
];

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/;
const NUMERIC_RE = /^-?\d+(\.\d+)?$/;

const pad = (n) => String(n).padStart(2, '0');

// MySQL returns DATE as a local-midnight Date and DATETIME as a Date in the
// Node process's timezone; SQLite returns plain strings. Normalize both so
// equivalent values compare equal regardless of the timezone they were stored
// in: DATE columns collapse to 'YYYY-MM-DD', DATETIME/TIMESTAMP to epoch ms.
const isLocalMidnight = (d) =>
	d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0;

const localDateStr = (d) =>
	`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const utcEpochFromString = (s) => {
	const t = Date.parse(s.includes('T') ? s : `${s.replace(' ', 'T')}Z`);
	return Number.isNaN(t) ? null : t;
};

const normalizeValue = (v) => {
	if (v === null || v === undefined) return null;
	if (v instanceof Date) {
		return isLocalMidnight(v) ? localDateStr(v) : v.getTime();
	}
	if (typeof v === 'bigint') return Number(v);
	if (typeof v === 'boolean') return v ? 1 : 0;
	if (typeof v === 'number') return v;
	if (typeof v === 'string') {
		const trimmed = v.trim();
		if (trimmed !== '' && NUMERIC_RE.test(trimmed)) return Number(trimmed);
		if (DATE_ONLY_RE.test(trimmed)) return trimmed;
		if (DATETIME_RE.test(trimmed)) {
			const epoch = utcEpochFromString(trimmed);
			if (epoch !== null) return epoch;
		}
		return v;
	}
	if (Buffer.isBuffer(v)) return v.toString('hex');
	return String(v);
};

const normalizeRow = (row) => {
	const out = {};
	for (const [k, v] of Object.entries(row)) out[k] = normalizeValue(v);
	return out;
};

// Timestamps are set independently by each database, so they are excluded
// from the conflict check and only used for LWW ordering.
const dataSignature = (row) => {
	const copy = normalizeRow(row);
	delete copy.created_at;
	delete copy.updated_at;
	return JSON.stringify(copy);
};

const toEpoch = (v) => {
	if (v instanceof Date) return v.getTime();
	if (typeof v === 'number') return v;
	if (typeof v === 'string') {
		const epoch = utcEpochFromString(v);
		if (epoch !== null) return epoch;
	}
	return 0;
};

const rowVersion = (row) => {
	const updated = toEpoch(row.updated_at);
	if (updated > 0) return updated;
	return toEpoch(row.created_at);
};

// Values copied MySQL -> SQLite must be stored as strings SQLite accepts.
// DATE (local-midnight) -> 'YYYY-MM-DD'; DATETIME/TIMESTAMP -> UTC text.
const toSqliteValue = (v) => {
	if (v instanceof Date) {
		if (isLocalMidnight(v)) return localDateStr(v);
		return v.toISOString().slice(0, 19).replace('T', ' ');
	}
	if (typeof v === 'bigint') return Number(v);
	if (typeof v === 'boolean') return v ? 1 : 0;
	return v;
};

const insertInto = async (db, isSqlite, table, row) => {
	const keys = Object.keys(row);
	const cols = keys.join(', ');
	const placeholders = keys.map(() => '?').join(', ');
	const values = isSqlite ? keys.map((k) => toSqliteValue(row[k])) : keys.map((k) => row[k]);
	if (isSqlite) {
		db.prepare(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`).run(...values);
	} else {
		await db(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, values);
	}
};

const updateInto = async (db, isSqlite, table, row) => {
	const keys = Object.keys(row).filter((k) => k !== 'id');
	const set = keys.map((k) => `${k} = ?`).join(', ');
	const values = isSqlite ? keys.map((k) => toSqliteValue(row[k])) : keys.map((k) => row[k]);
	if (isSqlite) {
		db.prepare(`UPDATE ${table} SET ${set} WHERE id = ?`).run(...values, row.id);
	} else {
		await db(`UPDATE ${table} SET ${set} WHERE id = ?`, [...values, row.id]);
	}
};

// Reconcile one table between MySQL (primary) and SQLite (mirror).
const reconcileTable = async (mysqlRaw, sqliteDb, table) => {
	const [mysqlRows] = await mysqlRaw(`SELECT * FROM ${table}`, []);
	const sqliteRows = sqliteDb.prepare(`SELECT * FROM ${table}`).all();

	const mysqlById = new Map(mysqlRows.map((r) => [r.id, r]));
	const sqliteById = new Map(sqliteRows.map((r) => [r.id, r]));

	// Copy rows that only exist on the SQLite side into MySQL (preserving ids).
	for (const row of sqliteRows) {
		if (!mysqlById.has(row.id)) {
			try {
				await insertInto(mysqlRaw, false, table, row);
			} catch (err) {
				console.error(`[sync] reconcile copy sqlite->mysql ${table} #${row.id}:`, err.message);
			}
		}
	}

	// Copy rows that only exist on MySQL into SQLite, and resolve conflicts by LWW.
	for (const row of mysqlRows) {
		const target = sqliteById.get(row.id);
		if (!target) {
			try {
				await insertInto(sqliteDb, true, table, row);
			} catch (err) {
				console.error(`[sync] reconcile copy mysql->sqlite ${table} #${row.id}:`, err.message);
			}
			continue;
		}
		if (dataSignature(row) === dataSignature(target)) continue;

		const sqliteNewer = rowVersion(target) > rowVersion(row);
		try {
			if (sqliteNewer) {
				await updateInto(mysqlRaw, false, table, target);
			} else {
				await updateInto(sqliteDb, true, table, row);
			}
		} catch (err) {
			console.error(`[sync] reconcile LWW ${table} #${row.id}:`, err.message);
		}
	}
};

// Delete any rows that carry a tombstone in either database, then clear the
// tombstones. Runs before the merge so a deleted row is never resurrected.
const applyTombstones = async (mysqlRaw, sqliteDb) => {
	let mysqlTomb = [];
	try {
		mysqlTomb = (await mysqlRaw('SELECT table_name, row_id FROM sync_deletions', []))[0];
	} catch (err) {
		console.error('[sync] read tombstones (mysql):', err.message);
	}
	let sqliteTomb = [];
	try {
		sqliteTomb = sqliteDb.prepare('SELECT table_name, row_id FROM sync_deletions').all();
	} catch (err) {
		console.error('[sync] read tombstones (sqlite):', err.message);
	}

	const seen = new Set();
	for (const [table, rowId] of [...mysqlTomb, ...sqliteTomb].map((r) => [r.table_name, r.row_id])) {
		const key = `${table}:${rowId}`;
		if (seen.has(key)) continue;
		seen.add(key);
		if (!TABLE_ORDER.includes(table)) continue;
		try {
			await mysqlRaw(`DELETE FROM ${table} WHERE id = ?`, [rowId]);
		} catch (err) {
			console.error(`[sync] tombstone delete mysql ${table} #${rowId}:`, err.message);
		}
		try {
			sqliteDb.prepare(`DELETE FROM ${table} WHERE id = ?`).run(rowId);
		} catch (err) {
			console.error(`[sync] tombstone delete sqlite ${table} #${rowId}:`, err.message);
		}
	}

	try {
		await mysqlRaw('DELETE FROM sync_deletions', []);
	} catch (err) {
		console.error('[sync] clear tombstones (mysql):', err.message);
	}
	try {
		sqliteDb.prepare('DELETE FROM sync_deletions').run();
	} catch (err) {
		console.error('[sync] clear tombstones (sqlite):', err.message);
	}
};

export const reconcileAll = async (mysqlRaw, sqliteDb) => {
	await applyTombstones(mysqlRaw, sqliteDb);
	for (const table of TABLE_ORDER) {
		try {
			await reconcileTable(mysqlRaw, sqliteDb, table);
		} catch (err) {
			console.error(`[sync] reconcile ${table} failed:`, err.message);
		}
	}
};
