import { getSettings, upsertSetting } from '../models/settingsModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';
import { ALLOWED_SETTINGS } from '../utils/validation.js';

export const getAppSettings = asyncHandler(async (req, res) => {
	const settings = await getSettings();
	res.json({ success: true, settings });
});

export const saveSettings = asyncHandler(async (req, res) => {
	const entries = req.body;
	if (!entries || typeof entries !== 'object' || Array.isArray(entries)) {
		throw new HttpError(400, 'Invalid settings data');
	}
	for (const [key, value] of Object.entries(entries)) {
		const validate = ALLOWED_SETTINGS[key];
		if (!validate) {
			throw new HttpError(400, `Unknown setting: ${key}`);
		}
		if (!validate(value)) {
			throw new HttpError(400, `Invalid value for setting: ${key}`);
		}
	}
	for (const [key, value] of Object.entries(entries)) {
		await upsertSetting(key, String(value));
	}
	res.json({ success: true, message: 'Settings saved' });
});
