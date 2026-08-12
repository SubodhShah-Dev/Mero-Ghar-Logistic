import pool from '../config/db.js';

export const createTicket = async (vendorId, subject, message) => {
	try {
		const [result] = await pool.execute(
			'INSERT INTO support_tickets (vendor_id, subject, message) VALUES (?, ?, ?)',
			[vendorId, subject, message],
		);
		return result.insertId;
	} catch (error) {
		console.error('Error creating support ticket:', error);
		return null;
	}
};

export const getTicketsByVendor = async (vendorId) => {
	try {
		const [rows] = await pool.execute(
			'SELECT * FROM support_tickets WHERE vendor_id = ? ORDER BY created_at DESC',
			[vendorId],
		);
		return rows;
	} catch (error) {
		console.error('Error fetching tickets:', error);
		return [];
	}
};

export const getAllTickets = async (branchFilter = null) => {
	try {
		const params = [];
		let where = 'WHERE 1 = 1';
		if (branchFilter?.restricted) {
			where = `WHERE v.branch_id IN (${branchFilter.params.map(() => '?').join(', ')})`;
			params.push(...branchFilter.params);
		}
		const [rows] = await pool.execute(
			`SELECT st.*, v.business_name, b.name AS branch_name
       FROM support_tickets st
       JOIN vendors v ON v.id = st.vendor_id
       LEFT JOIN branches b ON b.id = v.branch_id
       ${where}
       ORDER BY st.created_at DESC`,
			params,
		);
		return rows;
	} catch (error) {
		console.error('Error fetching all tickets:', error);
		return [];
	}
};

export const getTicketById = async (id) => {
	try {
		const [rows] = await pool.execute(
			`SELECT st.*, v.branch_id, v.business_name FROM support_tickets st
       JOIN vendors v ON v.id = st.vendor_id
       WHERE st.id = ?`,
			[id],
		);
		return rows[0];
	} catch (error) {
		console.error('Error fetching ticket:', error);
		return null;
	}
};

export const updateTicketStatus = async (id, status) => {
	try {
		const [result] = await pool.execute(
			'UPDATE support_tickets SET status = ? WHERE id = ?',
			[status, id],
		);
		return result.affectedRows > 0;
	} catch (error) {
		console.error('Error updating ticket status:', error);
		return false;
	}
};
