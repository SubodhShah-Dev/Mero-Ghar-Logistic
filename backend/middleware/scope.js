// Tenancy / scope helpers for the multi-branch RBAC model.
//
// Scope semantics:
//   - super_admin : branchIds() === null  → unlimited (global)
//   - branch_admin: branchIds() === number[] → restricted to assigned branches
//   - vendor      : branchIds() === [own vendor branch]
//   - user        : branchIds() === [] (no administrative scope)
//
// Scope is always derived from the authenticated JWT claims (set at login),
// never from client-supplied query/body values.

export const isSuperAdmin = (user) => user?.role === 'super_admin';

// Returns null for unlimited scope, else an array of allowed branch ids.
export const branchIds = (user) => {
	if (isSuperAdmin(user)) return null;
	const ids = (user?.branches || []).map(Number).filter(Number.isFinite);
	return ids;
};

export const canAccessBranch = (user, branchId) => {
	if (isSuperAdmin(user)) return true;
	return (branchIds(user) || []).includes(Number(branchId));
};

// Build an SQL fragment + params for a tenant column, e.g.
//   scopeFragment(user, 's.branch_id') → { sql, params }
// Returns { restricted: false } for unlimited (super admin) scope.
export const scopeFragment = (user, column) => {
	const ids = branchIds(user);
	if (ids === null) return { restricted: false };
	if (ids.length === 0) return { restricted: true, sql: '1 = 0', params: [] };
	return {
		restricted: true,
		sql: `${column} IN (${ids.map(() => '?').join(', ')})`,
		params: ids,
	};
};

// Resolve an optional branch_id filter from the request against the caller's
// scope. Super admin may pick any branch (or none = all); branch admins are
// clamped to their own scope (or none = their whole scope).
// Returns { invalid: boolean, branch_id: null|number } — invalid means the
// caller asked for a branch they do not control.
export const resolveBranchFilter = (req) => {
	const raw = req.query?.branch_id;
	if (raw === undefined || raw === null || raw === '') {
		return { invalid: false, branch_id: null };
	}
	const id = Number(raw);
	if (!Number.isFinite(id)) return { invalid: true, branch_id: null };
	if (isSuperAdmin(req.user)) return { invalid: false, branch_id: id };
	if (!canAccessBranch(req.user, id)) return { invalid: true, branch_id: null };
	return { invalid: false, branch_id: id };
};

// Convenience: build the scope filter object (scopeFragment shape) honoring an
// optional branch_id query param. Throws nothing; invalid requests fall back to
// the caller's own scope (their effective reach), keeping 403s consistent.
export const scopeFilterFor = (user, { branch_id = null } = {}) => {
	const selfScope = scopeFragment(user, 'X');
	if (isSuperAdmin(user)) {
		return branch_id
			? { restricted: true, sql: 'X = ?', params: [branch_id] }
			: { restricted: false };
	}
	return selfScope;
};