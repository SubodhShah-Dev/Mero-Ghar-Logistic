import pool from '../config/db.js';

import {
	getAllVendors,
	getActiveVendors,
	getVendorById,
	getVendorByUserId,
	createVendor,
	updateVendorStatus,
	updateVendorProfile,
	updateVendorRating,
	getVendorVehicles,
	addVendorVehicle,
	updateVehicleStatus,
	removeVendorVehicle,
	findMatchingVendors,
} from '../models/vendorModel.js';

import {
	getShipmentsForVendor,
	updateVendorShipmentStatus,
} from '../models/shipmentModel.js';

export const getVendors = async (req, res) => {
	try {
		const vendors = await getAllVendors();
		res.json({ success: true, vendors });
	} catch (error) {
		console.error('Error fetching vendors:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

export const getActiveVendorsList = async (req, res) => {
	try {
		const vendors = await getActiveVendors();
		res.json({ success: true, vendors });
	} catch (error) {
		console.error('Error fetching active vendors:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

export const getMyVendorProfile = async (req, res) => {
	try {
		console.log('=== getMyVendorProfile called ===');
		console.log('Headers:', req.headers);
		console.log('Query:', req.query);
		console.log('Body:', req.body);

		let userId = null;

		// Try multiple sources for user ID
		if (req.headers['x-user-id']) {
			userId = req.headers['x-user-id'];
			console.log('Found userId in x-user-id header:', userId);
		} else if (
			req.headers.authorization &&
			req.headers.authorization.startsWith('Bearer ')
		) {
			userId = req.headers.authorization.split(' ')[1];
			console.log('Found userId in Bearer token:', userId);
		} else if (req.query.userId) {
			userId = req.query.userId;
			console.log('Found userId in query params:', userId);
		} else if (req.body.userId) {
			userId = req.body.userId;
			console.log('Found userId in body:', userId);
		}

		if (!userId) {
			console.log('No userId found in any source');
			return res.status(401).json({
				success: false,
				message: 'User not authenticated - no user ID provided',
				debug: { headers: req.headers, query: req.query },
			});
		}

		const vendor = await getVendorByUserId(userId);
		console.log('Vendor found:', vendor);

		if (!vendor) {
			return res
				.status(404)
				.json({ success: false, message: 'Vendor profile not found' });
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
	} catch (error) {
		console.error('Error fetching vendor profile:', error);
		res.status(500).json({
			success: false,
			message: 'Server error',
			error: error.message,
		});
	}
};

export const updateMyVendorProfile = async (req, res) => {
	try {
		let userId = req.headers['x-user-id'] || req.body.userId;

		if (!userId && req.headers.authorization) {
			const authHeader = req.headers.authorization;
			if (authHeader.startsWith('Bearer ')) {
				userId = authHeader.split(' ')[1];
			}
		}

		const vendor = await getVendorByUserId(userId);
		if (!vendor) {
			return res
				.status(404)
				.json({ success: false, message: 'Vendor profile not found' });
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

		if (updated) {
			res.json({
				success: true,
				message: 'Profile updated successfully',
			});
		} else {
			res.status(400).json({
				success: false,
				message: 'Failed to update profile',
			});
		}
	} catch (error) {
		console.error('Error updating vendor profile:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

export const registerVendor = async (req, res) => {
	try {
		const {
			user_id,
			business_name,
			owner_name,
			phone,
			email,
			service_region,
			address,
		} = req.body;

		const existing = await getVendorByUserId(user_id);
		if (existing) {
			return res
				.status(400)
				.json({ success: false, message: 'Vendor already registered' });
		}

		const vendor = await createVendor({
			user_id,
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
	} catch (error) {
		console.error('Error registering vendor:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

export const updateVendorStatusCtrl = async (req, res) => {
	try {
		const { id } = req.params;
		const { status } = req.body;

		// Allowed statuses for admin update
		const allowedStatuses = ['pending', 'active', 'inactive', 'banned'];
		if (!allowedStatuses.includes(status)) {
			return res
				.status(400)
				.json({ success: false, message: 'Invalid status' });
		}

		// Get current vendor data
		const vendor = await getVendorById(id);
		if (!vendor) {
			return res
				.status(404)
				.json({ success: false, message: 'Vendor not found' });
		}

		// Prevent reactivating a banned vendor (optional – can be allowed if needed)
		if (vendor.status === 'banned' && status !== 'banned') {
			return res.status(400).json({
				success: false,
				message:
					'Banned vendors cannot be reactivated. Contact support.',
			});
		}

		// Update status
		const updated = await updateVendorStatus(id, status);
		if (!updated) {
			return res.status(500).json({
				success: false,
				message: 'Failed to update vendor status',
			});
		}

		res.json({
			success: true,
			message: `Vendor status updated to ${status}`,
		});
	} catch (error) {
		console.error('Error updating vendor status:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

export const getVendorShipments = async (req, res) => {
	try {
		let userId = null;

		// Check headers
		if (req.headers['x-user-id']) {
			userId = req.headers['x-user-id'];
		}
		// Check authorization header
		else if (
			req.headers.authorization &&
			req.headers.authorization.startsWith('Bearer ')
		) {
			userId = req.headers.authorization.split(' ')[1];
		}
		// Check query parameters
		else if (req.query.userId) {
			userId = req.query.userId;
		}

		console.log('Getting shipments for user ID:', userId);

		if (!userId) {
			return res
				.status(401)
				.json({ success: false, message: 'User not authenticated' });
		}

		const vendor = await getVendorByUserId(userId);
		if (!vendor) {
			return res
				.status(404)
				.json({ success: false, message: 'Vendor not found' });
		}

		if (vendor.status !== 'active') {
			return res.json({ success: true, shipments: [] });
		}

		const shipments = await getShipmentsForVendor(vendor.id);
		res.json({ success: true, shipments });
	} catch (error) {
		console.error('Error fetching vendor shipments:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

export const acceptShipment = async (req, res) => {
	try {
		const { id } = req.params;
		await updateVendorShipmentStatus(id, 'accepted');
		res.json({ success: true, message: 'Shipment accepted' });
	} catch (error) {
		console.error('Error accepting shipment:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

export const startDelivery = async (req, res) => {
	try {
		const { id } = req.params;
		await updateVendorShipmentStatus(id, 'in_transit');
		res.json({ success: true, message: 'Delivery started' });
	} catch (error) {
		console.error('Error starting delivery:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

export const completeDelivery = async (req, res) => {
	try {
		const { id } = req.params;
		await updateVendorShipmentStatus(id, 'delivered');
		res.json({ success: true, message: 'Delivery completed' });
	} catch (error) {
		console.error('Error completing delivery:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

// Add this temporary debug endpoint
export const debugVendor = async (req, res) => {
	try {
		// Test database connection
		const [result] = await pool.execute('SELECT 1 as test');

		// Get all vendors
		const [vendors] = await pool.execute('SELECT * FROM vendors');

		res.json({
			success: true,
			dbConnection: 'ok',
			vendorsCount: vendors.length,
			vendors: vendors,
			message: 'Debug endpoint working',
		});
	} catch (error) {
		console.error('Debug error:', error);
		res.status(500).json({
			success: false,
			error: error.message,
			stack: error.stack,
		});
	}
};

// Simple test endpoint to verify route is working
export const testVendorRoute = async (req, res) => {
	console.log('Test vendor route hit!');
	res.json({
		success: true,
		message: 'Vendor route is working!',
		timestamp: new Date().toISOString(),
	});
};

export const rejectShipment = async (req, res) => {
	try {
		const { id } = req.params;
		let userId = req.headers['x-user-id'];
		if (!userId) {
			return res
				.status(401)
				.json({ success: false, message: 'User not authenticated' });
		}

		const vendor = await getVendorByUserId(userId);
		if (!vendor) {
			return res
				.status(404)
				.json({ success: false, message: 'Vendor not found' });
		}

		// Update the shipment: unassign vendor, reset status
		const [result] = await pool.execute(
			`UPDATE shipments 
             SET assigned_vendor_id = NULL, 
                 status = 'pending', 
                 approval_status = 'pending' 
             WHERE id = ? AND assigned_vendor_id = ?`,
			[id, vendor.id],
		);

		if (result.affectedRows === 0) {
			return res
				.status(404)
				.json({
					success: false,
					message: 'Shipment not found or not assigned to you',
				});
		}

		res.json({ success: true, message: 'Job rejected successfully' });
	} catch (error) {
		console.error('Error rejecting shipment:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

// ── VEHICLE CRUD ──

export const getMyVehicles = async (req, res) => {
	try {
		let userId = req.headers['x-user-id'];
		if (!userId) {
			return res.status(401).json({ success: false, message: 'Not authenticated' });
		}
		const vendor = await getVendorByUserId(userId);
		if (!vendor) {
			return res.status(404).json({ success: false, message: 'Vendor not found' });
		}
		const vehicles = await getVendorVehicles(vendor.id);
		res.json({ success: true, vehicles });
	} catch (error) {
		console.error('Error fetching vehicles:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

export const addVehicle = async (req, res) => {
	try {
		let userId = req.headers['x-user-id'];
		if (!userId) {
			return res.status(401).json({ success: false, message: 'Not authenticated' });
		}
		const vendor = await getVendorByUserId(userId);
		if (!vendor) {
			return res.status(404).json({ success: false, message: 'Vendor not found' });
		}
		const vehicle = await addVendorVehicle(vendor.id, req.body);
		if (vehicle) {
			res.status(201).json({ success: true, message: 'Vehicle added', vehicle });
		} else {
			res.status(500).json({ success: false, message: 'Failed to add vehicle' });
		}
	} catch (error) {
		console.error('Error adding vehicle:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

export const updateVehicleStatusCtrl = async (req, res) => {
	try {
		const { id } = req.params;
		const { status } = req.body;
		const updated = await updateVehicleStatus(id, status);
		if (updated) {
			res.json({ success: true, message: 'Vehicle status updated' });
		} else {
			res.status(404).json({ success: false, message: 'Vehicle not found' });
		}
	} catch (error) {
		console.error('Error updating vehicle status:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

export const deleteVehicle = async (req, res) => {
	try {
		let userId = req.headers['x-user-id'];
		if (!userId) {
			return res.status(401).json({ success: false, message: 'Not authenticated' });
		}
		const vendor = await getVendorByUserId(userId);
		if (!vendor) {
			return res.status(404).json({ success: false, message: 'Vendor not found' });
		}
		const { id } = req.params;
		const removed = await removeVendorVehicle(id, vendor.id);
		if (removed) {
			res.json({ success: true, message: 'Vehicle removed' });
		} else {
			res.status(404).json({ success: false, message: 'Vehicle not found' });
		}
	} catch (error) {
		console.error('Error removing vehicle:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

// ── VENDOR MATCHING (for customers) ──

export const matchingVendors = async (req, res) => {
	try {
		const { vehicle_type, pickup_province, drop_province } = req.query;
		if (!vehicle_type) {
			return res.status(400).json({ success: false, message: 'vehicle_type is required' });
		}
		const vendors = await findMatchingVendors(vehicle_type, pickup_province || '', drop_province || '');
		res.json({ success: true, vendors });
	} catch (error) {
		console.error('Error finding matching vendors:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};
