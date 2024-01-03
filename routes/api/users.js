const router = require("express").Router();
const bcrypt = require("bcrypt");
const jsonwebtoken = require("jsonwebtoken");
const { key, keyPub } = require("../../keys");
const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.USER_MAIL,
        pass: process.env.USER_PASS,
    }
})
const connection = require("../../database");


router.post("/login", (req, res) => {
    const { email, motdepasse } = req.body;
    const sqlVerify = `SELECT * FROM adherents WHERE email= ?`;
    connection.query(sqlVerify, [email], (err, result) => {
        try {
            if (result.length > 0) {
                if (bcrypt.compareSync(motdepasse, result[0].motdepasse)) {
                    const token = jsonwebtoken.sign({}, key, {
                        subject: result[0].idAdher.toString(),
                        expiresIn: 12 * 60 * 60 * 1000,
                        algorithm: "RS256",
                    });
                    res.cookie("token", token, { maxAge: 12 * 60 * 60 * 1000 });

                    // nb jours * nb heures par jour * nb minutes par heure * nb secondes par minute * nb millisecondes par seconde
                    // les éléments sont ajoutés de la droite vers la gauche

                    let idAd = result[0].idAdher;
                    const sqlData = `SELECT adherents.idAdher, adherents.nom, adherents.prenom, adherents.email, adherents.admin, chiens.idChien, chiens.nomChien, chiens.naissance, chiens.race, pratiquer.level, activites.nomActivites FROM adherents LEFT JOIN chiens ON adherents.idAdher = chiens.idAdher LEFT JOIN pratiquer ON chiens.idChien = pratiquer.idChien LEFT JOIN activites ON pratiquer.idActivites = activites.idActivites WHERE adherents.idAdher = ?`;
                    connection.query(sqlData, [idAd], (err, result) => {
                        if (err) throw err;
                        let connectedUser = {
                            adherent: {
                                idAdher: result[0].idAdher,
                                nom: result[0].nom,
                                prenom: result[0].prenom,
                                email: result[0].email,
                                admin: result[0].admin,
                            },
                        };

                        // Vérifie s'il y a des chiens associés
                        const hasDogs = result.some((row) => row.idChien !== null);
                        console.log(hasDogs);
                        if (hasDogs) {
                            connectedUser.chiens = result.map((row) => ({
                                idChien: row.idChien,
                                nomChien: row.nomChien,
                                naissance: row.naissance,
                                race: row.race,
                                activites: result
                                    .filter(
                                        (act) => act.idChien === row.idChien && row.idChien !== null
                                    )
                                    .map((act) => ({
                                        nomActivites: act.nomActivites,
                                        level: act.level,
                                    })),
                            }));
                        }

                        res.json(connectedUser);
                    })
                } else {
                    res.status(400).json("Email et/ou mot de passe incorrects");
                }
            } else {
                res.status(400).json("Email et/ou mot de passe incorrects");
            }
        } catch (error) {
            console.log(error);
        }
    });
});

router.post("/register", (req, res) => {
    const { nom, prenom, email, motdepasse, chiens } = req.body;
    const verifyMailSql = `SELECT * FROM adherents WHERE email="${email}"`;
    connection.query(verifyMailSql, [email], async (err, result) => {
        if (err) throw err;
        if (result.length) {
            let message = { message: "Cet email est déjà associé à un compte" };
            res.send(message)
        } else {
            const mdpHashed = await bcrypt.hash(motdepasse, 10);
            const sqlInsert = "INSERT INTO adherents (nom, prenom, email, motdepasse)VALUES(?,?,?,?)";
            const values = [nom, prenom, email, mdpHashed];
            connection.query(sqlInsert, values, (err, result) => {
                if (err) throw err;
                let resultBack = req.body;
                resultBack.id = result.insertId;
                {
                    if (Array.isArray(req.body.chiens)) {
                        req.body.chiens.map((c) => {

                            const sqlDog = "INSERT INTO chiens (nomChien, naissance, race, idAdher) VALUES (?,?,?,?)";
                            const valuesDog = [c.nomChien, c.naissance, c.race, resultBack.id];
                            connection.query(sqlDog, valuesDog, (err, result) => {
                                if (err) throw err;
                            })
                            let dogBack = req.body;
                            dogBack.id = result.insertId;
                        })
                    }
                }
                let message = { messageGood: "inscription réussie, vous allez être redirigé" }
                res.send(message)
            }
            )

        }
    })
})

router.patch("/update", (req, res) => {
    console.log("Received request to update:", req.body);
    const idAd = req.body.idAdher;
    const { nom, prenom, email } = req.body;
    const verifyMailSql = `SELECT idAdher, email FROM adherents WHERE email = ? AND idAdher != ?`;
    connection.query(verifyMailSql, [email, idAd], async (err, result) => {
        if (err) throw err;
        if (result.length > 0) {

            let message = { message: "Cet email est déjà associé à un compte" };
            res.send(message)

        } else {
            const updateSql = `UPDATE adherents SET nom = ?, prenom = ?, email = ? WHERE idAdher="${idAd}"`;
            const values = [nom, prenom, email];
            connection.query(updateSql, values, async (err, result) => {
                if (err) throw err;
                let resultBack = req.body;
                let message = { messageGood: "Vos informations ont bien été modifiées" }
                res.send(message)
            }
            )

        }
    })
})

router.post("/changePassword/:email", async (req, res) => {

    const email = req.params.email;
    const motdepasse = req.body.motdepasse;

    try {
        const verifyUserSql = `SELECT * FROM adherents WHERE email="${email}"`;
        connection.query(verifyUserSql, async (err, result) => {
            if (err) throw err;

            if (result.length === 0) {
                let message = { message: "Utilisateur non trouvé" };
                return res.status(404).json(message);
            }

            const mdpHashed = await bcrypt.hash(motdepasse, 10);

            const updateSql = `UPDATE adherents SET motdepasse = ? WHERE email="${email}"`;
            connection.query(updateSql, [mdpHashed], (err, result) => {
                if (err) throw err;
                let message = { messageGood: "Votre mot de passe a bien été modifié" };
                res.json(message);
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

//NOTE - récupérer les infos du user lors de sa connexion 

router.get("/userConnected", (req, res) => {
    const { token } = req.cookies;
    if (token) {
        try {
            const decodedToken = jsonwebtoken.verify(token, keyPub, {
                algorithms: "RS256",
            });
            const sqlSelect = `SELECT adherents.idAdher, adherents.nom, adherents.prenom, adherents.email, adherents.admin, chiens.idChien, chiens.nomChien, chiens.naissance, chiens.race, pratiquer.level, activites.nomActivites FROM adherents LEFT JOIN chiens ON adherents.idAdher = chiens.idAdher LEFT JOIN pratiquer ON chiens.idChien = pratiquer.idChien LEFT JOIN activites ON pratiquer.idActivites = activites.idActivites WHERE adherents.idAdher = ?`;

            connection.query(sqlSelect, [decodedToken.sub], (err, result) => {
                if (err) throw err;
                console.log({ result });
                if (result.length > 0) {
                    let connectedUser = {
                        adherent: {
                            idAdher: result[0].idAdher,
                            nom: result[0].nom,
                            prenom: result[0].prenom,
                            email: result[0].email,
                            admin: result[0].admin,
                        },
                    };

                    // Vérifie s'il y a des chiens associés
                    const hasDogs = result.some((row) => row.idChien !== null);
                    console.log(hasDogs);
                    if (hasDogs) {
                        connectedUser.chiens = result.map((row) => ({
                            idChien: row.idChien,
                            nomChien: row.nomChien,
                            naissance: row.naissance,
                            race: row.race,
                            activites: result
                                .filter(
                                    (act) => act.idChien === row.idChien && row.idChien !== null
                                )
                                .map((act) => ({
                                    nomActivites: act.nomActivites,
                                    level: act.level,
                                })),
                        }));
                    }

                    console.log(connectedUser);
                    res.json(connectedUser);
                } else {
                    res.json(null);
                }
            });
        } catch (error) {
            console.log(error);
        }
    } else {
        res.json(null);
    }
});

router.delete('/logout', (req, res) => {
    res.clearCookie("token");
    res.end();
});

router.get("/resetPassword/:email", (req, res) => {
    console.log(req.params);
    const email = req.params.email;
    const sqlSearchMail = "SELECT * FROM adherents WHERE email = ?";
    connection.query(sqlSearchMail, [email], (err, result) => {
        if (err) throw err;
        if (result.length !== 0) {
            const confirmLink = `http://localhost:3000/ResetPassword?email=${email}`;
            const mailOptions = {
                from: "obeaba@fauxmail.com",
                to: email,
                subject: "Mot de passe oublié Obeaba",
                text: `Cliquez sur ce lien pour modifier votre mot de passe : ${confirmLink}`,
            };
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    throw err;
                } else {
                    res.status(404).send("Email non trouvé dans la base de données");
                }
            });
        }
    });
});

router.post("/deleteUserBDD", (req, res) => {
    const idAd = req.body.idAd;
    console.log(idAd);

    // Requête SELECT pour récupérer les idChien liés à l'adhérent
    const selectChiensQuery = "SELECT idChien FROM chiens WHERE idAdher = ?";
    connection.query(selectChiensQuery, [idAd], (err, chiens) => {
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
        connection.query(deleteAdherentQuery, [idAd], (err, result) => {
            if (err) throw err;

            // Si toutes les opérations se déroulent sans erreur, on commit la transaction
            connection.commit((err) => {
                if (err) throw err;

                let message = { messageGood: "Votre compte adhérent et vos informations sauvegardées vont être supprimés." }
                res.send(message);

            });

        });

    });
});



module.exports = router;