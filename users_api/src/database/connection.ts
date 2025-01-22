import { createPool } from 'mysql2/promise';

const pool = createPool({
  host: 'localhost',
  user: 'admin',
  database: 'users_api',
  password: 'password',
  port: 3306,
});

export default pool;