import pool from '../config/db.js';

// Get shipment by ID
export const getShipmentById = async (id) => {
	const [rows] = await pool.execute('SELECT * FROM shipments WHERE id = ?', [
		id,
	]);
	return rows[0];
};

// Get shipments by user ID
export const getShipmentsByUserId = async (userId) => {
	const [rows] = await pool.execute(
		'SELECT * FROM shipments WHERE user_id = ? ORDER BY created_at DESC',
		[userId],
	);
	return rows;
};

// Get all shipments
export const getAllShipments = async () => {
	const [rows] = await pool.execute(
		`SELECT s.*, u.name as user_name, u.email as user_email 
         FROM shipments s 
         LEFT JOIN users u ON s.user_id = u.id 
         ORDER BY s.created_at DESC`,
	);
	return rows;
};

// Get count of active (not delivered/cancelled) shipments for a vendor
export const getActiveShipmentsCountForVendor = async (vendorId) => {
	const [rows] = await pool.execute(
		`SELECT COUNT(*) as count FROM shipments 
         WHERE assigned_vendor_id = ? 
         AND status NOT IN ('delivered', 'cancelled')`,
		[vendorId],
	);
	return rows[0].count;
};

// Update shipment status
export const updateShipmentStatus = async (id, status, finalQuote = null) => {
	let query = 'UPDATE shipments SET status = ?';
	const params = [status];

	if (finalQuote !== null) {
		query += ', final_quote = ?';
		params.push(finalQuote);
	}

	query += ' WHERE id = ?';
	params.push(id);

	const [result] = await pool.execute(query, params);
	return result.affectedRows > 0;
};

// Get pending shipments for admin
export const getPendingShipments = async () => {
	const [rows] = await pool.execute(`
        SELECT s.*, 
               CONCAT(s.first_name, ' ', s.last_name) as customer_name,
               s.mobile_number as customer_phone
        FROM shipments s 
        WHERE s.approval_status = 'pending' 
        ORDER BY s.created_at ASC
    `);
	return rows;
};

// Get shipments for vendor
export const getShipmentsForVendor = async (vendorId) => {
	const [rows] = await pool.execute(
		`SELECT s.*, 
               CONCAT(s.first_name, ' ', s.last_name) as customer_name,
               s.mobile_number as customer_phone,
               s.pickup_district, s.pickup_city, s.pickup_ward,
               s.drop_district, s.drop_city, s.drop_ward,
               s.move_date, s.selected_items, s.vehicle_type,
               s.booking_id, s.id, s.status, s.final_quote
        FROM shipments s 
        WHERE s.assigned_vendor_id = ? AND s.approval_status = 'approved'
        ORDER BY s.move_date ASC
    `,
		[vendorId],
	);
	return rows;
};

// Approve shipment
export const approveShipment = async (shipmentId, vendorId, adminId) => {
	const [result] = await pool.execute(
		`UPDATE shipments 
         SET approval_status = 'approved', 
             assigned_vendor_id = ?, 
             approved_by = ?, 
             approved_at = NOW(),
             status = 'pending'
         WHERE id = ? AND approval_status = 'pending'`,
		[vendorId, adminId, shipmentId],
	);
	return result.affectedRows > 0;
};

// Reject shipment
export const rejectShipment = async (shipmentId, adminId, reason) => {
	const [result] = await pool.execute(
		`UPDATE shipments 
         SET approval_status = 'rejected', 
             approved_by = ?, 
             approved_at = NOW(),
             special_notes = CONCAT(COALESCE(special_notes, ''), ' | Rejected: ', ?)
         WHERE id = ? AND approval_status = 'pending'`,
		[adminId, reason, shipmentId],
	);
	return result.affectedRows > 0;
};

// Get shipments by approval status
export const getShipmentsByApprovalStatus = async (status) => {
	const [rows] = await pool.execute(
		`SELECT s.*, 
               CONCAT(s.first_name, ' ', s.last_name) as customer_name,
               v.business_name as vendor_name,
               v.id as vendor_id
        FROM shipments s 
        LEFT JOIN vendors v ON s.assigned_vendor_id = v.id
        WHERE s.approval_status = ?
        ORDER BY s.created_at DESC
    `,
		[status],
	);
	return rows;
};

// Update vendor shipment status
export const updateVendorShipmentStatus = async (id, status) => {
	const [result] = await pool.execute(
		'UPDATE shipments SET status = ? WHERE id = ?',
		[status, id],
	);
	return result.affectedRows > 0;
};
