import pool from '../config/db.js';

const ESCAPE_ORDER = {
	pending: '1',
	approved: '2',
	rejected: '3',
	cancelled: '4',
};

export const createEscalation = async ({
	shipment_id,
	from_branch_id,
	to_branch_id,
	type = 'transfer',
	reason = null,
	requested_by,
}) => {
	const [result] = await pool.execute(
		`INSERT INTO escalations (shipment_id, from_branch_id, to_branch_id, type, reason, status, requested_by)
		 VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
		[shipment_id, from_branch_id, to_branch_id, type, reason, requested_by],
	);
	return result.insertId;
};

// List escalations visible to the caller.
//   scopeFilter: { restricted:false } super admin → all
//   scopeFilter: { restricted:true, params:[...] } branch admin → to their branches
export const listEscalations = async ({ page = 1, limit = 50, scopeFilter = null } = {}) => {
	const offset = (page - 1) * limit;
	const params = [];
	let where = 'WHERE 1 = 1';
	if (scopeFilter?.restricted) {
		const ph = scopeFilter.params.map(() => '?').join(', ');
		// Incoming requests (to the admin's branches) are the actionable inbox.
		where = `WHERE e.to_branch_id IN (${ph})`;
		params.push(...scopeFilter.params);
	}
	const [rows] = await pool.execute(
		`SELECT e.*, s.booking_id, s.pickup_province, s.drop_province, s.status AS shipment_status,
		        fb.name AS from_branch_name, tb.name AS to_branch_name,
		        ru.name AS requested_by_name
		 FROM escalations e
		 JOIN shipments s ON s.id = e.shipment_id
		 JOIN branches fb ON fb.id = e.from_branch_id
		 JOIN branches tb ON tb.id = e.to_branch_id
		 LEFT JOIN users ru ON ru.id = e.requested_by
		 ${where}
		 ORDER BY FIELD(e.status, 'pending', 'approved', 'rejected', 'cancelled'), e.created_at DESC
		 LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
		params,
	);
	return rows;
};

export const getEscalationById = async (id) => {
	const [rows] = await pool.execute(
		`SELECT e.*, s.booking_id, s.branch_id AS shipment_branch_id,
		        fb.name AS from_branch_name, tb.name AS to_branch_name
		 FROM escalations e
		 JOIN shipments s ON s.id = e.shipment_id
		 JOIN branches fb ON fb.id = e.from_branch_id
		 JOIN branches tb ON tb.id = e.to_branch_id
		 WHERE e.id = ?`,
		[id],
	);
	return rows[0];
};

// Resolve (approve/reject/cancel) an escalation. returnToPending resets the
// shipment to the destination branch's pending queue so the target admin can
// assign a local mover.
export const resolveEscalation = async (id, status, resolvedBy) => {
	const current = await getEscalationById(id);
	if (!current || current.status !== 'pending') return { ok: false, escalation: current };

	const accepted = ['approved', 'rejected', 'cancelled'];
	if (!accepted.includes(status)) return { ok: false, escalation: current };

	await pool.execute(
		'UPDATE escalations SET status = ?, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?',
		[status, resolvedBy, id],
	);

	if (status === 'approved' && current.type === 'transfer') {
		// Transfer the booking to the destination branch (from_branch -> to_branch).
		await pool.execute(
			`UPDATE shipments
			 SET branch_id = ?, assigned_vendor_id = NULL, approval_status = 'pending', status = 'pending'
			 WHERE id = ?`,
			[current.to_branch_id, current.shipment_id],
		);
	}

	const escalation = await getEscalationById(id);
	return { ok: true, escalation };
};