import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getAppSettings, saveSettings } from '../controllers/settingsController.js';

const router = express.Router();

router.get('/', getAppSettings);
router.put('/', authenticate, authorize('settings.manage'), saveSettings);

export default router;
