import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';
import { getShipmentById } from '../models/shipmentModel.js';
import { getVendorById } from '../models/vendorModel.js';
import {
	getMessagesForShipment,
	insertMessage,
} from '../models/messageModel.js';

const MAX_MESSAGE_LENGTH = 2000;

// Only the booking owner and the assigned vendor may read/write the thread.
const assertParty = async (req, shipment) => {
	if (!shipment) {
		throw new HttpError(404, 'Shipment not found');
	}
	if (String(shipment.user_id) === String(req.user.id)) {
		return 'customer';
	}
	if (shipment.assigned_vendor_id != null) {
		const vendor = await getVendorById(shipment.assigned_vendor_id);
		if (vendor && String(vendor.user_id) === String(req.user.id)) {
			return 'vendor';
		}
	}
	throw new HttpError(403, 'You are not a party to this booking');
};

export const listMessages = asyncHandler(async (req, res) => {
	const shipment = await getShipmentById(req.params.id);
	await assertParty(req, shipment);
	const messages = await getMessagesForShipment(shipment.id);
	res.json({ success: true, messages });
});

export const sendMessage = asyncHandler(async (req, res) => {
	const shipment = await getShipmentById(req.params.id);
	const senderRole = await assertParty(req, shipment);

	const message = String(req.body?.message || '').trim();
	if (!message) {
		throw new HttpError(400, 'Message is required');
	}
	if (message.length > MAX_MESSAGE_LENGTH) {
		throw new HttpError(400, `Message must be at most ${MAX_MESSAGE_LENGTH} characters`);
	}

	const created = await insertMessage({
		shipment_id: shipment.id,
		sender_user_id: req.user.id,
		sender_role: senderRole,
		message,
	});

	res.status(201).json({ success: true, message: 'Message sent', data: created });
});
