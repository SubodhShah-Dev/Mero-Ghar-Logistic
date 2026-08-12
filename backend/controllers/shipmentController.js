import pool, { dialect } from '../config/db.js';
import { HttpError } from '../utils/HttpError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
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

const INSERT_SHIPMENT_SQL = `INSERT INTO shipments (
	booking_id, user_id, pickup_address, pickup_province, pickup_district, pickup_city, pickup_ward, pickup_floor, pickup_lane_access,
	drop_address, drop_province, drop_district, drop_city, drop_ward, drop_floor,
	home_size, selected_items, fragile_items, vehicle_type, add_on_services,
	move_date, alternate_date, preferred_time_slot, move_reason,
	first_name, last_name, mobile_number, alternate_mobile, email,
	preferred_contact, payment_method, special_notes, how_found_us,
	approval_status, status, transaction_id, payment_status, final_quote, distance_km, estimated_duration,
	assigned_vendor_id
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const DEMO_QUOTE_BY_VEHICLE = {
	'Cargo Tempo': 4000,
	'Mini Truck': 8000,
	'Large Truck': 12000,
};

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

	const userId = req.user?.id || null;
	const booking_id = `MG-${Date.now()}`;
	const transactionId = `TXN-${Date.now()}`;

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
			// SQLite is single-writer, so the lock clause is unnecessary there.
			const rowLock = dialect === 'mysql' ? ' FOR UPDATE' : '';
			const [vendorRows] = await connection.execute(
				`SELECT id FROM vendors WHERE id = ?${rowLock}`,
				[vendor_id],
			);
			if (vendorRows.length === 0) {
				throw new HttpError(400, 'Selected mover is not available');
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
			// No mover chosen: auto-assign the best matching available mover so the
			// booking reaches a vendor without admin intervention. If none is free,
			// the booking stays unassigned and appears in the vendors' claim pool.
			const candidates = await findMatchingVendors(vehicle_type, {
				pickup_province,
				pickup_district,
				drop_province,
				drop_district,
			});
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
			DEMO_QUOTE_BY_VEHICLE[vehicle_type] || null,
			distance_km || null,
			estimated_duration || null,
			assignedVendorId,
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
		(DEMO_QUOTE_BY_VEHICLE[vehicle_type] || 0) > 0;

	res.status(201).json({
		success: true,
		message: 'Shipment created successfully',
		booking_id,
		shipment_id: shipmentId,
		transaction_id: transactionId,
		payment_required: paymentRequired,
		payment_data: paymentRequired
			? {
					amount: DEMO_QUOTE_BY_VEHICLE[vehicle_type] || 0,
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
	const shipments = await getAllShipmentsModel({ page, limit });
	res.json({ success: true, shipments });
});

export const getShipment = asyncHandler(async (req, res) => {
	const shipment = await getShipmentById(req.params.id);
	if (!shipment) {
		throw new HttpError(404, 'Shipment not found');
	}
	// Only the booking owner or an admin may view a single booking's details.
	const isAdmin = req.user?.role === 'admin';
	const isOwner =
		shipment.user_id != null &&
		Number(shipment.user_id) === Number(req.user?.id);
	if (!isAdmin && !isOwner) {
		throw new HttpError(403, 'You do not have access to this booking');
	}
	res.json({ success: true, shipment });
});

export const getUserShipments = asyncHandler(async (req, res) => {
	const userId = req.user.id;
	const shipments = await getShipmentsByUserId(userId);
	res.json({ success: true, shipments });
});

export const getShipmentsByEmail = asyncHandler(async (req, res) => {
	const [rows] = await pool.execute(
		`SELECT s.id, s.booking_id, s.status, s.created_at,
		        s.pickup_city, s.pickup_district, s.pickup_province,
		        s.drop_city, s.drop_district, s.drop_province,
		        s.vehicle_type, s.final_quote, s.move_date,
		        v.business_name as vendor_name
		 FROM shipments s
		 LEFT JOIN vendors v ON s.assigned_vendor_id = v.id
		 WHERE s.email = ?
		 ORDER BY s.created_at DESC`,
		[req.params.email],
	);
	res.json({ success: true, shipments: rows });
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
