import express from 'express';
import { getShipmentsByStatus } from '../controllers/adminShipmentController.js';
import {
	getVendors,
	updateVendorStatusCtrl,
	getActiveVendorsList,
} from '../controllers/vendorController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/shipments/status/:status', authenticate, requireRole('admin'), getShipmentsByStatus);
router.get('/vendors', authenticate, requireRole('admin'), getVendors);
router.get('/vendors/active', authenticate, requireRole('admin'), getActiveVendorsList);
router.put('/vendors/:id/status', authenticate, requireRole('admin'), updateVendorStatusCtrl);

export default router;
