import { createTicket, getTicketsByVendor, getAllTickets, updateTicketStatus } from '../models/supportTicketModel.js';
import { getVendorByUserId } from '../models/vendorModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';

export const submitTicket = asyncHandler(async (req, res) => {
	const { subject, message } = req.body;
	if (!subject || !message) {
		throw new HttpError(400, 'Subject and message are required');
	}
	const vendor = await getVendorByUserId(req.user.id);
	if (!vendor) {
		throw new HttpError(403, 'Vendor profile not found');
	}
	const id = await createTicket(vendor.id, subject, message);
	if (!id) {
		throw new HttpError(500, 'Failed to create ticket');
	}
	res.json({ success: true, message: 'Ticket submitted', ticket_id: id });
});

export const listMyTickets = asyncHandler(async (req, res) => {
	const vendor = await getVendorByUserId(req.user.id);
	if (!vendor) {
		throw new HttpError(403, 'Vendor profile not found');
	}
	const tickets = await getTicketsByVendor(vendor.id);
	res.json({ success: true, tickets });
});

export const listAllTickets = asyncHandler(async (req, res) => {
	const tickets = await getAllTickets();
	res.json({ success: true, tickets });
});

export const resolveTicket = asyncHandler(async (req, res) => {
	const { id } = req.params;
	const ok = await updateTicketStatus(id, 'resolved');
	if (!ok) {
		throw new HttpError(404, 'Ticket not found');
	}
	res.json({ success: true, message: 'Ticket resolved' });
});

export const closeTicket = asyncHandler(async (req, res) => {
	const { id } = req.params;
	const ok = await updateTicketStatus(id, 'closed');
	if (!ok) {
		throw new HttpError(404, 'Ticket not found');
	}
	res.json({ success: true, message: 'Ticket closed' });
});
