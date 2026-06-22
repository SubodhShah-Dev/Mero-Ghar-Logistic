// ==================================================
// ADMIN PANEL - COMPLETE WORKING VERSION
// FIXED: Pending shipments sorted by id DESC (newest first)
// FIXED: Move Date simplified (YYYY-MM-DD)
// ==================================================

const BASEURL = API_BASE_URL;
let BOOKINGS = [];
let CUSTOMERS = [];
let VENDORS = [];
let PENDING_SHIPMENTS = [];
let sortState = { col: null, dir: 1 };
let bookFilter = 'all';
let dashFilter = 'all';
let approvalFilter = 'pending';
let currentEditingBookingId = null;

// ==================================================
// AUTHENTICATION FUNCTIONS
// ==================================================

function checkAuth() {
	const user = safeParse(localStorage.getItem('meroGharUser'), {});
	if (!user.loggedIn || user.role !== 'admin') {
		window.location.href = '/src/pages/login.html';
		return null;
	}

	const adminNameEl = document.getElementById('a-name');
	if (adminNameEl) adminNameEl.textContent = user.name || 'Admin User';

	const avatarEl = document.querySelector('.av');
	if (avatarEl && user.name) {
		const initials = user.name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
		avatarEl.textContent = initials;
	}

	return user;
}

function logout() {
	if (confirm('Are you sure you want to logout?')) {
		localStorage.removeItem('meroGharUser');
		toast('Logged out successfully', 'green');
		setTimeout(() => {
			window.location.href = '/src/pages/login.html';
		}, 500);
	}
}

// ==================================================
// API FUNCTIONS
// ==================================================

async function fetchAPI(url, options = {}) {
	const token = localStorage.getItem('meroGharUser');
	const headers = {
		'Content-Type': 'application/json',
		...options.headers,
	};

	if (token) {
		const user = safeParse(token, {});
		headers['Authorization'] = `Bearer ${user.id}`;
	}

	try {
		const response = await fetch(`${BASEURL}${url}`, {
			...options,
			headers,
		});
		const data = await response.json();
		return { ok: response.ok, ...data };
	} catch (error) {
		console.error('API Error:', error);
		return { ok: false, message: error.message };
	}
}

// ==================================================
// LOAD DATA (with sorting by id DESC)
// ==================================================

async function loadBookings() {
	const result = await fetchAPI('/api/shipment/all');
	if (result.ok && result.shipments) {
		BOOKINGS = result.shipments
			.map((shipment) => {
				let rawAmount = shipment.final_quote;
				if (rawAmount === undefined || rawAmount === null)
					rawAmount = 0;
				if (typeof rawAmount === 'string') {
					rawAmount = rawAmount.replace(/[^0-9.-]/g, '');
				}
				const amountNum = parseFloat(rawAmount) || 0;

				let displayStatus = shipment.status || 'pending';
				const statusMap = {
					pending: 'Pending',
					in_transit: 'In Transit',
					delivered: 'Delivered',
					cancelled: 'Cancelled',
				};
				displayStatus = statusMap[displayStatus] || displayStatus;

				return {
					id: shipment.id,
					booking_id: shipment.booking_id || `#MG-${shipment.id}`,
					customer:
						`${shipment.first_name || ''} ${shipment.last_name || ''}`.trim(),
					route: `${shipment.pickup_district || ''} → ${shipment.drop_district || ''}`,
					date: shipment.move_date
						? new Date(shipment.move_date).toLocaleDateString(
								'en-GB',
								{
									day: 'numeric',
									month: 'short',
								},
							)
						: '—',
					status: displayStatus,
					amount: amountNum,
					phone: shipment.mobile_number || '—',
					full_route: `${shipment.pickup_city || ''}, ${shipment.pickup_district || ''} → ${shipment.drop_city || ''}, ${shipment.drop_district || ''}`,
					move_date: shipment.move_date,
					created_at: shipment.created_at,
					approval_status: shipment.approval_status || 'pending',
					assigned_vendor_id: shipment.assigned_vendor_id,
					vendor_name: shipment.vendor_name || null,
					raw_status: shipment.status,
				};
			})
			.sort((a, b) => b.id - a.id); // newest first
		renderDashTable(dashFilter, '');
		renderBookTable(bookFilter, '');
		updateStats();
	}
}

async function loadCustomers() {
	const result = await fetchAPI('/api/auth/users');
	if (result.ok && result.users) {
		CUSTOMERS = result.users.map((user) => ({
			name: user.name,
			email: user.email,
			phone: user.phone || '—',
			bookings: BOOKINGS.filter((b) => b.customer.includes(user.name))
				.length,
			joined: user.created_at
				? new Date(user.created_at).toLocaleDateString('en-GB', {
						month: 'short',
						year: 'numeric',
					})
				: '—',
			status: 'Active',
		}));
		renderCustomers('');
	}
}

async function loadVendors() {
	try {
		const result = await fetchAPI('/api/admin/vendors');
		if (result.ok && result.vendors) {
			VENDORS = result.vendors;
			renderVendorsTable();
			return VENDORS;
		}
		return [];
	} catch (error) {
		console.error('Error loading vendors:', error);
		return [];
	}
}

async function loadPendingShipments() {
	const result = await fetchAPI('/api/admin/shipments/pending');
	if (result.ok && result.shipments) {
		// Sort by id descending (newest first)
		PENDING_SHIPMENTS = result.shipments.sort((a, b) => b.id - a.id);
		renderApprovalTable(PENDING_SHIPMENTS);
		const pendingCount = document.getElementById('pending-approval-count');
		if (pendingCount) pendingCount.textContent = PENDING_SHIPMENTS.length;
	}
}

async function loadShipmentsByStatus(status) {
	const result = await fetchAPI(`/api/admin/shipments/status/${status}`);
	if (result.ok && result.shipments) {
		const sorted = result.shipments.sort((a, b) => b.id - a.id);
		renderApprovalTable(sorted);
	}
}

// ==================================================
// UI UPDATE FUNCTIONS
// ==================================================

function updateStats() {
	const total = BOOKINGS.length;
	const delivered = BOOKINGS.filter((b) => b.status === 'Delivered').length;
	const inTransit = BOOKINGS.filter((b) => b.status === 'In Transit').length;
	const revenue = BOOKINGS.reduce((sum, b) => sum + (b.amount || 0), 0);

	animateNumber('sv1', total);
	animateNumber('sv2', delivered);
	animateNumber('sv3', inTransit);
	animateNumber('sv4', revenue, (v) => `Rs ${(v / 1000).toFixed(0)}k`);

	const pendingCount = document.getElementById('pending-count');
	if (pendingCount)
		pendingCount.textContent = BOOKINGS.filter(
			(b) => b.status === 'Pending',
		).length;
}

function animateNumber(id, target, formatter = (v) => v.toLocaleString()) {
	let current = 0;
	const el = document.getElementById(id);
	if (!el) return;
	const step = Math.ceil(target / 50);
	const interval = setInterval(() => {
		current = Math.min(current + step, target);
		el.textContent = formatter(current);
		if (current >= target) clearInterval(interval);
	}, 20);
}

// ==================================================
// PILL & TABLE RENDER FUNCTIONS
// ==================================================

function pillHtml(status) {
	const map = {
		Delivered: 'pd',
		'In Transit': 'pt',
		Pending: 'pp',
		Cancelled: 'pc',
		Active: 'pd',
		Inactive: 'pc',
		approved: 'pd',
		pending: 'pp',
		rejected: 'pc',
	};
	return `<span class="pill ${map[status] || 'pp'}">${status}</span>`;
}

function escapeHtml(str) {
	if (!str) return '';
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function renderDashTable(filter, search) {
	const tbody = document.getElementById('dash-tbody');
	if (!tbody) return;

	let data = [...BOOKINGS];
	if (filter && filter !== 'all')
		data = data.filter((r) => r.status === filter);
	if (search)
		data = data.filter(
			(r) =>
				r.customer.toLowerCase().includes(search.toLowerCase()) ||
				r.booking_id.toLowerCase().includes(search.toLowerCase()),
		);
	data = data.slice(0, 6);
	if (!data.length) {
		tbody.innerHTML = `<tr><td colspan="6" class="no-results">No bookings found</td></tr>`;
		return;
	}
	tbody.innerHTML = data
		.map(
			(r) => `
    <tr onclick="toggleDetail('d-${r.id}')">
      <td class="m">${r.booking_id}</td><td class="b">${escapeHtml(r.customer)}</td>
      <td>${escapeHtml(r.route)}</td><td>${r.date}</td>
      <td>${pillHtml(r.status)}</td><td class="b">Rs ${(r.amount || 0).toLocaleString()}</td>
    </tr>
    <tr class="row-detail" id="d-${r.id}">
      <td colspan="6"><div class="rd-inner">
        <div class="rd-item"><div class="rd-lbl">Phone</div><div class="rd-val">${escapeHtml(r.phone || '—')}</div></div>
        <div class="rd-item"><div class="rd-lbl">Full Route</div><div class="rd-val">${escapeHtml(r.full_route || r.route)}</div></div>
        <div class="rd-item"><div class="rd-lbl">Status</div><div class="rd-val">${r.status}</div></div>
        <div class="rd-item"><div class="rd-lbl">Approval</div><div class="rd-val">${pillHtml(r.approval_status)}</div></div>
        <div class="rd-item"><div class="rd-lbl">Amount</div><div class="rd-val">Rs ${(r.amount || 0).toLocaleString()}</div></div>
        <div class="rd-item"><div class="rd-lbl">Move Date</div><div class="rd-val">${r.move_date || r.date ? (r.move_date || r.date).split('T')[0] : '—'}</div></div>
        <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
          <button class="btn-ghost btn-sm" onclick="event.stopPropagation();openEditStatusModal(${r.id})">Edit</button>
          <button class="btn btn-sm" onclick="event.stopPropagation();copyToClipboard('${r.booking_id}')">Copy ID</button>
        </div>
      </div></td>
    </tr>`,
		)
		.join('');
}

function renderBookTable(filter, search) {
	const tbody = document.getElementById('book-tbody');
	if (!tbody) return;

	let data = [...BOOKINGS];
	if (filter && filter !== 'all')
		data = data.filter((r) => r.status === filter);
	if (search)
		data = data.filter(
			(r) =>
				r.customer.toLowerCase().includes(search.toLowerCase()) ||
				r.booking_id.toLowerCase().includes(search.toLowerCase()),
		);
	if (sortState.col) {
		data.sort((a, b) => {
			let av = a[sortState.col],
				bv = b[sortState.col];
			if (sortState.col === 'amount') {
				av = Number(av);
				bv = Number(bv);
			}
			return av > bv ? sortState.dir : av < bv ? -sortState.dir : 0;
		});
	}
	if (!data.length) {
		tbody.innerHTML = `<tr><td colspan="7" class="no-results">No bookings found</td></tr>`;
		return;
	}
	tbody.innerHTML = data
		.map(
			(r) => `
    <tr onclick="toggleDetail('bd-${r.id}')">
      <td class="m">${r.booking_id}</td><td class="b">${escapeHtml(r.customer)}</td>
      <td>${escapeHtml(r.route)}</td><td>${r.date}</td>
      <td>${pillHtml(r.status)}</td><td class="b">Rs ${(r.amount || 0).toLocaleString()}</td>
      <td><div style="display:flex;gap:6px" onclick="event.stopPropagation()">
        <button class="btn-ghost btn-sm" onclick="openEditStatusModal(${r.id})">Edit</button>
      </div></td>
    </tr>
    <tr class="row-detail" id="bd-${r.id}">
      <td colspan="7"><div class="rd-inner">
        <div class="rd-item"><div class="rd-lbl">Customer Phone</div><div class="rd-val">${escapeHtml(r.phone || '—')}</div></div>
        <div class="rd-item"><div class="rd-lbl">Route</div><div class="rd-val">${escapeHtml(r.full_route || r.route)}</div></div>
        <div class="rd-item"><div class="rd-lbl">Status</div><div class="rd-val">${r.status}</div></div>
        <div class="rd-item"><div class="rd-lbl">Approval</div><div class="rd-val">${pillHtml(r.approval_status)}</div></div>
        <div class="rd-item"><div class="rd-lbl">Amount</div><div class="rd-val">Rs ${(r.amount || 0).toLocaleString()}</div></div>
        <div class="rd-item"><div class="rd-lbl">Move Date</div><div class="rd-val">${r.move_date || r.date ? (r.move_date || r.date).split('T')[0] : '—'}</div></div>
      </div></td>
    </tr>`,
		)
		.join('');
}

function renderCustomers(search) {
	const tbody = document.getElementById('cust-tbody');
	if (!tbody) return;

	let data = [...CUSTOMERS];
	if (search)
		data = data.filter((r) =>
			r.name.toLowerCase().includes(search.toLowerCase()),
		);
	tbody.innerHTML = data
		.map(
			(r) => `
      <tr>
        <td class="b">${escapeHtml(r.name)}</td><td>${escapeHtml(r.email)}</td>
        <td>${escapeHtml(r.phone)}</td><td>${r.bookings}</td>
        <td>${r.joined}</td><td>${pillHtml(r.status)}</td>
      </tr>`,
		)
		.join('');
}

function renderVendorsTable() {
	const tbody = document.getElementById('vendors-tbody');
	if (!tbody) return;

	if (!VENDORS || VENDORS.length === 0) {
		tbody.innerHTML = `<tr><td colspan="7" class="no-results">No vendors found. Click "Add Vendor" to create one.</td></tr>`;
		return;
	}

	tbody.innerHTML = VENDORS.map((v) => {
		let statusOptions = '';
		if (v.status === 'pending') {
			statusOptions = `
                <option value="active">✅ Activate</option>
                <option value="banned">🚫 Ban</option>
            `;
		} else if (v.status === 'active') {
			statusOptions = `
                <option value="inactive">⏸️ Suspend</option>
                <option value="banned">🚫 Ban</option>
            `;
		} else if (v.status === 'inactive') {
			statusOptions = `
                <option value="active">✅ Reactivate</option>
                <option value="banned">🚫 Ban</option>
            `;
		} else if (v.status === 'banned') {
			statusOptions = `
                <option value="active">✅ Unban (Reactivate)</option>
            `;
		}

		return `
        <tr>
            <td class="b">${escapeHtml(v.business_name || v.name || '—')}</td>
            <td>${escapeHtml(v.phone || '—')}</td>
            <td>${escapeHtml(v.email || '—')}</td>
            <td>${escapeHtml(v.service_region || '—')}</td>
            <td>${v.total_jobs || 0}</td>
            <td>⭐ ${v.rating || 0}</td>
            <td>
                <select onchange="updateVendorStatus(${v.id}, this.value)" class="vendor-status-select" style="padding: 5px 10px; border-radius: 6px; background: var(--dark3); color: var(--text); border: 1px solid var(--bdim);">
                    <option value="${v.status}" selected disabled>${v.status}</option>
                    ${statusOptions}
                </select>
            </td>
        </tr>`;
	}).join('');
}

async function renderApprovalTable(shipments) {
	const tbody = document.getElementById('approval-tbody');
	if (!tbody) return;

	if (!shipments || shipments.length === 0) {
		tbody.innerHTML = `<tr><td colspan="7" class="no-results">No pending shipments</td></tr>`;
		return;
	}

	tbody.innerHTML = shipments
		.map((shipment) => {
			const moveDateSimple = shipment.move_date
				? shipment.move_date.split('T')[0]
				: '—';
			const vendorAssigned = shipment.assigned_vendor_id || shipment.vendor_name;
			return `
      <tr id="approval-row-${shipment.id}">
        <td class="m">${shipment.booking_id || `#MG-${shipment.id}`}</td>
        <td class="b">${escapeHtml(shipment.customer_name || `${shipment.first_name} ${shipment.last_name}`)}</td>
        <td>${escapeHtml(shipment.pickup_district || '')} → ${escapeHtml(shipment.drop_district || '')}</td>
        <td>${moveDateSimple}</td>
        <td class="b">Rs ${(shipment.final_quote || 0).toLocaleString()}</td>
        <td>
          <span class="${vendorAssigned ? 'pill pd' : 'pill pNw'}">${vendorAssigned ? escapeHtml(shipment.vendor_name || 'Assigned') : 'No vendor'}</span>
        </td>
        <td>
          <button class="btn-r btn-sm" onclick="rejectShipment(${shipment.id})">Reject</button>
        </td>
      </tr>`;
		})
		.join('');
}

// ==================================================
// EDIT STATUS MODAL
// ==================================================

function openEditStatusModal(bookingId) {
	const booking = BOOKINGS.find((b) => b.id === parseInt(bookingId));
	if (!booking) {
		toast('Booking not found', 'red');
		return;
	}
	currentEditingBookingId = booking.id;
	const modal = document.getElementById('modal-edit-status');
	if (!modal) {
		console.error('Edit status modal not found');
		return;
	}
	const select = document.getElementById('edit-status-select');
	if (select) {
		select.value = booking.status;
	}
	modal.classList.add('open');
}

async function submitStatusChange() {
	const select = document.getElementById('edit-status-select');
	const newDisplayStatus = select?.value;
	if (!newDisplayStatus) return;

	const booking = BOOKINGS.find((b) => b.id === currentEditingBookingId);
	if (!booking) {
		toast('Booking not found', 'red');
		closeModal('modal-edit-status');
		return;
	}

	const reverseStatusMap = {
		Pending: 'pending',
		'In Transit': 'in_transit',
		Delivered: 'delivered',
		Cancelled: 'cancelled',
	};
	const newBackendStatus = reverseStatusMap[newDisplayStatus];
	if (!newBackendStatus) {
		toast('Invalid status', 'red');
		return;
	}

	const result = await fetchAPI(`/api/shipment/${booking.id}/status`, {
		method: 'PUT',
		body: JSON.stringify({ status: newBackendStatus }),
	});

	if (result.ok) {
		toast(
			`Booking ${booking.booking_id} updated to ${newDisplayStatus}`,
			'green',
		);
		await loadBookings();
		await loadPendingShipments();
		closeModal('modal-edit-status');
	} else {
		toast(result.message || 'Failed to update status', 'red');
	}
}

// ==================================================
// OTHER ACTION FUNCTIONS
// ==================================================

async function rejectShipment(shipmentId) {
	const reason = prompt('Enter rejection reason:');
	if (!reason) return;
	const result = await fetchAPI(`/api/admin/shipments/${shipmentId}/reject`, {
		method: 'PUT',
		body: JSON.stringify({ reason }),
	});
	if (result.ok) {
		toast('Shipment rejected', 'green');
		await loadPendingShipments();
		await loadBookings();
	} else {
		toast('Failed to reject', 'red');
	}
}

async function updateVendorStatus(vendorId, newStatus) {
	const vendor = VENDORS.find((v) => v.id === vendorId);
	if (!vendor) return;

	if (!confirm(`Change ${vendor.business_name} status to ${newStatus}?`)) {
		// Reset select to original value
		renderVendorsTable();
		return;
	}

	const result = await fetchAPI(`/api/admin/vendors/${vendorId}/status`, {
		method: 'PUT',
		body: JSON.stringify({ status: newStatus }),
	});

	if (result.ok) {
		toast(`Vendor status updated to ${newStatus}`, 'green');
		await loadVendors();
		// Refresh pending approvals if needed
		if (approvalFilter === 'pending') await loadPendingShipments();
	} else {
		toast(result.message || 'Failed to update vendor status', 'red');
		renderVendorsTable(); // revert select
	}
}

function toggleDetail(id) {
	const row = document.getElementById(id);
	if (row) row.classList.toggle('open');
}

function copyToClipboard(text) {
	navigator.clipboard.writeText(text);
	toast('Copied to clipboard', 'green');
}

// ==================================================
// SORT & FILTER FUNCTIONS
// ==================================================

function setupSort(tableId, renderFn) {
	const table = document.getElementById(tableId);
	if (!table) return;
	table.querySelectorAll('thead th[data-col]').forEach((th) => {
		th.addEventListener('click', () => {
			const col = th.dataset.col;
			if (sortState.col === col) sortState.dir *= -1;
			else {
				sortState.col = col;
				sortState.dir = 1;
			}
			table
				.querySelectorAll('thead th')
				.forEach((h) => h.classList.remove('sorted'));
			th.classList.add('sorted');
			const sortIcon = th.querySelector('.sort-ic');
			if (sortIcon)
				sortIcon.textContent = sortState.dir === 1 ? '↑' : '↓';
			renderFn();
		});
	});
}

function setupChips(groupId, renderFn, searchId) {
	const container = document.getElementById(groupId);
	if (!container) return;
	container.querySelectorAll('.chip').forEach((c) => {
		c.addEventListener('click', () => {
			container
				.querySelectorAll('.chip')
				.forEach((x) => x.classList.remove('on'));
			c.classList.add('on');
			const f = c.dataset.filter;
			if (groupId === 'dash-chips') dashFilter = f;
			if (groupId === 'book-chips') bookFilter = f;
			const search = searchId
				? document.getElementById(searchId)?.value
				: '';
			renderFn(f, search);
		});
	});
}

function setupApprovalChips() {
	const container = document.getElementById('approval-chips');
	if (!container) return;
	container.querySelectorAll('.chip').forEach((c) => {
		c.addEventListener('click', async () => {
			container
				.querySelectorAll('.chip')
				.forEach((x) => x.classList.remove('on'));
			c.classList.add('on');
			const status = c.dataset.status;
			approvalFilter = status;
			if (status === 'pending') {
				await loadPendingShipments();
			} else {
				await loadShipmentsByStatus(status);
			}
		});
	});
}

// ==================================================
// NAVIGATION FUNCTIONS
// ==================================================

function goPage(pageName) {
	const validPages = [
		'dash',
		'bookings',
		'customers',
		'vendors',
		'revenue',
		'settings',
		'pending',
	];
	if (!validPages.includes(pageName)) return;

	validPages.forEach((page) => {
		const pageElement = document.getElementById(`page-${page}`);
		if (pageElement) pageElement.classList.remove('active');
	});
	const selectedPageElement = document.getElementById(`page-${pageName}`);
	if (selectedPageElement) selectedPageElement.classList.add('active');

	document.querySelectorAll('.nav-a').forEach((link) => {
		link.classList.remove('on');
		if (link.getAttribute('data-page') === pageName)
			link.classList.add('on');
	});

	const titleMap = {
		dash: 'Dashboard',
		bookings: 'Bookings',
		customers: 'Customers',
		vendors: 'Vendors',
		revenue: 'Revenue',
		settings: 'Settings',
		pending: 'Pending Approvals',
	};
	const pageTitle = document.getElementById('page-title');
	if (pageTitle) pageTitle.textContent = titleMap[pageName] || pageName;

	const topSub = document.getElementById('top-sub');
	if (topSub && pageName === 'dash') {
		const today = new Date();
		topSub.textContent = today.toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	}
	if (pageName === 'revenue') setTimeout(() => drawRevChart(), 100);
	if (pageName === 'pending') loadPendingShipments();
	if (pageName === 'vendors') loadVendors();
}

function setupSidebarNavigation() {
	const navLinks = document.querySelectorAll('.nav-a');
	navLinks.forEach((link) => {
		const newLink = link.cloneNode(true);
		link.parentNode.replaceChild(newLink, link);
		newLink.addEventListener('click', (e) => {
			e.preventDefault();
			const page = newLink.getAttribute('data-page');
			if (page) goPage(page);
		});
	});
}

// ==================================================
// MODAL FUNCTIONS
// ==================================================

function openNewBooking() {
	const modal = document.getElementById('modal-new');
	if (modal) modal.classList.add('open');
}

function closeModal(id) {
	const modal = document.getElementById(id);
	if (modal) modal.classList.remove('open');
}

async function submitBooking() {
	const name = document.getElementById('nb-name')?.value.trim();
	const phone = document.getElementById('nb-phone')?.value.trim();
	const from = document.getElementById('nb-from')?.value.trim();
	const to = document.getElementById('nb-to')?.value.trim();
	const amount = document.getElementById('nb-amount')?.value.trim();
	const notes = document.getElementById('nb-notes')?.value.trim();
	if (!name || !from || !to) {
		toast('Please fill all required fields', 'red');
		return;
	}
	const result = await fetchAPI('/api/shipment/create', {
		method: 'POST',
		body: JSON.stringify({
			first_name: name,
			pickup_address: from,
			drop_address: to,
			mobile_number: phone || '',
			final_quote: amount ? parseFloat(amount) : 0,
			special_notes: notes || '',
		}),
	});
	if (!result.ok) {
		toast(result.message || 'Failed to create booking', 'red');
		return;
	}
	toast('Booking #' + (result.booking_id || '') + ' created', 'green');
	closeModal('modal-new');
	await loadBookings();
	['nb-name','nb-phone','nb-from','nb-to','nb-amount','nb-notes'].forEach((id) => {
		const el = document.getElementById(id);
		if (el) el.value = '';
	});
}

function openAddVendor() {
	const modal = document.getElementById('modal-add-vendor');
	if (modal) modal.classList.add('open');
}

async function submitAddVendor() {
	const user_id = document.getElementById('vendor-user-id')?.value;
	const business_name = document
		.getElementById('vendor-business-name')
		?.value.trim();
	const owner_name = document
		.getElementById('vendor-owner-name')
		?.value.trim();
	const phone = document.getElementById('vendor-phone')?.value.trim();
	const email = document.getElementById('vendor-email')?.value.trim();
	const service_region = document
		.getElementById('vendor-region')
		?.value.trim();
	const address = document.getElementById('vendor-address')?.value.trim();
	if (!user_id || !business_name || !owner_name || !phone || !email) {
		toast('Please fill all required fields', 'red');
		return;
	}
	const result = await fetchAPI('/api/vendor/register', {
		method: 'POST',
		body: JSON.stringify({
			user_id: parseInt(user_id),
			business_name,
			owner_name,
			phone,
			email,
			service_region,
			address,
		}),
	});
	if (result.ok) {
		toast('Vendor added successfully!', 'green');
		closeModal('modal-add-vendor');
		await loadVendors();
		[
			'vendor-user-id',
			'vendor-business-name',
			'vendor-owner-name',
			'vendor-phone',
			'vendor-email',
			'vendor-region',
			'vendor-address',
		].forEach((id) => {
			const el = document.getElementById(id);
			if (el) el.value = '';
		});
	} else {
		toast(result.message || 'Failed to add vendor', 'red');
	}
}

function showNotifications() {
	const notifDot = document.getElementById('notif-dot');
	if (notifDot) notifDot.style.display = 'none';
	const badge = document.getElementById('admin-alert-badge');
	if (badge) badge.style.display = 'none';
	toast('3 new bookings pending approval', 'gold');
}

// ==================================================
// TOAST FUNCTION
// ==================================================

function toast(msg, color = 'gold') {
	const colors = {
		gold: '#f8c06a',
		green: '#4caf7d',
		red: '#e05e5e',
		blue: '#5e9fe0',
	};
	const wrap = document.getElementById('toast-wrap');
	if (!wrap) return;
	const el = document.createElement('div');
	el.className = 'toast';
	var dot = document.createElement('span');
	dot.className = 'toast-dot';
	dot.style.background = colors[color] || colors.gold;
	el.appendChild(dot);
	el.appendChild(document.createTextNode(msg));
	wrap.appendChild(el);
	setTimeout(() => {
		el.classList.add('out');
		setTimeout(() => el.remove(), 220);
	}, 2800);
}

// ==================================================
// CHART FUNCTIONS
// ==================================================

let sparkChart, revChart;

function drawSparkChart(days) {
	const labels = [],
		data = [];
	const base = [12, 18, 9, 22, 15, 27, 19, 14, 25, 11, 20, 17, 23, 8, 16];
	for (let i = days - 1; i >= 0; i--) {
		const d = new Date();
		d.setDate(d.getDate() - i);
		labels.push(
			d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
		);
		data.push(base[i % base.length] + Math.floor(Math.random() * 5));
	}
	const ctx = document.getElementById('spark-chart')?.getContext('2d');
	if (!ctx) return;
	if (sparkChart) sparkChart.destroy();
	sparkChart = new Chart(ctx, {
		type: 'line',
		data: {
			labels,
			datasets: [
				{
					data,
					borderColor: '#f8c06a',
					borderWidth: 2,
					pointRadius: 0,
					tension: 0.4,
					fill: true,
					backgroundColor: (ctx2) => {
						const g = ctx2.chart.ctx.createLinearGradient(
							0,
							0,
							0,
							130,
						);
						g.addColorStop(0, 'rgba(248,192,106,0.25)');
						g.addColorStop(1, 'rgba(248,192,106,0)');
						return g;
					},
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { display: false },
				tooltip: {
					callbacks: { label: (v) => `${v.raw} bookings` },
					backgroundColor: '#16261d',
					titleColor: '#eef2ee',
					bodyColor: 'rgba(238,242,238,.6)',
					borderColor: 'rgba(248,192,106,.3)',
					borderWidth: 1,
					padding: 10,
					displayColors: false,
				},
			},
			scales: { x: { display: false }, y: { display: false } },
		},
	});
}

function drawRevChart() {
	const ctx = document.getElementById('rev-chart')?.getContext('2d');
	if (!ctx) return;
	if (revChart) revChart.destroy();
	const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
	const vals = [280000, 310000, 295000, 340000, 380000, 420000];
	revChart = new Chart(ctx, {
		type: 'bar',
		data: {
			labels: months,
			datasets: [
				{
					data: vals,
					backgroundColor: 'rgba(248,192,106,0.25)',
					borderColor: '#f8c06a',
					borderWidth: 1.5,
					borderRadius: 6,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { display: false },
				tooltip: {
					callbacks: {
						label: (v) => `Rs ${(v.raw / 1000).toFixed(0)}k`,
					},
					backgroundColor: '#16261d',
					titleColor: '#eef2ee',
					bodyColor: 'rgba(238,242,238,.6)',
					borderColor: 'rgba(248,192,106,.3)',
					borderWidth: 1,
					padding: 10,
					displayColors: false,
				},
			},
			scales: {
				x: {
					ticks: {
						color: 'rgba(238,242,238,.35)',
						font: { family: 'var(--mono)', size: 11 },
					},
					grid: { display: false },
					border: { display: false },
				},
				y: {
					ticks: {
						color: 'rgba(238,242,238,.35)',
						font: { family: 'var(--mono)', size: 11 },
						callback: (v) => `${v / 1000}k`,
					},
					grid: { color: 'rgba(255,255,255,.05)' },
					border: { display: false },
				},
			},
		},
	});
}

// ==================================================
// INITIALIZATION
// ==================================================

document.addEventListener('DOMContentLoaded', async () => {
	const user = checkAuth();
	if (!user) return;

	setupSidebarNavigation();
	await Promise.all([
		loadBookings(),
		loadCustomers(),
		loadVendors(),
		loadPendingShipments(),
	]);
	renderDashTable('all', '');
	renderBookTable('all', '');
	renderCustomers('');
	renderVendorsTable();

	setupChips('dash-chips', (f, s) => renderDashTable(f, s), null);
	setupChips('book-chips', (f, s) => renderBookTable(f, s), 'book-search');
	setupApprovalChips();
	setupSort('book-table', () =>
		renderBookTable(
			bookFilter,
			document.getElementById('book-search')?.value || '',
		),
	);

	drawSparkChart(7);
	const chartRange = document.getElementById('chart-range');
	if (chartRange) {
		chartRange.querySelectorAll('.chip').forEach((c) => {
			c.addEventListener('click', () => {
				chartRange
					.querySelectorAll('.chip')
					.forEach((x) => x.classList.remove('on'));
				c.classList.add('on');
				drawSparkChart(Number(c.dataset.range));
			});
		});
	}

	const globalSearch = document.getElementById('global-search');
	if (globalSearch) {
		globalSearch.addEventListener('input', (e) => {
			const v = e.target.value.toLowerCase();
			if (!v) {
				renderDashTable(dashFilter, '');
				return;
			}
			goPage('dash');
			renderDashTable('all', v);
			const dashChips = document.getElementById('dash-chips');
			if (dashChips)
				dashChips
					.querySelectorAll('.chip')
					.forEach((c) =>
						c.classList.toggle('on', c.dataset.filter === 'all'),
					);
			dashFilter = 'all';
		});
	}

	const bookSearch = document.getElementById('book-search');
	if (bookSearch)
		bookSearch.addEventListener('input', (e) =>
			renderBookTable(bookFilter, e.target.value),
		);
	const custSearch = document.getElementById('cust-search');
	if (custSearch)
		custSearch.addEventListener('input', (e) =>
			renderCustomers(e.target.value),
		);

	document.querySelectorAll('.overlay').forEach((o) => {
		o.addEventListener('click', (e) => {
			if (e.target === o) o.classList.remove('open');
		});
	});

	const notifBtn = document.getElementById('notif-btn');
	if (notifBtn)
		notifBtn.addEventListener('click', () => {
			document.getElementById('notif-dot').style.display = 'none';
			toast('3 new bookings pending approval', 'gold');
		});

	setTimeout(() => {
		document.querySelectorAll('.m-fill').forEach((el) => {
			if (el.dataset.w) el.style.width = el.dataset.w + '%';
		});
	}, 400);
	goPage('dash');
});

// Expose global functions
window.goPage = goPage;
window.toggleDetail = toggleDetail;
window.openNewBooking = openNewBooking;
window.closeModal = closeModal;
window.submitBooking = submitBooking;
window.toast = toast;
window.logout = logout;
window.openEditStatusModal = openEditStatusModal;
window.submitStatusChange = submitStatusChange;
window.copyToClipboard = copyToClipboard;
window.showNotifications = showNotifications;
window.rejectShipment = rejectShipment;
window.updateVendorStatus = updateVendorStatus;
window.openAddVendor = openAddVendor;
window.submitAddVendor = submitAddVendor;
