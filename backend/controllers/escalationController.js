import { HttpError } from '../utils/HttpError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getShipmentById } from '../models/shipmentModel.js';
import { getBranchById } from '../models/branchModel.js';
import {
	createEscalation,
	listEscalations,
	getEscalationById,
	resolveEscalation,
} from '../models/escalationModel.js';
import { logAudit } from '../models/auditModel.js';
import { canAccessBranch, scopeFilterFor } from '../middleware/scope.js';

export const createEscalationHandler = asyncHandler(async (req, res) => {
	const { shipment_id, to_branch_id, type = 'transfer', reason } = req.body;
	if (!shipment_id || !to_branch_id) {
		throw new HttpError(400, 'shipment_id and to_branch_id are required');
	}

	const shipment = await getShipmentById(shipment_id);
	if (!shipment) throw new HttpError(404, 'Shipment not found');

	// The origin branch is the shipment's current branch; the caller must
	// control it (super admin bypasses).
	if (!canAccessBranch(req.user, shipment.branch_id)) {
		throw new HttpError(403, 'This booking is outside your assigned region');
	}

	const toBranch = await getBranchById(to_branch_id);
	if (!toBranch) throw new HttpError(400, 'Destination branch not found');
	if (Number(toBranch.id) === Number(shipment.branch_id)) {
		throw new HttpError(400, 'Destination branch must differ from the origin branch');
	}

	const id = await createEscalation({
		shipment_id: shipment.id,
		from_branch_id: shipment.branch_id,
		to_branch_id: toBranch.id,
		type: ['transfer', 'assign', 'delete', 'override_vendor'].includes(type) ? type : 'transfer',
		reason: reason || null,
		requested_by: req.user.id,
	});

	await logAudit({
		actorUserId: req.user.id,
		action: 'escalation.create',
		entity: 'escalation',
		entityId: id,
		branchId: shipment.branch_id,
		meta: { to_branch_id: toBranch.id, type },
	});

	res.status(201).json({ success: true, message: 'Escalation created', escalation_id: id });
});

export const listEscalationsHandler = asyncHandler(async (req, res) => {
	const page = Math.max(parseInt(req.query.page) || 1, 1);
	const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
	const escalations = await listEscalations({
		page,
		limit,
		scopeFilter: scopeFilterFor(req.user),
	});
	res.json({ success: true, escalations });
});

export const resolveEscalationHandler = asyncHandler(async (req, res) => {
	const { id } = req.params;
	const { status } = req.body;

	const allowed = { approved: 'approved', rejected: 'rejected', cancelled: 'cancelled' };
	const newStatus = allowed[status];
	if (!newStatus) throw new HttpError(400, 'status must be approved, rejected or cancelled');

	const escalation = await getEscalationById(id);
	if (!escalation) throw new HttpError(404, 'Escalation not found');
	if (escalation.status !== 'pending') throw new HttpError(409, 'Escalation already resolved');

	// Approvals / rejections come from the destination branch admin; cancels
	// come from the origin branch admin. Super admins may do all three.
	if (status === 'cancelled' && !canAccessBranch(req.user, escalation.from_branch_id)) {
		throw new HttpError(403, 'Only the origin branch admin can cancel this request');
	}
	if (!canAccessBranch(req.user, escalation.to_branch_id)) {
		throw new HttpError(403, 'Only the destination branch admin can act on this request');
	}

	const { ok } = await resolveEscalation(id, newStatus, req.user.id);
	if (!ok) throw new HttpError(409, 'Escalation could not be resolved');

	await logAudit({
		actorUserId: req.user.id,
		action: `escalation.${newStatus}`,
		entity: 'escalation',
		entityId: Number(id),
		branchId: escalation.to_branch_id,
	});

	res.json({ success: true, message: `Escalation ${newStatus}` });
});