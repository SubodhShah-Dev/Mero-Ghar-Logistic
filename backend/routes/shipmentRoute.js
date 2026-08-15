import express from 'express';
import {
	createShipment,
	getShipment,
	getAllShipments,
	getUserShipments,
	updateShipmentStatus,
} from '../controllers/shipmentController.js';
import { listMessages, sendMessage } from '../controllers/messageController.js';
import { authenticate, optionalAuth, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/create', optionalAuth, createShipment);
router.get('/all', authenticate, authorize('shipments.view.global', 'shipments.view.region'), getAllShipments);
router.get('/my', authenticate, getUserShipments);
router.get('/:id', authenticate, getShipment);
router.put('/:id/status', authenticate, authorize('shipments.status.admin'), updateShipmentStatus);
router.get('/:id/messages', authenticate, listMessages);
router.post('/:id/messages', authenticate, sendMessage);

export default router;
