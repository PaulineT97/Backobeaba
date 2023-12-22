const mysql = require("mysql");

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "obeaba",
  });

  connection.connect((err) => {
    if (err) throw err;
    console.log("Connecté à la base de données MySQL");
  });


  module.exports = connection;
