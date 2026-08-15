import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '.env') });

import { init as initDb } from './config/db.js';
import authRoute from './routes/authRoute.js';
import shipmentRoute from './routes/shipmentRoute.js';
import adminShipmentRoute from './routes/adminShipmentRoute.js';
import vendorRoute from './routes/vendorRoute.js';
import dummyPaymentRoutes from './routes/dummyPaymentRoutes.js';
import chatbotRoute from './routes/chatbotRoute.js';
import geocodeRoute from './routes/geocodeRoute.js';
import supportTicketRoute from './routes/supportTicketRoute.js';
import settingsRoute from './routes/settingsRoute.js';
import orgRoute from './routes/orgRoute.js';
import { HttpError } from './utils/HttpError.js';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
	'http://localhost:5000',
	'http://127.0.0.1:5000',
	'http://10.0.2.2:5000',
];
app.use(cors({
	origin: function (origin, callback) {
		if (!origin || allowedOrigins.includes(origin)) {
			callback(null, true);
		} else {
			callback(new Error('Not allowed by CORS'));
		}
	},
}));
app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 20,
	message: { success: false, message: 'Too many attempts, try again later' },
	standardHeaders: true,
	legacyHeaders: false,
});

// Generous public-endpoint limiters: they only stop abuse, never legit app use.
const publicLimiter = (max) =>
	rateLimit({
		windowMs: 15 * 60 * 1000,
		max,
		message: { success: false, message: 'Too many requests, try again later' },
		standardHeaders: true,
		legacyHeaders: false,
	});

app.use('/api/auth', authLimiter, authRoute);
app.use('/api/shipment', shipmentRoute);
app.use('/api/admin', adminShipmentRoute);
app.use('/api/vendor', vendorRoute);
app.use('/api/payment', dummyPaymentRoutes);
app.use('/api/chatbot', publicLimiter(300), chatbotRoute);
app.use('/api/geocode', publicLimiter(120), geocodeRoute);
app.use('/api/tickets', supportTicketRoute);
app.use('/api/settings', settingsRoute);
app.use('/api/admin', orgRoute);

app.get('/', (req, res) => {
	res.json('Server running');
});

// 404 handler for unknown routes
app.use((req, res) => {
	res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
	if (err instanceof HttpError) {
		return res
			.status(err.status)
			.json({ success: false, message: err.message });
	}
	console.error('Unhandled error:', err);
	res.status(500).json({ success: false, message: 'Internal server error' });
});

initDb()
	.then(() => {
		app.listen(PORT, () => {
			console.log(`Server running on http://localhost:${PORT}`);
		});
	})
	.catch((err) => {
		console.error('Failed to initialize database:', err);
		process.exit(1);
	});
