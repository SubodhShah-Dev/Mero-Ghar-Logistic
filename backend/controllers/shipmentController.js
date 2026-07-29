import pool from '../config/db.js';
import { initiateDummyPayment } from '../services/dummyPaymentService.js';
import { getAllShipments as getAllShipmentsModel, getShipmentById, getShipmentsByUserId, updateShipmentStatus as updateShipmentStatusModel } from '../models/shipmentModel.js';

export const createShipment = async (req, res) => {
	try {

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
			final_quote,
			distance_km,
			estimated_duration,
			vendor_id,
		} = req.body;

		const userId = req.headers['x-user-id'] || null;
		const booking_id = `MG-${Date.now()}`;
		const transactionId = `TXN-${Date.now()}`;

		// If customer selected a vendor directly, skip admin approval
		const hasVendor = !!vendor_id;
		const approvalStatus = hasVendor ? 'approved' : 'pending';

		// Insert into database
		const [result] = await pool.execute(
			`INSERT INTO shipments (
                booking_id, user_id, pickup_address, pickup_province, pickup_district, pickup_city, pickup_ward, pickup_floor, pickup_lane_access,
                drop_address, drop_province, drop_district, drop_city, drop_ward, drop_floor,
                home_size, selected_items, fragile_items, vehicle_type, add_on_services,
                move_date, alternate_date, preferred_time_slot, move_reason,
                first_name, last_name, mobile_number, alternate_mobile, email,
                preferred_contact, payment_method, special_notes, how_found_us,
                approval_status, status, transaction_id, payment_status, final_quote, distance_km, estimated_duration,
                assigned_vendor_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
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
				last_name,
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
				final_quote || null,
				distance_km || null,
				estimated_duration || null,
				vendor_id || null,
			],
		);

		console.log('✅ Insert successful, ID:', result.insertId);

		// Payment handling (unchanged)
		if (
			payment_method &&
			(payment_method === 'esewa' ||
				payment_method === 'khalti' ||
				payment_method === 'imepay') &&
			final_quote > 0
		) {
			const paymentData = await initiateDummyPayment(
				final_quote,
				transactionId,
				booking_id,
				`${first_name} ${last_name}`,
				email,
				mobile_number,
			);
			return res.status(201).json({
				success: true,
				payment_required: true,
				payment_method: payment_method,
				payment_data: paymentData,
				booking_id,
				shipment_id: result.insertId,
			});
		}

		res.status(201).json({
			success: true,
			message: 'Shipment created successfully',
			booking_id: booking_id,
			shipment_id: result.insertId,
			payment_required: false,
		});
	} catch (error) {
		console.error('❌ Error creating shipment:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to create shipment',
			error: error.message,
		});
	}
};

export const getAllShipments = async (req, res) => {
	try {
		const shipments = await getAllShipmentsModel();
		res.json({ success: true, shipments });
	} catch (error) {
		console.error('Error fetching shipments:', error);
		res.status(500).json({ success: false, message: 'Failed to fetch shipments' });
	}
};

export const getShipment = async (req, res) => {
	try {
		const shipment = await getShipmentById(req.params.id);
		if (!shipment) {
			return res.status(404).json({ success: false, message: 'Shipment not found' });
		}
		res.json({ success: true, shipment });
	} catch (error) {
		console.error('Error fetching shipment:', error);
		res.status(500).json({ success: false, message: 'Failed to fetch shipment' });
	}
};

export const getUserShipments = async (req, res) => {
	try {
		const userId = req.user.id;
		const shipments = await getShipmentsByUserId(userId);
		res.json({ success: true, shipments });
	} catch (error) {
		console.error('Error fetching user shipments:', error);
		res.status(500).json({ success: false, message: 'Failed to fetch user shipments' });
	}
};

export const getShipmentsByEmail = async (req, res) => {
	try {
		const [rows] = await pool.execute(
			`SELECT s.*, v.business_name as vendor_name
       FROM shipments s
       LEFT JOIN vendors v ON s.assigned_vendor_id = v.id
       WHERE s.email = ?
       ORDER BY s.created_at DESC`,
			[req.params.email],
		);
		res.json({ success: true, shipments: rows });
	} catch (error) {
		console.error('Error fetching shipments by email:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to fetch shipments',
		});
	}
};

export const updateShipmentStatus = async (req, res) => {
	try {
		const { id } = req.params;
		const { status, final_quote } = req.body;
		const shipmentId = parseInt(id);
		if (isNaN(shipmentId)) {
			return res.status(400).json({ success: false, message: 'Invalid shipment ID' });
		}
		const updated = await updateShipmentStatusModel(shipmentId, status, final_quote);
		if (!updated) {
			return res.status(404).json({ success: false, message: 'Shipment not found' });
		}
		res.json({ success: true, message: 'Shipment status updated successfully' });
	} catch (error) {
		console.error('Error updating shipment:', error);
		res.status(500).json({ success: false, message: 'Failed to update shipment status' });
	}
};
