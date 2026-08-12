import { getShipmentsByApprovalStatus } from '../models/shipmentModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';
import { ALLOWED_APPROVAL_STATUSES } from '../utils/validation.js';
import { scopeFilterFor } from '../middleware/scope.js';

const parsePagination = (query) => {
	const page = Math.max(parseInt(query.page) || 1, 1);
	const limit = Math.min(Math.max(parseInt(query.limit) || 50, 1), 200);
	return { page, limit };
};

export const getShipmentsByStatus = asyncHandler(async (req, res) => {
	const { status } = req.params;
	if (!ALLOWED_APPROVAL_STATUSES.includes(status)) {
		throw new HttpError(400, 'Invalid approval status');
	}
	const shipments = await getShipmentsByApprovalStatus(
		status,
		{ ...parsePagination(req.query), branchFilter: scopeFilterFor(req.user) },
	);
	res.json({ success: true, shipments });
});
