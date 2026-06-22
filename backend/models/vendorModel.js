import pool from '../config/db.js';

export const getAllVendors = async () => {
	try {
		const [rows] = await pool.execute(`
            SELECT v.*, u.email as user_email, u.name as user_name 
            FROM vendors v 
            JOIN users u ON v.user_id = u.id 
            ORDER BY v.created_at DESC
        `);
		return rows;
	} catch (error) {
		console.error('Error in getAllVendors:', error);
		return [];
	}
};

export const getActiveVendors = async () => {
	try {
		const [rows] = await pool.execute(`
            SELECT v.*, u.email as user_email, u.name as user_name 
            FROM vendors v 
            JOIN users u ON v.user_id = u.id 
            WHERE v.status = 'active'
            ORDER BY v.rating DESC
        `);
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
		console.log('getVendorByUserId called with userId:', userId);

		// Convert to number if it's a string
		const numericUserId = parseInt(userId);
		if (isNaN(numericUserId)) {
			console.log('Invalid user ID - not a number:', userId);
			return null;
		}

		const [rows] = await pool.execute(
			'SELECT * FROM vendors WHERE user_id = ?',
			[numericUserId],
		);
		console.log('Query result:', rows);
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
			service_region,
			address,
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

export const updateVehicleStatus = async (vehicleId, status) => {
	try {
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

export const findMatchingVendors = async (vehicleType, pickupProvince, dropProvince) => {
	try {
		const [rows] = await pool.execute(
			`SELECT DISTINCT v.id, v.business_name, v.owner_name, v.phone, v.email,
                    v.service_region, v.rating, v.total_jobs, v.status as vendor_status,
                    vv.id as vehicle_id, vv.name as vehicle_name, vv.plate_number,
                    vv.vehicle_type, vv.driver_name, vv.status as vehicle_status
             FROM vendors v
             JOIN vendor_vehicles vv ON vv.vendor_id = v.id
             WHERE v.status = 'active'
               AND vv.vehicle_type = ?
               AND vv.status = 'available'
               AND vv.is_active = 1
             ORDER BY v.rating DESC`,
			[vehicleType],
		);
		return rows;
	} catch (error) {
		console.error('Error in findMatchingVendors:', error);
		return [];
	}
};
