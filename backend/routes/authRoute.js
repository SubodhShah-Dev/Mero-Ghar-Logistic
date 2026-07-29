import express from 'express';
import {
	registerUser,
	loginUser,
	getUsers,
} from '../controllers/authController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/users', authenticate, requireRole('admin'), getUsers);

export default router;
