import pool from '../config/db.js';
import bcrypt from 'bcryptjs';

export const createUser = async (userData) => {
	const { name, email, password, role, phone } = userData;

	const allowedRoles = ['user', 'vendor'];
	const safeRole = allowedRoles.includes(role) ? role : 'user';

	const salt = await bcrypt.genSalt(10);
	const hashedPassword = await bcrypt.hash(password, salt);

	const [result] = await pool.execute(
		'INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
		[name, email, hashedPassword, safeRole, phone || null],
	);

	return { id: result.insertId, name, email, role: safeRole };
};

export const findUserByEmail = async (email) => {
	const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [
		email,
	]);
	return rows[0];
};

export const findUserById = async (id) => {
	const [rows] = await pool.execute(
		'SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?',
		[id],
	);
	return rows[0];
};

export const getAllUsers = async () => {
	const [rows] = await pool.execute(
		'SELECT id, name, email, role, phone, created_at FROM users',
	);
	return rows;
};

export const verifyPassword = async (plainPassword, hashedPassword) => {
	try {
		// Check if the password is already hashed (starts with $2)
		if (!hashedPassword || !hashedPassword.startsWith('$2')) {
			console.log('Password is not hashed properly');
			return false;
		}
		return await bcrypt.compare(plainPassword, hashedPassword);
	} catch (error) {
		console.error('Error verifying password:', error);
		return false;
	}
};

// ── RBAC v2 helpers ──

// The administrative branch scope for a user:
//   super_admin → null (unlimited)
//   branch_admin→ [branch_ids...] from user_branches
//   vendor      → [their vendor's branch]
//   user        → []
export const getUserBranches = async (userId, role) => {
	if (role === 'super_admin') return null;
	if (role === 'branch_admin') {
		const [rows] = await pool.execute(
			'SELECT branch_id FROM user_branches WHERE user_id = ?',
			[userId],
		);
		return rows.map((r) => r.branch_id);
	}
	if (role === 'vendor') {
		const [rows] = await pool.execute(
			'SELECT branch_id FROM vendors WHERE user_id = ? AND branch_id IS NOT NULL LIMIT 1',
			[userId],
		);
		return rows.length ? [rows[0].branch_id] : [];
	}
	return [];
};

export const setUserBranches = async (userId, branchIds) => {
	if (!Array.isArray(branchIds) || branchIds.length === 0) return;
	await pool.execute('DELETE FROM user_branches WHERE user_id = ?', [userId]);
	for (const branchId of branchIds) {
		await pool.execute(
			'INSERT IGNORE INTO user_branches (user_id, branch_id) VALUES (?, ?)',
			[userId, branchId],
		);
	}
};

// Create an administrative account (branch_admin / super_admin). Only called
// through the super-admin user-management endpoints.
export const createAdminUser = async ({ name, email, password, role, branchIds = [] }) => {
	const allowedRoles = ['branch_admin', 'super_admin'];
	const safeRole = allowedRoles.includes(role) ? role : 'branch_admin';

	const salt = await bcrypt.genSalt(10);
	const hashedPassword = await bcrypt.hash(password, salt);

	const [result] = await pool.execute(
		'INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
		[name, email, hashedPassword, safeRole, null],
	);
	const userId = result.insertId;

	if (safeRole === 'branch_admin') {
		await setUserBranches(userId, branchIds);
	}

	return { id: userId, name, email, role: safeRole };
};

export const updateUserRole = async (userId, role, branchIds = []) => {
	if (!['branch_admin', 'super_admin', 'vendor', 'user'].includes(role)) return false;
	await pool.execute('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
	if (role === 'branch_admin') {
		await setUserBranches(userId, branchIds);
	} else {
		await pool.execute('DELETE FROM user_branches WHERE user_id = ?', [userId]);
	}
	return true;
};

export const listUsersForAdmin = async ({ page = 1, limit = 50, branchFilter = null } = {}) => {
	const offset = (page - 1) * limit;
	const params = [];
	let scopeSql = '1 = 1';
	if (branchFilter?.restricted) {
		const ph = branchFilter.params.map(() => '?').join(', ');
		scopeSql =
			`(EXISTS (SELECT 1 FROM user_branches ub2 WHERE ub2.user_id = u.id AND ub2.branch_id IN (${ph}))` +
			` OR (u.role = 'vendor' AND EXISTS (SELECT 1 FROM vendors v WHERE v.user_id = u.id AND v.branch_id IN (${ph}))))`;
		params.push(...branchFilter.params, ...branchFilter.params);
	}
	const [rows] = await pool.execute(
		`SELECT u.id, u.name, u.email, u.role, u.phone, u.created_at,
		        GROUP_CONCAT(DISTINCT ub.branch_id) AS branch_ids
		 FROM users u
		 LEFT JOIN user_branches ub ON ub.user_id = u.id
		 WHERE ${scopeSql}
		 GROUP BY u.id
		 ORDER BY u.created_at DESC
		 LIMIT ? OFFSET ?`,
		[...params, Number(limit), Number(offset)],
	);
	return rows.map((r) => ({
		...r,
		branch_ids: r.branch_ids ? r.branch_ids.split(',').map(Number) : [],
	}));
};
