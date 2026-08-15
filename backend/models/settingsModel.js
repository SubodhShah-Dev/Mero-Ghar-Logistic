import pool from '../config/db.js';

export const getSettings = async () => {
	try {
		const [rows] = await pool.execute('SELECT setting_key, setting_value FROM settings');
		const settings = {};
		for (const row of rows) {
			settings[row.setting_key] = row.setting_value;
		}
		return settings;
	} catch (error) {
		console.error('Error fetching settings:', error);
		return {};
	}
};

export const upsertSetting = async (key, value) => {
	try {
		const upsertSql =
			'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = CURRENT_TIMESTAMP';
		await pool.execute(upsertSql, [key, value, value]);
		return true;
	} catch (error) {
		console.error('Error saving setting:', error);
		return false;
	}
};
