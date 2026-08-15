export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^[0-9]{10}$/;

const ALLOWED_VEHICLE_TYPES = ['Cargo Tempo', 'Mini Truck', 'Large Truck'];
const ALLOWED_PAYMENT_METHODS = ['esewa', 'khalti', 'imepay', 'connectips', 'cash'];
export const ALLOWED_SHIPMENT_STATUSES = ['pending', 'accepted', 'in_transit', 'delivered', 'cancelled'];
export const ALLOWED_APPROVAL_STATUSES = ['pending', 'approved', 'rejected'];

export const TICKET_SUBJECT_MAX = 200;
export const TICKET_MESSAGE_MAX = 2000;

// The only settings keys the platform understands, with a value validator.
// Save calls are rejected (naming the key) when a value fails.
export const ALLOWED_SETTINGS = {
	platform_commission_pct: (v) => {
		const n = Number(v);
		return Number.isFinite(n) && n >= 0 && n <= 100;
	},
};

// Normalize a Nepali number plate to its canonical form "BA 1 KA 1234"
// (uppercase, single spaces). Accepts the provincial format in any spacing,
// e.g. "ba 2 pa 9876", "BA-1-KA-1234", "BA1KA1234". Returns null when the
// plate does not match the strict modern provincial format.
export const normalizePlateNumber = (plate) => {
	const s = String(plate || '')
		.toUpperCase()
		.replace(/[-\s]+/g, ' ')
		.trim();
	const m = s.match(/^(KH|JA|BA|GA|LU|KA|SU)\s?(\d{1,2})\s?([A-Z]{1,2})\s?(\d{1,4})$/);
	if (!m) return null;
	return `${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
};

export const validateVehicleInput = (body = {}) => {
	const {
		name,
		plate_number,
		vehicle_type,
		capacity_tonnes,
		driver_name,
		driver_phone,
	} = body;

	if (!name || !String(name).trim()) {
		return 'Vehicle name is required';
	}
	if (String(name).trim().length > 100) {
		return 'Vehicle name must be at most 100 characters';
	}
	if (!plate_number || normalizePlateNumber(plate_number) === null) {
		return 'A valid plate number is required (e.g. BA 1 KA 1234)';
	}
	if (!vehicle_type || !ALLOWED_VEHICLE_TYPES.includes(vehicle_type)) {
		return 'A valid vehicle type is required';
	}
	const capacity = Number(capacity_tonnes);
	if (capacity === null || capacity === undefined || !Number.isFinite(capacity) || capacity <= 0 || capacity > 50) {
		return 'Capacity must be a number between 0 and 50 tonnes';
	}
	if (driver_name && String(driver_name).length > 100) {
		return 'Driver name must be at most 100 characters';
	}
	if (driver_phone && !PHONE_REGEX.test(String(driver_phone))) {
		return 'Driver phone must be exactly 10 digits';
	}

	return null;
};

export const validateVendorProfileInput = (body = {}) => {
	const { business_name, owner_name, phone } = body;
	if (!business_name || !String(business_name).trim()) {
		return 'Business name is required';
	}
	if (!owner_name || !String(owner_name).trim()) {
		return 'Owner name is required';
	}
	if (!phone || !PHONE_REGEX.test(String(phone))) {
		return 'A valid 10-digit mobile number is required';
	}
	if (body.address && String(body.address).length > 500) {
		return 'Address is too long';
	}
	if (body.service_region && String(body.service_region).length > 500) {
		return 'Service region is too long';
	}
	return null;
};

export const validateShipmentInput = (body) => {
	const {
		first_name,
		mobile_number,
		email,
		pickup_province,
		pickup_district,
		drop_province,
		drop_district,
		vehicle_type,
		move_date,
		payment_method,
		alternate_mobile,
	} = body;

	if (!first_name || !String(first_name).trim()) {
		return 'First name is required';
	}
	if (!mobile_number || !PHONE_REGEX.test(String(mobile_number))) {
		return 'A valid 10-digit mobile number is required';
	}
	if (alternate_mobile && !PHONE_REGEX.test(String(alternate_mobile))) {
		return 'Alternate mobile must be exactly 10 digits';
	}
	if (email && !EMAIL_REGEX.test(String(email))) {
		return 'A valid email is required';
	}
	if (!pickup_province || !pickup_district) {
		return 'Pickup province and district are required';
	}
	if (!drop_province || !drop_district) {
		return 'Drop province and district are required';
	}
	if (!vehicle_type || !ALLOWED_VEHICLE_TYPES.includes(vehicle_type)) {
		return 'A valid vehicle type is required';
	}
	if (!move_date) {
		return 'Move date is required';
	}
	if (payment_method && !ALLOWED_PAYMENT_METHODS.includes(payment_method)) {
		return 'Invalid payment method';
	}

	return null;
};
