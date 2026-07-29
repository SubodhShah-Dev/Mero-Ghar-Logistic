import { getSettings, upsertSetting } from '../models/settingsModel.js';

export const getAppSettings = async (req, res) => {
	try {
		const settings = await getSettings();
		res.json({ success: true, settings });
	} catch (error) {
		console.error('Error in getAppSettings:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

export const saveSettings = async (req, res) => {
	try {
		const entries = req.body;
		if (!entries || typeof entries !== 'object') {
			return res.status(400).json({ success: false, message: 'Invalid settings data' });
		}
		for (const [key, value] of Object.entries(entries)) {
			await upsertSetting(key, String(value));
		}
		res.json({ success: true, message: 'Settings saved' });
	} catch (error) {
		console.error('Error in saveSettings:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};
