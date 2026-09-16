const express = require("express");
const {
  register,
  logon,
  logoff,
  googleLogon,
} = require("../controllers/userController");
const jwtMiddleware = require("../middleware/jwtMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/logon", logon);
router.post("/googleLogon", googleLogon);
router.post("/logoff", jwtMiddleware, logoff);

module.exports = router;
