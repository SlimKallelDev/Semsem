const express = require("express");
const { checkAppVersion } = require("../controllers/appVersionController");

const router = express.Router();
router.get("/check", checkAppVersion);
module.exports = router;
