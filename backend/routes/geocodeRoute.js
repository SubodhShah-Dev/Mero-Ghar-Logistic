import express from 'express';

const router = express.Router();

const ORS_API_KEY = process.env.ORS_API_KEY;
const ORS_GEOCODE_URL = 'https://api.openrouteservice.org/geocode/search';
const ORS_MATRIX_URL = 'https://api.openrouteservice.org/v2/matrix/driving-car';

router.get('/search', async (req, res) => {
	const { text } = req.query;
	if (!text) {
		return res.status(400).json({ error: 'Missing query parameter: text' });
	}
	if (!ORS_API_KEY) {
		return res.status(500).json({ error: 'ORS API key not configured' });
	}
	const url = `${ORS_GEOCODE_URL}?api_key=${ORS_API_KEY}&text=${encodeURIComponent(text)}&boundary.country=NP`;
	try {
		const response = await fetch(url);
		const data = await response.json();
		res.json(data);
	} catch (err) {
		console.error('Geocode proxy error:', err.message);
		res.status(502).json({ error: 'Failed to fetch from ORS' });
	}
});

router.post('/matrix', async (req, res) => {
	const { locations } = req.body;
	if (!locations || !Array.isArray(locations) || locations.length < 2) {
		return res.status(400).json({ error: 'Need at least 2 locations' });
	}
	if (!ORS_API_KEY) {
		return res.status(500).json({ error: 'ORS API key not configured' });
	}
	const body = { locations, metrics: ['distance', 'duration'], units: 'km' };
	try {
		const response = await fetch(ORS_MATRIX_URL, {
			method: 'POST',
			headers: {
				Authorization: ORS_API_KEY,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});
		if (!response.ok) throw new Error(`ORS error ${response.status}`);
		const data = await response.json();
		res.json(data);
	} catch (err) {
		console.error('Matrix proxy error:', err.message);
		res.status(502).json({ error: 'Failed to fetch distance matrix' });
	}
});

export default router;
