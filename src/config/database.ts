import mysql from 'mysql2/promise';
import logger from '../utils/logger';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const testConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query('SELECT 1');
      logger.info('Database connection established successfully.', { tag: 'DATABASE' });
      return { success: true };
    } finally {
      connection.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    logger.error(`Database connection failed: ${message}`, { tag: 'DATABASE' });
    return { success: false, error: message };
  }
};

export default pool;
