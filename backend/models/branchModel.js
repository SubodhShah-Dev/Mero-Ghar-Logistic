import pool from '../config/db.js';

export const getBranches = async () => {
	const [rows] = await pool.execute(
		'SELECT id, name, province_id, is_active, created_at FROM branches ORDER BY province_id ASC',
	);
	return rows;
};

export const getAllBranches = async () => {
	const [rows] = await pool.execute(
		'SELECT id, name, province_id, is_active FROM branches ORDER BY province_id ASC',
	);
	return rows;
};

export const getActiveBranches = async () => {
	const [rows] = await pool.execute(
		'SELECT id, name, province_id FROM branches WHERE is_active = 1 ORDER BY province_id ASC',
	);
	return rows;
};

export const getBranchById = async (id) => {
	const [rows] = await pool.execute(
		'SELECT id, name, province_id, is_active FROM branches WHERE id = ?',
		[id],
	);
	return rows[0];
};

export const getBranchByName = async (name) => {
	const [rows] = await pool.execute(
		'SELECT id, name, province_id FROM branches WHERE name = ? LIMIT 1',
		[name],
	);
	return rows[0];
};

export const createBranch = async ({ name, province_id }) => {
	const [result] = await pool.execute(
		'INSERT INTO branches (name, province_id) VALUES (?, ?)',
		[name, province_id],
	);
	return { id: result.insertId, name, province_id, is_active: 1 };
};

export const setBranchActive = async (id, isActive) => {
	const [result] = await pool.execute(
		'UPDATE branches SET is_active = ? WHERE id = ?',
		[isActive ? 1 : 0, id],
	);
	return result.affectedRows > 0;
};

// Resolve a branch for a pickup province name (used at shipment creation).
// Tolerates the many ways the UI/old data spells the provinces, e.g. 'Bagmati',
// 'Bagmati Province', 'Province No. 3', 'Province No. 3 (Bagmati)'.
const PROVINCE_ALIASES = [
	['Koshi Province', /koshi|province\s*no[.\s]*1|province\s*1/i],
	['Madhesh Province', /madhesh|province\s*no[.\s]*2|province\s*2/i],
	['Bagmati Province', /bagmati|province\s*no[.\s]*3|province\s*3/i],
	['Gandaki Province', /gandaki|province\s*no[.\s]*4|province\s*4/i],
	['Lumbini Province', /lumbini|province\s*no[.\s]*5|province\s*5/i],
	['Karnali Province', /karnali|province\s*no[.\s]*6|province\s*6/i],
	['Sudurpashchim Province', /sudurpashchim|surdurpashchim|province\s*no[.\s]*7|province\s*7/i],
];

export const branchIdForProvince = async (provinceName) => {
	if (!provinceName) return null;
	const name = String(provinceName).trim();
	let canonical = null;
	for (const [branch, re] of PROVINCE_ALIASES) {
		if (re.test(name)) {
			canonical = branch;
			break;
		}
	}
	if (!canonical) {
		const exact = await getBranchByName(name);
		if (exact) return exact.id;
		return null;
	}
	const branch = await getBranchByName(canonical);
	return branch ? branch.id : null;
};