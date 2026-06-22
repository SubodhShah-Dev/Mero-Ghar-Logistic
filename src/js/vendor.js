// ==================================================
// VENDOR PORTAL - COMPLETE WORKING VERSION
// FIXED: Job rejection, proper earnings display
// FIXED: Status-aware UI (inactive/banned)
// FIXED: Move Date simplified (YYYY-MM-DD)
// ==================================================

const BASEURL = API_BASE_URL;
let currentPage = 'overview';
let vendorData = null;
let vehicles = [];
let jobs = [];
let statusCheckInterval = null;
let currentJobFilter = 'all'; // 'all', 'active', 'completed'

// ==================================================
// UTILITIES
// ==================================================

function parseAmount(value) {
	if (value === null || value === undefined) return 0;
	if (typeof value === 'number') return value;
	const cleaned = String(value).replace(/[^0-9.-]/g, '');
	const num = parseFloat(cleaned);
	return isNaN(num) ? 0 : num;
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

// ==================================================
// AUTHENTICATION
// ==================================================

function checkAuth() {
	const user = safeParse(localStorage.getItem('meroGharUser'), {});
	if (!user.loggedIn || user.role !== 'vendor') {
		window.location.href = '/src/pages/login.html';
		return null;
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
	const user = safeParse(localStorage.getItem('meroGharUser'), {});
	const headers = {
		'Content-Type': 'application/json',
		...options.headers,
	};
	if (user.id) {
		headers['X-User-Id'] = user.id.toString();
	}
	try {
		const response = await fetch(`${BASEURL}${url}`, {
			...options,
			headers,
		});
		const data = await response.json();
		return { ok: response.ok, ...data };
	} catch (error) {
		console.error('FetchAPI Error:', error);
		return { ok: false, message: error.message };
	}
}

// ==================================================
// VENDOR PROFILE MANAGEMENT
// ==================================================

async function checkVendorProfile() {
	const user = safeParse(localStorage.getItem('meroGharUser'), {});
	if (!user.id) {
		window.location.href = '/src/pages/login.html';
		return;
	}
	const result = await fetchAPI('/api/vendor/profile');
	if (result.ok && result.vendor) {
		vendorData = result.vendor;
		if (vendorData.status === 'active') {
			showApprovedDashboard();
			await loadFleet();
			await loadJobs();
			updateStats();
			goPage('overview');
			if (statusCheckInterval) clearInterval(statusCheckInterval);
		} else if (vendorData.status === 'pending') {
			showPendingState();
			startStatusCheck();
		} else if (vendorData.status === 'inactive') {
			showInactiveState();
		} else if (vendorData.status === 'banned') {
			showBannedState();
		}
	} else {
		showRegistrationForm();
	}
}

function showRegistrationForm() {
	const el1 = document.getElementById('vendor-reg-form');
	const el2 = document.getElementById('vendor-pending-state');
	const el3 = document.getElementById('dashboard-content');
	const el4 = document.getElementById('vendor-profile-card');
	if (el1) el1.style.display = 'block';
	if (el2) el2.style.display = 'none';
	if (el3) el3.style.display = 'none';
	if (el4) el4.style.display = 'none';
}

function showPendingState() {
	const el1 = document.getElementById('vendor-reg-form');
	const el2 = document.getElementById('vendor-pending-state');
	const el3 = document.getElementById('dashboard-content');
	const el4 = document.getElementById('vendor-profile-card');
	if (el1) el1.style.display = 'none';
	if (el2) el2.style.display = 'block';
	if (el3) el3.style.display = 'none';
	if (el4) el4.style.display = 'none';
	const pendingEl = document.getElementById('vendor-pending-state');
	if (pendingEl) {
		pendingEl.innerHTML = `
            <div class="max-w-2xl mx-auto bg-[#111d16] border border-[rgba(248,192,106,0.18)] rounded-xl overflow-hidden">
                <div class="bg-[#16261d] px-6 py-4 border-b border-[rgba(255,255,255,0.07)]">
                    <h2 class="text-lg font-bold">Registration Under Review</h2>
                    <p class="text-xs text-[rgba(238,242,238,0.5)] mt-1">Your profile is pending admin approval</p>
                </div>
                <div class="p-10 text-center">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-[rgba(248,192,106,0.1)] flex items-center justify-center">
                        <svg class="w-8 h-8 text-[#f8c06a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </div>
                    <div class="font-semibold text-lg mb-1">Awaiting Admin Approval</div>
                    <p class="text-sm text-[rgba(238,242,238,0.5)] max-w-sm mx-auto">
                        Your vendor registration has been submitted. Our admin team will review and activate your account.
                    </p>
                    <button onclick="checkStatusManually()" class="mt-6 px-5 py-2 rounded-lg bg-[rgba(248,192,106,0.1)] border border-[rgba(248,192,106,0.2)] text-[#f8c06a] text-sm hover:bg-[rgba(248,192,106,0.15)]">
                        Check Status
                    </button>
                </div>
            </div>
        `;
	}
}

function showInactiveState() {
	const el1 = document.getElementById('vendor-reg-form');
	const el2 = document.getElementById('vendor-pending-state');
	const el3 = document.getElementById('dashboard-content');
	const el4 = document.getElementById('vendor-profile-card');
	if (el1) el1.style.display = 'none';
	if (el2) el2.style.display = 'block';
	if (el3) el3.style.display = 'none';
	if (el4) el4.style.display = 'none';
	const pendingEl = document.getElementById('vendor-pending-state');
	if (pendingEl) {
		pendingEl.innerHTML = `
            <div class="max-w-2xl mx-auto bg-[#111d16] border border-[rgba(224,94,94,0.3)] rounded-xl overflow-hidden">
                <div class="bg-[#16261d] px-6 py-4 border-b border-[rgba(255,255,255,0.07)]">
                    <h2 class="text-lg font-bold text-[#e05e5e]">Account Suspended</h2>
                    <p class="text-xs text-[rgba(238,242,238,0.5)] mt-1">Your vendor account is currently inactive</p>
                </div>
                <div class="p-10 text-center">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-[rgba(224,94,94,0.1)] flex items-center justify-center">
                        <svg class="w-8 h-8 text-[#e05e5e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                    </div>
                    <div class="font-semibold text-lg mb-1">Account Suspended</div>
                    <p class="text-sm text-[rgba(238,242,238,0.5)] max-w-sm mx-auto">
                        Your account has been suspended by the admin. Please contact support for more information.
                    </p>
                </div>
            </div>
        `;
	}
}

function showBannedState() {
	const el1 = document.getElementById('vendor-reg-form');
	const el2 = document.getElementById('vendor-pending-state');
	const el3 = document.getElementById('dashboard-content');
	const el4 = document.getElementById('vendor-profile-card');
	if (el1) el1.style.display = 'none';
	if (el2) el2.style.display = 'block';
	if (el3) el3.style.display = 'none';
	if (el4) el4.style.display = 'none';
	const pendingEl = document.getElementById('vendor-pending-state');
	if (pendingEl) {
		pendingEl.innerHTML = `
            <div class="max-w-2xl mx-auto bg-[#111d16] border border-[rgba(224,94,94,0.5)] rounded-xl overflow-hidden">
                <div class="bg-[#16261d] px-6 py-4 border-b border-[rgba(255,255,255,0.07)]">
                    <h2 class="text-lg font-bold text-[#e05e5e]">Account Banned</h2>
                    <p class="text-xs text-[rgba(238,242,238,0.5)] mt-1">Your vendor account has been permanently banned</p>
                </div>
                <div class="p-10 text-center">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-[rgba(224,94,94,0.15)] flex items-center justify-center">
                        <svg class="w-8 h-8 text-[#e05e5e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </div>
                    <div class="font-semibold text-lg mb-1">Permanently Banned</div>
                    <p class="text-sm text-[rgba(238,242,238,0.5)] max-w-sm mx-auto">
                        Your account has been banned for violating terms. This action is irreversible.
                    </p>
                </div>
            </div>
        `;
	}
}

function showApprovedDashboard() {
	const el1 = document.getElementById('vendor-reg-form');
	const el2 = document.getElementById('vendor-pending-state');
	const el3 = document.getElementById('dashboard-content');
	const el4 = document.getElementById('vendor-profile-card');
	if (el1) el1.style.display = 'none';
	if (el2) el2.style.display = 'none';
	if (el3) el3.style.display = 'block';
	if (el4) el4.style.display = 'block';

	const nameEl = document.getElementById('vendor-name-display');
	if (nameEl) nameEl.textContent =
		vendorData.business_name || vendorData.name;
	const regionEl = document.getElementById('vendor-region-display');
	if (regionEl) regionEl.textContent =
		vendorData.service_region || 'Kathmandu Valley';
	const initials = (vendorData.business_name || vendorData.name)
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);
	const avatarEl = document.getElementById('vendor-avatar');
	if (avatarEl) avatarEl.textContent = initials;
	const ratingEl = document.getElementById('vendor-rating');
	if (ratingEl) ratingEl.textContent =
		(vendorData.rating || 0) + '★';
	const fleetEl = document.getElementById('vendor-fleet');
	if (fleetEl) fleetEl.textContent = vehicles.length;
	const jobsEl = document.getElementById('vendor-jobs');
	if (jobsEl) jobsEl.textContent =
		vendorData.total_jobs || 0;
}

function startStatusCheck() {
	if (statusCheckInterval) clearInterval(statusCheckInterval);
	statusCheckInterval = setInterval(async () => {
		const result = await fetchAPI('/api/vendor/profile');
		if (result.ok && result.vendor && result.vendor.status === 'active') {
			clearInterval(statusCheckInterval);
			toast(
				'Your vendor account has been approved! Refreshing...',
				'green',
			);
			setTimeout(() => location.reload(), 2000);
		}
	}, 30000);
}

async function checkStatusManually() {
	toast('Checking status...', 'gold');
	const result = await fetchAPI('/api/vendor/profile');
	if (result.ok && result.vendor && result.vendor.status === 'active') {
		toast('Your account has been approved! Refreshing...', 'green');
		setTimeout(() => location.reload(), 1500);
	} else {
		toast('Still pending approval', 'blue');
	}
}

async function submitVendorRegistration() {
	const user = safeParse(localStorage.getItem('meroGharUser'), {});
	const business_name = document
		.getElementById('vendor-business-name')
		?.value.trim();
	const owner_name = document
		.getElementById('vendor-owner-name')
		?.value.trim();
	const phone = document.getElementById('vendor-phone')?.value.trim();
	const service_region = document.getElementById(
		'vendor-service-region',
	)?.value;
	const address = document.getElementById('vendor-address')?.value.trim();

	if (!business_name || !owner_name || !phone || !service_region) {
		toast('Please fill all required fields', 'red');
		return;
	}

	const result = await fetchAPI('/api/vendor/register', {
		method: 'POST',
		body: JSON.stringify({
			user_id: user.id,
			business_name,
			owner_name,
			phone,
			email: user.email,
			service_region,
			address,
		}),
	});

	if (result.ok) {
		toast('Vendor registration submitted for admin approval!', 'green');
		setTimeout(() => location.reload(), 2000);
	} else {
		toast(result.message || 'Registration failed', 'red');
	}
}

async function updateVendorProfile() {
	const business_name = document
		.getElementById('profile-business-name')
		?.value.trim();
	const owner_name = document
		.getElementById('profile-owner-name')
		?.value.trim();
	const phone = document.getElementById('profile-phone')?.value.trim();
	const service_region = document
		.getElementById('profile-region')
		?.value.trim();
	const address = document.getElementById('profile-address')?.value.trim();

	const result = await fetchAPI('/api/vendor/profile', {
		method: 'PUT',
		body: JSON.stringify({
			business_name,
			owner_name,
			phone,
			service_region,
			address,
		}),
	});

	if (result.ok) {
		toast('Profile updated successfully!', 'green');
		await checkVendorProfile();
	} else {
		toast('Failed to update profile', 'red');
	}
}

// ==================================================
// FLEET MANAGEMENT
// ==================================================

function openAddVehicle() {
	document.getElementById('modal-add-vehicle')?.classList.remove('hidden');
}

function closeModal(id) {
	document.getElementById(id)?.classList.add('hidden');
}

async function addVehicle() {
	const name = document.getElementById('vehicle-name')?.value.trim();
	const plate = document.getElementById('vehicle-plate')?.value.trim();
	const vehicle_type = document.getElementById('vehicle-type')?.value;
	const driver_name = document.getElementById('vehicle-driver')?.value.trim();
	const driver_phone = document.getElementById('vehicle-driver-phone')?.value.trim();
	const capacity_tonnes = document.getElementById('vehicle-capacity')?.value.trim();

	if (!name || !plate || !driver_name) {
		toast('Please fill required fields', 'red');
		return;
	}

	const result = await fetchAPI('/api/vendor/vehicles', {
		method: 'POST',
		body: JSON.stringify({ name, plate_number: plate, vehicle_type, capacity_tonnes, driver_name, driver_phone }),
	});

	if (result.ok) {
		await loadFleet();
		toast(`${name} added to fleet`, 'green');
	} else {
		toast(result.message || 'Failed to add vehicle', 'red');
	}

	closeModal('modal-add-vehicle');
	[
		'vehicle-name', 'vehicle-plate', 'vehicle-type',
		'vehicle-capacity', 'vehicle-driver', 'vehicle-driver-phone',
	].forEach((id) => {
		const el = document.getElementById(id);
		if (el) el.value = '';
	});
}

async function removeVehicle(vehicleId) {
	if (confirm('Remove this vehicle?')) {
		const result = await fetchAPI(`/api/vendor/vehicles/${vehicleId}`, { method: 'DELETE' });
		if (result.ok) {
			await loadFleet();
			toast('Vehicle removed from fleet', 'red');
		} else {
			toast(result.message || 'Failed to remove vehicle', 'red');
		}
	}
}

async function updateVehicleStatus(vehicleId, status) {
	const result = await fetchAPI(`/api/vendor/vehicles/${vehicleId}/status`, {
		method: 'PUT',
		body: JSON.stringify({ status }),
	});
	if (result.ok) {
		await loadFleet();
		toast('Vehicle status updated', 'gold');
	} else {
		toast('Failed to update status', 'red');
	}
}

async function loadFleet() {
	const result = await fetchAPI('/api/vendor/vehicles');
	if (result.ok && result.vehicles) {
		vehicles = result.vehicles.map(v => ({
			id: v.id,
			name: v.name || v.vehicle_name,
			plate: v.plate_number,
			type: v.vehicle_type,
			driver: v.driver_name,
			status: v.status === 'available' ? 'Available' : v.status,
			lastJob: '—',
		}));
	} else {
		vehicles = [];
	}
	renderFleet();
	renderFleetList();
	updateStats();
}

function renderFleet() {
	const container = document.getElementById('fleet-grid');
	if (!container) return;
	if (vehicles.length === 0) {
		container.innerHTML =
			'<div class="col-span-2 text-center py-8 text-[rgba(238,242,238,0.5)]">No vehicles</div>';
		return;
	}
	container.innerHTML = vehicles
		.map(
			(v) => `
        <div class="bg-[#16261d] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden">
            <div class="p-4 border-b border-[rgba(255,255,255,0.07)] flex justify-between items-start">
                <div><div class="font-semibold">${escapeHtml(v.name)}</div><div class="text-xs font-mono text-[#f8c06a]">${escapeHtml(v.plate)}</div></div>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-mono ${v.status === 'Available' ? 'bg-[rgba(76,175,125,0.15)] text-[#4caf7d]' : 'bg-[rgba(248,192,106,0.15)] text-[#f8c06a]'}">${escapeHtml(v.status)}</span>
            </div>
            <div class="p-4 space-y-2">
                <div class="flex justify-between text-sm"><span class="text-[rgba(238,242,238,0.5)]">Type:</span><span>${escapeHtml(v.type)}</span></div>
                <div class="flex justify-between text-sm"><span class="text-[rgba(238,242,238,0.5)]">Driver:</span><span>${escapeHtml(v.driver)}</span></div>
            </div>
            <div class="p-4 border-t border-[rgba(255,255,255,0.07)] flex gap-2">
                <select onchange="updateVehicleStatus(${v.id}, this.value)" class="flex-1 bg-[#1d3327] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-1.5 text-xs">
                    <option value="Available" ${v.status === 'Available' ? 'selected' : ''}>Available</option>
                    <option value="On Route" ${v.status === 'On Route' ? 'selected' : ''}>On Route</option>
                    <option value="Maintenance" ${v.status === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
                </select>
                <button onclick="removeVehicle(${v.id})" class="bg-[rgba(224,94,94,0.15)] text-[#e05e5e] px-3 py-1.5 rounded-lg text-xs">Remove</button>
            </div>
        </div>
    `,
		)
		.join('');
}

function renderFleetList() {
	const container = document.getElementById('fleet-list');
	if (!container) return;
	if (vehicles.length === 0) {
		container.innerHTML =
			'<div class="p-4 text-center text-[rgba(238,242,238,0.5)]">No vehicles in fleet</div>';
		return;
	}
	container.innerHTML = `<div class="overflow-x-auto"><table class="w-full"><thead class="border-b border-[rgba(255,255,255,0.07)]"><tr class="text-left text-[10px] font-mono text-[rgba(238,242,238,0.28)] uppercase"><th class="px-5 py-3">Vehicle</th><th class="px-5 py-3">Plate</th><th class="px-5 py-3">Type</th><th class="px-5 py-3">Driver</th><th class="px-5 py-3">Status</th></tr></thead><tbody>${vehicles.map((v) => `<tr class="border-b border-[rgba(255,255,255,0.05)]"><td class="px-5 py-3 font-medium">${escapeHtml(v.name)}</td><td class="px-5 py-3 font-mono text-xs">${escapeHtml(v.plate)}</td><td class="px-5 py-3">${escapeHtml(v.type)}</td><td class="px-5 py-3">${escapeHtml(v.driver)}</td><td class="px-5 py-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-mono ${v.status === 'Available' ? 'bg-[rgba(76,175,125,0.15)] text-[#4caf7d]' : 'bg-[rgba(248,192,106,0.15)] text-[#f8c06a]'}">${escapeHtml(v.status)}</span></td></tr>`).join('')}</tbody></table></div>`;
}

// ==================================================
// JOBS MANAGEMENT
// ==================================================

async function loadJobs() {
	const result = await fetchAPI('/api/vendor/shipments');
	if (result.ok && result.shipments) {
		jobs = result.shipments
			.map((job) => ({
				...job,
				final_quote: parseAmount(job.final_quote),
			}))
			.sort((a, b) => b.id - a.id);
		renderJobsTable();
		renderNewJobsList();
		renderRecentCompletions();
		updateStats();
	}
}

function renderJobsTable() {
	const tbody = document.getElementById('jobs-tbody');
	if (!tbody) return;

	let filtered = [...jobs];
	if (currentJobFilter === 'active') {
		filtered = jobs.filter((j) =>
			['pending', 'accepted', 'in_transit'].includes(j.status),
		);
	} else if (currentJobFilter === 'completed') {
		filtered = jobs.filter((j) =>
			['delivered', 'completed'].includes(j.status),
		);
	}

	if (filtered.length === 0) {
		tbody.innerHTML =
			'<tr><td colspan="7" class="empty">No jobs found</td></tr>';
		return;
	}

	tbody.innerHTML = filtered
		.map((job) => {
			let statusClass = '';
			let statusText = job.status || 'pending';
			switch (statusText) {
				case 'pending':
					statusClass = 'pill pNw';
					statusText = 'Pending';
					break;
				case 'accepted':
					statusClass = 'pill pAv';
					statusText = 'Accepted';
					break;
				case 'in_transit':
					statusClass = 'pill pOn';
					statusText = 'In Transit';
					break;
				case 'delivered':
				case 'completed':
					statusClass = 'pill pCo';
					statusText = 'Completed';
					break;
				default:
					statusClass = 'pill pMt';
			}

			let actionButtons = '';
			if (job.status === 'pending') {
				actionButtons = `<button onclick="acceptJob(${job.id})" class="btn-g text-xs py-1 px-2">Accept</button>
                             <button onclick="declineJob(${job.id})" class="btn-r text-xs py-1 px-2">Decline</button>`;
			} else if (job.status === 'accepted') {
				actionButtons = `<button onclick="startDelivery(${job.id})" class="btn btn-sm">Start</button>`;
			} else if (job.status === 'in_transit') {
				actionButtons = `<button onclick="completeDelivery(${job.id})" class="btn-g btn-sm">Complete</button>`;
			} else {
				actionButtons = `<span class="text-[rgba(238,242,238,0.4)] text-xs">—</span>`;
			}

			const moveDateSimple = job.move_date
				? job.move_date.split('T')[0]
				: '—';

			return `<tr class="border-b border-[rgba(255,255,255,0.05)]">
            <td class="px-5 py-3 font-mono text-xs">${escapeHtml(job.booking_id || `#MG-${job.id}`)}</td>
            <td class="px-5 py-3">${escapeHtml(job.customer_name || '—')}</td>
            <td class="px-5 py-3">${escapeHtml(job.pickup_district || '')} → ${escapeHtml(job.drop_district || '')}</td>
            <td class="px-5 py-3">${moveDateSimple}</td>
            <td class="px-5 py-3">Rs ${(job.final_quote || 0).toLocaleString()}</td>
            <td class="px-5 py-3"><span class="${statusClass}">${statusText}</span></td>
            <td class="px-5 py-3"><div class="flex gap-2">${actionButtons}</div></td>
        </tr>`;
		})
		.join('');
}

function setupJobFilters() {
	const filterContainer = document.getElementById('job-status-filter');
	if (!filterContainer) return;
	filterContainer.querySelectorAll('.chip').forEach((chip) => {
		chip.addEventListener('click', () => {
			filterContainer
				.querySelectorAll('.chip')
				.forEach((c) => c.classList.remove('on'));
			chip.classList.add('on');
			currentJobFilter = chip.dataset.filter;
			renderJobsTable();
		});
	});
}

async function acceptJob(jobId) {
	const result = await fetchAPI(`/api/vendor/shipments/${jobId}/accept`, {
		method: 'PUT',
	});
	if (result.ok) {
		toast('Job accepted!', 'green');
		await loadJobs();
	} else {
		toast('Failed to accept job', 'red');
	}
}

async function declineJob(jobId) {
	if (confirm('Decline this job? It will be returned to the admin pool.')) {
		const result = await fetchAPI(`/api/vendor/shipments/${jobId}/reject`, {
			method: 'PUT',
		});
		if (result.ok) {
			toast('Job declined', 'red');
			await loadJobs();
		} else {
			toast(result.message || 'Failed to decline job', 'red');
		}
	}
}

async function startDelivery(jobId) {
	const result = await fetchAPI(`/api/vendor/shipments/${jobId}/start`, {
		method: 'PUT',
	});
	if (result.ok) {
		toast('Delivery started!', 'gold');
		await loadJobs();
	} else {
		toast('Failed to start delivery', 'red');
	}
}

async function completeDelivery(jobId) {
	const result = await fetchAPI(`/api/vendor/shipments/${jobId}/complete`, {
		method: 'PUT',
	});
	if (result.ok) {
		toast('Delivery completed!', 'green');
		await loadJobs();
		if (vendorData) {
			vendorData.total_jobs++;
			document.getElementById('vendor-jobs').textContent =
				vendorData.total_jobs;
		}
	} else {
		toast('Failed to complete delivery', 'red');
	}
}

function renderNewJobsList() {
	const container = document.getElementById('new-jobs-list');
	if (!container) return;
	const newJobs = jobs.filter((j) => j.status === 'pending');
	const badge = document.getElementById('new-jobs-badge');
	const jobBadge = document.getElementById('job-badge');
	if (badge) {
		if (newJobs.length > 0) {
			badge.classList.remove('hidden');
			badge.textContent = `${newJobs.length} new`;
			if (jobBadge) {
				jobBadge.classList.remove('hidden');
				jobBadge.textContent = newJobs.length;
			}
		} else {
			badge.classList.add('hidden');
			if (jobBadge) jobBadge.classList.add('hidden');
		}
	}
	if (newJobs.length === 0) {
		container.innerHTML =
			'<div class="p-5 text-center text-[rgba(238,242,238,0.5)]">No new job requests</div>';
		return;
	}
	container.innerHTML = newJobs
		.map((job) => {
			const moveDateSimple = job.move_date
				? job.move_date.split('T')[0]
				: '—';
			return `
        <div class="p-4 hover:bg-[rgba(248,192,106,0.05)]">
            <div class="flex justify-between items-start">
                <div>
                    <div class="font-medium text-sm">${escapeHtml(job.pickup_district)} → ${escapeHtml(job.drop_district)}</div>
                    <div class="text-xs text-[rgba(238,242,238,0.5)] mt-1">${escapeHtml(job.customer_name)} · ${moveDateSimple}</div>
                </div>
                <div class="text-right">
                    <div class="text-[#f8c06a] font-semibold">Rs ${(job.final_quote || 0).toLocaleString()}</div>
                    <button onclick="acceptJob(${job.id})" class="mt-2 bg-[rgba(76,175,125,0.15)] text-[#4caf7d] px-3 py-1 rounded-lg text-xs">Accept</button>
                </div>
            </div>
        </div>
    `;
		})
		.join('');
}

function renderRecentCompletions() {
	const container = document.getElementById('recent-completions');
	if (!container) return;
	const completedJobs = jobs
		.filter((j) => j.status === 'delivered' || j.status === 'completed')
		.slice(0, 5);
	if (completedJobs.length === 0) {
		container.innerHTML =
			'<div class="p-4 text-center text-[rgba(238,242,238,0.5)]">No completed jobs</div>';
		return;
	}
	container.innerHTML = `<div class="overflow-x-auto"><table class="w-full"><thead class="border-b border-[rgba(255,255,255,0.07)]"><tr class="text-left text-[10px] font-mono text-[rgba(238,242,238,0.28)] uppercase"><th class="px-5 py-3">Job ID</th><th class="px-5 py-3">Route</th><th class="px-5 py-3">Earned</th><th class="px-5 py-3">Date</th></tr></thead><tbody>${completedJobs
		.map((job) => {
			const moveDateSimple = job.move_date
				? job.move_date.split('T')[0]
				: '—';
			return `<tr class="border-b border-[rgba(255,255,255,0.05)]"><td class="px-5 py-3 text-sm font-mono">${escapeHtml(job.booking_id)}</td><td class="px-5 py-3 text-sm">${escapeHtml(job.pickup_district)} → ${escapeHtml(job.drop_district)}</td><td class="px-5 py-3 text-sm text-[#4caf7d]">+Rs ${(job.final_quote || 0).toLocaleString()}</td><td class="px-5 py-3 text-sm">${moveDateSimple}</td></tr>`;
		})
		.join('')}</tbody></table></div>`;
}

// ==================================================
// STATS & EARNINGS
// ==================================================

function updateStats() {
	const activeJobs = jobs.filter(
		(j) => j.status === 'accepted' || j.status === 'in_transit',
	).length;
	const completedJobs = jobs.filter(
		(j) => j.status === 'delivered' || j.status === 'completed',
	);
	const totalEarned = completedJobs.reduce(
		(sum, j) => sum + parseAmount(j.final_quote),
		0,
	);

	const now = new Date();
	const currentMonth = now.getMonth();
	const currentYear = now.getFullYear();
	const thisMonthCompleted = completedJobs.filter((j) => {
		if (!j.move_date) return false;
		const d = new Date(j.move_date);
		return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
	});
	const monthEarnings = thisMonthCompleted.reduce(
		(sum, j) => sum + parseAmount(j.final_quote),
		0,
	);

	const pendingJobs = jobs.filter(
		(j) => j.status === 'pending' || j.status === 'accepted',
	);
	const pendingPayout = pendingJobs.reduce(
		(sum, j) => sum + parseAmount(j.final_quote),
		0,
	);

	const setText = (id, value) => {
		const el = document.getElementById(id);
		if (el) el.textContent = value;
	};

	setText('active-jobs', activeJobs);
	setText('fleet-size', vehicles.length);
	setText('vendor-fleet', vehicles.length);
	setText('vendor-jobs', vendorData?.total_jobs || completedJobs.length);
	setText('month-earning', `Rs ${monthEarnings.toLocaleString()}`);
	setText('earn-month', `Rs ${monthEarnings.toLocaleString()}`);
	setText('earn-pending', `Rs ${pendingPayout.toLocaleString()}`);
	setText('earn-total', `Rs ${totalEarned.toLocaleString()}`);
	setText('earn-jobs', completedJobs.length);
	setText('vendor-rating', (vendorData?.rating || 0) + '★');
	setText('vendor-rating-val', (vendorData?.rating || 0).toFixed(1));
}

// ==================================================
// UI HELPERS & NAVIGATION
// ==================================================

function goPage(page) {
	currentPage = page;
	const pages = [
		'overview',
		'jobs',
		'fleet',
		'earnings',
		'profile',
		'support',
	];
	pages.forEach((p) => {
		const el = document.getElementById(`page-${p}`);
		if (el) el.style.display = 'none';
	});
	const selectedPage = document.getElementById(`page-${page}`);
	if (selectedPage) selectedPage.style.display = 'block';
	document.querySelectorAll('.nav-link').forEach((link) => {
		link.classList.remove('bg-[rgba(248,192,106,0.1)]', 'text-[#f8c06a]');
		if (link.getAttribute('data-page') === page)
			link.classList.add('bg-[rgba(248,192,106,0.1)]', 'text-[#f8c06a]');
	});
	const titles = {
		overview: 'Overview',
		jobs: 'Assigned Jobs',
		fleet: 'My Fleet',
		earnings: 'Earnings',
		profile: 'Profile & Docs',
		support: 'Help & Support',
	};
	const pageTitleEl = document.getElementById('page-title');
	if (pageTitleEl) pageTitleEl.textContent = titles[page] || page;
	if (page === 'profile' && vendorData) {
		const pb = document.getElementById('profile-business-name');
		const po = document.getElementById('profile-owner-name');
		const pp = document.getElementById('profile-phone');
		const pr = document.getElementById('profile-region');
		const pa = document.getElementById('profile-address');
		if (pb) pb.value = vendorData.business_name || '';
		if (po) po.value = vendorData.owner_name || '';
		if (pp) pp.value = vendorData.phone || '';
		if (pr) pr.value = vendorData.service_region || '';
		if (pa) pa.value = vendorData.address || '';
	}
	if (page === 'jobs') renderJobsTable();
	if (page === 'earnings') updateStats();
}

function showNotifications() {
	const pendingJobs = jobs.filter((j) => j.status === 'pending').length;
	if (pendingJobs > 0) {
		toast(`You have ${pendingJobs} new job requests!`, 'gold');
		goPage('jobs');
	} else {
		toast('No new notifications', 'blue');
	}
}

function toggleOnline() {
	const statusSpan = document.getElementById('online-status');
	const dotSpan = document.getElementById('online-dot');
	const toggleBtn = document.getElementById('online-toggle-btn');
	const toggleKnob = document.getElementById('online-toggle-knob');
	if (!statusSpan) return;
	const isOnline = statusSpan.textContent === 'Online & Available';
	if (isOnline) {
		statusSpan.textContent = 'Offline';
		if (dotSpan) dotSpan.style.backgroundColor = '#9ca3af';
		if (toggleBtn) toggleBtn.style.backgroundColor = '#6b7280';
		if (toggleKnob) { toggleKnob.style.left = '3px'; toggleKnob.style.right = 'auto'; }
		toast('You are now offline', 'red');
	} else {
		statusSpan.textContent = 'Online & Available';
		if (dotSpan) dotSpan.style.backgroundColor = '#4caf7d';
		if (toggleBtn) toggleBtn.style.backgroundColor = '#2d5a3d';
		if (toggleKnob) { toggleKnob.style.left = 'auto'; toggleKnob.style.right = '3px'; }
		toast('You are now online', 'green');
	}
}

function initializeToggleState() {
	const statusSpan = document.getElementById('online-status');
	const dotSpan = document.getElementById('online-dot');
	const toggleBtn = document.getElementById('online-toggle-btn');
	const toggleKnob = document.getElementById('online-toggle-knob');
	if (!statusSpan) return;
	const isOnline = statusSpan.textContent === 'Online & Available';
	if (isOnline) {
		if (dotSpan) dotSpan.style.backgroundColor = '#4caf7d';
		if (toggleBtn) toggleBtn.style.backgroundColor = '#2d5a3d';
		if (toggleKnob) toggleKnob.style.transform = 'translateX(16px)';
	} else {
		if (dotSpan) dotSpan.style.backgroundColor = '#9ca3af';
		if (toggleBtn) toggleBtn.style.backgroundColor = '#6b7280';
		if (toggleKnob) toggleKnob.style.transform = 'translateX(0px)';
	}
}

function submitSupportTicket() {
	const subject = document.getElementById('support-subject')?.value;
	const message = document.getElementById('support-message')?.value;
	if (!subject || !message) {
		toast('Please fill subject and message', 'red');
		return;
	}
	toast('Ticket submitted!', 'green');
	const subEl = document.getElementById('support-subject');
	const msgEl = document.getElementById('support-message');
	if (subEl) subEl.value = '';
	if (msgEl) msgEl.value = '';
}

function toast(msg, color = 'gold') {
	const colors = {
		gold: '#f8c06a',
		green: '#4caf7d',
		red: '#e05e5e',
		blue: '#5e9fe0',
	};
	const container = document.getElementById('toast-container');
	if (!container) return;
	const el = document.createElement('div');
	el.className =
		'bg-[#16261d] border border-[rgba(248,192,106,0.3)] rounded-lg px-4 py-3 text-sm flex items-center gap-2 mb-2';
	var dot = document.createElement('span');
	dot.className = 'w-1.5 h-1.5 rounded-full';
	dot.style.background = colors[color] || colors.gold;
	el.appendChild(dot);
	el.appendChild(document.createTextNode(msg));
	container.appendChild(el);
	setTimeout(() => {
		el.style.opacity = '0';
		el.style.transform = 'translateX(10px)';
		setTimeout(() => el.remove(), 200);
	}, 2800);
}

// ==================================================
// INITIALIZATION
// ==================================================

document.addEventListener('DOMContentLoaded', async () => {
	const user = checkAuth();
	if (!user) return;
	await checkVendorProfile();
	initializeToggleState();
	setupJobFilters();
});

// Expose global functions
window.goPage = goPage;
window.logout = logout;
window.openAddVehicle = openAddVehicle;
window.closeModal = closeModal;
window.addVehicle = addVehicle;
window.removeVehicle = removeVehicle;
window.updateVehicleStatus = updateVehicleStatus;
window.acceptJob = acceptJob;
window.declineJob = declineJob;
window.startDelivery = startDelivery;
window.completeDelivery = completeDelivery;
window.showNotifications = showNotifications;
window.toggleOnline = toggleOnline;
window.submitVendorRegistration = submitVendorRegistration;
window.updateVendorProfile = updateVendorProfile;
window.submitSupportTicket = submitSupportTicket;
window.checkStatusManually = checkStatusManually;
