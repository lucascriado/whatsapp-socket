import dotenv from 'dotenv'
import mysql from 'mysql2/promise'

dotenv.config()

const connection = mysql.createConnection({
	host: process.env.DB_HOST,
	port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME
})

console.log(connection, 'connection')

export default connection