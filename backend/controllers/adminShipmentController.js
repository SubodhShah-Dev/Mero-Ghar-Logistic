import {
	getPendingShipments,
	approveShipment,
	rejectShipment,
	getShipmentsByApprovalStatus,
	getActiveShipmentsCountForVendor,
	getShipmentById,
} from '../models/shipmentModel.js';
import { getVendorById, findMatchingVendors } from '../models/vendorModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';
import { ALLOWED_APPROVAL_STATUSES } from '../utils/validation.js';

const parsePagination = (query) => {
	const page = Math.max(parseInt(query.page) || 1, 1);
	const limit = Math.min(Math.max(parseInt(query.limit) || 50, 1), 200);
	return { page, limit };
};

export const getPendingShipmentsList = asyncHandler(async (req, res) => {
	const shipments = await getPendingShipments(parsePagination(req.query));
	res.json({ success: true, shipments });
});

export const getShipmentsByStatus = asyncHandler(async (req, res) => {
	const { status } = req.params;
	if (!ALLOWED_APPROVAL_STATUSES.includes(status)) {
		throw new HttpError(400, 'Invalid approval status');
	}
	const shipments = await getShipmentsByApprovalStatus(
		status,
		parsePagination(req.query),
	);
	res.json({ success: true, shipments });
});

export const approveShipmentRequest = asyncHandler(async (req, res) => {
	const { id } = req.params;
	let { vendor_id } = req.body;
	const adminId = req.user.id;

	// Mobile clients approve without choosing a mover, so auto-assign the best
	// eligible one (active, matching vehicle type & availability) at that point.
	if (!vendor_id) {
		const target = await getShipmentById(id);
		if (!target) {
			throw new HttpError(404, 'Shipment not found');
		}
		const candidates = await findMatchingVendors(target.vehicle_type);
		if (candidates.length === 0) {
			throw new HttpError(
				400,
				'No available mover currently matches this booking',
			);
		}
		vendor_id = candidates[0].id;
	}

	const vendor = await getVendorById(vendor_id);
	if (!vendor) {
		throw new HttpError(404, 'Vendor not found');
	}
	if (vendor.status !== 'active') {
		throw new HttpError(400, 'Vendor is not active and cannot be assigned');
	}

	const activeCount = await getActiveShipmentsCountForVendor(vendor_id);
	if (activeCount > 0) {
		throw new HttpError(
			400,
			`${vendor.business_name} already has an active shipment. Please wait until it's completed.`,
		);
	}

	const approved = await approveShipment(id, vendor_id, adminId);
	if (!approved) {
		throw new HttpError(404, 'Shipment not found');
	}

	res.json({
		success: true,
		message: `Shipment approved and assigned to ${vendor.business_name}`,
	});
});

export const rejectShipmentRequest = asyncHandler(async (req, res) => {
	const { id } = req.params;
	const reason = String(req.body?.reason ?? '').trim();
	const adminId = req.user.id;

	const rejected = await rejectShipment(id, adminId, reason);
	if (!rejected) {
		throw new HttpError(404, 'Shipment not found');
	}

	res.json({ success: true, message: 'Shipment rejected' });
});
