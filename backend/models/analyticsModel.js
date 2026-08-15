import pool from '../config/db.js';
import { scopeFragment } from '../middleware/scope.js';

// Region/KPI aggregates for the admin dashboards.
// scope := { restricted:false } -> global (super admin), optionally limited to a
// chosen branch via branch_id; { restricted:true } -> branch admin's own scope.
export const regionalOverview = async (user, { branch_id = null } = {}) => {
	let where = '1 = 1';
	const params = [];

	if (branch_id != null) {
		where += ' AND s.branch_id = ?';
		params.push(Number(branch_id));
	} else {
		const frag = scopeFragment(user, 's.branch_id');
		if (frag.restricted) {
			where += ` AND ${frag.sql}`;
			params.push(...frag.params);
		}
	}

	const [[shipments]] = await pool.execute(
		`SELECT COUNT(*) AS total,
		        SUM(CASE WHEN status NOT IN ('delivered','cancelled') THEN 1 ELSE 0 END) AS active,
		        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN final_quote ELSE 0 END), 0) AS revenue,
		        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN commission_amount ELSE 0 END), 0) AS commission,
		        SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) AS pending_approvals
		 FROM shipments s WHERE ${where}`,
		params,
	);

	const [[vendors]] = await pool.execute(
		`SELECT COUNT(*) AS total,
		        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
		        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
		 FROM vendors v
		 WHERE ${where.replace(/s\./g, 'v.')}`,
		params,
	);

	const [[tickets]] = await pool.execute(
		`SELECT COUNT(*) AS open
		 FROM support_tickets t
		 JOIN vendors v ON v.id = t.vendor_id
		 WHERE t.status = 'open' AND ${where.replace(/s\./g, 'v.')}`,
		params,
	);

	return {
		shipments: {
			total: Number(shipments?.total || 0),
			active: Number(shipments?.active || 0),
			pending_approvals: Number(shipments?.pending_approvals || 0),
		},
		revenue: Number(shipments?.revenue || 0),
		commission_earnings: Number(shipments?.commission || 0),
		vendors: {
			total: Number(vendors?.total || 0),
			active: Number(vendors?.active || 0),
			pending: Number(vendors?.pending || 0),
		},
		tickets_open: Number(tickets?.open || 0),
	};
};

// Per-branch breakdown for the super-admin global dashboard.
export const perBranchBreakdown = async () => {
	const [rows] = await pool.execute(
		`SELECT b.id, b.name, b.province_id,
		        (SELECT COUNT(*) FROM shipments s WHERE s.branch_id = b.id) AS shipments,
		        (SELECT COALESCE(SUM(s.commission_amount), 0) FROM shipments s
		           WHERE s.branch_id = b.id AND s.payment_status = 'paid') AS commission,
		        (SELECT COUNT(*) FROM vendors v WHERE v.branch_id = b.id AND v.status = 'active') AS active_vendors,
		        (SELECT COUNT(*) FROM support_tickets t
		           JOIN vendors tv ON tv.id = t.vendor_id
		           WHERE tv.branch_id = b.id AND t.status = 'open') AS open_tickets
		 FROM branches b
		 ORDER BY b.province_id ASC, b.name ASC`,
	);
	return rows;
};