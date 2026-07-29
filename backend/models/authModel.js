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
