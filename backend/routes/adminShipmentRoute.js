import express from 'express';
import {
	getPendingShipmentsList,
	getShipmentsByStatus,
	approveShipmentRequest,
	rejectShipmentRequest,
} from '../controllers/adminShipmentController.js';
import {
	getVendors,
	updateVendorStatusCtrl,
	getActiveVendorsList,
} from '../controllers/vendorController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/shipments/pending', authenticate, requireRole('admin'), getPendingShipmentsList);
router.get('/shipments/status/:status', authenticate, requireRole('admin'), getShipmentsByStatus);
router.put('/shipments/:id/approve', authenticate, requireRole('admin'), approveShipmentRequest);
router.put('/shipments/:id/reject', authenticate, requireRole('admin'), rejectShipmentRequest);
router.get('/vendors', authenticate, requireRole('admin'), getVendors);
router.get('/vendors/active', authenticate, requireRole('admin'), getActiveVendorsList);
router.put('/vendors/:id/status', authenticate, requireRole('admin'), updateVendorStatusCtrl);

export default router;
