import pool from '../config/db.js';

export const logAudit = async ({
	actorUserId,
	action,
	entity = null,
	entityId = null,
	branchId = null,
	meta = null,
}) => {
	try {
		await pool.execute(
			`INSERT INTO audit_logs (actor_user_id, action, entity, entity_id, branch_id, meta)
			 VALUES (?, ?, ?, ?, ?, ?)`,
			[
				actorUserId,
				action,
				entity,
				entityId,
				branchId,
				meta ? JSON.stringify(meta) : null,
			],
		);
	} catch (err) {
		console.error('[audit] write failed:', err.message);
	}
};

export const listAuditLogs = async ({ page = 1, limit = 50, branchFilter = null, actorUserId = null } = {}) => {
	const offset = (page - 1) * limit;
	const params = [];
	let where = 'WHERE 1 = 1';
	if (branchFilter?.restricted) {
		const ph = branchFilter.params.map(() => '?').join(', ');
		where += ` AND a.branch_id IN (${ph})`;
		params.push(...branchFilter.params);
	}
	if (actorUserId) {
		where += ' AND a.actor_user_id = ?';
		params.push(actorUserId);
	}
	const [rows] = await pool.execute(
		`SELECT a.*, u.name AS actor_name, b.name AS branch_name
		 FROM audit_logs a
		 LEFT JOIN users u ON u.id = a.actor_user_id
		 LEFT JOIN branches b ON b.id = a.branch_id
		 ${where}
		 ORDER BY a.created_at DESC
		 LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
		params,
	);
	return rows;
};