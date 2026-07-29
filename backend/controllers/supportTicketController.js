import { createTicket, getTicketsByVendor, getAllTickets, updateTicketStatus } from '../models/supportTicketModel.js';
import { getVendorByUserId } from '../models/vendorModel.js';

export const submitTicket = async (req, res) => {
	try {
		const { subject, message } = req.body;
		if (!subject || !message) {
			return res.status(400).json({ success: false, message: 'Subject and message are required' });
		}
		const vendor = await getVendorByUserId(req.user.id);
		if (!vendor) {
			return res.status(403).json({ success: false, message: 'Vendor profile not found' });
		}
		const id = await createTicket(vendor.id, subject, message);
		if (!id) {
			return res.status(500).json({ success: false, message: 'Failed to create ticket' });
		}
		res.json({ success: true, message: 'Ticket submitted', ticket_id: id });
	} catch (error) {
		console.error('Error in submitTicket:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

export const listMyTickets = async (req, res) => {
	try {
		const vendor = await getVendorByUserId(req.user.id);
		if (!vendor) {
			return res.status(403).json({ success: false, message: 'Vendor profile not found' });
		}
		const tickets = await getTicketsByVendor(vendor.id);
		res.json({ success: true, tickets });
	} catch (error) {
		console.error('Error in listMyTickets:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

export const listAllTickets = async (req, res) => {
	try {
		const tickets = await getAllTickets();
		res.json({ success: true, tickets });
	} catch (error) {
		console.error('Error in listAllTickets:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

export const resolveTicket = async (req, res) => {
	try {
		const { id } = req.params;
		const ok = await updateTicketStatus(id, 'resolved');
		res.json({ success: ok, message: ok ? 'Ticket resolved' : 'Ticket not found' });
	} catch (error) {
		console.error('Error in resolveTicket:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

export const closeTicket = async (req, res) => {
	try {
		const { id } = req.params;
		const ok = await updateTicketStatus(id, 'closed');
		res.json({ success: ok, message: ok ? 'Ticket closed' : 'Ticket not found' });
	} catch (error) {
		console.error('Error in closeTicket:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};
