import express from 'express';
import {
	getMyVendorProfile,
	updateMyVendorProfile,
	updateMyVendorBranch,
	registerVendor,
	getVendorShipments,
	getAvailableShipments,
	claimShipment,
	acceptShipment,
	startDelivery,
	completeDelivery,
	rejectShipment,
	getMyVehicles,
	addVehicle,
	updateVehicleStatusCtrl,
	deleteVehicle,
	matchingVendors,
	getMyRoutes,
	createRoute,
	deleteRoute,
} from '../controllers/vendorController.js';
import { authenticate, requireRole, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/profile', authenticate, requireRole('vendor', 'super_admin', 'branch_admin'), getMyVendorProfile);
router.put('/profile', authenticate, requireRole('vendor', 'super_admin', 'branch_admin'), updateMyVendorProfile);
router.put('/branch', authenticate, requireRole('vendor'), updateMyVendorBranch);
router.post('/register', authenticate, registerVendor);
router.get('/available', authenticate, requireRole('vendor'), getAvailableShipments);
router.get('/shipments', authenticate, requireRole('vendor', 'super_admin', 'branch_admin'), getVendorShipments);
router.put('/shipments/:id/claim', authenticate, requireRole('vendor'), claimShipment);
router.put('/shipments/:id/accept', authenticate, requireRole('vendor'), acceptShipment);
router.put('/shipments/:id/start', authenticate, requireRole('vendor'), startDelivery);
router.put('/shipments/:id/complete', authenticate, requireRole('vendor'), completeDelivery);
router.put('/shipments/:id/reject', authenticate, requireRole('vendor'), rejectShipment);

router.get('/vehicles', authenticate, requireRole('vendor'), getMyVehicles);
router.post('/vehicles', authenticate, requireRole('vendor'), addVehicle);
router.put('/vehicles/:id/status', authenticate, requireRole('vendor', 'super_admin', 'branch_admin'), updateVehicleStatusCtrl);
router.delete('/vehicles/:id', authenticate, requireRole('vendor'), deleteVehicle);

router.get('/routes', authenticate, requireRole('vendor', 'super_admin', 'branch_admin'), getMyRoutes);
router.post('/routes', authenticate, requireRole('vendor'), createRoute);
router.delete('/routes/:id', authenticate, requireRole('vendor'), deleteRoute);

router.get('/matching', matchingVendors);

export default router;
