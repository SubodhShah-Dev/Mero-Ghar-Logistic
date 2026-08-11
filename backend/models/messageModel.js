import pool from '../config/db.js';

export const getMessagesForShipment = async (shipmentId) => {
	const [rows] = await pool.execute(
		`SELECT m.*, u.name as sender_name
         FROM messages m
         LEFT JOIN users u ON m.sender_user_id = u.id
         WHERE m.shipment_id = ?
         ORDER BY m.created_at ASC, m.id ASC`,
		[shipmentId],
	);
	return rows;
};

export const insertMessage = async ({
	shipment_id,
	sender_user_id,
	sender_role,
	message,
}) => {
	const [result] = await pool.execute(
		`INSERT INTO messages (shipment_id, sender_user_id, sender_role, message)
         VALUES (?, ?, ?, ?)`,
		[shipment_id, sender_user_id, sender_role, message],
	);
	const [rows] = await pool.execute(
		`SELECT m.*, u.name as sender_name
         FROM messages m
         LEFT JOIN users u ON m.sender_user_id = u.id
         WHERE m.id = ?`,
		[result.insertId],
	);
	return rows[0];
};
