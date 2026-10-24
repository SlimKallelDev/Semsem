const express = require("express");
const {
  getLocationSuggestions,
} = require("../controllers/locationController");

const router = express.Router();

router.get("/suggestions", getLocationSuggestions);

module.exports = router;
