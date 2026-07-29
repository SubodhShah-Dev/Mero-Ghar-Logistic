import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
	host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
	user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
	password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
	database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'meroghar_db',
	port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306'),
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
});

// Test connection
const testConnection = async () => {
	try {
		const connection = await pool.getConnection();
		console.log('Database connected successfully');
		connection.release();
	} catch (error) {
		console.error('Database connection failed:', error);
	}
};

testConnection();

export default pool;
