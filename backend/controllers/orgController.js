import pool from '../config/db.js';
import { HttpError } from '../utils/HttpError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { EMAIL_REGEX, PHONE_REGEX } from '../utils/validation.js';
import {
	getBranches as getBranchesModel,
	createBranch as createBranchModel,
	setBranchActive,
	getActiveBranches,
} from '../models/branchModel.js';
import {
	createAdminUser,
	updateUserRole,
	listUsersForAdmin,
	getUserBranches,
} from '../models/authModel.js';
import { listAuditLogs, logAudit } from '../models/auditModel.js';
import { regionalOverview, perBranchBreakdown } from '../models/analyticsModel.js';
import { branchIds, scopeFilterFor } from '../middleware/scope.js';

const PASSWORD_MIN_LENGTH = 6;

// ── Branches ──

export const listBranches = asyncHandler(async (req, res) => {
	// Super admins and branch admins both need the branch list (region switcher);
	// branch admins see only their own branches.
	const all = await getBranchesModel();
	const scope = branchIds(req.user);
	const branches =
		scope === null ? all : all.filter((b) => scope.includes(b.id));
	res.json({ success: true, branches });
});

export const createBranch = asyncHandler(async (req, res) => {
	const { name, province_id } = req.body;
	if (!name || !name.trim()) throw new HttpError(400, 'Branch name is required');
	let provinceId = null;
	if (province_id != null && province_id !== '') {
		provinceId = Number(province_id);
		if (!Number.isInteger(provinceId) || provinceId < 1 || provinceId > 7) {
			throw new HttpError(400, 'province_id must be between 1 and 7 when provided');
		}
	}
	const branch = await createBranchModel({ name: name.trim(), province_id: provinceId });
	await logAudit({
		actorUserId: req.user.id,
		action: 'branch.create',
		entity: 'branch',
		entityId: branch.id,
		branchId: branch.id,
	});
	res.status(201).json({ success: true, branch });
});

export const toggleBranchActive = asyncHandler(async (req, res) => {
	const { id } = req.params;
	const { is_active } = req.body;
	const ok = await setBranchActive(id, is_active !== false);
	if (!ok) throw new HttpError(404, 'Branch not found');
	await logAudit({
		actorUserId: req.user.id,
		action: is_active === false ? 'branch.deactivate' : 'branch.activate',
		entity: 'branch',
		entityId: Number(id),
		branchId: Number(id),
	});
	res.json({ success: true, message: 'Branch updated' });
});

// ── Users / admin accounts ──

export const listUsersAdmin = asyncHandler(async (req, res) => {
	const page = Math.max(parseInt(req.query.page) || 1, 1);
	const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
	const users = await listUsersForAdmin({ page, limit, branchFilter: scopeFilterFor(req.user) });
	res.json({ success: true, users });
});

// CREATE ADMIN ACCOUNT — the primary super-admin workflow.
export const createAdminAccount = asyncHandler(async (req, res) => {
	const { name, email, password, role, branch_ids } = req.body;

	if (!name || !name.trim()) throw new HttpError(400, 'Name is required');
	if (!email || !EMAIL_REGEX.test(email)) throw new HttpError(400, 'Valid email is required');
	if (!password || password.length < PASSWORD_MIN_LENGTH) {
		throw new HttpError(400, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
	}

	const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
	if (existing.length) throw new HttpError(400, 'User already exists');

	const safeRole = role === 'super_admin' ? 'super_admin' : 'branch_admin';
	let branchIdsList = (branch_ids || []).map(Number).filter(Number.isFinite);

	if (safeRole === 'branch_admin' && branchIdsList.length === 0) {
		throw new HttpError(400, 'A branch admin must be assigned to at least one branch');
	}

	// Validate branch ids exist.
	if (branchIdsList.length) {
		const ph = branchIdsList.map(() => '?').join(', ');
		const [rows] = await pool.execute(`SELECT id FROM branches WHERE id IN (${ph})`, branchIdsList);
		const valid = new Set(rows.map((r) => r.id));
		branchIdsList = branchIdsList.filter((b) => valid.has(b));
		if (safeRole === 'branch_admin' && branchIdsList.length === 0) {
			throw new HttpError(400, 'No valid branches selected');
		}
	}

	const user = await createAdminUser({
		name: name.trim(),
		email: email.trim().toLowerCase(),
		password,
		role: safeRole,
		branchIds: branchIdsList,
	});

	await Promise.all(
		branchIdsList.map((bid) =>
			logAudit({
				actorUserId: req.user.id,
				action: 'user.create_admin',
				entity: 'user',
				entityId: user.id,
				branchId: bid,
				meta: { role: safeRole },
			}),
		),
	);

	res.status(201).json({
		success: true,
		message: `${safeRole === 'super_admin' ? 'Super admin' : 'Branch admin'} account created`,
		user: { ...user, branch_ids: safeRole === 'branch_admin' ? branchIdsList : [] },
	});
});

export const updateUserRoleAndScope = asyncHandler(async (req, res) => {
	const { id } = req.params;
	const { role, branch_ids } = req.body;
	if (!role) throw new HttpError(400, 'role is required');

	const newRole = ['super_admin', 'branch_admin', 'vendor', 'user'].includes(role) ? role : null;
	if (!newRole) throw new HttpError(400, 'Invalid role');

	let branchIdsList = (branch_ids || []).map(Number).filter(Number.isFinite);
	if (newRole === 'branch_admin' && branchIdsList.length === 0) {
		throw new HttpError(400, 'A branch admin must be assigned to at least one branch');
	}

	const ok = await updateUserRole(id, newRole, branchIdsList);
	if (!ok) throw new HttpError(404, 'User not found');

	await logAudit({
		actorUserId: req.user.id,
		action: 'user.role_change',
		entity: 'user',
		entityId: Number(id),
		meta: { role: newRole, branch_ids: branchIdsList },
	});

	const branches = await getUserBranches(id, newRole);
	res.json({ success: true, message: 'User updated', user: { id: Number(id), role: newRole, branches } });
});

// ── Analytics ──

export const getAnalytics = asyncHandler(async (req, res) => {
	const filter = scopeFilterFor(req.user);
	const branchId = req.query.branch_id ? Number(req.query.branch_id) : null;

	// A branch admin pointing at an out-of-scope branch is flattened to their own scope.
	const overview = await regionalOverview(req.user, { branch_id: branchId });
	const breakdown = req.user.role === 'super_admin' ? await perBranchBreakdown() : null;

	res.json({ success: true, scope: filter.restricted ? filter.params : null, overview, breakdown });
});

export const getActiveBranchesList = asyncHandler(async (req, res) => {
	const branches = await getActiveBranches();
	res.json({ success: true, branches });
});

// ── Audit ──

export const getAuditLogs = asyncHandler(async (req, res) => {
	const page = Math.max(parseInt(req.query.page) || 1, 1);
	const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
	const logs = await listAuditLogs({ page, limit });
	res.json({ success: true, logs });
});