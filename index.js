const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cookie = require("cookie-parser");
require("dotenv").config();

app.use(express.json({ limit: "5000mb" }));

app.use(express.json());
app.use(bodyParser.json());
app.use(cookie());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://frontobeaba.vercel.app");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, PATCH");
  res.header("Access-Control-Allow-Headers", 'X-Requested-With,content-type');
  res.header("Access-Control-Allow-Credentials", true);
  next();
});

const port = process.env.MYSQL_PORT;


require("./database");
const routes = require("./routes");
app.use(routes);

// gestion des routes non reconnues
// app.use("*", (req, res) => {
//   res.status(404).end();
// });


app.listen(port, "0.0.0.0", () => {
  console.log(`serveur Node écoutant sur le port ${port}`);
});
