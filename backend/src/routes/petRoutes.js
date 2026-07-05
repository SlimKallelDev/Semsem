const express = require("express");
const router = express.Router();

const {
  getPets,
  getPetById,
  getPetsByOwner,
  createPet,
  updatePet,
  deletePet,
  getPetCareRecord,
  updatePetCareRecord,
  getPetCareRecordQrData,
  renderPetCareRecordQrView,
} = require("../controllers/petController");
const { uploadPetImage } = require("../middlewares/uploadMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/", getPets);
router.get("/care-record/view", renderPetCareRecordQrView);
router.get("/user/:ownerId", getPetsByOwner);
router.get("/:id/care-record/view", renderPetCareRecordQrView);
router.get("/:id/care-record", getPetCareRecord);
router.get("/:id/care-record/qr", getPetCareRecordQrData);
router.put("/:id/care-record", authMiddleware, updatePetCareRecord);
router.get("/:id", getPetById);
router.post("/", authMiddleware, uploadPetImage, createPet);
router.put("/:id", authMiddleware, uploadPetImage, updatePet);
router.delete("/:id", authMiddleware, deletePet);

module.exports = router;
