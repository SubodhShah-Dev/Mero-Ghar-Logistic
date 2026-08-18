import jwt from 'jsonwebtoken';
import {
	createUser,
	findUserByEmail,
	verifyPassword,
	getAllUsers,
	getUserBranches,
} from '../models/authModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';
import { EMAIL_REGEX, PHONE_REGEX } from '../utils/validation.js';

const JWT_SECRET = process.env.JWT_SECRET || 'shiftsathi-jwt-secret-change-in-production';
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('Refusing to start in production without JWT_SECRET set');
  process.exit(1);
}

const PASSWORD_MIN_LENGTH = 6;

export const registerUser = asyncHandler(async (req, res) => {
	const { name, email, password, role, phone } = req.body;

	if (!name || !name.trim()) {
		throw new HttpError(400, 'Name is required');
	}
	if (!email || !EMAIL_REGEX.test(email)) {
		throw new HttpError(400, 'Valid email is required');
	}
	if (!password || password.length < PASSWORD_MIN_LENGTH) {
		throw new HttpError(400, 'Password must be at least 6 characters');
	}
	if (phone && !PHONE_REGEX.test(phone)) {
		throw new HttpError(400, 'Phone must be exactly 10 digits');
	}

	const allowedRoles = ['user', 'vendor'];
	const sanitizedRole = allowedRoles.includes(role) ? role : 'user';

	const existingUser = await findUserByEmail(email);
	if (existingUser) {
		throw new HttpError(400, 'User already exists');
	}

	const newUser = await createUser({
		name: name.trim(),
		email: email.trim().toLowerCase(),
		password,
		role: sanitizedRole,
		phone: phone || null,
	});

	res.status(201).json({
		success: true,
		message: 'User successfully registered',
		user: newUser,
	});
});

export const loginUser = asyncHandler(async (req, res) => {
	const { email, password } = req.body;

	if (!email || !password) {
		throw new HttpError(400, 'Email and password required');
	}

	const user = await findUserByEmail(email);
	if (!user) {
		throw new HttpError(401, 'Invalid email or password');
	}

	const isValid = await verifyPassword(password, user.password);
	if (!isValid) {
		throw new HttpError(401, 'Invalid email or password');
	}

	const branches = await getUserBranches(user.id, user.role);

	const token = jwt.sign(
		{ id: user.id, email: user.email, role: user.role, branches },
		JWT_SECRET,
		{ expiresIn: '7d' }
	);

	const { password: _, ...userWithoutPassword } = user;

	res.json({
		success: true,
		message: 'Login successful',
		token,
		user: { ...userWithoutPassword, branches },
	});
});

export const getUsers = asyncHandler(async (req, res) => {
	const users = await getAllUsers();
	res.json({ success: true, users });
});
