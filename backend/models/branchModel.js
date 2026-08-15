import pool from '../config/db.js';

export const getBranches = async () => {
	const [rows] = await pool.execute(
		'SELECT id, name, province_id, is_active, created_at FROM branches ORDER BY province_id ASC, name ASC',
	);
	return rows;
};

export const getActiveBranches = async () => {
	const [rows] = await pool.execute(
		'SELECT id, name, province_id FROM branches WHERE is_active = 1 ORDER BY province_id ASC, name ASC',
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

// Resolve the branch for a pickup district name (used at shipment creation and
// by public matching). Branches are district-scoped (one branch per district),
// so the branch name matches the district name exactly.
export const branchIdForDistrict = async (districtName) => {
	if (!districtName) return null;
	const name = String(districtName).trim();
	if (!name) return null;
	const [rows] = await pool.execute(
		'SELECT id FROM branches WHERE name = ? LIMIT 1',
		[name],
	);
	if (rows[0]) return rows[0].id;
	// Tolerate case/spacing differences in district spellings.
	const [fuzzy] = await pool.execute(
		'SELECT id FROM branches WHERE LOWER(REPLACE(name, " ", "")) = LOWER(REPLACE(?, " ", "")) LIMIT 1',
		[name],
	);
	return fuzzy[0] ? fuzzy[0].id : null;
};

// True when the given string matches one of the recognized province aliases.
// Provinces are still used to validate vendor-declared routes.
const PROVINCE_ALIASES = [
	['Koshi Province', /koshi|province\s*no[.\s]*1|province\s*1/i],
	['Madhesh Province', /madhesh|province\s*no[.\s]*2|province\s*2/i],
	['Bagmati Province', /bagmati|province\s*no[.\s]*3|province\s*3/i],
	['Gandaki Province', /gandaki|province\s*no[.\s]*4|province\s*4/i],
	['Lumbini Province', /lumbini|province\s*no[.\s]*5|province\s*5/i],
	['Karnali Province', /karnali|province\s*no[.\s]*6|province\s*6/i],
	['Sudurpashchim Province', /sudurpashchim|surdurpashchim|province\s*no[.\s]*7|province\s*7/i],
];

export const isKnownProvince = (provinceName) => {
	if (!provinceName) return false;
	return PROVINCE_ALIASES.some(([, re]) => re.test(String(provinceName)));
};
