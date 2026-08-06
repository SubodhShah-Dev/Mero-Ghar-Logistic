export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^[0-9]{10}$/;

export const ALLOWED_VEHICLE_TYPES = ['Cargo Tempo', 'Mini Truck', 'Large Truck'];
export const ALLOWED_PAYMENT_METHODS = ['esewa', 'khalti', 'imepay', 'connectips', 'cash'];
export const ALLOWED_SHIPMENT_STATUSES = ['pending', 'accepted', 'in_transit', 'delivered', 'cancelled'];
export const ALLOWED_APPROVAL_STATUSES = ['pending', 'approved', 'rejected'];

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
