const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
    port: process.env.MYSQL_PORT,
  });

  const connection = await pool.getConnection();
  
  connection.connect((err) => {
    if (err) throw err;
    console.log("Connecté à la base de données MySQL");
  });


  module.exports = connection;
