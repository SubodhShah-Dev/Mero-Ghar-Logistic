import express from 'express';
import { getShipmentsByStatus } from '../controllers/adminShipmentController.js';
import {
	getVendors,
	updateVendorStatusCtrl,
	getActiveVendorsList,
} from '../controllers/vendorController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get(
	'/shipments/status/:status',
	authenticate,
	authorize('shipments.view.global', 'shipments.view.region'),
	getShipmentsByStatus,
);
router.get(
	'/vendors',
	authenticate,
	authorize('vendors.view.global', 'vendors.view.region'),
	getVendors,
);
router.get(
	'/vendors/active',
	authenticate,
	authorize('vendors.view.global', 'vendors.view.region'),
	getActiveVendorsList,
);
router.put(
	'/vendors/:id/status',
	authenticate,
	authorize('vendors.status.region'),
	updateVendorStatusCtrl,
);

export default router;
