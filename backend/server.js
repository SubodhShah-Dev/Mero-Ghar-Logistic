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

import authRoute from './routes/authRoute.js';
import shipmentRoute from './routes/shipmentRoute.js';
import adminShipmentRoute from './routes/adminShipmentRoute.js';
import vendorRoute from './routes/vendorRoute.js';
import dummyPaymentRoutes from './routes/dummyPaymentRoutes.js';
import chatbotRoute from './routes/chatbotRoute.js';
import geocodeRoute from './routes/geocodeRoute.js';
import supportTicketRoute from './routes/supportTicketRoute.js';
import settingsRoute from './routes/settingsRoute.js';

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
	'http://localhost:5173',
	'http://localhost:5000',
	'http://127.0.0.1:5173',
	'http://127.0.0.1:5000',
	'https://backend-production-d51a3.up.railway.app',
];
app.use(cors({
	origin: function (origin, callback) {
		if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.railway.app')) {
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

app.use('/api/auth', authLimiter, authRoute);
app.use('/api/shipment', shipmentRoute);
app.use('/api/admin', adminShipmentRoute);
app.use('/api/vendor', vendorRoute);
app.use('/api/payment', dummyPaymentRoutes);
app.use('/api/chatbot', chatbotRoute);
app.use('/api/geocode', geocodeRoute);
app.use('/api/tickets', supportTicketRoute);
app.use('/api/settings', settingsRoute);

app.get('/', (req, res) => {
	res.json('Server running');
});

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
