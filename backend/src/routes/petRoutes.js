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
const { uploadPetImage } = require("../middlewares/uploadMiddleware");

router.get("/", getPets);
router.get("/user/:ownerId", getPetsByOwner);
router.get("/:id", getPetById);
router.post("/", uploadPetImage, createPet);
router.put("/:id", uploadPetImage, updatePet);
router.delete("/:id", deletePet);

module.exports = router;
