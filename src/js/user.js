// ── AUTH CHECK AND LOGOUT FOR USER ──
function checkAuth() {
	const user = JSON.parse(localStorage.getItem('meroGharUser') || '{}');
	if (!user.loggedIn) {
		window.location.href = '/src/pages/login.html';
		return null;
	}
	return user;
}

function logout() {
	if (confirm('Are you sure you want to logout?')) {
		localStorage.removeItem('meroGharUser');
		alert('Logged out successfully');
		window.location.href = '/src/pages/login.html';
	}
}

function addLogoutButton() {
	const homeBtn = document.getElementById('homeBtn');
	if (homeBtn && !document.getElementById('user-logout-btn')) {
		const logoutBtn = document.createElement('button');
		logoutBtn.id = 'user-logout-btn';
		logoutBtn.textContent = 'Logout';
		logoutBtn.className =
			'bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-6 py-3 rounded-sm transition-all ml-3';
		logoutBtn.onclick = logout;
		homeBtn.parentNode.appendChild(logoutBtn);
	}
}

document.addEventListener('DOMContentLoaded', () => {
	const user = checkAuth();
	if (user) {
		addLogoutButton();
		const userNameSpan = document.createElement('span');
		userNameSpan.textContent = `Welcome, ${user.name}`;
		userNameSpan.className = 'text-forest-700 font-semibold mr-3';
		const homeBtn = document.getElementById('homeBtn');
		if (homeBtn) homeBtn.parentNode.insertBefore(userNameSpan, homeBtn);
	}
});

// ── HOME PAGE RETURN ─────────────────────────────────
(function goHome() {
	const homeBtn = document.querySelector('#homeBtn');
	if (homeBtn) {
		homeBtn.addEventListener('click', () => {
			window.location.href = 'index.html';
		});
	}
})();

// ── FORM STEPS ───────────────────────────────────────
let fCur = 1;
const fTotal = 5;
const fPW = { 1: '20%', 2: '40%', 3: '60%', 4: '80%', 5: '100%' };

// ========== LOWER PRICES (matching the ranges shown in HTML) ==========
const PRICES = {
	vehicle: {
		cargo_tempo: 500, // matches "NPR 400-500"
		tata_ace: 1000, // matches "NPR 800-1200"
		mini_truck_407: 2000, // matches "NPR 1500-2000"
		large_truck: 2500, // matches "NPR 2000+"
		recommend: 0,
	},
	homeSize: {
		'1_room': 1,
		'2_bhk': 1.2,
		'3_bhk': 1.5,
		large_house: 1.8,
	},
	addOns: {
		packing: 500,
		disassembly: 300,
		porter: 500,
		insurance: 800,
	},
};
// =====================================================

function getSelectedVehiclePrice() {
	const vehicleSelected = document.querySelector('input[name="veh"]:checked');
	if (!vehicleSelected) return 0;
	const vehicleCard = vehicleSelected
		.closest('label')
		?.querySelector('.v-card');
	const vehicleTitle = vehicleCard?.querySelector('.font-semibold');
	if (!vehicleTitle) return 0;
	const text = vehicleTitle.innerText.toLowerCase();
	if (text.includes('cargo tempo')) return PRICES.vehicle.cargo_tempo;
	if (text.includes('tata ace')) return PRICES.vehicle.tata_ace;
	if (text.includes('mini truck')) return PRICES.vehicle.mini_truck_407;
	if (text.includes('large truck')) return PRICES.vehicle.large_truck;
	return 0;
}

function getHomeSizeMultiplier() {
	const homeSizeSelected = document.querySelector(
		'input[name="hSize"]:checked',
	);
	if (!homeSizeSelected) return 1;
	const label = homeSizeSelected.closest('label')?.querySelector('.chip-lbl');
	if (!label) return 1;
	const text = label.innerText;
	if (text.includes('1 Room')) return PRICES.homeSize['1_room'];
	if (text.includes('2 BHK')) return PRICES.homeSize['2_bhk'];
	if (text.includes('3 BHK')) return PRICES.homeSize['3_bhk'];
	if (text.includes('Large House')) return PRICES.homeSize.large_house;
	return 1;
}

function getAddOnsTotal() {
	let total = 0;
	document
		.querySelectorAll('#fp3 input[type="checkbox"]:checked')
		.forEach((cb) => {
			const serviceText = cb
				.closest('label')
				?.querySelector('p:first-child')?.innerText;
			if (serviceText) {
				if (serviceText.includes('Packing'))
					total += PRICES.addOns.packing;
				if (serviceText.includes('Disassembly'))
					total += PRICES.addOns.disassembly;
				if (serviceText.includes('Porter'))
					total += PRICES.addOns.porter;
				if (serviceText.includes('Insurance'))
					total += PRICES.addOns.insurance;
			}
		});
	return total;
}

function calculateTotalPrice() {
	const vehicleBase = getSelectedVehiclePrice();
	const multiplier = getHomeSizeMultiplier();
	const addOns = getAddOnsTotal();
	let total = vehicleBase * multiplier + addOns;
	return Math.max(total, 200);
}

function updatePriceDisplay() {
	const vehicleBase = getSelectedVehiclePrice();
	const multiplier = getHomeSizeMultiplier();
	const addOns = getAddOnsTotal();
	const total = calculateTotalPrice();

	// Find the yellow price box in Panel 5
	const priceBox = document.querySelector('#fp5 .bg-saffron-50');
	if (priceBox) {
		priceBox.innerHTML = `
			<div class="space-y-1 text-sm">
				<div class="flex justify-between"><span>🚛 Vehicle base:</span><span>रु ${vehicleBase.toLocaleString()}</span></div>
				<div class="flex justify-between"><span>🏠 Home size factor:</span><span>${multiplier}x</span></div>
				<div class="flex justify-between"><span>➕ Add‑on services:</span><span>रु ${addOns.toLocaleString()}</span></div>
				<div class="border-t border-saffron-300 my-1"></div>
				<div class="flex justify-between font-bold text-base"><span>💰 Total estimate:</span><span>रु ${total.toLocaleString()}</span></div>
				<p class="text-xs text-gray-500 mt-2">* Final quote confirmed by coordinator</p>
			</div>
		`;
	}

	// Also update the old total display if it still exists somewhere (for safety)
	const oldTotalSpan = document.getElementById('total-price-display');
	if (oldTotalSpan) oldTotalSpan.textContent = `रु ${total.toLocaleString()}`;
}

// Validation rules (unchanged)
const stepValidations = {
	1: function () {
		const puProv = document.getElementById('puProv')?.value;
		const puDist = document.getElementById('puDist')?.value;
		const puCity = document.querySelectorAll('#fp1 input[type="text"]')[0]
			?.value;
		const puWard = document.querySelectorAll('#fp1 input[type="text"]')[1]
			?.value;
		const drProv = document.getElementById('drProv')?.value;
		const drDist = document.getElementById('drDist')?.value;
		const drCity = document.querySelectorAll('#fp1 input[type="text"]')[2]
			?.value;
		const drWard = document.querySelectorAll('#fp1 input[type="text"]')[3]
			?.value;
		if (!puProv) {
			alert('Please select pickup province');
			return false;
		}
		if (!puDist || puDist === '— Select District —') {
			alert('Please select pickup district');
			return false;
		}
		if (!puCity) {
			alert('Please enter pickup city/municipality');
			return false;
		}
		if (!puWard) {
			alert('Please enter pickup ward/locality');
			return false;
		}
		if (!drProv) {
			alert('Please select drop province');
			return false;
		}
		if (!drDist || drDist === '— Select District —') {
			alert('Please select drop district');
			return false;
		}
		if (!drCity) {
			alert('Please enter drop city/municipality');
			return false;
		}
		if (!drWard) {
			alert('Please enter drop ward/locality');
			return false;
		}
		return true;
	},
	2: function () {
		return (
			!!document.querySelector('input[name="hSize"]:checked') ||
			(alert('Please select your home size'), false)
		);
	},
	3: function () {
		return (
			!!document.querySelector('input[name="veh"]:checked') ||
			(alert('Please select a vehicle type'), false)
		);
	},
	4: function () {
		const moveDate = document.querySelectorAll('#fp4 input[type="date"]')[0]
			?.value;
		const timeSlot = document.querySelector('input[name="tSlot"]:checked');
		if (!moveDate) {
			alert('Please select your move date');
			return false;
		}
		if (!timeSlot) {
			alert('Please select your preferred time slot');
			return false;
		}
		return true;
	},
	5: function () {
		const firstName = document.querySelectorAll(
			'#fp5 input[type="text"]',
		)[0]?.value;
		const lastName = document.querySelectorAll('#fp5 input[type="text"]')[1]
			?.value;
		const mobile = document.querySelectorAll('#fp5 input[type="tel"]')[0]
			?.value;
		const termsAccepted = document.querySelector(
			'#fp5 input[type="checkbox"]',
		)?.checked;
		if (!firstName) {
			alert('Please enter your first name');
			return false;
		}
		if (!lastName) {
			alert('Please enter your last name');
			return false;
		}
		if (!mobile || mobile.length < 10) {
			alert('Please enter a valid mobile number (at least 10 digits)');
			return false;
		}
		if (!termsAccepted) {
			alert('Please accept the Terms of Service and Privacy Policy');
			return false;
		}
		return true;
	},
};

function fGoTo(n) {
	if (n < 1 || n > fTotal) return;
	if (n > fCur && (!stepValidations[fCur] || !stepValidations[fCur]()))
		return;
	const cur = document.getElementById('fp' + fCur);
	if (cur) cur.classList.add('hidden');
	fCur = n;
	const next = document.getElementById('fp' + n);
	if (next) {
		next.classList.remove('hidden');
		next.classList.remove('panel-active');
		void next.offsetWidth;
		next.classList.add('panel-active');
	}
	document.getElementById('formProgress').style.width = fPW[n] || '100%';
	for (let i = 1; i <= fTotal; i++) {
		const el = document.getElementById('sc' + i);
		if (i < n) {
			el.className = 's-circle s-done';
			el.textContent = '✓';
		} else if (i === n) {
			el.className = 's-circle s-active';
			el.textContent = i;
		} else {
			el.className = 's-circle s-idle';
			el.textContent = i;
		}
	}
	[
		['cn12', 1],
		['cn23', 2],
		['cn34', 3],
		['cn45', 4],
	].forEach(([id, si]) => {
		const c = document.getElementById(id);
		if (c) c.classList.toggle('bg-forest-600', si < n);
	});
	for (let i = 1; i <= fTotal; i++) {
		const l = document.getElementById('fl' + i);
		if (l) l.classList.toggle('text-forest-800', i === n);
	}
	document
		.getElementById('booking')
		?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── SUBMIT FORM WITH PAYMENT HANDLING (unchanged) ──
async function submitForm() {
	if (!stepValidations[5]()) return;
	try {
		const shipmentData = collectFormData();
		shipmentData.final_quote = calculateTotalPrice();
		const user = JSON.parse(localStorage.getItem('meroGharUser') || '{}');
		if (user.id) shipmentData.user_id = user.id;

		console.log('Submitting:', shipmentData);
		const response = await fetch(
			'http://localhost:5000/api/shipment/create',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(shipmentData),
			},
		);
		const result = await response.json();
		if (!response.ok) {
			alert(result.message || 'Failed to submit booking.');
			return;
		}
		if (
			result.payment_required &&
			result.payment_data &&
			result.payment_data.form_html
		) {
			const bookingSection = document.getElementById('booking');
			if (bookingSection) {
				bookingSection.innerHTML = result.payment_data.form_html;
			}
			return;
		}
		showSuccessMessage(result.booking_id);
	} catch (error) {
		console.error(error);
		alert('Failed to submit booking. Please check your connection.');
	}
}

function showSuccessMessage(bookingId) {
	document.getElementById('fp5').classList.add('hidden');
	document.getElementById('fpConfirm').classList.remove('hidden');
	document.getElementById('formProgress').style.width = '100%';
	for (let i = 1; i <= fTotal; i++) {
		const el = document.getElementById('sc' + i);
		if (el) {
			el.className = 's-circle s-done';
			el.textContent = '✓';
		}
	}
	const bookIdSpan = document.getElementById('bookId');
	if (bookIdSpan) bookIdSpan.textContent = bookingId;
	document
		.getElementById('booking')
		?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	const bookings = JSON.parse(localStorage.getItem('myBookings') || '[]');
	bookings.push({ bookingId, date: new Date().toISOString() });
	localStorage.setItem('myBookings', JSON.stringify(bookings));
}

// ── COLLECT FORM DATA (unchanged) ──
function collectFormData() {
	const pickupCityInput = document.querySelectorAll(
		'#fp1 input[type="text"]',
	)[0];
	const pickupWardInput = document.querySelectorAll(
		'#fp1 input[type="text"]',
	)[1];
	const pickupFloorSelect = document.querySelectorAll('#fp1 select')[1];
	const pickupLaneRadio = document.querySelector(
		'input[name="puLane"]:checked',
	);
	const dropCityInput = document.querySelectorAll(
		'#fp1 input[type="text"]',
	)[2];
	const dropWardInput = document.querySelectorAll(
		'#fp1 input[type="text"]',
	)[3];
	const dropFloorSelect = document.querySelectorAll('#fp1 select')[2];

	const homeSizeSelected = document.querySelector(
		'input[name="hSize"]:checked',
	);
	let homeSize = '';
	if (homeSizeSelected) {
		const lbl = homeSizeSelected
			.closest('label')
			?.querySelector('.chip-lbl');
		if (lbl) {
			const t = lbl.innerText;
			if (t.includes('1 Room')) homeSize = '1_room';
			else if (t.includes('2 BHK')) homeSize = '2_bhk';
			else if (t.includes('3 BHK')) homeSize = '3_bhk';
			else if (t.includes('Large House')) homeSize = 'large_house';
		}
	}
	const selectedItems = [];
	document.querySelectorAll('#fp2 .item-chip.on').forEach((chip) => {
		const lbl = chip.querySelector('.chip-lbl');
		if (lbl) selectedItems.push(lbl.innerText);
	});
	const fragileTextarea = document.querySelector('#fp2 textarea');
	const vehicleSelected = document.querySelector('input[name="veh"]:checked');
	let vehicleType = '';
	if (vehicleSelected) {
		const card = vehicleSelected.closest('label')?.querySelector('.v-card');
		const title = card?.querySelector('.font-semibold');
		if (title) {
			const txt = title.innerText.toLowerCase();
			if (txt.includes('cargo tempo')) vehicleType = 'cargo_tempo';
			else if (txt.includes('tata ace')) vehicleType = 'tata_ace';
			else if (txt.includes('mini truck')) vehicleType = 'mini_truck_407';
			else if (txt.includes('large truck')) vehicleType = 'large_truck';
			else if (txt.includes('recommend')) vehicleType = 'recommend';
		}
	}
	const addOnServices = [];
	document
		.querySelectorAll('#fp3 input[type="checkbox"]:checked')
		.forEach((cb) => {
			const txt = cb
				.closest('label')
				?.querySelector('p:first-child')?.innerText;
			if (txt) {
				if (txt.includes('Packing')) addOnServices.push('packing');
				if (txt.includes('Disassembly'))
					addOnServices.push('disassembly');
				if (txt.includes('Porter')) addOnServices.push('porter');
				if (txt.includes('Insurance')) addOnServices.push('insurance');
			}
		});
	const moveDateInput = document.querySelectorAll(
		'#fp4 input[type="date"]',
	)[0];
	const alternateDateInput = document.querySelectorAll(
		'#fp4 input[type="date"]',
	)[1];
	const timeSlotSelected = document.querySelector(
		'input[name="tSlot"]:checked',
	);
	let timeSlot = '';
	if (timeSlotSelected) {
		const lbl = timeSlotSelected
			.closest('label')
			?.querySelector('.chip-lbl');
		if (lbl) {
			const t = lbl.innerText.toLowerCase();
			if (t.includes('early morning')) timeSlot = 'early_morning';
			else if (t.includes('morning')) timeSlot = 'morning';
			else if (t.includes('afternoon')) timeSlot = 'afternoon';
			else if (t.includes('flexible')) timeSlot = 'flexible';
		}
	}
	const moveReasonSelect = document.querySelector('#fp4 select');
	const firstNameInput = document.querySelectorAll(
		'#fp5 input[type="text"]',
	)[0];
	const lastNameInput = document.querySelectorAll(
		'#fp5 input[type="text"]',
	)[1];
	const mobileInput = document.querySelectorAll('#fp5 input[type="tel"]')[0];
	const alternateMobileInput = document.querySelectorAll(
		'#fp5 input[type="tel"]',
	)[1];
	const emailInput = document.querySelector('#fp5 input[type="email"]');
	const preferredContact = [];
	document
		.querySelectorAll('#fp5 .flex-wrap input[type="checkbox"]:checked')
		.forEach((cb) => {
			const txt = cb.parentElement.innerText.trim();
			if (txt.includes('Phone')) preferredContact.push('phone');
			if (txt.includes('Viber')) preferredContact.push('viber');
			if (txt.includes('WhatsApp')) preferredContact.push('whatsapp');
			if (txt.includes('Email')) preferredContact.push('email');
		});

	const paymentSelected = document.querySelector('.pay-card.picked');
	let paymentMethod = 'cash';
	if (paymentSelected) {
		const paymentText =
			paymentSelected.querySelector('.text-xs.font-semibold')
				?.innerText || '';
		const lower = paymentText.toLowerCase();
		if (lower.includes('esewa')) paymentMethod = 'esewa';
		else if (lower.includes('khalti')) paymentMethod = 'khalti';
		else if (lower.includes('ime pay')) paymentMethod = 'imepay';
	}
	const howFoundSelect = document.querySelectorAll('#fp5 select')[1];
	const specialNotesTextarea = document.querySelector('#fp4 textarea');

	return {
		pickup_province: document.getElementById('puProv')?.value || '',
		pickup_district: document.getElementById('puDist')?.value || '',
		pickup_city: pickupCityInput?.value || '',
		pickup_ward: pickupWardInput?.value || '',
		pickup_floor: pickupFloorSelect?.value || '',
		pickup_lane_access: pickupLaneRadio?.parentElement?.innerText.includes(
			'Wide road',
		)
			? 'wide_road'
			: pickupLaneRadio?.parentElement?.innerText.includes('Narrow lane')
				? 'narrow_lane'
				: 'steps_only',
		drop_province: document.getElementById('drProv')?.value || '',
		drop_district: document.getElementById('drDist')?.value || '',
		drop_city: dropCityInput?.value || '',
		drop_ward: dropWardInput?.value || '',
		drop_floor: dropFloorSelect?.value || '',
		home_size: homeSize,
		selected_items: selectedItems,
		fragile_items: fragileTextarea?.value || '',
		vehicle_type: vehicleType,
		add_on_services: addOnServices,
		move_date: moveDateInput?.value || '',
		alternate_date: alternateDateInput?.value || '',
		preferred_time_slot: timeSlot,
		move_reason: moveReasonSelect?.value || '',
		first_name: firstNameInput?.value || '',
		last_name: lastNameInput?.value || '',
		mobile_number: mobileInput?.value || '',
		alternate_mobile: alternateMobileInput?.value || '',
		email: emailInput?.value || '',
		preferred_contact: preferredContact,
		payment_method: paymentMethod,
		special_notes: specialNotesTextarea?.value || '',
		how_found_us: howFoundSelect?.value || '',
	};
}

function resetForm() {
	document.getElementById('fpConfirm').classList.add('hidden');
	fCur = 1;
	fGoTo(1);
}

// ── UI HELPERS ──
function tChip(el) {
	el.classList.toggle('on');
	const lbl = el.querySelector('.chip-lbl');
	if (lbl) lbl.style.color = el.classList.contains('on') ? '#f5a623' : '';
	updatePriceDisplay();
}
function pickVeh(inp) {
	document
		.querySelectorAll('.v-card')
		.forEach((c) => c.classList.remove('chosen'));
	const c = inp.closest('label').querySelector('.v-card');
	if (c) c.classList.add('chosen');
	updatePriceDisplay();
}
function pickPay(card) {
	document
		.querySelectorAll('.pay-card')
		.forEach((c) => c.classList.remove('picked'));
	card.classList.add('picked');
}

document.addEventListener('DOMContentLoaded', () => {
	document
		.querySelectorAll('label.item-chip input[type=radio]')
		.forEach((inp) => {
			inp.addEventListener('change', () => {
				const name = inp.name;
				document
					.querySelectorAll(`label.item-chip input[name="${name}"]`)
					.forEach((r) => {
						r.closest('label').classList.remove('on');
						const cl = r
							.closest('label')
							.querySelector('.chip-lbl');
						if (cl) cl.style.color = '';
					});
				inp.closest('label').classList.add('on');
				const cl = inp.closest('label').querySelector('.chip-lbl');
				if (cl) cl.style.color = '#f5a623';
				updatePriceDisplay();
			});
		});
	document
		.querySelectorAll('#fp3 input[type="checkbox"]')
		.forEach((cb) => cb.addEventListener('change', updatePriceDisplay));
	updatePriceDisplay();
});

// ── DISTRICTS (unchanged) ──
const DISTRICTS = {
	1: [
		'Bhojpur',
		'Dhankuta',
		'Ilam',
		'Jhapa',
		'Khotang',
		'Morang',
		'Okhaldhunga',
		'Panchthar',
		'Sankhuwasabha',
		'Solukhumbu',
		'Sunsari',
		'Taplejung',
		'Terhathum',
		'Udayapur',
	],
	2: [
		'Bara',
		'Dhanusha',
		'Mahottari',
		'Parsa',
		'Rautahat',
		'Saptari',
		'Sarlahi',
		'Siraha',
	],
	3: [
		'Bhaktapur',
		'Chitwan',
		'Dhading',
		'Dolakha',
		'Kathmandu',
		'Kavrepalanchok',
		'Lalitpur',
		'Makwanpur',
		'Nuwakot',
		'Ramechhap',
		'Rasuwa',
		'Sindhuli',
		'Sindhupalchok',
	],
	4: [
		'Baglung',
		'Gorkha',
		'Kaski',
		'Lamjung',
		'Manang',
		'Mustang',
		'Myagdi',
		'Nawalpur',
		'Parbat',
		'Syangja',
		'Tanahun',
	],
	5: [
		'Arghakhanchi',
		'Banke',
		'Bardiya',
		'Dang',
		'Eastern Rukum',
		'Gulmi',
		'Kapilvastu',
		'Nawalparasi West',
		'Palpa',
		'Pyuthan',
		'Rolpa',
		'Rupandehi',
	],
	6: [
		'Dailekh',
		'Dolpa',
		'Humla',
		'Jajarkot',
		'Jumla',
		'Kalikot',
		'Mugu',
		'Salyan',
		'Surkhet',
		'Western Rukum',
	],
	7: [
		'Achham',
		'Baitadi',
		'Bajhang',
		'Bajura',
		'Dadeldhura',
		'Darchula',
		'Doti',
		'Kailali',
		'Kanchanpur',
	],
};
function loadDist(prefix) {
	const pVal = document.getElementById(prefix + 'Prov').value;
	const sel = document.getElementById(prefix + 'Dist');
	if (sel) {
		sel.innerHTML = '<option value="">— Select District —</option>';
		if (pVal && DISTRICTS[pVal]) {
			DISTRICTS[pVal].forEach((d) => {
				const o = document.createElement('option');
				o.value = d;
				o.textContent = d;
				sel.appendChild(o);
			});
		}
	}
}
