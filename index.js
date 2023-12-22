const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cookie = require("cookie-parser");

app.use(express.json({ limit: "5000mb" }));

app.use(express.json());
app.use(bodyParser.json());
app.use(cookie());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, PATCH");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

const port = 8000;

require("./database");
const routes = require("./routes");
app.use(routes);

// gestion des routes non reconnues
// app.use("*", (req, res) => {
//   res.status(404).end();
// });


app.listen(port, () => {
  console.log(`serveur Node écoutant sur le port ${port}`);
});
