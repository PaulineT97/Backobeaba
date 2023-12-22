const router = require("express").Router();
const connection = require("../../database");

//NOTE - gestion des EDUCATEURS 

router.get("/getCertifications", (req, res) => {
    try {
        const sqlSelect = "SELECT * FROM certification";
        connection.query(sqlSelect, (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).json({ error: "Internal Server Error" });
                return;
            } else {
                const data = result;
                console.log(data);
                res.json(data);
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post("/updateCertification", (req, res) => {
    const idEduc = req.body.idEduc;
    const certification = req.body.certification;
    console.log(`received request to update educator ${idEduc} with certification ${certification}`);

    const updateSql = `UPDATE possede SET idCertification = ? WHERE idEduc = ${idEduc}`;
    const values = certification;
    connection.query(updateSql, values, async (err, result) => {
        if (err) throw err;
        let resultBack = req.body;
        let message = { messageGood: "La certification a bien été modifiée" }
        res.send(message)
    })
})

router.post("/addEducator", async (req, res) => {
    const { nom, certification, introduction, photo } = req.body;

    console.log(req.body);

    const newEduc = [];
    // Démarrer une transaction pour garantir la cohérence des données
    try {
        // Insérer l'éducateur
        const sqlEducateur = "INSERT INTO educateurs (nom, introduction, photo) VALUES (?,?,?)";
        const valuesEducateur = [nom, introduction, photo];

        connection.query(sqlEducateur, valuesEducateur, (err, result) => {
            if (err) throw err;
            let resultBack = req.body;
            resultBack.id = result.insertId;

            const nouvellementAjouteIdEducateur = result.insertId;
            console.log("Resultat de l'éducateur:", result);
            console.log("Nouvel ID de l'éducateur:", nouvellementAjouteIdEducateur);

            // Insérer la certification en utilisant l'identifiant de l'éducateur
            const sqlCertification = "INSERT INTO possede (idCertification, idEduc) VALUES (?,?)";
            const valuesCertification = [certification, nouvellementAjouteIdEducateur];

            connection.query(sqlCertification, valuesCertification);

            // Utiliser l'identifiant pour récupérer l'éducateur nouvellement ajouté
            const nouvelEducateur = (connection.query("SELECT * FROM educateurs WHERE idEduc = ?", [nouvellementAjouteIdEducateur]))[0];

            newEduc.push(nouvelEducateur)

        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de l'ajout de l'éducateur et de sa certification." });
    }
    let message = { messageGood: "L'éducateur a bien été ajouté", newEduc };
    res.send(message);
});

router.delete('/deleteEducateur/:educateurId', async (req, res) => {
    const educateurId = req.params.educateurId;

    // try {
    const deleteEducCertification = `DELETE FROM possede WHERE idEduc = ?`;
    connection.query(deleteEducCertification, educateurId, (err, result) => {
        if (err) throw err;

        const deleteEducateur = `DELETE FROM educateurs WHERE idEduc = ?`;
        connection.query(deleteEducateur, educateurId, (err, result) => {
            if (err) throw err;

            let message = { messageGood: "L'éducateur a été supprimé avec succès." };
            // res.status(200).json(message);
            res.send(message);
        });
    });
    // } catch (error) {
    //     console.error('Erreur lors de la suppression de l\'éducateur:', error);
    //     res.status(500).json({ message: 'Erreur lors de la suppression de l\'éducateur.' });
    // }
});

//NOTE - gestion des ADHERENTS

router.get("/getAdherents", (req, res) => {
    try {
        const sqlSelect = "SELECT adherents.idAdher, adherents.nom, adherents.prenom, adherents.email, adherents.admin FROM adherents";
        connection.query(sqlSelect, (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).json({ error: "Internal Server Error" });
                return;
            } else {
                const data = result;
                console.log(data);
                res.json(data);
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.delete('/deleteAdherent/:adherentId', async (req, res) => {
    const adherentId = req.params.adherentId;

    console.log(adherentId);

    // Requête SELECT pour récupérer les idChien liés à l'adhérent
    const selectChiensQuery = "SELECT idChien FROM chiens WHERE idAdher = ?";
    connection.query(selectChiensQuery, [adherentId], (err, chiens) => {
        if (err) {
            throw err;
        }

        // Récupérez les idChien avant d'exécuter la requête DELETE
        const idChiensASupprimer = chiens.map(chien => chien.idChien);
        console.log(idChiensASupprimer);

        // Vérifier si l'adhérent a des chiens avant d'exécuter la requête DELETE
        if (idChiensASupprimer.length > 0) {
            // Requête DELETE pour supprimer les entrées de la table "pratiquer" liées aux chiens
            const deletePratiquerQuery = "DELETE FROM pratiquer WHERE idChien IN (?)";
            connection.query(deletePratiquerQuery, [idChiensASupprimer], (err, result) => {
                if (err) throw err;

                // Requête DELETE pour supprimer les chiens liés à l'adhérent
                const deleteChiensQuery = "DELETE FROM chiens WHERE idAdher = ?";
                connection.query(deleteChiensQuery, [idAd], (err, result) => {
                    if (err) throw err;
                });
            });
        }
        // Requête DELETE pour supprimer l'adhérent
        const deleteAdherentQuery = "DELETE FROM adherents WHERE idAdher = ?";
        connection.query(deleteAdherentQuery, [adherentId], (err, result) => {
            if (err) throw err;

            // Si toutes les opérations se déroulent sans erreur, on commit la transaction
            connection.commit((err) => {
                if (err) throw err;

                let message = { messageGood: "L'adhérent a été supprimé" }
                res.send(message);

            });

        });

    });
});


//NOTE - gestion des CHIENS

router.get("/getDogs", (req, res) => {
    try {
        const sqlSelect = "SELECT chiens.idChien, chiens.nomChien, chiens.naissance, chiens.race, pratiquer.level, activites.nomActivites FROM chiens LEFT JOIN pratiquer ON chiens.idChien = pratiquer.idChien LEFT JOIN activites ON pratiquer.idActivites = activites.idActivites";
        connection.query(sqlSelect, (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).json({ error: "Internal Server Error" });
                return;
            } else {
                const data = result;
                console.log(data);
                res.json(data);
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;