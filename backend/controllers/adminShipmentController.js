import {
	getPendingShipments,
	approveShipment,
	rejectShipment,
	getShipmentsByApprovalStatus,
	getActiveShipmentsCountForVendor,
} from '../models/shipmentModel.js';
import { getVendorById } from '../models/vendorModel.js';

export const getPendingShipmentsList = async (req, res) => {
	try {
		const shipments = await getPendingShipments();
		res.json({ success: true, shipments });
	} catch (error) {
		console.error('Error fetching pending shipments:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

export const getShipmentsByStatus = async (req, res) => {
	try {
		const { status } = req.params;
		const shipments = await getShipmentsByApprovalStatus(status);
		res.json({ success: true, shipments });
	} catch (error) {
		console.error('Error fetching shipments by status:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

export const approveShipmentRequest = async (req, res) => {
	try {
		const { id } = req.params;
		const { vendor_id } = req.body;
		const adminId = req.user.id;

		const vendor = await getVendorById(vendor_id);
		if (!vendor) {
			return res
				.status(404)
				.json({ success: false, message: 'Vendor not found' });
		}

		// 🚫 Check if vendor already has an active shipment
		const activeCount = await getActiveShipmentsCountForVendor(vendor_id);
		if (activeCount > 0) {
			return res.status(400).json({
				success: false,
				message: `${vendor.business_name} already has an active shipment. Please wait until it's completed.`,
			});
		}

		const approved = await approveShipment(id, vendor_id, adminId);
		if (!approved) {
			return res
				.status(404)
				.json({ success: false, message: 'Shipment not found' });
		}

		res.json({
			success: true,
			message: `Shipment approved and assigned to ${vendor.business_name}`,
		});
	} catch (error) {
		console.error('Error approving shipment:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};
export const rejectShipmentRequest = async (req, res) => {
	try {
		const { id } = req.params;
		const { reason } = req.body;
		const adminId = req.user.id;

		const rejected = await rejectShipment(id, adminId, reason);
		if (!rejected) {
			return res
				.status(404)
				.json({ success: false, message: 'Shipment not found' });
		}

		res.json({ success: true, message: 'Shipment rejected' });
	} catch (error) {
		console.error('Error rejecting shipment:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};
