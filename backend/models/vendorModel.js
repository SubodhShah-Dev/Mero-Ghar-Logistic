import pool from '../config/db.js';

export const getAllVendors = async ({ page = 1, limit = 50, branchFilter = null } = {}) => {
	try {
		const offset = (page - 1) * limit;
		const params = [];
		let where = 'WHERE 1 = 1';
		if (branchFilter?.restricted) {
			where += ` AND v.branch_id IN (${branchFilter.params.map(() => '?').join(', ')})`;
			params.push(...branchFilter.params);
		}
		const [rows] = await pool.execute(
			`SELECT v.*, u.email as user_email, u.name as user_name, b.name as branch_name
            FROM vendors v
            JOIN users u ON v.user_id = u.id
            LEFT JOIN branches b ON b.id = v.branch_id
            ${where}
            ORDER BY v.created_at DESC
            LIMIT ${limit} OFFSET ${offset}`,
			params,
		);
		return rows;
	} catch (error) {
		console.error('Error in getAllVendors:', error);
		return [];
	}
};

export const getActiveVendors = async (branchFilter = null) => {
	try {
		let where = `WHERE v.status = 'active'`;
		const params = [];
		if (branchFilter?.restricted) {
			where += ` AND v.branch_id IN (${branchFilter.params.map(() => '?').join(', ')})`;
			params.push(...branchFilter.params);
		}
		const [rows] = await pool.execute(
			`SELECT v.*, u.email as user_email, u.name as user_name, b.name as branch_name
            FROM vendors v
            JOIN users u ON v.user_id = u.id
            LEFT JOIN branches b ON b.id = v.branch_id
            ${where}
            ORDER BY v.rating DESC`,
			params,
		);
		return rows;
	} catch (error) {
		console.error('Error in getActiveVendors:', error);
		return [];
	}
};

export const getVendorById = async (id) => {
	try {
		const [rows] = await pool.execute(
			`
            SELECT v.*, u.email as user_email, u.name as user_name 
            FROM vendors v 
            JOIN users u ON v.user_id = u.id 
            WHERE v.id = ?
        `,
			[id],
		);
		return rows[0];
	} catch (error) {
		console.error('Error in getVendorById:', error);
		return null;
	}
};

export const getVendorByUserId = async (userId) => {
	try {
		const numericUserId = parseInt(userId);
		if (isNaN(numericUserId)) {
			return null;
		}
		const [rows] = await pool.execute(
			'SELECT * FROM vendors WHERE user_id = ?',
			[numericUserId],
		);
		return rows[0];
	} catch (error) {
		console.error('Error in getVendorByUserId:', error);
		return null;
	}
};

export const createVendor = async (vendorData) => {
	const {
		user_id,
		business_name,
		owner_name,
		phone,
		email,
		service_region,
		address,
	} = vendorData;
	const [result] = await pool.execute(
		'INSERT INTO vendors (user_id, business_name, owner_name, phone, email, service_region, address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
		[
			user_id,
			business_name,
			owner_name,
			phone,
			email,
			service_region || null,
			address || null,
			'pending',
		],
	);
	return { id: result.insertId, ...vendorData };
};

export const updateVendorStatus = async (id, status) => {
	try {
		const [result] = await pool.execute(
			'UPDATE vendors SET status = ? WHERE id = ?',
			[status, id],
		);
		return result.affectedRows > 0;
	} catch (error) {
		console.error('Error in updateVendorStatus:', error);
		return false;
	}
};

export const updateVendorProfile = async (id, profileData) => {
	const { business_name, owner_name, phone, service_region, address } =
		profileData;
	const [result] = await pool.execute(
		'UPDATE vendors SET business_name = ?, owner_name = ?, phone = ?, service_region = ?, address = ? WHERE id = ?',
		[business_name, owner_name, phone, service_region, address, id],
	);
	return result.affectedRows > 0;
};

export const updateVendorRating = async (id, rating, totalJobs) => {
	const [result] = await pool.execute(
		'UPDATE vendors SET rating = ?, total_jobs = ? WHERE id = ?',
		[rating, totalJobs, id],
	);
	return result.affectedRows > 0;
};

// ── VEHICLE FUNCTIONS ──

export const getVendorVehicles = async (vendorId) => {
	try {
		const [rows] = await pool.execute(
			'SELECT * FROM vendor_vehicles WHERE vendor_id = ? AND is_active = 1 ORDER BY created_at DESC',
			[vendorId],
		);
		return rows;
	} catch (error) {
		console.error('Error in getVendorVehicles:', error);
		return [];
	}
};

export const addVendorVehicle = async (vendorId, vehicleData) => {
	try {
		const { name, plate_number, vehicle_type, capacity_tonnes, driver_name, driver_phone } = vehicleData;
		const [result] = await pool.execute(
			`INSERT INTO vendor_vehicles (vendor_id, name, plate_number, vehicle_type, capacity_tonnes, driver_name, driver_phone)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[vendorId, name, plate_number, vehicle_type, capacity_tonnes || null, driver_name, driver_phone || null],
		);
		return { id: result.insertId, ...vehicleData };
	} catch (error) {
		console.error('Error in addVendorVehicle:', error);
		return null;
	}
};

export const updateVehicleStatus = async (vehicleId, status, vendorId = null) => {
	try {
		if (vendorId != null) {
			const [result] = await pool.execute(
				'UPDATE vendor_vehicles SET status = ? WHERE id = ? AND vendor_id = ?',
				[status, vehicleId, vendorId],
			);
			return result.affectedRows > 0;
		}
		const [result] = await pool.execute(
			'UPDATE vendor_vehicles SET status = ? WHERE id = ?',
			[status, vehicleId],
		);
		return result.affectedRows > 0;
	} catch (error) {
		console.error('Error in updateVehicleStatus:', error);
		return false;
	}
};

export const removeVendorVehicle = async (vehicleId, vendorId) => {
	try {
		const [result] = await pool.execute(
			'UPDATE vendor_vehicles SET is_active = 0 WHERE id = ? AND vendor_id = ?',
			[vehicleId, vendorId],
		);
		return result.affectedRows > 0;
	} catch (error) {
		console.error('Error in removeVendorVehicle:', error);
		return false;
	}
};

export const findMatchingVendors = async (vehicleType, route = {}) => {
	try {
		const { pickup_province, pickup_district, drop_province, drop_district } = route;
		// A mover matches a booking when they are active, have an available
		// vehicle of the requested type, and cover the pickup->drop route.
		// Vendors without any routes declared still match everything (legacy
		// fallback) so existing vendors keep receiving jobs until they add routes.
		let sql = `
            SELECT DISTINCT v.id, v.business_name, v.service_region, v.rating, v.total_jobs
             FROM vendors v
             JOIN vendor_vehicles vv ON vv.vendor_id = v.id
             WHERE v.status = 'active'
               AND vv.vehicle_type = ?
               AND vv.status = 'available'
               AND vv.is_active = 1`;
		const params = [vehicleType];

		if (pickup_province && drop_province) {
			sql += `
               AND (
                 EXISTS (
                   SELECT 1 FROM vendor_routes vr
                   WHERE vr.vendor_id = v.id
                     AND vr.is_active = 1
                     AND vr.from_province = ?
                     AND (vr.from_district IS NULL OR vr.from_district = ?)
                     AND vr.to_province = ?
                     AND (vr.to_district IS NULL OR vr.to_district = ?)
                 )
                 OR NOT EXISTS (SELECT 1 FROM vendor_routes WHERE vendor_id = v.id)
               )`;
			params.push(
				pickup_province,
				pickup_district || null,
				drop_province,
				drop_district || null,
			);
		}

		sql += ` ORDER BY v.rating DESC`;
		const [rows] = await pool.execute(sql, params);
		return rows;
	} catch (error) {
		console.error('Error in findMatchingVendors:', error);
		return [];
	}
};

// True when the vendor has a route covering pickup->drop, or has no routes at
// all (legacy fallback: no routes means they accept any route).
export const vendorCoversRoute = async (vendorId, route = {}) => {
	try {
		const { pickup_province, pickup_district, drop_province, drop_district } = route;
		const [countRows] = await pool.execute(
			'SELECT COUNT(*) as c FROM vendor_routes WHERE vendor_id = ?',
			[vendorId],
		);
		if (!countRows[0] || countRows[0].c === 0) return true;
		if (!pickup_province || !drop_province) return false;

		const [rows] = await pool.execute(
			`SELECT COUNT(*) as c FROM vendor_routes
			 WHERE vendor_id = ? AND is_active = 1
			   AND from_province = ?
			   AND (from_district IS NULL OR from_district = ?)
			   AND to_province = ?
			   AND (to_district IS NULL OR to_district = ?)`,
			[
				vendorId,
				pickup_province,
				pickup_district || null,
				drop_province,
				drop_district || null,
			],
		);
		return rows[0]?.c > 0;
	} catch (error) {
		console.error('Error in vendorCoversRoute:', error);
		return true;
	}
};

// ── ROUTE CRUD ──

export const getVendorRoutes = async (vendorId) => {
	try {
		const [rows] = await pool.execute(
			`SELECT id, vendor_id, from_province, from_district, to_province, to_district, is_active, created_at
			 FROM vendor_routes
			 WHERE vendor_id = ?
			 ORDER BY created_at DESC`,
			[vendorId],
		);
		return rows;
	} catch (error) {
		console.error('Error in getVendorRoutes:', error);
		return [];
	}
};

export const addVendorRoute = async (vendorId, routeData) => {
	try {
		const { from_province, from_district, to_province, to_district } = routeData;
		if (!from_province || !to_province) return null;
		const [result] = await pool.execute(
			`INSERT INTO vendor_routes (vendor_id, from_province, from_district, to_province, to_district)
			 VALUES (?, ?, ?, ?, ?)`,
			[vendorId, from_province, from_district || null, to_province, to_district || null],
		);
		return {
			id: result.insertId,
			vendor_id: vendorId,
			from_province,
			from_district: from_district || null,
			to_province,
			to_district: to_district || null,
		};
	} catch (error) {
		console.error('Error in addVendorRoute:', error);
		return null;
	}
};

export const removeVendorRoute = async (routeId, vendorId) => {
	try {
		const [result] = await pool.execute(
			'DELETE FROM vendor_routes WHERE id = ? AND vendor_id = ?',
			[routeId, vendorId],
		);
		return result.affectedRows > 0;
	} catch (error) {
		console.error('Error in removeVendorRoute:', error);
		return false;
	}
};
