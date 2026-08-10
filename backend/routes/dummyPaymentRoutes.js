import express from 'express';
import pool from '../config/db.js';
import { processDummyPayment } from '../services/dummyPaymentService.js';

const router = express.Router();

router.post(
	'/dummy/process',
	express.urlencoded({ extended: true }),
	async (req, res) => {
		if (!req.body || Object.keys(req.body).length === 0) {
			return res.status(400).json({ success: false, message: 'No form data received' });
		}

		const result = await processDummyPayment(req.body);

		if (result.success) {
			try {
				// Demo only: mark the booking as paid but leave status 'pending'
				// so it can advance through the admin/vendor state machine
				// (pending -> accepted -> in_transit -> delivered).
				await pool.execute(
					`UPDATE shipments SET payment_status = 'paid' WHERE transaction_id = ? AND status = 'pending'`,
					[result.transaction_id],
				);
			} catch (dbError) {
				console.error('DB update error:', dbError);
				return res.status(500).json({ success: false, message: 'Database update failed' });
			}
			return res.status(200).json({
				success: true,
				message: 'Payment successful',
				transaction_id: result.transaction_id,
				booking_id: result.order_id,
			});
		} else {
			return res.status(400).json({ success: false, message: result.message || 'Payment failed' });
		}
	},
);

export default router;
