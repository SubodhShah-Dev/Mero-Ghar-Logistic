import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
	listBranches,
	createBranch,
	toggleBranchActive,
	listUsersAdmin,
	createAdminAccount,
	updateUserRoleAndScope,
	getAnalytics,
	getAuditLogs,
	getActiveBranchesList,
} from '../controllers/orgController.js';
import {
	createEscalationHandler,
	listEscalationsHandler,
	resolveEscalationHandler,
} from '../controllers/escalationController.js';

const router = express.Router();

// Branch catalog (self-aware: branch admins see only their own branches).
router.get('/branches', authenticate, authorize('admin.dashboard'), listBranches);
router.get('/branches/active', getActiveBranchesList);

// Branch management (HQ only).
router.post('/branches', authenticate, authorize('branches.manage'), createBranch);
router.put('/branches/:id/toggle', authenticate, authorize('branches.manage'), toggleBranchActive);

// Users / admin accounts.
router.get('/users', authenticate, authorize('users.manage.global', 'users.manage.region'), listUsersAdmin);
router.post('/users', authenticate, authorize('users.manage.global'), createAdminAccount);
router.put('/users/:id/roles', authenticate, authorize('users.roles.assign'), updateUserRoleAndScope);

// Analytics.
router.get('/analytics', authenticate, authorize('dashboard.analytics.global', 'dashboard.analytics.region'), getAnalytics);

// Escalations (cross-branch requests).
router.get('/escalations', authenticate, authorize('admin.dashboard'), listEscalationsHandler);
router.post('/escalations', authenticate, authorize('escalations.create'), createEscalationHandler);
router.put('/escalations/:id', authenticate, authorize('escalations.resolve'), resolveEscalationHandler);

// Audit log (HQ only).
router.get('/audit', authenticate, authorize('audit.read'), getAuditLogs);

export default router;