const express = require("express");
const router = express.Router();

const {
  getPets,
  getPetById,
  getPetsByOwner,
  createPet,
  updatePet,
  deletePet,
} = require("../controllers/petController");

router.get("/", getPets);
router.get("/user/:ownerId", getPetsByOwner);
router.get("/:id", getPetById);
router.post("/", createPet);
router.put("/:id", updatePet);
router.delete("/:id", deletePet);

module.exports = router;