import jwt from 'jsonwebtoken';
import {
	createUser,
	findUserByEmail,
	verifyPassword,
	getAllUsers,
} from '../models/authModel.js';

const JWT_SECRET = process.env.JWT_SECRET || 'meroghar-jwt-secret-change-in-production';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 6;
const PHONE_REGEX = /^[0-9]{10}$/;

export const registerUser = async (req, res) => {
	try {
		const { name, email, password, role, phone } = req.body;

		if (!name || !name.trim()) {
			return res.status(400).json({ success: false, message: 'Name is required' });
		}
		if (!email || !EMAIL_REGEX.test(email)) {
			return res.status(400).json({ success: false, message: 'Valid email is required' });
		}
		if (!password || password.length < PASSWORD_MIN_LENGTH) {
			return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
		}
		if (phone && !PHONE_REGEX.test(phone)) {
			return res.status(400).json({ success: false, message: 'Phone must be exactly 10 digits' });
		}

		const allowedRoles = ['user', 'vendor'];
		const sanitizedRole = allowedRoles.includes(role) ? role : 'user';

		const existingUser = await findUserByEmail(email);
		if (existingUser) {
			return res.status(400).json({ success: false, message: 'User already exists' });
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
	} catch (error) {
		console.error('Registration error:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

export const loginUser = async (req, res) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res.status(400).json({ success: false, message: 'Email and password required' });
		}

		const user = await findUserByEmail(email);
		if (!user) {
			return res.status(401).json({ success: false, message: 'Invalid email or password' });
		}

		const isValid = await verifyPassword(password, user.password);
		if (!isValid) {
			return res.status(401).json({ success: false, message: 'Invalid email or password' });
		}

		const token = jwt.sign(
			{ id: user.id, email: user.email, role: user.role },
			JWT_SECRET,
			{ expiresIn: '7d' }
		);

		const { password: _, ...userWithoutPassword } = user;

		res.json({
			success: true,
			message: 'Login successful',
			token,
			user: userWithoutPassword,
		});
	} catch (error) {
		console.error('Login error:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

export const getUsers = async (req, res) => {
	try {
		const users = await getAllUsers();
		res.json({ success: true, users });
	} catch (error) {
		console.error('Error fetching users:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};
