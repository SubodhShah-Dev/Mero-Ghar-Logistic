import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Register routes
app.use('/api/auth', authRoute);
app.use('/api/shipment', shipmentRoute);
app.use('/api/admin', adminShipmentRoute);
app.use('/api/vendor', vendorRoute);
app.use('/api/payment', dummyPaymentRoutes);
app.use('/api/chatbot', chatbotRoute);

app.get('/', (req, res) => {
	res.json('Server running');
});

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
