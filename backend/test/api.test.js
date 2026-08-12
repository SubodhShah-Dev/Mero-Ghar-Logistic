import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp, rm } from 'node:fs/promises';
import net from 'node:net';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(__dirname, '..');

let child;
let baseUrl;
let tmpDir;
let adminToken;
let vendorToken;
let customerToken;
let customerEmail;

const freePort = () =>
	new Promise((resolve, reject) => {
		const srv = net.createServer();
		srv.listen(0, () => {
			const { port } = srv.address();
			srv.close(() => resolve(port));
		});
		srv.on('error', reject);
	});

const waitForServer = async (url, tries = 50) => {
	for (let i = 0; i < tries; i++) {
		try {
			const res = await fetch(url);
			if (res.ok) return;
		} catch {}
		await new Promise((r) => setTimeout(r, 200));
	}
	throw new Error('Backend did not start in time');
};

const req = async (method, route, body, token) => {
	const res = await fetch(baseUrl + route, {
		method,
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	let json = null;
	try {
		json = await res.json();
	} catch {}
	return { status: res.status, body: json };
};

before(async () => {
	tmpDir = await mkdtemp(path.join(os.tmpdir(), 'meroghar-test-'));
	const port = await freePort();
	baseUrl = `http://127.0.0.1:${port}`;

	child = spawn(process.execPath, ['server.js'], {
		cwd: BACKEND_DIR,
		env: {
			...process.env,
			PORT: String(port),
			DB_DRIVER: 'sqlite',
			DB_PATH: path.join(tmpDir, 'test.db'),
			NODE_ENV: 'test',
			SEED_DEMO_DATA: 'true',
		},
		stdio: 'ignore',
	});

	await waitForServer(baseUrl);

	// Sign in as the seeded demo accounts.
	const adminLogin = await req('POST', '/api/auth/login', {
		email: 'admin@test.com',
		password: 'adminpass123',
	});
	adminToken = adminLogin.body?.token;

	const vendorLogin = await req('POST', '/api/auth/login', {
		email: 'vendor@test.com',
		password: 'vendorpass123',
	});
	vendorToken = vendorLogin.body?.token;
});

after(async () => {
	if (child) child.kill('SIGKILL');
	await new Promise((r) => setTimeout(r, 300));
	if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
});

test('health check responds', async () => {
	const res = await fetch(baseUrl);
	assert.equal(res.status, 200);
});

test('admin and vendor demo accounts can log in', () => {
	assert.ok(adminToken, 'admin token issued');
	assert.ok(vendorToken, 'vendor token issued');
});

test('new customer can register and log in', async () => {
	customerEmail = `itest-${Date.now()}@test.com`;
	const reg = await req('POST', '/api/auth/register', {
		name: 'Integration Tester',
		email: customerEmail,
		password: 'secret1',
		role: 'user',
		phone: '9840000001',
	});
	assert.equal(reg.status, 201);
	assert.equal(reg.body?.success, true);

	const login = await req('POST', '/api/auth/login', { email: customerEmail, password: 'secret1' });
	assert.equal(login.status, 200);
	customerToken = login.body?.token;
	assert.ok(customerToken);
});

let shipment;
test('booking is created with payment required and a transaction id', async () => {
	const res = await req(
		'POST',
		'/api/shipment/create',
		{
			first_name: 'Integration',
			last_name: 'Tester',
			mobile_number: '9840000001',
			email: customerEmail,
			pickup_province: 'Bagmati',
			pickup_district: 'Kathmandu',
			pickup_city: 'Baluwatar',
			drop_province: 'Bagmati',
			drop_district: 'Lalitpur',
			drop_city: 'Patan',
			home_size: '2 BHK',
			selected_items: ['Furniture'],
			vehicle_type: 'Mini Truck',
			payment_method: 'esewa',
			move_date: '2026-09-15',
		},
		customerToken,
	);
	assert.equal(res.status, 201);
	assert.equal(res.body?.payment_required, true);
	assert.match(String(res.body?.transaction_id), /^TXN-/);
	assert.equal(res.body?.payment_data?.amount, 8000);
	shipment = res.body;
});

test('dummy payment marks booking paid but keeps status pending', async () => {
	const res = await req('POST', '/api/payment/dummy/process', {
		mobile: '9840000001',
		password: 'anything',
		amount: 8000,
		transaction_uuid: shipment.transaction_id,
		order_id: shipment.booking_id,
	});
	assert.equal(res.status, 200);
	assert.equal(res.body?.success, true);

	const detail = await req('GET', `/api/shipment/${shipment.shipment_id}`, undefined, customerToken);
	assert.equal(detail.body?.shipment?.payment_status, 'paid');
	assert.equal(detail.body?.shipment?.status, 'pending');
	assert.equal(detail.body?.shipment?.final_quote, 8000);
});

test('a stranger cannot view another customer booking (IDOR blocked)', async () => {
	const res = await req('GET', `/api/shipment/${shipment.shipment_id}`, undefined, vendorToken);
	assert.equal(res.status, 403);
});

test('guest email lookup returns trimmed fields without PII', async () => {
	const res = await req('GET', `/api/shipment/email/${encodeURIComponent(customerEmail)}`);
	assert.equal(res.status, 200);
	assert.equal(res.body?.shipments?.length, 1);
	const row = res.body.shipments[0];
	assert.equal(row.booking_id, shipment.booking_id);
	assert.equal('mobile_number' in row, false);
	assert.equal('first_name' in row, false);
	assert.equal('pickup_address' in row, false);
});

test('no admin approval is needed and admin assignment endpoints are gone', async () => {
	// The seed mover only owns a Cargo Tempo, so this Mini Truck booking stays
	// pending for the claim pool — and there is no admin route to assign it.
	const detail = await req('GET', `/api/shipment/${shipment.shipment_id}`, undefined, customerToken);
	assert.equal(detail.body?.shipment?.approval_status, 'pending');
	assert.equal(detail.body?.shipment?.assigned_vendor_id, null);

	const goneApprove = await req(
		'PUT',
		`/api/admin/shipments/${shipment.shipment_id}/approve`,
		{ vendor_id: 1 },
		adminToken,
	);
	assert.equal(goneApprove.status, 404, 'admin approve endpoint has been removed');

	const goneReject = await req(
		'PUT',
		`/api/admin/shipments/${shipment.shipment_id}/reject`,
		{},
		adminToken,
	);
	assert.equal(goneReject.status, 404, 'admin reject endpoint has been removed');
});

let lifecycleShipment;
test('vendor runs the full job lifecycle', async () => {
	const vendors = await req('GET', '/api/admin/vendors', undefined, adminToken);
	const active = vendors.body?.vendors?.find((v) => v.status === 'active');
	assert.ok(active, 'an active mover exists');

	// Choosing an active mover auto-approves and assigns the booking directly.
	lifecycleShipment = await createAndPayBooking({
		vehicle_type: 'Cargo Tempo',
		vendor_id: active.id,
	});
	const shipId = lifecycleShipment.shipment_id;
	const accept = await req('PUT', `/api/vendor/shipments/${shipId}/accept`, {}, vendorToken);
	assert.equal(accept.status, 200, 'accept succeeds');

	const start = await req('PUT', `/api/vendor/shipments/${shipId}/start`, {}, vendorToken);
	assert.equal(start.status, 200, 'start succeeds');

	const complete = await req('PUT', `/api/vendor/shipments/${shipId}/complete`, {}, vendorToken);
	assert.equal(complete.status, 200, 'complete succeeds');

	const detail = await req('GET', `/api/shipment/${shipId}`, undefined, customerToken);
	assert.equal(detail.body?.shipment?.status, 'delivered');
});

test('admin settings save with a flat key/value map and round-trip', async () => {
	const key = `k_${Date.now()}`;
	const save = await req('PUT', '/api/settings', { [key]: 'some-value' }, adminToken);
	assert.equal(save.status, 200);

	const read = await req('GET', '/api/settings');
	assert.equal(read.body?.settings?.[key], 'some-value');
});

test('support tickets can be submitted by a vendor and listed', async () => {
	const submit = await req(
		'POST',
		'/api/tickets/submit',
		{ subject: 'Issue with truck', message: 'Truck plate expired' },
		vendorToken,
	);
	assert.equal(submit.status, 200);
	assert.ok(submit.body?.ticket_id);

	const mine = await req('GET', '/api/tickets/mine', undefined, vendorToken);
	assert.ok(mine.body?.tickets?.some((t) => t.id === submit.body.ticket_id));
});

const bookingPayload = (extra = {}) => ({
	first_name: 'Integration',
	last_name: 'Tester',
	mobile_number: '9840000001',
	email: customerEmail,
	pickup_province: 'Bagmati Province',
	pickup_district: 'Kathmandu',
	pickup_city: 'Baluwatar',
	drop_province: 'Bagmati Province',
	drop_district: 'Lalitpur',
	drop_city: 'Patan',
	home_size: '2 BHK',
	selected_items: ['Furniture'],
	vehicle_type: 'Mini Truck',
	payment_method: 'esewa',
	move_date: '2026-09-20',
	...extra,
});

const createAndPayBooking = async (extra = {}) => {
	const res = await req('POST', '/api/shipment/create', bookingPayload(extra), customerToken);
	assert.equal(res.status, 201, 'booking created');
	const pay = await req('POST', '/api/payment/dummy/process', {
		mobile: '9840000001',
		password: 'anything',
		amount: res.body?.payment_data?.amount,
		transaction_uuid: res.body?.transaction_id,
		order_id: res.body?.booking_id,
	});
	assert.equal(pay.status, 200, 'booking paid');
	return res.body;
};

test('chatbot responds to a question and rejects empty messages', async () => {
	const ok = await req('POST', '/api/chatbot/message', { message: 'How much does it cost to move house?' });
	assert.equal(ok.status, 200);
	assert.equal(ok.body?.success, true);
	assert.ok(typeof ok.body?.response === 'string' && ok.body.response.length > 0);

	const empty = await req('POST', '/api/chatbot/message', { message: '   ' });
	assert.equal(empty.status, 400);
});

test('chatbot exposes a comprehensive grouped question list and answers fixed questions', async () => {
	const questions = await req('GET', '/api/chatbot/questions');
	assert.equal(questions.status, 200);
	assert.equal(questions.body?.success, true);
	assert.ok(questions.body?.categories?.length >= 5, 'multiple question categories are listed');
	for (const cat of questions.body.categories) {
		assert.ok(cat.name && cat.questions?.length > 0, 'each category has a name and questions');
		for (const q of cat.questions) {
			assert.ok(typeof q === 'string' && q.trim().length > 0, 'questions are non-empty strings');
		}
	}

	const answer = await req('POST', '/api/chatbot/message', { message: 'What is MeroGhar Logistics?' });
	assert.equal(answer.status, 200);
	assert.ok(typeof answer.body?.response === 'string' && answer.body.response.length > 0);
	// The canonical question gets its curated answer — it should mention MeroGhar.
	assert.match(answer.body.response, /MeroGhar/);
});

test('auth users listing is admin-only', async () => {
	const adminRes = await req('GET', '/api/auth/users', undefined, adminToken);
	assert.equal(adminRes.status, 200);
	assert.ok(adminRes.body?.users?.some((u) => u.email === 'admin@test.com'));

	const denied = await req('GET', '/api/auth/users', undefined, customerToken);
	assert.equal(denied.status, 403);
});

test('vendor can read and update their profile', async () => {
	const get = await req('GET', '/api/vendor/profile', undefined, vendorToken);
	assert.equal(get.status, 200);
	assert.equal(get.body?.vendor?.business_name, 'Himalayan Movers');

	const before = get.body.vendor;
	const put = await req(
		'PUT',
		'/api/vendor/profile',
		{
			business_name: before.business_name,
			owner_name: before.owner_name,
			phone: before.phone,
			service_region: 'Bagmati Province',
			address: before.address,
		},
		vendorToken,
	);
	assert.equal(put.status, 200);

	const after = await req('GET', '/api/vendor/profile', undefined, vendorToken);
	assert.equal(after.body?.vendor?.service_region, 'Bagmati Province');
});

let secondVendorToken;
test('a user can register as a vendor and duplicates are rejected', async () => {
	const email2 = `vendor2-${Date.now()}@test.com`;
	const reg = await req('POST', '/api/auth/register', {
		name: 'Second Mover',
		email: email2,
		password: 'secret1',
		role: 'vendor',
		phone: '9840000002',
	});
	assert.equal(reg.status, 201);

	const login = await req('POST', '/api/auth/login', { email: email2, password: 'secret1' });
	secondVendorToken = login.body?.token;
	assert.ok(secondVendorToken, 'second vendor can log in');

	const vreg = await req(
		'POST',
		'/api/vendor/register',
		{
			business_name: 'Bagmati Movers',
			owner_name: 'Hari Poudel',
			phone: '9840000002',
			email: email2,
			service_region: 'Lalitpur',
			address: 'Kupondole',
		},
		secondVendorToken,
	);
	assert.equal(vreg.status, 201);
	assert.equal(vreg.body?.vendor?.business_name, 'Bagmati Movers');
	assert.match(String(vreg.body?.message), /approval/i);
	const adminList = await req('GET', '/api/admin/vendors', undefined, adminToken);
	const pending = adminList.body?.vendors?.find((v) => v.business_name === 'Bagmati Movers');
	assert.equal(pending?.status, 'pending', 'new mover starts pending approval');

	const dup = await req(
		'POST',
		'/api/vendor/register',
		{ business_name: 'Again', owner_name: 'x', phone: '9840000002' },
		secondVendorToken,
	);
	assert.equal(dup.status, 400);
});

let miniTruckVehicleId;
test('vendor vehicle CRUD and status validation', async () => {
	const list = await req('GET', '/api/vendor/vehicles', undefined, vendorToken);
	assert.equal(list.status, 200);
	assert.ok(
		list.body?.vehicles?.some((v) => v.plate_number === 'BA 1 KA 1234'),
		'seeded vehicle is listed',
	);

	const add = await req(
		'POST',
		'/api/vendor/vehicles',
		{
			name: 'Mini Truck Unit',
			plate_number: 'BA 1 PA 9876',
			vehicle_type: 'Mini Truck',
			capacity_tonnes: 2,
			driver_name: 'K. Gurung',
			driver_phone: '9812345600',
		},
		vendorToken,
	);
	assert.equal(add.status, 201);
	miniTruckVehicleId = add.body?.vehicle?.id;
	assert.ok(miniTruckVehicleId, 'vehicle id returned');

	const flip = await req(
		'PUT',
		`/api/vendor/vehicles/${miniTruckVehicleId}/status`,
		{ status: 'maintenance' },
		vendorToken,
	);
	assert.equal(flip.status, 200);

	const after = await req('GET', '/api/vendor/vehicles', undefined, vendorToken);
	const veh = after.body?.vehicles?.find((v) => v.id === Number(miniTruckVehicleId));
	assert.equal(veh?.status, 'maintenance');

	const invalid = await req(
		'PUT',
		`/api/vendor/vehicles/${miniTruckVehicleId}/status`,
		{ status: 'flying' },
		vendorToken,
	);
	assert.equal(invalid.status, 400);

	const del = await req('DELETE', `/api/vendor/vehicles/${miniTruckVehicleId}`, undefined, vendorToken);
	assert.equal(del.status, 200);

	const gone = await req('GET', '/api/vendor/vehicles', undefined, vendorToken);
	assert.equal(
		gone.body?.vehicles?.some((v) => v.id === Number(miniTruckVehicleId)),
		false,
		'deleted vehicle is hidden from the fleet',
	);
});

test('vendor B cannot modify vendor A vehicle status (scoped)', async () => {
	const list = await req('GET', '/api/vendor/vehicles', undefined, vendorToken);
	const seedVehicle = list.body?.vehicles?.find((v) => v.plate_number === 'BA 1 KA 1234');
	assert.ok(seedVehicle, 'seed vehicle exists');

	const attempt = await req(
		'PUT',
		`/api/vendor/vehicles/${seedVehicle.id}/status`,
		{ status: 'maintenance' },
		secondVendorToken,
	);
	assert.equal(attempt.status, 404, 'a mover cannot touch another mover vehicle');
});

test('vendor matching is route-aware and returns only trimmed public fields', async () => {
	const covered = await req(
		'GET',
		`/api/vendor/matching?vehicle_type=${encodeURIComponent('Cargo Tempo')}` +
			`&pickup_province=${encodeURIComponent('Bagmati Province')}&pickup_district=Kathmandu` +
			`&drop_province=${encodeURIComponent('Bagmati Province')}&drop_district=Lalitpur`,
	);
	assert.equal(covered.status, 200);
	const vendors = covered.body?.vendors || [];
	assert.ok(
		vendors.some((v) => v.business_name === 'Himalayan Movers'),
		'mover matches its vehicle type on a route it covers',
	);
	for (const v of vendors) {
		assert.ok(!('phone' in v), 'match payload hides phone');
		assert.ok(!('email' in v), 'match payload hides email');
		assert.ok(!('plate_number' in v), 'match payload hides plate');
		assert.ok(!('driver_phone' in v), 'match payload hides driver phone');
	}

	const outside = await req(
		'GET',
		`/api/vendor/matching?vehicle_type=${encodeURIComponent('Cargo Tempo')}` +
			`&pickup_province=${encodeURIComponent('Sudurpashchim Province')}&pickup_district=Doti` +
			`&drop_province=${encodeURIComponent('Karnali Province')}&drop_district=Jumla`,
	);
	assert.equal(outside.body?.vendors?.length, 0, 'mover with routes does not appear on a route it does not cover');

	const none = await req(
		'GET',
		`/api/vendor/matching?vehicle_type=${encodeURIComponent('Mini Truck')}` +
			`&pickup_province=${encodeURIComponent('Bagmati Province')}&drop_province=${encodeURIComponent('Bagmati Province')}`,
	);
	assert.equal(none.body?.vendors?.length, 0, 'nobody offers a Mini Truck');

	const missing = await req('GET', '/api/vendor/matching');
	assert.equal(missing.status, 400);

	const noRoute = await req(
		'GET',
		`/api/vendor/matching?vehicle_type=${encodeURIComponent('Cargo Tempo')}`,
	);
	assert.equal(noRoute.status, 400, 'pickup_province and drop_province are required');
});

test('vendor route CRUD', async () => {
	const list = await req('GET', '/api/vendor/routes', undefined, vendorToken);
	assert.equal(list.status, 200);
	assert.ok(
		list.body?.routes?.some((r) => r.from_province === 'Bagmati Province' && r.to_province === 'Bagmati Province'),
		'seeded routes are listed',
	);

	const add = await req(
		'POST',
		'/api/vendor/routes',
		{ from_province: 'Gandaki Province', from_district: 'Kaski', to_province: 'Lumbini Province', to_district: '' },
		vendorToken,
	);
	assert.equal(add.status, 201);
	assert.ok(add.body?.route?.id);

	const bad = await req('POST', '/api/vendor/routes', { from_province: 'X' }, vendorToken);
	assert.equal(bad.status, 400, 'to_province is required');

	const del = await req('DELETE', `/api/vendor/routes/${add.body.route.id}`, undefined, vendorToken);
	assert.equal(del.status, 200);

	const after = await req('GET', '/api/vendor/routes', undefined, vendorToken);
	assert.equal(
		after.body?.routes?.some((r) => r.id === add.body.route.id),
		false,
		'deleted route is gone',
	);
});

test('vendor sees their assigned shipments', async () => {
	const res = await req('GET', '/api/vendor/shipments', undefined, vendorToken);
	assert.equal(res.status, 200);
	assert.ok(
		res.body?.shipments?.some((s) => s.id === lifecycleShipment.shipment_id),
		'delivered job appears in vendor list',
	);
});

let secondShipment;
test('a vendor can reject an assigned job and it returns to the pending queue', async () => {
	const vendors = await req('GET', '/api/admin/vendors', undefined, adminToken);
	const active = vendors.body?.vendors?.find((v) => v.status === 'active');
	assert.ok(active, 'an active mover exists');

	// Choosing an active mover auto-approves the booking at creation time.
	secondShipment = await createAndPayBooking({
		vehicle_type: 'Cargo Tempo',
		vendor_id: active.id,
	});

	const reject = await req(
		'PUT',
		`/api/vendor/shipments/${secondShipment.shipment_id}/reject`,
		{},
		vendorToken,
	);
	assert.equal(reject.status, 200);

	const detail = await req('GET', `/api/shipment/${secondShipment.shipment_id}`, undefined, customerToken);
	assert.equal(detail.body?.shipment?.status, 'pending');
	assert.equal(detail.body?.shipment?.approval_status, 'pending');
	assert.equal(detail.body?.shipment?.assigned_vendor_id, null);
});

let autoShipment;
test('selecting an available mover auto-approves and a busy mover is blocked', async () => {
	const vendors = await req('GET', '/api/admin/vendors', undefined, adminToken);
	const active = vendors.body?.vendors?.find((v) => v.status === 'active');
	assert.ok(active);

	autoShipment = await createAndPayBooking({ vehicle_type: 'Cargo Tempo', vendor_id: active.id });
	const detail = await req('GET', `/api/shipment/${autoShipment.shipment_id}`, undefined, customerToken);
	assert.equal(detail.body?.shipment?.approval_status, 'approved', 'eligibility auto-approves');
	assert.equal(detail.body?.shipment?.assigned_vendor_id, active.id);
	assert.equal(detail.body?.shipment?.status, 'pending');

	const busy = await req('POST', '/api/shipment/create', bookingPayload({ vehicle_type: 'Cargo Tempo', vendor_id: active.id }), customerToken);
	assert.equal(busy.status, 400, 'mover already has an active move');
	assert.match(String(busy.body?.message), /busy/i);

	const cancel = await req('PUT', `/api/shipment/${autoShipment.shipment_id}/status`, { status: 'cancelled' }, adminToken);
	assert.equal(cancel.status, 200, 'admin can cancel to free the mover');
});

test('an unbidden booking auto-assigns the best available mover without admin', async () => {
	const booking = await createAndPayBooking({ vehicle_type: 'Cargo Tempo' });

	const detail = await req('GET', `/api/shipment/${booking.shipment_id}`, undefined, customerToken);
	assert.equal(detail.body?.shipment?.approval_status, 'approved', 'auto-approved at booking time');
	assert.ok(detail.body?.shipment?.assigned_vendor_id, 'a mover was auto-assigned');

	const cancel = await req(
		'PUT',
		`/api/shipment/${booking.shipment_id}/status`,
		{ status: 'cancelled' },
		adminToken,
	);
	assert.equal(cancel.status, 200, 'cleanup keeps the seeded mover free for later tests');
});

let claimShipment;
test('an unassignable booking enters the claim pool and a mover can claim it', async () => {
	const vendors = await req('GET', '/api/admin/vendors', undefined, adminToken);
	const seed = vendors.body?.vendors?.find((v) => v.business_name === 'Himalayan Movers');
	assert.ok(seed, 'seed mover present');

	const deactivate = await req(
		'PUT',
		`/api/admin/vendors/${seed.id}/status`,
		{ status: 'inactive' },
		adminToken,
	);
	assert.equal(deactivate.status, 200);

	claimShipment = await createAndPayBooking({ vehicle_type: 'Cargo Tempo' });
	const pending = await req('GET', `/api/shipment/${claimShipment.shipment_id}`, undefined, customerToken);
	assert.equal(pending.body?.shipment?.approval_status, 'pending', 'no active mover matched');
	assert.equal(pending.body?.shipment?.assigned_vendor_id, null);

	const reactivate = await req(
		'PUT',
		`/api/admin/vendors/${seed.id}/status`,
		{ status: 'active' },
		adminToken,
	);
	assert.equal(reactivate.status, 200);

	const pool = await req('GET', '/api/vendor/available', undefined, vendorToken);
	assert.equal(pool.status, 200);
	assert.ok(
		pool.body?.shipments?.some((s) => s.id === claimShipment.shipment_id),
		'unassigned booking is in the claim pool',
	);

	const claim = await req('PUT', `/api/vendor/shipments/${claimShipment.shipment_id}/claim`, {}, vendorToken);
	assert.equal(claim.status, 200);

	const after = await req('GET', `/api/shipment/${claimShipment.shipment_id}`, undefined, customerToken);
	assert.equal(after.body?.shipment?.approval_status, 'approved');
	assert.equal(String(after.body?.shipment?.assigned_vendor_id), String(seed.id));

	const pool2 = await req('GET', '/api/vendor/available', undefined, vendorToken);
	assert.equal(
		pool2.body?.shipments?.some((s) => s.id === claimShipment.shipment_id),
		false,
		'claimed job leaves the pool',
	);

	const again = await req('PUT', `/api/vendor/shipments/${claimShipment.shipment_id}/claim`, {}, vendorToken);
	assert.equal(again.status, 409, 'double claim is rejected');

	const blocked = await req('GET', '/api/vendor/available', undefined, customerToken);
	assert.equal(blocked.status, 403, 'claim pool is vendor-only');

	const cancel = await req(
		'PUT',
		`/api/shipment/${claimShipment.shipment_id}/status`,
		{ status: 'cancelled' },
		adminToken,
	);
	assert.equal(cancel.status, 200, 'cleanup frees the mover');
});

test('customer and assigned mover can chat, outsiders are blocked', async () => {
	const chatBooking = await createAndPayBooking({ vehicle_type: 'Cargo Tempo' });
	const detail = await req('GET', `/api/shipment/${chatBooking.shipment_id}`, undefined, customerToken);
	assert.equal(detail.body?.shipment?.approval_status, 'approved');
	assert.ok(detail.body?.shipment?.assigned_vendor_id, 'mover auto-assigned for chat');

	const send = await req(
		'POST',
		`/api/shipment/${chatBooking.shipment_id}/messages`,
		{ message: 'Hi, what time on move day?' },
		customerToken,
	);
	assert.equal(send.status, 201);

	const vendorView = await req('GET', `/api/shipment/${chatBooking.shipment_id}/messages`, undefined, vendorToken);
	assert.equal(vendorView.status, 200);
	assert.ok(
		vendorView.body?.messages?.some((m) => m.message === 'Hi, what time on move day?'),
		'vendor sees the customer message',
	);

	const reply = await req(
		'POST',
		`/api/shipment/${chatBooking.shipment_id}/messages`,
		{ message: '9am sharp!' },
		vendorToken,
	);
	assert.equal(reply.status, 201);

	const customerView = await req('GET', `/api/shipment/${chatBooking.shipment_id}/messages`, undefined, customerToken);
	assert.ok(
		customerView.body?.messages?.some((m) => m.message === '9am sharp!'),
		'customer sees the reply',
	);

	const empty = await req(
		'POST',
		`/api/shipment/${chatBooking.shipment_id}/messages`,
		{ message: '   ' },
		customerToken,
	);
	assert.equal(empty.status, 400, 'blank messages are rejected');

	const stranger = await req('GET', `/api/shipment/${chatBooking.shipment_id}/messages`, undefined, adminToken);
	assert.equal(stranger.status, 403, 'a non-party cannot read the thread');

	const cancel = await req(
		'PUT',
		`/api/shipment/${chatBooking.shipment_id}/status`,
		{ status: 'cancelled' },
		adminToken,
	);
	assert.equal(cancel.status, 200);
});

test('admin status filters and direct status update', async () => {
	const pending = await req('GET', '/api/admin/shipments/status/pending', undefined, adminToken);
	assert.ok(
		pending.body?.shipments?.some((s) => s.id === secondShipment.shipment_id),
		'vendor-rejected job is back in the pending queue',
	);

	const approved = await req('GET', '/api/admin/shipments/status/approved', undefined, adminToken);
	assert.ok(
		approved.body?.shipments?.some((s) => s.id === lifecycleShipment.shipment_id),
		'approved filter shows the approved booking',
	);

	const invalidFilter = await req('GET', '/api/admin/shipments/status/bogus', undefined, adminToken);
	assert.equal(invalidFilter.status, 400);

	const cancelled = await req(
		'PUT',
		`/api/shipment/${secondShipment.shipment_id}/status`,
		{ status: 'cancelled' },
		adminToken,
	);
	assert.equal(cancelled.status, 200);

	const cdetail = await req('GET', `/api/shipment/${secondShipment.shipment_id}`, undefined, customerToken);
	assert.equal(cdetail.body?.shipment?.status, 'cancelled');

	const bad = await req(
		'PUT',
		`/api/shipment/${secondShipment.shipment_id}/status`,
		{ status: 'nonsense' },
		adminToken,
	);
	assert.equal(bad.status, 400);
});

test('customer can list their own bookings', async () => {
	const res = await req('GET', '/api/shipment/my', undefined, customerToken);
	assert.equal(res.status, 200);
	assert.ok(res.body?.shipments?.length >= 4, 'all integration bookings visible');
	assert.ok(res.body?.shipments?.some((s) => s.id === shipment.shipment_id));
});

test('admin mover lifecycle and inactive guard', async () => {
	const all = await req('GET', '/api/admin/vendors', undefined, adminToken);
	const seed = all.body?.vendors?.find((v) => v.business_name === 'Himalayan Movers');
	assert.ok(seed, 'seed mover present in admin listing');

	const deactivate = await req(
		'PUT',
		`/api/admin/vendors/${seed.id}/status`,
		{ status: 'inactive' },
		adminToken,
	);
	assert.equal(deactivate.status, 200);

	const bookingAttempt = await req(
		'POST',
		'/api/shipment/create',
		bookingPayload({ vehicle_type: 'Cargo Tempo', vendor_id: seed.id }),
		customerToken,
	);
	assert.equal(bookingAttempt.status, 400, 'inactive mover cannot be auto-assigned');

	const reactivate = await req(
		'PUT',
		`/api/admin/vendors/${seed.id}/status`,
		{ status: 'active' },
		adminToken,
	);
	assert.equal(reactivate.status, 200);

	const active = await req('GET', '/api/admin/vendors/active', undefined, adminToken);
	assert.ok(active.body?.vendors?.some((v) => v.business_name === 'Himalayan Movers'));

	const badStatus = await req('PUT', `/api/admin/vendors/${seed.id}/status`, { status: 'greased' }, adminToken);
	assert.equal(badStatus.status, 400);

	const bookingAfter = await req(
		'POST',
		'/api/shipment/create',
		bookingPayload({ vehicle_type: 'Cargo Tempo', vendor_id: seed.id }),
		customerToken,
	);
	assert.equal(bookingAfter.status, 201, 'reactivated mover can be auto-assigned again');
});

test('admin can resolve and close support tickets', async () => {
	const all = await req('GET', '/api/tickets/all', undefined, adminToken);
	assert.equal(all.status, 200);
	const t = all.body?.tickets?.find((x) => x.subject === 'Issue with truck');
	assert.ok(t, 'submitted ticket visible to admin');

	const resolve = await req('PUT', `/api/tickets/${t.id}/resolve`, {}, adminToken);
	assert.equal(resolve.status, 200);

	const close = await req('PUT', `/api/tickets/${t.id}/close`, {}, adminToken);
	assert.equal(close.status, 200);
});

test('role guards block the wrong actors', async () => {
	const deniedVendorRoutes = await req('GET', '/api/vendor/shipments', undefined, customerToken);
	assert.equal(deniedVendorRoutes.status, 403);

	const deniedAdminRoutes = await req('GET', '/api/admin/vendors', undefined, vendorToken);
	assert.equal(deniedAdminRoutes.status, 403);

	const deniedTicketSubmit = await req(
		'POST',
		'/api/tickets/submit',
		{ subject: 'x', message: 'y' },
		adminToken,
	);
	assert.equal(deniedTicketSubmit.status, 403);

	const deniedVehicleWrite = await req(
		'PUT',
		`/api/vendor/vehicles/1/status`,
		{ status: 'available' },
		customerToken,
	);
	assert.equal(deniedVehicleWrite.status, 403);
});

test('bookings survive an application restart', async () => {
	child.kill('SIGKILL');
	await new Promise((r) => setTimeout(r, 400));

	child = spawn(process.execPath, ['server.js'], {
		cwd: BACKEND_DIR,
		env: {
			...process.env,
			PORT: baseUrl.split(':')[2],
			DB_DRIVER: 'sqlite',
			DB_PATH: path.join(tmpDir, 'test.db'),
			NODE_ENV: 'test',
			SEED_DEMO_DATA: 'true',
		},
		stdio: 'ignore',
	});
	await waitForServer(baseUrl);

	const login = await req('POST', '/api/auth/login', { email: customerEmail, password: 'secret1' });
	assert.equal(login.status, 200, 'customer can log in again after restart');

	const mine = await req('GET', '/api/shipment/my', undefined, login.body?.token);
	assert.equal(mine.status, 200);
	assert.ok(mine.body?.shipments?.length >= 4, 'bookings persisted across restart');
});