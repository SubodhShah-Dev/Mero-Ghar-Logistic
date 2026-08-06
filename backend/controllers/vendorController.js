import pool from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';

import {
	getAllVendors,
	getActiveVendors,
	getVendorById,
	getVendorByUserId,
	createVendor,
	updateVendorStatus,
	updateVendorProfile,
	getVendorVehicles,
	addVendorVehicle,
	updateVehicleStatus,
	removeVendorVehicle,
	findMatchingVendors,
} from '../models/vendorModel.js';

import {
	getShipmentsForVendor,
	getShipmentById,
	updateVendorShipmentStatus,
} from '../models/shipmentModel.js';

const parsePagination = (query) => {
	const page = Math.max(parseInt(query.page) || 1, 1);
	const limit = Math.min(Math.max(parseInt(query.limit) || 50, 1), 200);
	return { page, limit };
};

export const getVendors = asyncHandler(async (req, res) => {
	const vendors = await getAllVendors(parsePagination(req.query));
	res.json({ success: true, vendors });
});

export const getActiveVendorsList = asyncHandler(async (req, res) => {
	const vendors = await getActiveVendors();
	res.json({ success: true, vendors });
});

export const getMyVendorProfile = asyncHandler(async (req, res) => {
	const userId = req.user.id;
	const vendor = await getVendorByUserId(userId);

	if (!vendor) {
		throw new HttpError(404, 'Vendor profile not found');
	}

	res.json({
		success: true,
		vendor: {
			id: vendor.id,
			user_id: vendor.user_id,
			business_name: vendor.business_name,
			owner_name: vendor.owner_name,
			phone: vendor.phone,
			email: vendor.email,
			service_region: vendor.service_region,
			address: vendor.address,
			rating: vendor.rating || 0,
			total_jobs: vendor.total_jobs || 0,
			status: vendor.status,
			created_at: vendor.created_at,
		},
	});
});

export const updateMyVendorProfile = asyncHandler(async (req, res) => {
	const userId = req.user.id;

	const vendor = await getVendorByUserId(userId);
	if (!vendor) {
		throw new HttpError(404, 'Vendor profile not found');
	}

	const { business_name, owner_name, phone, service_region, address } =
		req.body;
	const updated = await updateVendorProfile(vendor.id, {
		business_name,
		owner_name,
		phone,
		service_region,
		address,
	});

	if (!updated) {
		throw new HttpError(400, 'Failed to update profile');
	}

	res.json({ success: true, message: 'Profile updated successfully' });
});

export const registerVendor = asyncHandler(async (req, res) => {
	const { business_name, owner_name, phone, email, service_region, address } =
		req.body;

	if (!business_name || !owner_name || !phone) {
		throw new HttpError(400, 'Business name, owner name and phone are required');
	}

	const existing = await getVendorByUserId(req.user.id);
	if (existing) {
		throw new HttpError(400, 'Vendor already registered');
	}

	const vendor = await createVendor({
		user_id: req.user.id,
		business_name,
		owner_name,
		phone,
		email,
		service_region,
		address,
	});

	res.status(201).json({
		success: true,
		message: 'Vendor registration submitted for approval',
		vendor,
	});
});

export const updateVendorStatusCtrl = asyncHandler(async (req, res) => {
	const { id } = req.params;
	const { status } = req.body;

	const allowedStatuses = ['pending', 'active', 'inactive', 'banned'];
	if (!allowedStatuses.includes(status)) {
		throw new HttpError(400, 'Invalid status');
	}

	const vendor = await getVendorById(id);
	if (!vendor) {
		throw new HttpError(404, 'Vendor not found');
	}

	if (vendor.status === 'banned' && status !== 'banned') {
		throw new HttpError(
			400,
			'Banned vendors cannot be reactivated. Contact support.',
		);
	}

	const updated = await updateVendorStatus(id, status);
	if (!updated) {
		throw new HttpError(500, 'Failed to update vendor status');
	}

	res.json({
		success: true,
		message: `Vendor status updated to ${status}`,
	});
});

export const getVendorShipments = asyncHandler(async (req, res) => {
	const userId = req.user.id;

	const vendor = await getVendorByUserId(userId);
	if (!vendor) {
		throw new HttpError(404, 'Vendor not found');
	}

	if (vendor.status !== 'active') {
		return res.json({ success: true, shipments: [] });
	}

	const shipments = await getShipmentsForVendor(
		vendor.id,
		parsePagination(req.query),
	);
	res.json({ success: true, shipments });
});

const transitionShipment = async (shipmentId, vendorId, from, to) => {
	const shipment = await getShipmentById(shipmentId);
	if (!shipment || String(shipment.assigned_vendor_id) !== String(vendorId)) {
		throw new HttpError(404, 'Shipment not found or not assigned to you');
	}
	if (shipment.approval_status !== 'approved') {
		throw new HttpError(400, 'Shipment is not approved');
	}
	if (shipment.status !== from) {
		throw new HttpError(
			400,
			`Invalid transition: cannot move from '${shipment.status}' to '${to}'`,
		);
	}
	const updated = await updateVendorShipmentStatus(shipmentId, to, vendorId);
	if (!updated) {
		throw new HttpError(404, 'Shipment not found or not assigned to you');
	}
};

export const acceptShipment = asyncHandler(async (req, res) => {
	const { id } = req.params;
	const vendor = await getVendorByUserId(req.user.id);
	if (!vendor) {
		throw new HttpError(404, 'Vendor not found');
	}
	await transitionShipment(id, vendor.id, 'pending', 'accepted');
	res.json({ success: true, message: 'Shipment accepted' });
});

export const startDelivery = asyncHandler(async (req, res) => {
	const { id } = req.params;
	const vendor = await getVendorByUserId(req.user.id);
	if (!vendor) {
		throw new HttpError(404, 'Vendor not found');
	}
	await transitionShipment(id, vendor.id, 'accepted', 'in_transit');
	res.json({ success: true, message: 'Delivery started' });
});

export const completeDelivery = asyncHandler(async (req, res) => {
	const { id } = req.params;
	const vendor = await getVendorByUserId(req.user.id);
	if (!vendor) {
		throw new HttpError(404, 'Vendor not found');
	}
	await transitionShipment(id, vendor.id, 'in_transit', 'delivered');
	res.json({ success: true, message: 'Delivery completed' });
});

export const testVendorRoute = async (req, res) => {
	res.json({
		success: true,
		message: 'Vendor route is working!',
		timestamp: new Date().toISOString(),
	});
};

export const rejectShipment = asyncHandler(async (req, res) => {
	const { id } = req.params;
	const userId = req.user.id;

	const vendor = await getVendorByUserId(userId);
	if (!vendor) {
		throw new HttpError(404, 'Vendor not found');
	}

	const [result] = await pool.execute(
		`UPDATE shipments 
		 SET assigned_vendor_id = NULL, 
		     status = 'pending', 
		     approval_status = 'pending' 
		 WHERE id = ? AND assigned_vendor_id = ?`,
		[id, vendor.id],
	);

	if (result.affectedRows === 0) {
		throw new HttpError(404, 'Shipment not found or not assigned to you');
	}

	res.json({ success: true, message: 'Job rejected successfully' });
});

// ── VEHICLE CRUD ──

export const getMyVehicles = asyncHandler(async (req, res) => {
	const userId = req.user.id;
	const vendor = await getVendorByUserId(userId);
	if (!vendor) {
		throw new HttpError(404, 'Vendor not found');
	}
	const vehicles = await getVendorVehicles(vendor.id);
	res.json({ success: true, vehicles });
});

export const addVehicle = asyncHandler(async (req, res) => {
	const userId = req.user.id;
	const vendor = await getVendorByUserId(userId);
	if (!vendor) {
		throw new HttpError(404, 'Vendor not found');
	}
	const vehicle = await addVendorVehicle(vendor.id, req.body);
	if (!vehicle) {
		throw new HttpError(500, 'Failed to add vehicle');
	}
	res.status(201).json({ success: true, message: 'Vehicle added', vehicle });
});

export const updateVehicleStatusCtrl = asyncHandler(async (req, res) => {
	const { id } = req.params;
	const { status } = req.body;
	const allowedStatuses = ['available', 'in_use', 'maintenance', 'retired'];
	if (!allowedStatuses.includes(status)) {
		throw new HttpError(400, 'Invalid vehicle status');
	}
	const updated = await updateVehicleStatus(id, status);
	if (!updated) {
		throw new HttpError(404, 'Vehicle not found');
	}
	res.json({ success: true, message: 'Vehicle status updated' });
});

export const deleteVehicle = asyncHandler(async (req, res) => {
	const userId = req.user.id;
	const vendor = await getVendorByUserId(userId);
	if (!vendor) {
		throw new HttpError(404, 'Vendor not found');
	}
	const { id } = req.params;
	const removed = await removeVendorVehicle(id, vendor.id);
	if (!removed) {
		throw new HttpError(404, 'Vehicle not found');
	}
	res.json({ success: true, message: 'Vehicle removed' });
});

// ── VENDOR MATCHING (for customers) ──

export const matchingVendors = asyncHandler(async (req, res) => {
	const { vehicle_type, pickup_province, drop_province } = req.query;
	if (!vehicle_type) {
		throw new HttpError(400, 'vehicle_type is required');
	}
	const vendors = await findMatchingVendors(vehicle_type);
	res.json({ success: true, vendors });
});
