// backend/services/dummyPaymentService.js
export const processDummyPayment = async (paymentData) => {
	console.log('Dummy payment received:', paymentData);
	const { mobile, password, amount, transaction_uuid, order_id } =
		paymentData;

	if (!mobile || !mobile.trim())
		return { success: false, message: 'Mobile number is required.' };
	if (!password || !password.trim())
		return { success: false, message: 'Password is required.' };

	return {
		success: true,
		message: 'Payment successful!',
		transaction_id: transaction_uuid,
		pidx: `DUMMY_${Date.now()}`,
		order_id: order_id, // ⬅️ ADD THIS LINE
	};
};
