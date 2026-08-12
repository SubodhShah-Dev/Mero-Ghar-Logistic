// Central capability map for the MeroGhar RBAC v2.
//
// Roles (ordered by privilege): super_admin > branch_admin > vendor > user.
// - super_admin bypasses the map entirely (all capabilities, unlimited scope).
// - branch_admin is matched against the map AND then restricted to its assigned
//   branches by middleware/scope.js (tenancy is applied at query level).
// - vendor / user are not administratively privileged.

export const ROLES = ['user', 'vendor', 'branch_admin', 'super_admin'];

export const PERMISSIONS = {
	// Dashboard / analytics
	'dashboard.analytics.global': ['super_admin'],
	'dashboard.analytics.region': ['super_admin', 'branch_admin'],
	// Branches
	'branches.manage': ['super_admin'],
	// Users & staff
	'users.manage.global': ['super_admin'],
	'users.manage.region': ['super_admin', 'branch_admin'],
	'users.roles.assign': ['super_admin'],
	// Shipments
	'shipments.view.global': ['super_admin'],
	'shipments.view.region': ['super_admin', 'branch_admin'],
	'shipments.approve.region': ['super_admin', 'branch_admin'],
	'shipments.status.admin': ['super_admin', 'branch_admin'],
	// Vendors / movers
	'vendors.view.global': ['super_admin'],
	'vendors.view.region': ['super_admin', 'branch_admin'],
	'vendors.status.region': ['super_admin', 'branch_admin'],
	// Support tickets
	'tickets.manage.global': ['super_admin'],
	'tickets.manage.region': ['super_admin', 'branch_admin'],
	// Escalations (cross-branch)
	'escalations.create': ['super_admin', 'branch_admin'],
	'escalations.resolve': ['super_admin', 'branch_admin'],
	// System config + audit (HQ only)
	'settings.manage': ['super_admin'],
	'audit.read': ['super_admin'],
	// Meta
	'admin.dashboard': ['super_admin', 'branch_admin'],
};

// Resolve whether a role holds ANY of the given capabilities.
export const roleCan = (role, capabilities) => {
	if (role === 'super_admin') return true;
	if (!Array.isArray(capabilities)) capabilities = [capabilities];
	return capabilities.some((cap) => (PERMISSIONS[cap] || []).includes(role));
};