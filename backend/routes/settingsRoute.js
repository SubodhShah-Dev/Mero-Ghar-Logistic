import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getAppSettings, saveSettings } from '../controllers/settingsController.js';

const router = express.Router();

router.get('/', getAppSettings);
router.put('/', authenticate, requireRole('admin'), saveSettings);

export default router;
