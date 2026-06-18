// ── AUTH CHECK AND LOGOUT FOR USER ──
function checkAuth() {
	const user = safeParse(localStorage.getItem('meroGharUser'), {});
	if (!user.loggedIn) {
		window.location.href = '/src/pages/login.html';
		return null;
	}
	return user;
}

function logout() {
	if (confirm('Are you sure you want to logout?')) {
		localStorage.removeItem('meroGharUser');
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
		// Append to the same container as home button
		const buttonContainer = homeBtn.parentNode;
		if (buttonContainer) buttonContainer.appendChild(logoutBtn);
	}
}

document.addEventListener('DOMContentLoaded', async () => {
	checkAuth();

	// Populate province dropdowns (hardcoded)
	populateProvincesHardcoded('pu');
	populateProvincesHardcoded('dr');

	['puCity', 'puWard', 'drCity', 'drWard'].forEach((id) => {
		const el = document.getElementById(id);
		if (el) {
			el.addEventListener('input', () => {
				clearDistanceCache();
				updatePriceDisplay();
			});
		}
	});

	// Restore saved form state
	restoreFormState();

	// Prevent past dates
	const today = new Date().toISOString().split('T')[0];
	document
		.querySelectorAll('input[type="date"]')
		.forEach((input) => input.setAttribute('min', today));

	// Auto-save on any input/change
	document.addEventListener('input', saveFormState);
	document.addEventListener('change', saveFormState);
	document.addEventListener('click', (e) => {
		if (
			e.target.closest('.item-chip') ||
			e.target.closest('.pay-card') ||
			e.target.closest('input[type="radio"]')
		) {
			saveFormState();
		}
	});

	// Setup other listeners
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
			});
		});

	document
		.querySelectorAll('#fp3 input[type="checkbox"]')
		.forEach((cb) => cb.addEventListener('change', updatePriceDisplay));
});

// ── HOME PAGE RETURN ─────────────────────────────────
(function goHome() {
	const homeBtn = document.getElementById('homeBtn');
	if (homeBtn) {
		homeBtn.addEventListener('click', () => {
			window.location.href = '/index.html'; // adjust if your index is elsewhere
		});
	}
})();

// ── FORM STEPS ───────────────────────────────────────
let fCur = 1;
const fTotal = 5;
const fPW = { 1: '20%', 2: '40%', 3: '60%', 4: '80%', 5: '100%' };

// ========== PRICES ==========
const PRICES = {
	vehicle: {
		cargo_tempo: 500,
		tata_ace: 1000,
		mini_truck_407: 2000,
		large_truck: 2500,
		recommend: 0,
	},
	addOns: {
		packing: 500,
		disassembly: 300,
		porter: 500,
		insurance: 800,
	},
};

// ========== HARDCODED NEPAL DATA ==========
const NEPAL_DATA = {
	provinces: [
		{ id: '1', name: 'Province No. 1 (Koshi)' },
		{ id: '2', name: 'Province No. 2 (Madhesh)' },
		{ id: '3', name: 'Bagmati Province' },
		{ id: '4', name: 'Gandaki Province' },
		{ id: '5', name: 'Lumbini Province' },
		{ id: '6', name: 'Karnali Province' },
		{ id: '7', name: 'Sudurpashchim Province' },
	],
	districts: {
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
	},
};

// Province centroids for fallback (approx)
const PROVINCE_CENTROIDS = {
	1: [87.2843, 26.4537],
	2: [85.9246, 26.7271],
	3: [85.324, 27.7172],
	4: [83.9856, 28.2096],
	5: [83.451, 27.69],
	6: [82.1739, 29.2753],
	7: [80.59, 28.71],
};

function populateProvincesHardcoded(prefix) {
	const select = document.getElementById(prefix + 'Prov');
	if (!select) return;
	select.innerHTML = '<option value="">— Select Province —</option>';
	NEPAL_DATA.provinces.forEach((prov) => {
		const option = document.createElement('option');
		option.value = prov.id;
		option.textContent = prov.name;
		select.appendChild(option);
	});
}

function populateDistrictsHardcoded(prefix, provinceId) {
	const select = document.getElementById(prefix + 'Dist');
	if (!select) return;
	select.innerHTML = '<option value="">— Select District —</option>';
	if (!provinceId || !NEPAL_DATA.districts[provinceId]) return;
	NEPAL_DATA.districts[provinceId].forEach((district) => {
		const option = document.createElement('option');
		option.value = district;
		option.textContent = district;
		select.appendChild(option);
	});
}

window.onProvinceChange = function (prefix) {
	var provEl = document.getElementById(prefix + 'Prov');
	if (!provEl) return;
	populateDistrictsHardcoded(prefix, provEl.value);
	var cityEl = document.getElementById(prefix + 'City');
	if (cityEl) cityEl.value = '';
	var wardEl = document.getElementById(prefix + 'Ward');
	if (wardEl) wardEl.value = '';
	clearDistanceCache();
	updatePriceDisplay();
};

window.onDistrictChange = function (prefix) {
	var cityEl = document.getElementById(prefix + 'City');
	if (cityEl) cityEl.value = '';
	var wardEl = document.getElementById(prefix + 'Ward');
	if (wardEl) wardEl.value = '';
	clearDistanceCache();
	updatePriceDisplay();
};

window.onMunicipalityChange = function (prefix) {
	clearDistanceCache();
	updatePriceDisplay();
};

// ========== OPENROUTESERVICE CONFIG ==========
const ORS_API_KEY =
	'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjUxMDBmZmI4Y2U2NTQ4ZjliZDcyOWM2YmFkMzk2MGVjIiwiaCI6Im11cm11cjY0In0=';
const PRICE_PER_KM = 10;

let cachedDistanceData = null;
let priceUpdateTimer = null;

function clearDistanceCache() {
	cachedDistanceData = null;
}

function schedulePriceUpdate() {
	if (priceUpdateTimer) clearTimeout(priceUpdateTimer);
	priceUpdateTimer = setTimeout(() => {
		updatePriceDisplay();
		priceUpdateTimer = null;
	}, 100);
}

// ── DURATION FORMATTING ─────────────────────────────
function formatDuration(seconds) {
	if (!seconds || seconds <= 0) return '';
	const mins = Math.round(seconds / 60);
	if (mins < 60) return `${mins} mins`;
	const hours = Math.floor(mins / 60);
	const remainingMins = mins % 60;
	if (remainingMins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
	return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMins} mins`;
}

// ========== GEOCODING ==========
const geocodeCache = new Map();

async function tryGeocode(address) {
	if (geocodeCache.has(address)) {
		console.log('📍 Using cached geocode for:', address);
		return geocodeCache.get(address);
	}
	const url = `https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(address)}&boundary.country=NP`;
	try {
		const response = await fetch(url);
		const data = await response.json();
		if (data.features && data.features.length > 0) {
			const [lon, lat] = data.features[0].geometry.coordinates;
			const coords = [lon, lat];
			geocodeCache.set(address, coords);
			return coords;
		}
	} catch (e) {
		console.warn('ORS geocoding error:', e);
	}
	return null;
}

async function geocodeAddress(address, provinceId) {
	let coords = await tryGeocode(address);
	if (coords) return coords;
	const parts = address.split(',').map((s) => s.trim());
	if (parts.length >= 3) {
		const district = parts[parts.length - 3] || parts[0];
		const province = parts[parts.length - 2];
		const simpleAddr = `${district}, ${province}, Nepal`;
		coords = await tryGeocode(simpleAddr);
		if (coords) return coords;
	}
	if (provinceId && PROVINCE_CENTROIDS[provinceId]) {
		console.log(`Using fallback centroid for province ${provinceId}`);
		return PROVINCE_CENTROIDS[provinceId];
	}
	return null;
}

function getPickupAddressString() {
	var city = document.getElementById('puCity')?.value?.trim() || '';
	var districtSelect = document.getElementById('puDist');
	var district = districtSelect ? (districtSelect.options[districtSelect.selectedIndex]?.text || '') : '';
	var provinceSelect = document.getElementById('puProv');
	var province = provinceSelect ? (provinceSelect.options[provinceSelect.selectedIndex]?.text || '') : '';
	return (city ? city + ', ' : '') + district + ', ' + province + ', Nepal';
}

function getDropAddressString() {
	var city = document.getElementById('drCity')?.value?.trim() || '';
	var districtSelect = document.getElementById('drDist');
	var district = districtSelect ? (districtSelect.options[districtSelect.selectedIndex]?.text || '') : '';
	var provinceSelect = document.getElementById('drProv');
	var province = provinceSelect ? (provinceSelect.options[provinceSelect.selectedIndex]?.text || '') : '';
	return (city ? city + ', ' : '') + district + ', ' + province + ', Nepal';
}

async function getDistance(originCoords, destinationCoords) {
	if (!originCoords || !destinationCoords) return null;
	const latDiff = Math.abs(originCoords[1] - destinationCoords[1]);
	const lonDiff = Math.abs(originCoords[0] - destinationCoords[0]);
	if (latDiff < 0.01 && lonDiff < 0.01) return null;
	const url = 'https://api.openrouteservice.org/v2/matrix/driving-car';
	const body = {
		locations: [originCoords, destinationCoords],
		metrics: ['distance', 'duration'],
		units: 'km',
	};
	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: ORS_API_KEY,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});
		if (!response.ok) throw new Error(`ORS error ${response.status}`);
		const data = await response.json();
		const distanceKm = data.distances[0][1];
		const durationSec = data.durations[0][1];
		return {
			distanceKm,
			durationSec,
			durationText: formatDuration(durationSec),
			originCoords,
			destinationCoords,
		};
	} catch (error) {
		console.error('Distance matrix failed:', error);
		return null;
	}
}

async function getDistanceCost() {
	const pickupAddr = getPickupAddressString();
	const dropAddr = getDropAddressString();
	const puProv = document.getElementById('puProv')?.value;
	const drProv = document.getElementById('drProv')?.value;
	try {
		const [pickupCoords, dropCoords] = await Promise.all([
			geocodeAddress(pickupAddr, puProv),
			geocodeAddress(dropAddr, drProv),
		]);
		const distData = await getDistance(pickupCoords, dropCoords);
		if (distData) {
			cachedDistanceData = {
				...distData,
				pickupAddress: pickupAddr,
				dropAddress: dropAddr,
			};
			return distData.distanceKm * PRICE_PER_KM;
		}
	} catch (e) {
		console.warn('Distance calculation error, using fallback:', e);
	}
	var puVal = parseInt(puProv) || 0;
	var drVal = parseInt(drProv) || 0;
	var diff = Math.abs(puVal - drVal);
	var fallbackKm = diff * 100 + 50;
	cachedDistanceData = {
		distanceKm: fallbackKm,
		durationSec: fallbackKm * 90,
		durationText: formatDuration(fallbackKm * 90),
		originCoords: PROVINCE_CENTROIDS[puProv] || null,
		destinationCoords: PROVINCE_CENTROIDS[drProv] || null,
		pickupAddress: pickupAddr,
		dropAddress: dropAddr,
	};
	console.log('📦 Fallback distance used:', fallbackKm, 'km');
	return fallbackKm * PRICE_PER_KM;
}

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

function getAddOnsTotal() {
	let total = 0;
	document
		.querySelectorAll('#fp3 input[type="checkbox"]:checked')
		.forEach((cb) => {
			const service = cb.dataset.service;
			if (service === 'packing') total += PRICES.addOns.packing;
			else if (service === 'disassembly')
				total += PRICES.addOns.disassembly;
			else if (service === 'porter') total += PRICES.addOns.porter;
			else if (service === 'insurance') total += PRICES.addOns.insurance;
		});
	return total;
}

async function calculateTotalPrice() {
	const vehicleBase = getSelectedVehiclePrice() || 0;
	const addOns = getAddOnsTotal() || 0;
	let distanceCost = 0,
		distanceKm = 0,
		durationText = '';
	if (
		cachedDistanceData &&
		typeof cachedDistanceData.distanceKm === 'number'
	) {
		distanceKm = cachedDistanceData.distanceKm;
		distanceCost = distanceKm * PRICE_PER_KM;
		durationText = cachedDistanceData.durationText || '';
		console.log('📦 Using cached distance:', distanceKm, 'km');
	} else {
		console.log('🔄 Recalculating distance...');
		distanceCost = await getDistanceCost();
		distanceKm = cachedDistanceData?.distanceKm || 0;
		durationText = cachedDistanceData?.durationText || '';
	}
	const total = vehicleBase + distanceCost + addOns;
	console.log('💰 Price calc:', { vehicleBase, distanceCost, addOns, total });
	return {
		total: Math.max(total, 200) || 200,
		vehicleBase,
		distanceCost,
		distanceKm,
		durationText,
		addOns,
	};
}

let updatingPrice = false;

async function updatePriceDisplay() {
	if (priceUpdateTimer) {
		clearTimeout(priceUpdateTimer);
		priceUpdateTimer = null;
	}
	if (updatingPrice) return;
	updatingPrice = true;
	try {
		const priceBox = document.querySelector('#fp5 .bg-saffron-50');
		if (priceBox)
			priceBox.innerHTML = `<div class="text-center py-2 text-sm">Calculating distance...</div>`;
		let result;
		try {
			result = await calculateTotalPrice();
		} catch (e) {
			console.error('Price calculation failed:', e);
			result = {
				total: 0,
				vehicleBase: 0,
				distanceCost: 0,
				distanceKm: 0,
				durationText: '',
				addOns: 0,
			};
		}
		const {
			total,
			vehicleBase,
			distanceCost,
			distanceKm,
			addOns,
			durationText,
		} = result;
		if (priceBox) {
			const displayDistance = distanceKm < 0.1 ? 0.1 : distanceKm;
			const distanceDisplayHtml =
				distanceKm > 0
					? `<div class="flex justify-between"><span>🗺️ Distance (${displayDistance.toFixed(1)} km):</span><span>रु ${distanceCost.toLocaleString()}</span></div>`
					: `<div class="flex justify-between"><span>🏢 Same Building / Locality:</span><span>रु 0</span></div>`;
			const validTotal = isNaN(total) ? 0 : total;
			const validDuration =
				durationText && durationText !== 'NaN mins' ? durationText : '';
			priceBox.innerHTML = `
				<div class="space-y-1 text-sm">
					<div class="flex justify-between"><span>🚛 Vehicle base:</span><span>रु ${vehicleBase.toLocaleString()}</span></div>
					${distanceDisplayHtml}
					<div class="flex justify-between"><span>➕ Add‑on services:</span><span>रु ${addOns.toLocaleString()}</span></div>
					<div class="border-t border-saffron-300 my-1"></div>
					<div class="flex justify-between font-bold text-base"><span>💰 Total estimate:</span><span>रु ${validTotal.toLocaleString()}</span></div>
					${validDuration ? `<p class="text-xs text-gray-500 mt-1">⏱️ Estimated travel time: ${validDuration}</p>` : ''}
					<p class="text-xs text-gray-500 mt-2">* Final quote confirmed by coordinator</p>
				</div>
			`;
		}
		const oldTotalSpan = document.getElementById('total-price-display');
		if (oldTotalSpan)
			oldTotalSpan.textContent = `रु ${(total || 0).toLocaleString()}`;
	} finally {
		updatingPrice = false;
	}
}

// ========== FORM STATE PERSISTENCE ==========
const STORAGE_KEY = 'meroGhar_booking_form';
const USE_LOCAL_STORAGE = false;

function saveFormState() {
	try {
		const formData = {
			puProv: document.getElementById('puProv')?.value || '',
			puDist: document.getElementById('puDist')?.value || '',
			puCity: document.getElementById('puCity')?.value || '',
			puWard: document.getElementById('puWard')?.value || '',
			puFloor: document.getElementById('puFloor')?.value || '',
			puLane:
				document.querySelector('input[name="puLane"]:checked')
					?.parentElement?.innerText || '',
			drProv: document.getElementById('drProv')?.value || '',
			drDist: document.getElementById('drDist')?.value || '',
			drCity: document.getElementById('drCity')?.value || '',
			drWard: document.getElementById('drWard')?.value || '',
			drFloor: document.getElementById('drFloor')?.value || '',
			homeSize:
				document
					.querySelector('input[name="hSize"]:checked')
					?.closest('label')
					?.querySelector('.chip-lbl')?.innerText || '',
			selectedItems: Array.from(
				document.querySelectorAll('#fp2 .item-chip.on .chip-lbl'),
			).map((l) => l.innerText),
			fragileItems: document.querySelector('#fp2 textarea')?.value || '',
			vehicle:
				document
					.querySelector('input[name="veh"]:checked')
					?.closest('label')
					?.querySelector('.font-semibold')?.innerText || '',
			addOns: Array.from(
				document.querySelectorAll(
					'#fp3 input[type="checkbox"]:checked',
				),
			).map((cb) => cb.dataset.service),
			moveDate:
				document.querySelectorAll('#fp4 input[type="date"]')[0]
					?.value || '',
			alternateDate:
				document.querySelectorAll('#fp4 input[type="date"]')[1]
					?.value || '',
			timeSlot:
				document
					.querySelector('input[name="tSlot"]:checked')
					?.closest('label')
					?.querySelector('.chip-lbl')?.innerText || '',
			moveReason: document.querySelector('#fp4 select')?.value || '',
			specialNotes: document.querySelector('#fp4 textarea')?.value || '',
			firstName:
				document.querySelectorAll('#fp5 input[type="text"]')[0]
					?.value || '',
			lastName:
				document.querySelectorAll('#fp5 input[type="text"]')[1]
					?.value || '',
			mobile:
				document.querySelectorAll('#fp5 input[type="tel"]')[0]?.value ||
				'',
			alternateMobile:
				document.querySelectorAll('#fp5 input[type="tel"]')[1]?.value ||
				'',
			email:
				document.querySelector('#fp5 input[type="email"]')?.value || '',
			preferredContact: Array.from(
				document.querySelectorAll(
					'#fp5 .flex-wrap input[type="checkbox"]:checked',
				),
			).map((cb) => cb.parentElement.innerText.trim()),
			paymentMethod:
				document
					.querySelector('.pay-card.picked')
					?.querySelector('.text-xs.font-semibold')?.innerText ||
				'Cash',
			howFound: document.querySelector('#fp5 select')?.value || '',
			termsAccepted:
				document.getElementById('termsCheckbox')
					?.checked || false,
			currentStep: fCur,
			cachedDistanceData: cachedDistanceData
				? JSON.stringify(cachedDistanceData)
				: null,
		};
		const storage = USE_LOCAL_STORAGE ? localStorage : sessionStorage;
		storage.setItem(STORAGE_KEY, JSON.stringify(formData));
	} catch (e) {}
}

function restoreFormState() {
	try {
		const storage = USE_LOCAL_STORAGE ? localStorage : sessionStorage;
		const saved = storage.getItem(STORAGE_KEY);
		if (!saved) return;
		const data = JSON.parse(saved);

		if (data.cachedDistanceData) {
			try {
				cachedDistanceData = JSON.parse(data.cachedDistanceData);
			} catch (e) {
				cachedDistanceData = null;
			}
		}

		const setValue = (id, value) => {
			if (id && value) document.getElementById(id).value = value;
		};
		const setRadioByLabel = (name, labelText) => {
			if (!labelText) return;
			document
				.querySelectorAll(`input[name="${name}"]`)
				.forEach((radio) => {
					const parent = radio.closest('label');
					if (parent && parent.innerText.includes(labelText))
						radio.checked = true;
				});
		};
		const setChipsByLabels = (selector, labels) => {
			document.querySelectorAll(selector).forEach((chip) => {
				const lbl = chip.querySelector('.chip-lbl');
				if (lbl && labels.includes(lbl.innerText))
					chip.classList.add('on');
			});
		};

		setValue('puProv', data.puProv);
		if (data.puProv) {
			populateDistrictsHardcoded('pu', data.puProv);
			setValue('puDist', data.puDist);
		}
		setValue('puCity', data.puCity);
		setValue('puWard', data.puWard);
		setValue('puFloor', data.puFloor);
		setRadioByLabel('puLane', data.puLane);

		setValue('drProv', data.drProv);
		if (data.drProv) {
			populateDistrictsHardcoded('dr', data.drProv);
			setValue('drDist', data.drDist);
		}
		setValue('drCity', data.drCity);
		setValue('drWard', data.drWard);
		setValue('drFloor', data.drFloor);

		setRadioByLabel('hSize', data.homeSize);
		setChipsByLabels('#fp2 .item-chip', data.selectedItems);
		const fragileTextarea = document.querySelector('#fp2 textarea');
		if (fragileTextarea) fragileTextarea.value = data.fragileItems;

		if (data.vehicle) {
			document.querySelectorAll('input[name="veh"]').forEach((radio) => {
				const card = radio
					.closest('label')
					?.querySelector('.font-semibold');
				if (card && card.innerText.includes(data.vehicle)) {
					radio.checked = true;
					pickVeh(radio);
				}
			});
		}

		document
			.querySelectorAll('#fp3 input[type="checkbox"]')
			.forEach((cb) => {
				const service = cb.dataset.service;
				cb.checked = !!(service && data.addOns.includes(service));
			});

		const moveDateInput = document.querySelectorAll(
			'#fp4 input[type="date"]',
		)[0];
		if (moveDateInput) moveDateInput.value = data.moveDate;
		const altDateInput = document.querySelectorAll(
			'#fp4 input[type="date"]',
		)[1];
		if (altDateInput) altDateInput.value = data.alternateDate;
		setRadioByLabel('tSlot', data.timeSlot);
		const moveReasonSelect = document.querySelector('#fp4 select');
		if (moveReasonSelect) moveReasonSelect.value = data.moveReason;
		const specialNotesTextarea = document.querySelector('#fp4 textarea');
		if (specialNotesTextarea)
			specialNotesTextarea.value = data.specialNotes;

		const firstNameInput = document.querySelectorAll(
			'#fp5 input[type="text"]',
		)[0];
		if (firstNameInput) firstNameInput.value = data.firstName;
		const lastNameInput = document.querySelectorAll(
			'#fp5 input[type="text"]',
		)[1];
		if (lastNameInput) lastNameInput.value = data.lastName;
		const mobileInput = document.querySelectorAll(
			'#fp5 input[type="tel"]',
		)[0];
		if (mobileInput) mobileInput.value = data.mobile;
		const altMobileInput = document.querySelectorAll(
			'#fp5 input[type="tel"]',
		)[1];
		if (altMobileInput) altMobileInput.value = data.alternateMobile;
		const emailInput = document.querySelector('#fp5 input[type="email"]');
		if (emailInput) emailInput.value = data.email;

		document
			.querySelectorAll('#fp5 .flex-wrap input[type="checkbox"]')
			.forEach((cb) => {
				const txt = cb.parentElement.innerText.trim();
				if (data.preferredContact.includes(txt)) cb.checked = true;
			});
		document.querySelectorAll('.pay-card').forEach((card) => {
			const name = card.querySelector(
				'.text-xs.font-semibold',
			)?.innerText;
			if (name === data.paymentMethod) pickPay(card);
		});
		const howFoundSelect = document.querySelector('#fp5 select');
		if (howFoundSelect) howFoundSelect.value = data.howFound;
		const termsCheckbox = document.getElementById('termsCheckbox');
		if (termsCheckbox) termsCheckbox.checked = data.termsAccepted;

		if (data.currentStep && data.currentStep > 1)
			fGoTo(data.currentStep, true);
		schedulePriceUpdate();
	} catch (e) {
		console.warn('Failed to restore form state:', e);
	}

	[
		'puProv',
		'puDist',
		'puCity',
		'puWard',
		'drProv',
		'drDist',
		'drCity',
		'drWard',
	].forEach((id) => {
		const el = document.getElementById(id);
		if (el && (el.value === '' || el.value === null)) {
			if (el.tagName === 'SELECT') el.selectedIndex = 0;
			else el.value = '';
		}
	});
}

function clearFormState() {
	const storage = USE_LOCAL_STORAGE ? localStorage : sessionStorage;
	storage.removeItem(STORAGE_KEY);
}

// ========== VALIDATION ==========
const stepValidations = {
	1: function () {
		const puProv = document.getElementById('puProv')?.value,
			puDist = document.getElementById('puDist')?.value,
			puCity = document.getElementById('puCity')?.value,
			puWard = document.getElementById('puWard')?.value;
		const drProv = document.getElementById('drProv')?.value,
			drDist = document.getElementById('drDist')?.value,
			drCity = document.getElementById('drCity')?.value,
			drWard = document.getElementById('drWard')?.value;
		if (!puProv) {
			alert('Please select pickup province');
			return false;
		}
		if (!puDist) {
			alert('Please select pickup district');
			return false;
		}
		if (!puCity) {
			alert('Please enter pickup city/municipality');
			return false;
		}
		if (!puWard) {
			alert('Please enter pickup ward number');
			return false;
		}
		if (!drProv) {
			alert('Please select drop province');
			return false;
		}
		if (!drDist) {
			alert('Please select drop district');
			return false;
		}
		if (!drCity) {
			alert('Please enter drop city/municipality');
			return false;
		}
		if (!drWard) {
			alert('Please enter drop ward number');
			return false;
		}
		return true;
	},
	2: function () {
		const hasHomeSize = !!document.querySelector('input[name="hSize"]:checked');
		const hasItems = !!document.querySelector('#fp2 .item-chip.on');
		if (!hasHomeSize && !hasItems) {
			alert('Please select your home size or at least one item to move');
			return false;
		}
		return true;
	},
	3: () =>
		!!document.querySelector('input[name="veh"]:checked') ||
		(alert('Please select a vehicle type'), false),
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
		const allCheckboxes = document.querySelectorAll(
			'#fp5 input[type="checkbox"]',
		);
		let termsAccepted = false;
		for (let cb of allCheckboxes) {
			const label = cb.closest('label');
			if (label && label.innerText.includes('Terms of Service')) {
				termsAccepted = cb.checked;
				break;
			}
		}
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

function fGoTo(n, skipValidation = false) {
	if (n < 1 || n > fTotal) return;
	if (
		!skipValidation &&
		n > fCur &&
		(!stepValidations[fCur] || !stepValidations[fCur]())
	)
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
	if (n === 5 && !skipValidation) updatePriceDisplay();
	saveFormState();
}

// ── SUBMIT FORM ──
async function submitForm() {
	if (!stepValidations[5]()) return;

	var overlay = document.getElementById('loading-overlay');
	if (overlay) overlay.style.display = 'flex';

	try {
		const shipmentData = collectFormData();
		const { total, distanceKm, durationText } = await calculateTotalPrice();
		shipmentData.final_quote = total;
		shipmentData.distance_km = distanceKm;
		shipmentData.estimated_duration = durationText;
		const user = safeParse(localStorage.getItem('meroGharUser'), {});
		if (user.id) shipmentData.user_id = user.id;
		console.log('Submitting:', shipmentData);
		const response = await fetch(
			API_BASE_URL + '/api/shipment/create',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(shipmentData),
			},
		);
		const result = await response.json();
		if (overlay) overlay.style.display = 'none';
		if (!response.ok) {
			showToast(result.message || 'Failed to submit booking.', 'red');
			return;
		}

		if (result.payment_required && result.payment_data) {
			if (cachedDistanceData)
				sessionStorage.setItem(
					'pendingMapData',
					JSON.stringify(cachedDistanceData),
				);
			showPaymentOverlay(result);
			return;
		}
		showSuccessMessage(result.booking_id);
	} catch (error) {
		if (overlay) overlay.style.display = 'none';
		console.error(error);
		showToast('Failed to submit booking. Please check your connection.', 'red');
	}
}

function showSuccessMessage(bookingId) {
	clearFormState();
	const fp5 = document.getElementById('fp5');
	const fpConfirm = document.getElementById('fpConfirm');
	const formProgress = document.getElementById('formProgress');
	const bookIdSpan = document.getElementById('bookId');
	const mapContainer = document.getElementById('confirmation-map');
	const bookingSection = document.getElementById('booking');
	if (fp5) fp5.classList.add('hidden');
	if (fpConfirm) fpConfirm.classList.remove('hidden');
	if (formProgress) formProgress.style.width = '100%';
	for (let i = 1; i <= fTotal; i++) {
		const el = document.getElementById('sc' + i);
		if (el) {
			el.className = 's-circle s-done';
			el.textContent = '✓';
		}
	}
	if (bookIdSpan) bookIdSpan.textContent = bookingId;
	var mapData = cachedDistanceData;
	if (!mapData) {
		try {
			var pending = sessionStorage.getItem('pendingMapData');
			if (pending) mapData = JSON.parse(pending);
	} catch (e) {
		console.warn('Failed to save form state:', e);
	}
	}
	if (mapContainer && mapData) {
		try { showLeafletMap(mapContainer, mapData); }
		catch (e) { console.warn('Map render failed:', e); }
	}
	if (bookingSection)
		bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
	const bookings = safeParse(localStorage.getItem('myBookings'), []);
	bookings.push({ bookingId, date: new Date().toISOString() });
	localStorage.setItem('myBookings', JSON.stringify(bookings));
}

function showLeafletMap(container, distData) {
	if (typeof L === 'undefined') {
		container.innerHTML = '<p class="text-sm text-gray-500">Map unavailable — Leaflet library not loaded</p>';
		return;
	}
	try {
		container.innerHTML = '';
		var mapDiv = document.createElement('div');
		mapDiv.style.height = '250px';
		container.appendChild(mapDiv);
		var map = L.map(mapDiv).setView([27.7172, 85.324], 7);
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors',
		}).addTo(map);

		if (
			!distData.originCoords ||
			!distData.destinationCoords ||
			distData.distanceKm < 0.1
		) {
			if (distData.originCoords) {
				map.setView([distData.originCoords[1], distData.originCoords[0]], 15);
				L.marker([distData.originCoords[1], distData.originCoords[0]])
					.addTo(map)
					.bindPopup('Pickup & Drop (Same Location)')
					.openPopup();
			} else {
				L.marker([27.7172, 85.324])
					.addTo(map)
					.bindPopup('Location not available')
					.openPopup();
			}
			var etaP = document.createElement('p');
			etaP.className = 'text-forest-700 font-semibold text-sm mt-2';
			etaP.textContent = '\uD83D\uDCCD Pickup and drop are at the same location.';
			container.appendChild(etaP);
			return;
		}

		L.Routing.control({
			waypoints: [
				L.latLng(distData.originCoords[1], distData.originCoords[0]),
				L.latLng(distData.destinationCoords[1], distData.destinationCoords[0]),
			],
			router: L.Routing.osrmv1(),
			lineOptions: { styles: [{ color: '#1a371a', weight: 6 }] },
			show: false,
		}).addTo(map);

		var etaP = document.createElement('p');
		etaP.className = 'text-forest-700 font-semibold text-sm mt-2';
		etaP.textContent = '\u23F1\uFE0F Estimated travel time: ' + (distData.durationText || 'N/A');
		container.appendChild(etaP);
	} catch (e) {
		console.warn('Leaflet map error:', e);
		container.innerHTML = '<p class="text-sm text-gray-500">Could not load map</p>';
	}
}

// ── PAYMENT OVERLAY ──
function showPaymentOverlay(result) {
	const overlay = document.getElementById('payOverlay');
	if (!overlay) return;

	document.getElementById('payAmount').value = result.payment_data.amount || '';
	document.getElementById('payTxnUuid').value = result.payment_data.transaction_uuid || '';
	document.getElementById('payOrderId').value = result.payment_data.order_id || result.booking_id || '';
	document.getElementById('payCustomerName').value = result.payment_data.customer_name || '';
	document.getElementById('payCustomerEmail').value = result.payment_data.customer_email || '';
	document.getElementById('payCustomerPhone').value = result.payment_data.customer_phone || '';

	const amt = parseFloat(result.payment_data.amount || 0);
	document.getElementById('payAmountDisplay').textContent = 'Rs ' + amt.toLocaleString();

	document.getElementById('payMobile').value = '';
	document.getElementById('payPassword').value = '';
	hidePayError();

	overlay.classList.remove('hidden');

	const payForm = document.getElementById('payForm');
	const existingHandler = payForm._submitHandler;
	if (existingHandler) {
		payForm.removeEventListener('submit', existingHandler);
	}

	const handler = async function (e) {
		e.preventDefault();
		const mobile = document.getElementById('payMobile').value.trim();
		const password = document.getElementById('payPassword').value.trim();
		if (!/^\d{10}$/.test(mobile)) { showPayError('Please enter a valid 10-digit mobile number.'); return; }
		if (!password) { showPayError('Please enter your password.'); return; }

		const submitBtn = document.getElementById('paySubmit');
		submitBtn.disabled = true;
		submitBtn.innerHTML = '<span class="animate-spin">&#9696;</span> Processing...';
		hidePayError();
		try {
			const formData = new FormData(payForm);
			const response = await fetch(
				API_BASE_URL + '/api/payment/dummy/process',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: new URLSearchParams(formData).toString(),
				},
			);
			const paymentResult = await response.json();
			if (paymentResult.success) {
				overlay.classList.add('hidden');
				showSuccessMessage(paymentResult.booking_id || result.booking_id);
			} else {
				showPayError(paymentResult.message || 'Payment failed. Please try again.');
				submitBtn.disabled = false;
				submitBtn.innerHTML = 'Pay Now';
			}
		} catch (error) {
			console.error('Payment error:', error);
			showPayError('Payment processing error. Please check your connection and try again.');
			submitBtn.disabled = false;
			submitBtn.innerHTML = 'Pay Now';
		}
	};

	payForm._submitHandler = handler;
	payForm.addEventListener('submit', handler);

	document.getElementById('payCancel').onclick = function () {
		overlay.classList.add('hidden');
	};
}

function showPayError(msg) {
	const el = document.getElementById('payError');
	if (!el) return;
	el.textContent = msg;
	el.classList.remove('hidden');
}

function hidePayError() {
	const el = document.getElementById('payError');
	if (el) el.classList.add('hidden');
}

function collectFormData() {
	const pickupFloorSelect = document.getElementById('puFloor');
	const pickupLaneRadio = document.querySelector(
		'input[name="puLane"]:checked',
	);
	const dropFloorSelect = document.getElementById('drFloor');
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
			const service = cb.dataset.service;
			if (service) addOnServices.push(service);
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
		else if (lower.includes('connectips')) paymentMethod = 'connectips';
		else if (lower.includes('bank transfer')) paymentMethod = 'banktransfer';
		else if (lower.includes('bank to bank')) paymentMethod = 'banktransfer';
	}
	const howFoundSelect = document.querySelector('#fp5 select');
	const specialNotesTextarea = document.querySelector('#fp4 textarea');
	const puProvSelect = document.getElementById('puProv');
	const puDistSelect = document.getElementById('puDist');
	const drProvSelect = document.getElementById('drProv');
	const drDistSelect = document.getElementById('drDist');

	return {
		pickup_province:
			puProvSelect?.options[puProvSelect.selectedIndex]?.text || '',
		pickup_district:
			puDistSelect?.options[puDistSelect.selectedIndex]?.text || '',
		pickup_city: document.getElementById('puCity')?.value || '',
		pickup_ward: document.getElementById('puWard')?.value || '',
		pickup_floor: pickupFloorSelect?.value || '',
		pickup_lane_access: pickupLaneRadio?.parentElement?.innerText.includes(
			'Wide road',
		)
			? 'wide_road'
			: pickupLaneRadio?.parentElement?.innerText.includes('Narrow lane')
				? 'narrow_lane'
				: 'steps_only',
		drop_province:
			drProvSelect?.options[drProvSelect.selectedIndex]?.text || '',
		drop_district:
			drDistSelect?.options[drDistSelect.selectedIndex]?.text || '',
		drop_city: document.getElementById('drCity')?.value || '',
		drop_ward: document.getElementById('drWard')?.value || '',
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
	clearFormState();
	resetAllFormFields();
	document.getElementById('fpConfirm').classList.add('hidden');
	fCur = 1;
	fGoTo(1, true);
	setTimeout(() => updatePriceDisplay(), 50);
}

function resetAllFormFields() {
	document
		.querySelectorAll(
			'#fp1 input, #fp2 input, #fp3 input, #fp4 input, #fp5 input[type="text"], #fp5 input[type="tel"], #fp5 input[type="email"], #fp5 input[type="number"]',
		)
		.forEach((input) => {
			if (input.type === 'radio' || input.type === 'checkbox') return;
			input.value = '';
		});
	document
		.querySelectorAll(
			'#fp1 select, #fp2 select, #fp3 select, #fp4 select, #fp5 select',
		)
		.forEach((select) => (select.selectedIndex = 0));
	document
		.querySelectorAll('input[type="radio"]')
		.forEach((radio) => (radio.checked = false));
	document
		.querySelectorAll('input[type="checkbox"]')
		.forEach((cb) => (cb.checked = false));
	document.querySelectorAll('#fp2 .item-chip.on').forEach((chip) => {
		chip.classList.remove('on');
		const lbl = chip.querySelector('.chip-lbl');
		if (lbl) lbl.style.color = '';
	});
	document
		.querySelectorAll('.v-card.chosen')
		.forEach((card) => card.classList.remove('chosen'));
	document
		.querySelectorAll('.pay-card.picked')
		.forEach((card) => card.classList.remove('picked'));
	populateProvincesHardcoded('pu');
	populateProvincesHardcoded('dr');
	document.getElementById('puDist').innerHTML =
		'<option value="">— Select District —</option>';
	document.getElementById('drDist').innerHTML =
		'<option value="">— Select District —</option>';
	document.getElementById('puCity').value = '';
	document.getElementById('puWard').value = '';
	document.getElementById('drCity').value = '';
	document.getElementById('drWard').value = '';
	document.getElementById('puFloor').selectedIndex = 0;
	document.getElementById('drFloor').selectedIndex = 0;
	document
		.querySelectorAll('#fp2 textarea, #fp4 textarea')
		.forEach((ta) => (ta.value = ''));
}

// ── UI HELPERS ──
function tChip(el) {
	el.classList.toggle('on');
	const lbl = el.querySelector('.chip-lbl');
	if (lbl) lbl.style.color = el.classList.contains('on') ? '#f5a623' : '';
	updatePriceDisplay();
	saveFormState();
}
function pickVeh(inp) {
	document
		.querySelectorAll('.v-card')
		.forEach((c) => c.classList.remove('chosen'));
	const c = inp.closest('label').querySelector('.v-card');
	if (c) c.classList.add('chosen');
	updatePriceDisplay();
	saveFormState();
}
function pickPay(card) {
	document
		.querySelectorAll('.pay-card')
		.forEach((c) => c.classList.remove('picked'));
	card.classList.add('picked');
	saveFormState();
}
