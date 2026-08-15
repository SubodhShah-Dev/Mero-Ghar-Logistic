import pool from '../config/db.js';
import { HttpError } from '../utils/HttpError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { canAccessBranch, scopeFilterFor } from '../middleware/scope.js';
import {
	validateShipmentInput,
	ALLOWED_SHIPMENT_STATUSES,
} from '../utils/validation.js';
import {
	getAllShipments as getAllShipmentsModel,
	getShipmentById,
	getShipmentsByUserId,
	updateShipmentStatus as updateShipmentStatusModel,
	getActiveShipmentsCountForVendor as getVendorActiveCount,
} from '../models/shipmentModel.js';
import { findMatchingVendors, vendorCoversRoute } from '../models/vendorModel.js';
import { branchIdForDistrict } from '../models/branchModel.js';
import { getSettings } from '../models/settingsModel.js';

const INSERT_SHIPMENT_SQL = `INSERT INTO shipments (
	booking_id, user_id, branch_id, pickup_address, pickup_province, pickup_district, pickup_city, pickup_ward, pickup_floor, pickup_lane_access,
	drop_address, drop_province, drop_district, drop_city, drop_ward, drop_floor,
	home_size, selected_items, fragile_items, vehicle_type, add_on_services,
	move_date, alternate_date, preferred_time_slot, move_reason,
	first_name, last_name, mobile_number, alternate_mobile, email,
	preferred_contact, payment_method, special_notes, how_found_us,
	approval_status, status, transaction_id, payment_status, final_quote, distance_km, estimated_duration,
	assigned_vendor_id, commission_amount
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const DEMO_QUOTE_BY_VEHICLE = {
	'Cargo Tempo': 4000,
	'Mini Truck': 8000,
	'Large Truck': 12000,
};

// Distance-based quote: base fee + per-km rate, rounded to the nearest 50 NPR.
// Used whenever the caller provides a distance; otherwise the flat
// DEMO_QUOTE_BY_VEHICLE rate is used so the suite stays deterministic.
const QUOTE_RATES = {
	'Cargo Tempo': { base: 800, perKm: 30 },
	'Mini Truck': { base: 1000, perKm: 35 },
	'Large Truck': { base: 1200, perKm: 45 },
};

const quoteFor = (vehicle, distanceKm) => {
	const rate = QUOTE_RATES[vehicle];
	if (!rate) return DEMO_QUOTE_BY_VEHICLE[vehicle] || 0;
	const raw = rate.base + rate.perKm * (Number(distanceKm) || 0);
	return Math.round(raw / 50) * 50;
};

// Platform commission on the booking fee (percentage), overridable via the
// 'platform_commission_pct' setting (super-admin editable).
const DEFAULT_COMMISSION_PCT = 10;

export const createShipment = asyncHandler(async (req, res) => {
	const {
		first_name,
		last_name,
		mobile_number,
		email,
		pickup_address,
		pickup_province,
		pickup_district,
		pickup_city,
		pickup_ward,
		pickup_floor,
		pickup_lane_access,
		drop_address,
		drop_province,
		drop_district,
		drop_city,
		drop_ward,
		drop_floor,
		home_size,
		selected_items,
		fragile_items,
		vehicle_type,
		add_on_services,
		move_date,
		alternate_date,
		preferred_time_slot,
		move_reason,
		alternate_mobile,
		preferred_contact,
		payment_method,
		special_notes,
		how_found_us,
		distance_km,
		estimated_duration,
		vendor_id,
	} = req.body;

	const invalid = validateShipmentInput(req.body);
	if (invalid) {
		throw new HttpError(400, invalid);
	}

	// Distance-based pricing when a distance is known; flat fallback otherwise.
	const distance = distance_km == null || distance_km === '' ? null : Number(distance_km);
	const finalQuote =
		distance != null
			? quoteFor(vehicle_type, distance)
			: DEMO_QUOTE_BY_VEHICLE[vehicle_type] || null;

	// Platform commission on the booking fee (10% by default).
	const settings = await getSettings();
	const commissionPct = Number(settings.platform_commission_pct) || DEFAULT_COMMISSION_PCT;
	const commissionAmount =
		finalQuote != null ? Math.round(finalQuote * (commissionPct / 100)) : null;

	const userId = req.user?.id || null;
	const booking_id = `MG-${Date.now()}`;
	const transactionId = `TXN-${Date.now()}`;
	// Branches are district-scoped: the booking belongs to the pickup district.
	const bookingBranchId = await branchIdForDistrict(pickup_district);

	// vendor_id from the client is UNTRUSTED. It is never accepted at face
	// value to skip admin approval; instead it is validated server-side and
	// the approval is automated only when the mover is genuinely eligible.
	let approvalStatus = 'pending';
	let assignedVendorId = null;

	const connection = await pool.getConnection();
	let shipmentId;
	try {
		await connection.beginTransaction();

		if (vendor_id) {
			// Serialize concurrent bookings for this vendor via a row lock.
			const rowLock = ' FOR UPDATE';
			const [vendorRows] = await connection.execute(
				`SELECT id, branch_id FROM vendors WHERE id = ?${rowLock}`,
				[vendor_id],
			);
			if (vendorRows.length === 0) {
				throw new HttpError(400, 'Selected mover is not available');
			}
			// Mover must belong to the booking's branch (derived from pickup
			// province) so bookings stay within the regional scope.
			if (
				bookingBranchId != null &&
				String(vendorRows[0].branch_id) !== String(bookingBranchId)
			) {
				throw new HttpError(
					400,
					'Selected mover does not serve this pickup region',
				);
			}

			// Mover must be active and have an available vehicle of the requested type.
			const [vehicleRows] = await connection.execute(
				`SELECT vv.id
				 FROM vendor_vehicles vv
				 JOIN vendors v ON vv.vendor_id = v.id
				 WHERE vv.vendor_id = ?
				   AND v.status = 'active'
				   AND vv.vehicle_type = ?
				   AND vv.status = 'available'
				   AND vv.is_active = 1
				 LIMIT 1`,
				[vendor_id, vehicle_type],
			);
			if (vehicleRows.length === 0) {
				throw new HttpError(
					400,
					'Selected mover is not available for the chosen vehicle type',
				);
			}

			// Mover must not already have an active shipment.
			const [countRows] = await connection.execute(
				`SELECT COUNT(*) as count FROM shipments
				 WHERE assigned_vendor_id = ?
				 AND status NOT IN ('delivered', 'cancelled')`,
				[vendor_id],
			);
			if (countRows[0].count > 0) {
				throw new HttpError(
					400,
					'Selected mover is busy with another move',
				);
			}

			// Mover must cover the pickup -> drop route (or have no routes yet).
			const covers = await vendorCoversRoute(vendor_id, {
				pickup_province,
				pickup_district,
				drop_province,
				drop_district,
			});
			if (!covers) {
				throw new HttpError(
					400,
					'Selected mover does not cover this route',
				);
			}

			approvalStatus = 'approved';
			assignedVendorId = vendor_id;
		} else {
			// No mover chosen: auto-assign the best matching available mover in
			// this booking's branch so the booking reaches a vendor without
			// admin intervention. If none is free, the booking stays unassigned
			// and appears in the vendors' claim pool.
			const candidates = await findMatchingVendors(
				vehicle_type,
				{
					pickup_province,
					pickup_district,
					drop_province,
					drop_district,
				},
				bookingBranchId,
			);
			for (const candidate of candidates) {
				const busy = await getVendorActiveCount(candidate.id);
				if (busy === 0) {
					approvalStatus = 'approved';
					assignedVendorId = candidate.id;
					break;
				}
			}
		}

		const [result] = await connection.execute(INSERT_SHIPMENT_SQL, [
			booking_id,
			userId,
			bookingBranchId,
			pickup_address || null,
			pickup_province || null,
			pickup_district || null,
			pickup_city || null,
			pickup_ward || null,
			pickup_floor || null,
			pickup_lane_access || null,
			drop_address || null,
			drop_province || null,
			drop_district || null,
			drop_city || null,
			drop_ward || null,
			drop_floor || null,
			home_size || null,
			selected_items ? JSON.stringify(selected_items) : null,
			fragile_items || null,
			vehicle_type || null,
			add_on_services ? JSON.stringify(add_on_services) : null,
			move_date || null,
			alternate_date || null,
			preferred_time_slot || null,
			move_reason || null,
			first_name,
			last_name || null,
			mobile_number,
			alternate_mobile || null,
			email || null,
			preferred_contact ? JSON.stringify(preferred_contact) : null,
			payment_method || null,
			special_notes || null,
			how_found_us || null,
			approvalStatus,
			'pending',
			transactionId,
			'pending',
			finalQuote,
			distance,
			estimated_duration || null,
			assignedVendorId,
			commissionAmount,
		]);

		await connection.commit();
		shipmentId = result.insertId;
	} catch (error) {
		await connection.rollback();
		throw error;
	} finally {
		connection.release();
	}

	const paymentRequired =
		!!payment_method && String(payment_method) !== 'cash' &&
		(finalQuote || 0) > 0;

	res.status(201).json({
		success: true,
		message: 'Shipment created successfully',
		booking_id,
		shipment_id: shipmentId,
		transaction_id: transactionId,
		commission_amount: commissionAmount,
		payment_required: paymentRequired,
		payment_data: paymentRequired
			? {
					amount: finalQuote || 0,
					customer_name: `${first_name} ${last_name || ''}`.trim(),
					customer_email: email || '',
					customer_phone: mobile_number || '',
			  }
			: null,
	});
});

export const getAllShipments = asyncHandler(async (req, res) => {
	const page = Math.max(parseInt(req.query.page) || 1, 1);
	const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
	const branchFilter = scopeFilterFor(req.user);
	const shipments = await getAllShipmentsModel({ page, limit, branchFilter });
	res.json({ success: true, shipments });
});

export const getShipment = asyncHandler(async (req, res) => {
	const shipment = await getShipmentById(req.params.id);
	if (!shipment) {
		throw new HttpError(404, 'Shipment not found');
	}
	// Only the booking owner, a scoped admin, or a super admin may view details.
	const isSuper = req.user?.role === 'super_admin';
	const isScopedAdmin =
		req.user?.role === 'branch_admin' && canAccessBranch(req.user, shipment.branch_id);
	const isOwner =
		shipment.user_id != null &&
		Number(shipment.user_id) === Number(req.user?.id);
	if (!isSuper && !isScopedAdmin && !isOwner) {
		throw new HttpError(403, 'You do not have access to this booking');
	}
	res.json({ success: true, shipment });
});

export const getUserShipments = asyncHandler(async (req, res) => {
	const userId = req.user.id;
	const shipments = await getShipmentsByUserId(userId);
	res.json({ success: true, shipments });
});

export const updateShipmentStatus = asyncHandler(async (req, res) => {
	const { id } = req.params;
	const { status, final_quote } = req.body;
	const shipmentId = parseInt(id);
	if (isNaN(shipmentId)) {
		throw new HttpError(400, 'Invalid shipment ID');
	}
	if (!status || !ALLOWED_SHIPMENT_STATUSES.includes(status)) {
		throw new HttpError(400, 'Invalid shipment status');
	}
	// Branch admins may only update shipments within their own branch scope.
	if (req.user?.role === 'branch_admin') {
		const shipment = await getShipmentById(shipmentId);
		if (!shipment) throw new HttpError(404, 'Shipment not found');
		if (!canAccessBranch(req.user, shipment.branch_id)) {
			throw new HttpError(403, 'This booking is outside your assigned region');
		}
	}
	const updated = await updateShipmentStatusModel(
		shipmentId,
		status,
		final_quote === undefined ? null : final_quote,
	);
	if (!updated) {
		throw new HttpError(404, 'Shipment not found');
	}
	res.json({ success: true, message: 'Shipment status updated successfully' });
});
