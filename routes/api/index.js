const router = require("express").Router();
const apiUsers = require("./users");
const apiDogs = require("./dogs");
const apiEduc = require("./educators");
const apiAdmin = require("./admin");

router.use("/users", apiUsers);
router.use("/dogs", apiDogs);
router.use("/educators", apiEduc);
router.use("/admin", apiAdmin);


module.exports = router;
