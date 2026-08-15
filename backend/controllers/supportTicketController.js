import { createTicket, getTicketsByVendor, getAllTickets, getTicketById, updateTicketStatus } from '../models/supportTicketModel.js';
import { getVendorByUserId } from '../models/vendorModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';
import { canAccessBranch, scopeFilterFor } from '../middleware/scope.js';
import { TICKET_SUBJECT_MAX, TICKET_MESSAGE_MAX } from '../utils/validation.js';

export const submitTicket = asyncHandler(async (req, res) => {
	const subject = String(req.body?.subject || '').trim();
	const message = String(req.body?.message || '').trim();
	if (!subject || !message) {
		throw new HttpError(400, 'Subject and message are required');
	}
	if (subject.length > TICKET_SUBJECT_MAX) {
		throw new HttpError(400, `Subject must be at most ${TICKET_SUBJECT_MAX} characters`);
	}
	if (message.length > TICKET_MESSAGE_MAX) {
		throw new HttpError(400, `Message must be at most ${TICKET_MESSAGE_MAX} characters`);
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
	const tickets = await getAllTickets(scopeFilterFor(req.user));
	res.json({ success: true, tickets });
});

// Helper: branch admins can only touch tickets opened in their own region.
const assertTicketScope = async (user, id) => {
	if (user.role === 'super_admin') return;
	const ticket = await getTicketById(id);
	if (!ticket) throw new HttpError(404, 'Ticket not found');
	if (!canAccessBranch(user, ticket.branch_id)) {
		throw new HttpError(403, 'This ticket is outside your assigned region');
	}
};

export const resolveTicket = asyncHandler(async (req, res) => {
	const { id } = req.params;
	await assertTicketScope(req.user, id);
	const ok = await updateTicketStatus(id, 'resolved');
	if (!ok) {
		throw new HttpError(404, 'Ticket not found');
	}
	res.json({ success: true, message: 'Ticket resolved' });
});

export const closeTicket = asyncHandler(async (req, res) => {
	const { id } = req.params;
	await assertTicketScope(req.user, id);
	const ok = await updateTicketStatus(id, 'closed');
	if (!ok) {
		throw new HttpError(404, 'Ticket not found');
	}
	res.json({ success: true, message: 'Ticket closed' });
});
