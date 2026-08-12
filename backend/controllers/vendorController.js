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
	vendorCoversRoute,
	getVendorRoutes,
	addVendorRoute,
	removeVendorRoute,
} from '../models/vendorModel.js';

import { getShipmentsForVendor,
	getAvailableShipmentsForVendor,
	claimShipmentForVendor,
	getShipmentById,
	updateVendorShipmentStatus,
	getActiveShipmentsCountForVendor,
} from '../models/shipmentModel.js';
import { canAccessBranch, scopeFilterFor } from '../middleware/scope.js';

const parsePagination = (query) => {
	const page = Math.max(parseInt(query.page) || 1, 1);
	const limit = Math.min(Math.max(parseInt(query.limit) || 50, 1), 200);
	return { page, limit };
};

export const getVendors = asyncHandler(async (req, res) => {
	const vendors = await getAllVendors({
		...parsePagination(req.query),
		branchFilter: scopeFilterFor(req.user),
	});
	res.json({ success: true, vendors });
});

export const getActiveVendorsList = asyncHandler(async (req, res) => {
	const vendors = await getActiveVendors(scopeFilterFor(req.user));
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

	// Branch admins may only change vendors inside their assigned regions.
	if (req.user?.role === 'branch_admin' && !canAccessBranch(req.user, vendor.branch_id)) {
		throw new HttpError(403, 'This mover is outside your assigned region');
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

// ── CLAIM POOL (no admin in the loop) ──

export const getAvailableShipments = asyncHandler(async (req, res) => {
	const vendor = await getVendorByUserId(req.user.id);
	if (!vendor) {
		throw new HttpError(404, 'Vendor not found');
	}
	if (vendor.status !== 'active') {
		return res.json({ success: true, shipments: [] });
	}
	const shipments = await getAvailableShipmentsForVendor(
		vendor.id,
		parsePagination(req.query),
	);
	res.json({ success: true, shipments });
});

export const claimShipment = asyncHandler(async (req, res) => {
	const { id } = req.params;
	const vendor = await getVendorByUserId(req.user.id);
	if (!vendor) {
		throw new HttpError(404, 'Vendor not found');
	}
	if (vendor.status !== 'active') {
		throw new HttpError(400, 'Vendor is not active');
	}

	const shipment = await getShipmentById(id);
	if (!shipment) {
		throw new HttpError(404, 'Shipment not found');
	}
	if (
		shipment.approval_status !== 'pending' ||
		shipment.assigned_vendor_id != null
	) {
		throw new HttpError(409, 'This job has already been claimed by another mover');
	}

	const matching = await findMatchingVendors(shipment.vehicle_type, {
		pickup_province: shipment.pickup_province,
		pickup_district: shipment.pickup_district,
		drop_province: shipment.drop_province,
		drop_district: shipment.drop_district,
	});
	if (!matching.some((m) => String(m.id) === String(vendor.id))) {
		throw new HttpError(
			400,
			'You do not have an available vehicle for this job or it is not on a route you cover',
		);
	}

	const covers = await vendorCoversRoute(vendor.id, {
		pickup_province: shipment.pickup_province,
		pickup_district: shipment.pickup_district,
		drop_province: shipment.drop_province,
		drop_district: shipment.drop_district,
	});
	if (!covers) {
		throw new HttpError(
			400,
			'This job is not on a route you cover. Add the route in your profile first.',
		);
	}

	const busy = await getActiveShipmentsCountForVendor(vendor.id);
	if (busy > 0) {
		throw new HttpError(
			400,
			'You already have an active job. Finish it before claiming another.',
		);
	}

	const claimed = await claimShipmentForVendor(id, vendor.id);
	if (!claimed) {
		throw new HttpError(409, 'This job has just been claimed by another mover');
	}

	res.json({
		success: true,
		message: 'Job claimed. You can now chat with the customer.',
	});
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

	// Admins may update vehicles; branch admins are limited to their region and
	// vendors are scoped to their own fleet.
	let scope = null;
	const isAdminUser = req.user.role === 'super_admin' || req.user.role === 'branch_admin';
	if (!isAdminUser) {
		const vendor = await getVendorByUserId(req.user.id);
		if (!vendor) {
			throw new HttpError(403, 'Vendor profile not found');
		}
		scope = vendor.id;
	} else if (req.user.role === 'branch_admin') {
		const owner = await pool.execute(
			'SELECT v.branch_id FROM vendor_vehicles vv JOIN vendors v ON v.id = vv.vendor_id WHERE vv.id = ?',
			[id],
		);
		const branchId = owner[0][0]?.branch_id;
		if (!canAccessBranch(req.user, branchId)) {
			throw new HttpError(403, 'This vehicle belongs to a mover outside your assigned region');
		}
	}

	const updated = await updateVehicleStatus(id, status, scope);
	if (!updated) {
		throw new HttpError(404, 'Vehicle not found or not owned by you');
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
	const { vehicle_type, pickup_province, pickup_district, drop_province, drop_district } = req.query;
	if (!vehicle_type) {
		throw new HttpError(400, 'vehicle_type is required');
	}
	if (!pickup_province || !drop_province) {
		throw new HttpError(400, 'pickup_province and drop_province are required');
	}
	const vendors = await findMatchingVendors(vehicle_type, {
		pickup_province,
		pickup_district: pickup_district || null,
		drop_province,
		drop_district: drop_district || null,
	});
	res.json({ success: true, vendors });
});

// ── VENDOR ROUTES CRUD ──

export const getMyRoutes = asyncHandler(async (req, res) => {
	const vendor = await getVendorByUserId(req.user.id);
	if (!vendor) {
		throw new HttpError(404, 'Vendor not found');
	}
	const routes = await getVendorRoutes(vendor.id);
	res.json({ success: true, routes });
});

export const createRoute = asyncHandler(async (req, res) => {
	const vendor = await getVendorByUserId(req.user.id);
	if (!vendor) {
		throw new HttpError(404, 'Vendor not found');
	}
	const { from_province, from_district, to_province, to_district } = req.body;
	if (!from_province || !to_province) {
		throw new HttpError(400, 'from_province and to_province are required');
	}
	const route = await addVendorRoute(vendor.id, {
		from_province,
		from_district: from_district || null,
		to_province,
		to_district: to_district || null,
	});
	if (!route) {
		throw new HttpError(500, 'Failed to add route');
	}
	res.status(201).json({ success: true, message: 'Route added', route });
});

export const deleteRoute = asyncHandler(async (req, res) => {
	const vendor = await getVendorByUserId(req.user.id);
	if (!vendor) {
		throw new HttpError(404, 'Vendor not found');
	}
	const removed = await removeVendorRoute(req.params.id, vendor.id);
	if (!removed) {
		throw new HttpError(404, 'Route not found');
	}
	res.json({ success: true, message: 'Route removed' });
});
