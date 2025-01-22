import pool from '../connection';
import { RowDataPacket } from 'mysql2';
import bcrypt from 'bcrypt';

export const createUser = async (username: string, email: string, password: string) => {
  const connection = await pool.getConnection();
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [rows] = await connection.execute(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );
    return rows;
  } finally {
    connection.release();
  }
};

export const getUser = async (field: string, value: string): Promise<RowDataPacket[]> => {
  const connection = await pool.getConnection();
  try {
    const query = `SELECT * FROM users WHERE ${field} = ?`;
    const [rows] = await connection.execute<RowDataPacket[]>(query, [value]);
    return rows;
  } finally {
    connection.release();
  }
};

