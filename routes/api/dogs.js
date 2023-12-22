const router = require("express").Router();
const connection = require("../../database");


router.post("/addDog", async (req, res) => {
  const { idAdher, chiens } = req.body;

  if (!Array.isArray(chiens)) {
    return res.status(400).json({ message: 'La liste des chiens est invalide.' });
  }

  const nouveauxChiens = [];

  for (const c of chiens) {
    const sqlDog = "INSERT INTO chiens (nomChien, naissance, race, idAdher) VALUES (?,?,?,?)";
    const valuesDog = [c.nomChien, c.naissance, c.race, idAdher];

    try {
      const result = await connection.query(sqlDog, valuesDog);

      const nouvellementAjouteId = result.insertId;

      // Utilisez l'identifiant pour récupérer le chien nouvellement ajouté
      const nouveauChien = (await connection.query("SELECT * FROM chiens WHERE idChien = ?", [nouvellementAjouteId]))[0];

      nouveauxChiens.push(nouveauChien);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur lors de l\'ajout des chiens.' });
    }
  }

  let message = { messageGood: "Vos modifications ont bien été prises en compte", nouveauxChiens };
  res.send(message);
});


router.post("/deleteDog", (req, res) => {
  const idChien = req.body.idChien;
  console.log(req.body.idChien);

  const deleteDogSql = "DELETE FROM chiens WHERE idChien = ?";
  const deletePratiquerSql = "DELETE FROM pratiquer WHERE idChien = ?";

  connection.query(deletePratiquerSql, idChien, (err, result) => {
    if (err) throw err;

    connection.query(deleteDogSql, idChien, (err, result) => {
      if (err) throw err;

      let message = { messageGood: "Vos modifications ont bien été prises en compte" }
      res.send(message);
    });
  });
});

router.get("/getActivities", (req, res) => {
  const sql = `SELECT * FROM activites`;
  connection.query(sql, (err, result) => {
    if (err) throw err;
    console.log("activités récupérées");
    console.log(result);
    res.send(JSON.stringify(result));
  });
});


router.post("/addActivity", async (req, res) => {
  const activites = req.body.activites;
  console.log(req.body);

  try {
    for (const a of activites) {
      // Requête pour vérifier la présence d'une ligne avec les mêmes valeurs
      const sqlCheckDuplicate =
        "SELECT * FROM pratiquer WHERE idChien = ? AND idActivites = ? AND level = ?";
      const valuesCheck = [a.chien, a.activite, a.level];

      // Exécute la requête de vérification
      const rows = await new Promise((resolve, reject) => {
        connection.query(sqlCheckDuplicate, valuesCheck, (err, rows) => {
          if (err) {
            console.error(err);
            reject(err);
          }
          resolve(rows);
        });
      });

      // Si une ligne avec les mêmes valeurs existe déjà, renvoie un message d'erreur
      if (rows.length > 0) {
        console.log(`Duplicata détecté pour l'activité du chien ${a.chien}`);
        return res.status(409).json({
          message: `Duplicata détecté pour l'activité du chien ${a.chien}`,
        });
      }

      // Aucun duplicata détecté, procède à l'insertion
      const sqlInsert =
        "INSERT INTO pratiquer (idChien, idActivites, level) VALUES (?,?,?)";
      const valuesInsert = [a.chien, a.activite, a.level];

      // Exécute la requête pour insérer l'activité
      await new Promise((resolve, reject) => {
        connection.query(sqlInsert, valuesInsert, (err) => {
          if (err) {
            console.error(err);
            reject(err);
          }
          console.log(`Activité ajoutée pour le chien ${a.chien}`);
          resolve();
        });
      });
    }

    let message = {
      messageGood: "Vos modifications ont bien été prises en compte",
    };
    res.send(message);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erreur lors de l'ajout des activités." });
  }
});

module.exports = router;