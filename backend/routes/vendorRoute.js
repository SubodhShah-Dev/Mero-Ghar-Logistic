import express from 'express';
import {
	getMyVendorProfile,
	updateMyVendorProfile,
	registerVendor,
	getVendorShipments,
	acceptShipment,
	startDelivery,
	completeDelivery,
	testVendorRoute,
	rejectShipment,
	getMyVehicles,
	addVehicle,
	updateVehicleStatusCtrl,
	deleteVehicle,
	matchingVendors,
} from '../controllers/vendorController.js';
import { authenticate, requireRole, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/test', testVendorRoute);

router.get('/profile', authenticate, requireRole('vendor', 'admin'), getMyVendorProfile);
router.put('/profile', authenticate, requireRole('vendor', 'admin'), updateMyVendorProfile);
router.post('/register', authenticate, registerVendor);
router.get('/shipments', authenticate, requireRole('vendor', 'admin'), getVendorShipments);
router.put('/shipments/:id/accept', authenticate, requireRole('vendor'), acceptShipment);
router.put('/shipments/:id/start', authenticate, requireRole('vendor'), startDelivery);
router.put('/shipments/:id/complete', authenticate, requireRole('vendor'), completeDelivery);
router.put('/shipments/:id/reject', authenticate, requireRole('vendor'), rejectShipment);

router.get('/vehicles', authenticate, requireRole('vendor'), getMyVehicles);
router.post('/vehicles', authenticate, requireRole('vendor'), addVehicle);
router.put('/vehicles/:id/status', authenticate, requireRole('vendor', 'admin'), updateVehicleStatusCtrl);
router.delete('/vehicles/:id', authenticate, requireRole('vendor'), deleteVehicle);

router.get('/matching', matchingVendors);

export default router;
