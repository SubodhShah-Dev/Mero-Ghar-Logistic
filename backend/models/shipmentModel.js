import pool from '../config/db.js';

// Full-name expression (MySQL syntax).
const NAME_CONCAT = "CONCAT(s.first_name, ' ', s.last_name)";

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
		`SELECT s.*, 
               v.business_name as vendor_name,
               v.phone as vendor_phone
         FROM shipments s
         LEFT JOIN vendors v ON s.assigned_vendor_id = v.id
         WHERE s.user_id = ? ORDER BY s.created_at DESC`,
		[userId],
	);
	return rows;
};

// Get all shipments (admin/global). branchFilter from scopeFragment():
//   { restricted:false } -> unlimited; { restricted:true, params:[...] } -> scoped.
export const getAllShipments = async ({ page = 1, limit = 50, branchFilter = null } = {}) => {
	const offset = (page - 1) * limit;
	const params = [];
	let where = 'WHERE 1 = 1';
	if (branchFilter?.restricted) {
		where += ` AND s.branch_id IN (${branchFilter.params.map(() => '?').join(', ')})`;
		params.push(...branchFilter.params);
	}
	const [rows] = await pool.execute(
		`SELECT s.*, u.name as user_name, u.email as user_email,
               v.business_name as vendor_name, b.name as branch_name
         FROM shipments s 
         LEFT JOIN users u ON s.user_id = u.id 
         LEFT JOIN vendors v ON s.assigned_vendor_id = v.id
         LEFT JOIN branches b ON b.id = s.branch_id
         ${where}
         ORDER BY s.created_at DESC
         LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
		params,
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

// Get shipments for vendor
export const getShipmentsForVendor = async (vendorId, { page = 1, limit = 50 } = {}) => {
	const offset = (page - 1) * limit;
	const [rows] = await pool.execute(
		`SELECT s.*, 
               ${NAME_CONCAT} as customer_name,
               s.mobile_number as customer_phone,
               s.pickup_district, s.pickup_city, s.pickup_ward,
               s.drop_district, s.drop_city, s.drop_ward,
               s.move_date, s.selected_items, s.vehicle_type,
               s.booking_id, s.id, s.status, s.final_quote
        FROM shipments s 
        WHERE s.assigned_vendor_id = ? AND s.approval_status = 'approved'
        ORDER BY s.move_date ASC
        LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `,
		[vendorId],
	);
	return rows;
};

// Unassigned pending bookings that this vendor can claim (must have an
// available vehicle of the required type in their fleet AND belong to their
// own branch so bookings stay within the regional scope).
export const getAvailableShipmentsForVendor = async (
	vendorId,
	{ page = 1, limit = 50, branchId = null } = {},
) => {
	const offset = (page - 1) * limit;
	const [rows] = await pool.execute(
		`SELECT s.*, 
               ${NAME_CONCAT} as customer_name,
               s.mobile_number as customer_phone
        FROM shipments s 
        WHERE s.approval_status = 'pending'
          AND s.assigned_vendor_id IS NULL
          AND s.status = 'pending'
          AND s.vehicle_type IN (
              SELECT vv.vehicle_type FROM vendor_vehicles vv
              WHERE vv.vendor_id = ? AND vv.is_active = 1 AND vv.status = 'available'
          )
          ${branchId != null ? 'AND s.branch_id = ?' : ''}
          AND (
              NOT EXISTS (SELECT 1 FROM vendor_routes WHERE vendor_id = ?)
              OR EXISTS (
                  SELECT 1 FROM vendor_routes vr
                  WHERE vr.vendor_id = ? AND vr.is_active = 1
                    AND vr.from_province = s.pickup_province
                    AND (vr.from_district IS NULL OR vr.from_district = s.pickup_district)
                    AND vr.to_province = s.drop_province
                    AND (vr.to_district IS NULL OR vr.to_district = s.drop_district)
              )
          )
        ORDER BY s.created_at ASC
        LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
		branchId != null
			? [vendorId, branchId, vendorId, vendorId]
			: [vendorId, vendorId, vendorId],
	);
	return rows;
};

// Race-safe claim: only succeeds while the booking is still unassigned.
export const claimShipmentForVendor = async (shipmentId, vendorId) => {
	const [result] = await pool.execute(
		`UPDATE shipments 
         SET assigned_vendor_id = ?, approval_status = 'approved', status = 'pending'
         WHERE id = ? AND approval_status = 'pending' AND assigned_vendor_id IS NULL`,
		[vendorId, shipmentId],
	);
	return result.affectedRows > 0;
};

// Get shipments by approval status (scoped for branch admins).
export const getShipmentsByApprovalStatus = async (status, { page = 1, limit = 50, branchFilter = null } = {}) => {
	const offset = (page - 1) * limit;
	const params = [status];
	let scopeSql = '1 = 1';
	if (branchFilter?.restricted) {
		scopeSql = `s.branch_id IN (${branchFilter.params.map(() => '?').join(', ')})`;
		params.push(...branchFilter.params);
	}
	const [rows] = await pool.execute(
		`SELECT s.*, 
               ${NAME_CONCAT} as customer_name,
               v.business_name as vendor_name,
               v.id as vendor_id,
               b.name as branch_name
        FROM shipments s 
        LEFT JOIN vendors v ON s.assigned_vendor_id = v.id
        LEFT JOIN branches b ON b.id = s.branch_id
        WHERE s.approval_status = ? AND ${scopeSql}
        ORDER BY s.created_at DESC
        LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `,
		params,
	);
	return rows;
};

// Update vendor shipment status (scoped to the assigned vendor)
export const updateVendorShipmentStatus = async (id, status, vendorId) => {
	const [result] = await pool.execute(
		'UPDATE shipments SET status = ? WHERE id = ? AND assigned_vendor_id = ?',
		[status, id, vendorId],
	);
	return result.affectedRows > 0;
};
