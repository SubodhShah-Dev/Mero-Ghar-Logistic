import express from 'express';
import {
	createShipment,
	getShipment,
	getAllShipments,
	getUserShipments,
	getShipmentsByEmail,
	updateShipmentStatus,
} from '../controllers/shipmentController.js';
import { listMessages, sendMessage } from '../controllers/messageController.js';
import { authenticate, requireRole, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/create', optionalAuth, createShipment);
router.get('/all', authenticate, requireRole('admin'), getAllShipments);
router.get('/my', authenticate, getUserShipments);
router.get('/email/:email', getShipmentsByEmail);
router.get('/:id', authenticate, getShipment);
router.put('/:id/status', authenticate, requireRole('admin'), updateShipmentStatus);
router.get('/:id/messages', authenticate, listMessages);
router.post('/:id/messages', authenticate, sendMessage);

export default router;
