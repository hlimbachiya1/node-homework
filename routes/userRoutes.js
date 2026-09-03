const express = require("express");
const { register, logon, logoff } = require("../controllers/userController");
const jwtMiddleware = require("../middleware/jwtMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/logon", logon);
router.post("/logoff", jwtMiddleware, logoff);

module.exports = router;
