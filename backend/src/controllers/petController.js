const Pet = require("../models/Pet");
const User = require("../models/User");
const {
  USER_PROFILE_TYPES,
  normalizeProfileType,
} = require("../constants/profileTypes");
const { uploadPetImageBuffer } = require("../services/cloudinaryService");
const { USER_STATUS } = require("../constants/moderationStatuses");

const OWNER_FIELDS =
  "_id name email avatar image governorate country profileType ratingAverage ratingCount";
const HTTP_URL_PATTERN = /^https?:\/\//i;
const PET_IMAGE_MIN_CREATE = 1;
const PET_IMAGE_MAX = 5;

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeLocation = (location = {}) => ({
  governorate: location?.governorate?.trim?.() || location?.city?.trim?.() || "",
  city: location?.governorate?.trim?.() || location?.city?.trim?.() || "",
  country: location?.country?.trim?.() || "",
});

const normalizePetLocationDocument = (pet) => {
  if (!pet) return pet;

  const normalizedGovernorate = String(
    pet?.location?.governorate || pet?.location?.city || ""
  ).trim();

  if (!pet.location || typeof pet.location !== "object") {
    pet.location = {};
  }

  pet.location.governorate = normalizedGovernorate;
  pet.location.city = normalizedGovernorate;

  if (pet?.owner && typeof pet.owner === "object") {
    const ownerGovernorate = String(
      pet.owner.governorate || pet.owner.city || ""
    ).trim();
    pet.owner.governorate = ownerGovernorate;
    pet.owner.city = ownerGovernorate;
  }

  return pet;
};

const parseLocationInput = (location) => {
  if (location === undefined) {
    return normalizeLocation({});
  }

  if (typeof location === "string") {
    const rawLocation = location.trim();

    if (!rawLocation) {
      return normalizeLocation({});
    }

    try {
      const parsed = JSON.parse(rawLocation);
      return normalizeLocation(parsed);
    } catch (error) {
      const parseError = new Error("Invalid location format");
      parseError.statusCode = 400;
      throw parseError;
    }
  }

  if (typeof location === "object" && location !== null) {
    return normalizeLocation(location);
  }

  const parseError = new Error("Invalid location format");
  parseError.statusCode = 400;
  throw parseError;
};

const buildPetLocationFilter = ({ country, governorate }) => {
  const filter = {};

  if (country?.trim()) {
    filter["location.country"] = {
      $regex: `^${escapeRegex(country.trim())}$`,
      $options: "i",
    };
  }

  if (governorate?.trim()) {
    const governorateRegex = {
      $regex: escapeRegex(governorate.trim()),
      $options: "i",
    };
    filter.$or = [
      { "location.governorate": governorateRegex },
      { "location.city": governorateRegex },
    ];
  }

  return filter;
};

const normalizeImageValue = (image) => {
  if (typeof image === "string") {
    return image.trim();
  }

  if (image === undefined || image === null) {
    return "";
  }

  return String(image).trim();
};

const parseImageListInput = (rawImages) => {
  if (rawImages === undefined) {
    return [];
  }

  if (Array.isArray(rawImages)) {
    return rawImages.map(normalizeImageValue).filter(Boolean);
  }

  const normalized = normalizeImageValue(rawImages);
  if (!normalized) {
    return [];
  }

  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    try {
      const parsed = JSON.parse(normalized);
      if (!Array.isArray(parsed)) {
        const parseError = new Error("Invalid pet images format");
        parseError.statusCode = 400;
        throw parseError;
      }

      return parsed.map(normalizeImageValue).filter(Boolean);
    } catch (error) {
      const parseError = new Error("Invalid pet images format");
      parseError.statusCode = 400;
      throw parseError;
    }
  }

  return [normalized];
};

const getUploadedImageFiles = (req) => {
  if (!req?.files) {
    return req?.file ? [req.file] : [];
  }

  if (Array.isArray(req.files)) {
    return req.files;
  }

  return Object.values(req.files).flat().filter(Boolean);
};

const parseRemoteImageUrls = (body = {}) => {
  const listFromImages = parseImageListInput(body.images);
  const listFromImage = parseImageListInput(body.image);
  const urls = [...listFromImages, ...listFromImage];

  const invalidUrl = urls.find((value) => !HTTP_URL_PATTERN.test(value));
  if (invalidUrl) {
    const error = new Error("Pet images must be uploaded as image files");
    error.statusCode = 400;
    throw error;
  }

  return urls;
};

const resolvePetImages = async ({ req, ownerId }) => {
  const files = getUploadedImageFiles(req);
  const body = req?.body || {};
  const hasImageField = Object.prototype.hasOwnProperty.call(body, "image");
  const hasImagesField = Object.prototype.hasOwnProperty.call(body, "images");
  const hasImagePayload = files.length > 0 || hasImageField || hasImagesField;
  const remoteImageUrls = parseRemoteImageUrls(body);

  if (!hasImagePayload) {
    return {
      hasImagePayload: false,
      images: [],
    };
  }

  if (files.length + remoteImageUrls.length > PET_IMAGE_MAX) {
    const limitError = new Error(`Pet accepts up to ${PET_IMAGE_MAX} images`);
    limitError.statusCode = 400;
    throw limitError;
  }

  const uploadedImageUrls = await Promise.all(
    files.map(async (file) => {
      const uploadedImage = await uploadPetImageBuffer(file, ownerId);
      return uploadedImage.secure_url;
    })
  );

  const uniqueImages = [...new Set([...uploadedImageUrls, ...remoteImageUrls])];

  if (uniqueImages.length > PET_IMAGE_MAX) {
    const limitError = new Error(`Pet accepts up to ${PET_IMAGE_MAX} images`);
    limitError.statusCode = 400;
    throw limitError;
  }

  return {
    hasImagePayload: true,
    images: uniqueImages,
  };
};

const hydratePetImages = (pet) => {
  if (!pet) return pet;

  const imagesFromArray = Array.isArray(pet.images)
    ? pet.images.map(normalizeImageValue).filter(Boolean)
    : [];
  const fallbackImage = normalizeImageValue(pet.image);
  const normalizedImages = imagesFromArray.length
    ? imagesFromArray.slice(0, PET_IMAGE_MAX)
    : fallbackImage
    ? [fallbackImage]
    : [];

  pet.images = normalizedImages;
  pet.image = normalizedImages[0] || null;

  return normalizePetLocationDocument(pet);
};

const sanitizeString = (value) => String(value || "").trim();

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const normalized = String(value || "").trim().toLowerCase();
  return ["true", "1", "yes", "y", "on"].includes(normalized);
};

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => sanitizeString(item)).filter(Boolean);
};

const hasMeaningfulValue = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return value;
  if (value && typeof value === "object") {
    return Object.values(value).some(hasMeaningfulValue);
  }
  return sanitizeString(value).length > 0;
};

const normalizeCareRecordInput = (value) => {
  if (value === undefined) return undefined;

  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return {};

    try {
      return JSON.parse(raw);
    } catch (error) {
      const parseError = new Error("Invalid care record format");
      parseError.statusCode = 400;
      throw parseError;
    }
  }

  if (value && typeof value === "object") return value;

  const parseError = new Error("Invalid care record format");
  parseError.statusCode = 400;
  throw parseError;
};

const normalizeCareRecord = (record = {}, pet = null) => {
  const identity = record?.identityProfile || {};
  const ownerInfo = identity?.ownerInfo || {};
  const medical = record?.medicalHistory || {};
  const illnesses = medical?.illnessesConditions || {};

  const normalized = {
    identityProfile: {
      petName: sanitizeString(identity?.petName || pet?.name),
      photo: sanitizeString(identity?.photo || pet?.image),
      species: sanitizeString(identity?.species || pet?.type),
      breed: sanitizeString(identity?.breed || pet?.breed),
      gender: sanitizeString(identity?.gender || pet?.gender),
      birthDateOrAge: sanitizeString(identity?.birthDateOrAge),
      weight: sanitizeString(identity?.weight),
      colorMarkings: sanitizeString(identity?.colorMarkings),
      microchipId: sanitizeString(identity?.microchipId),
      passportNumber: sanitizeString(identity?.passportNumber),
      sterilized: toBoolean(identity?.sterilized),
      adoptionDate: sanitizeString(identity?.adoptionDate),
      ownerInfo: {
        name: sanitizeString(ownerInfo?.name || pet?.owner?.name),
        phone: sanitizeString(ownerInfo?.phone),
        email: sanitizeString(ownerInfo?.email || pet?.owner?.email),
        address: sanitizeString(ownerInfo?.address),
        emergencyContact: sanitizeString(ownerInfo?.emergencyContact),
      },
    },
    medicalHistory: {
      veterinaryVisits: Array.isArray(medical?.veterinaryVisits)
        ? medical.veterinaryVisits
            .map((visit) => ({
              visitDate: sanitizeString(visit?.visitDate),
              veterinarianName: sanitizeString(visit?.veterinarianName),
              clinic: sanitizeString(visit?.clinic),
              interventionType: sanitizeString(visit?.interventionType),
              reason: sanitizeString(visit?.reason),
              diagnosis: sanitizeString(visit?.diagnosis),
              medicinesNeeded: toBoolean(visit?.medicinesNeeded),
              medicinesNotes: sanitizeString(visit?.medicinesNotes),
              surgicalIntervention: toBoolean(visit?.surgicalIntervention),
              notes: sanitizeString(visit?.notes),
              recordedByRole: sanitizeString(visit?.recordedByRole),
              recordedByName: sanitizeString(visit?.recordedByName),
              attachments: normalizeStringArray(visit?.attachments),
            }))
            .filter(hasMeaningfulValue)
        : [],
      illnessesConditions: {
        chronicDiseases: normalizeStringArray(illnesses?.chronicDiseases),
        allergies: normalizeStringArray(illnesses?.allergies),
        previousSurgeries: normalizeStringArray(illnesses?.previousSurgeries),
        disabilities: normalizeStringArray(illnesses?.disabilities),
        specialConditions: normalizeStringArray(illnesses?.specialConditions),
      },
      medications: Array.isArray(medical?.medications)
        ? medical.medications
            .map((medication) => ({
              name: sanitizeString(medication?.name),
              dosage: sanitizeString(medication?.dosage),
              frequency: sanitizeString(medication?.frequency),
              startDate: sanitizeString(medication?.startDate),
              endDate: sanitizeString(medication?.endDate),
              prescriptionUpload: sanitizeString(medication?.prescriptionUpload),
            }))
            .filter(hasMeaningfulValue)
        : [],
    },
    vaccinations: Array.isArray(record?.vaccinations)
      ? record.vaccinations
          .map((vaccine) => ({
            vaccineName: sanitizeString(vaccine?.vaccineName),
            dateAdministered: sanitizeString(vaccine?.dateAdministered),
            nextDoseDate: sanitizeString(vaccine?.nextDoseDate),
            veterinarian: sanitizeString(vaccine?.veterinarian),
            batchNumber: sanitizeString(vaccine?.batchNumber),
            certificateUpload: sanitizeString(vaccine?.certificateUpload),
          }))
          .filter(hasMeaningfulValue)
      : [],
    updatedAt: new Date(),
  };

  return normalized;
};

const toBase64Url = (value) =>
  Buffer.from(value, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const getPets = async (req, res, next) => {
  try {
    const locationFilter = buildPetLocationFilter(req.query);
    const activeOwnerIds = await User.find({
      status: USER_STATUS.ACTIVE,
    }).distinct("_id");

    const pets = await Pet.find({
      ...locationFilter,
      owner: { $in: activeOwnerIds },
    })
      .populate("owner", OWNER_FIELDS)
      .sort({ createdAt: -1 });

    pets.forEach(hydratePetImages);
    res.status(200).json(pets);
  } catch (error) {
    next(error);
  }
};

const getPetById = async (req, res, next) => {
  try {
    const activeOwnerIds = await User.find({
      status: USER_STATUS.ACTIVE,
    }).distinct("_id");
    const pet = await Pet.findOne({
      _id: req.params.id,
      owner: { $in: activeOwnerIds },
    }).populate("owner", OWNER_FIELDS);

    if (!pet) {
      return res.status(404).json({ message: "Pet not found" });
    }

    hydratePetImages(pet);
    res.status(200).json(pet);
  } catch (error) {
    next(error);
  }
};

const getPetsByOwner = async (req, res, next) => {
  try {
    const activeOwner = await User.exists({
      _id: req.params.ownerId,
      status: USER_STATUS.ACTIVE,
    });

    if (!activeOwner) {
      return res.status(200).json([]);
    }

    const pets = await Pet.find({ owner: req.params.ownerId })
      .populate("owner", OWNER_FIELDS)
      .sort({ createdAt: -1 });

    pets.forEach(hydratePetImages);
    res.status(200).json(pets);
  } catch (error) {
    next(error);
  }
};

const createPet = async (req, res, next) => {
  try {
    const { name, type, breed, date, description, location, careRecord } =
      req.body;
    const owner = req.user.userId;

    if (!name || !type) {
      return res
        .status(400)
        .json({ message: "name and type are required" });
    }

    const normalizedLocation = parseLocationInput(location);

    if (!normalizedLocation.governorate || !normalizedLocation.country) {
      return res
        .status(400)
        .json({ message: "governorate and country are required for pet location" });
    }

    const { images } = await resolvePetImages({
      req,
      ownerId: owner,
    });

    if (images.length < PET_IMAGE_MIN_CREATE) {
      return res.status(400).json({
        message: `At least ${PET_IMAGE_MIN_CREATE} pet image is required`,
      });
    }

    const petPayload = {
      owner,
      name,
      type,
      breed,
      date,
      image: images[0] || null,
      images,
      description,
      location: normalizedLocation,
    };

    const parsedCareRecord = normalizeCareRecordInput(careRecord);
    if (parsedCareRecord !== undefined) {
      petPayload.careRecord = normalizeCareRecord(parsedCareRecord, petPayload);
    }

    const pet = await Pet.create(petPayload);

    const populatedPet = await Pet.findById(pet._id).populate(
      "owner",
      OWNER_FIELDS
    );
    hydratePetImages(populatedPet);

    res.status(201).json(populatedPet);
  } catch (error) {
    next(error);
  }
};

const updatePet = async (req, res, next) => {
  try {
    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({ message: "Pet not found" });
    }

    const isOwner = String(pet.owner) === String(req.user.userId);
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to update this pet" });
    }

    const updates = { ...req.body };
    delete updates.owner;
    if (updates.location !== undefined) {
      const normalizedLocation = parseLocationInput(updates.location);

      if (!normalizedLocation.governorate || !normalizedLocation.country) {
        return res
          .status(400)
          .json({ message: "governorate and country are required for pet location" });
      }

      updates.location = normalizedLocation;
    }

    if (updates.careRecord !== undefined) {
      const parsedCareRecord = normalizeCareRecordInput(updates.careRecord);
      updates.careRecord = normalizeCareRecord(parsedCareRecord, pet);
    }

    const { hasImagePayload, images } = await resolvePetImages({
      req,
      ownerId: pet.owner,
    });

    if (hasImagePayload) {
      updates.image = images[0] || null;
      updates.images = images;
    }

    Object.assign(pet, updates);

    await pet.save();
    await pet.populate("owner", OWNER_FIELDS);
    hydratePetImages(pet);

    res.status(200).json(pet);
  } catch (error) {
    next(error);
  }
};

const deletePet = async (req, res, next) => {
  try {
    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({ message: "Pet not found" });
    }

    const isOwner = String(pet.owner) === String(req.user.userId);
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to delete this pet" });
    }

    await pet.deleteOne();

    res.status(200).json({ message: "Pet deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const getPetCareRecord = async (req, res, next) => {
  try {
    const pet = await Pet.findById(req.params.id).populate("owner", OWNER_FIELDS);

    if (!pet) {
      return res.status(404).json({ message: "Pet not found" });
    }

    const careRecord = normalizeCareRecord(pet.careRecord || {}, pet);
    res.status(200).json({
      petId: pet._id,
      petName: pet.name,
      careRecord,
    });
  } catch (error) {
    next(error);
  }
};

const updatePetCareRecord = async (req, res, next) => {
  try {
    const pet = await Pet.findById(req.params.id).populate("owner", OWNER_FIELDS);

    if (!pet) {
      return res.status(404).json({ message: "Pet not found" });
    }

    const requesterId = String(req?.user?.userId || "");
    const ownerId = String(pet?.owner?._id || pet?.owner || "");
    const isOwner = requesterId && requesterId === ownerId;
    let isVeterinarian = false;

    if (requesterId && !isOwner) {
      const requester = await User.findById(requesterId).select("profileType");
      isVeterinarian =
        normalizeProfileType(requester?.profileType) === USER_PROFILE_TYPES.VETERINARIAN;
    }

    if (!requesterId || (!isOwner && !isVeterinarian)) {
      return res.status(403).json({
        message: "Only the pet owner or a veterinarian can update care records",
      });
    }

    const normalizedRecord = normalizeCareRecord(
      normalizeCareRecordInput(req.body || {}) || {},
      pet
    );
    pet.careRecord = normalizedRecord;
    await pet.save();

    res.status(200).json({
      message: "Care record updated",
      petId: pet._id,
      careRecord: pet.careRecord,
    });
  } catch (error) {
    next(error);
  }
};

const getPetCareRecordQrData = async (req, res, next) => {
  try {
    const pet = await Pet.findById(req.params.id).populate("owner", OWNER_FIELDS);

    if (!pet) {
      return res.status(404).json({ message: "Pet not found" });
    }

    const careRecord = normalizeCareRecord(pet.careRecord || {}, pet);
    const payload = {
      petId: String(pet._id),
      generatedAt: new Date().toISOString(),
      careRecord,
    };

    const origin = `${req.protocol}://${req.get("host")}`;
    const scanUrl = `${origin}/api/pets/${pet._id}/care-record/view`;
    const encodedPayload = toBase64Url(JSON.stringify({ petId: String(pet._id) }));

    res.status(200).json({
      scanUrl,
      encodedPayload,
      payload,
    });
  } catch (error) {
    next(error);
  }
};

const renderPetCareRecordQrView = async (req, res, next) => {
  try {
    let parsed = null;

    if (req.params?.id) {
      const pet = await Pet.findById(req.params.id).populate("owner", OWNER_FIELDS);

      if (!pet) {
        return res.status(404).send("<h2>Pet not found</h2>");
      }

      hydratePetImages(pet);
      parsed = {
        petId: String(pet._id),
        generatedAt: new Date().toISOString(),
        careRecord: normalizeCareRecord(pet.careRecord || {}, pet),
      };
    } else {
      const encoded = String(req.query?.data || "").trim();
      if (!encoded) {
        return res.status(400).send("<h2>Missing QR data</h2>");
      }

      const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = Buffer.from(base64, "base64").toString("utf-8");
      parsed = JSON.parse(decoded);

      if (parsed?.petId && !parsed?.careRecord) {
        const pet = await Pet.findById(parsed.petId).populate("owner", OWNER_FIELDS);
        if (pet) {
          hydratePetImages(pet);
          parsed = {
            petId: String(pet._id),
            generatedAt: new Date().toISOString(),
            careRecord: normalizeCareRecord(pet.careRecord || {}, pet),
          };
        }
      }
    }

    if (!parsed?.careRecord) {
      return res.status(400).send("<h2>Missing QR data</h2>");
    }
    const record = parsed?.careRecord || {};
    const identity = record?.identityProfile || {};
    const ownerInfo = identity?.ownerInfo || {};
    const medical = record?.medicalHistory || {};
    const illnesses = medical?.illnessesConditions || {};
    const visits = Array.isArray(medical?.veterinaryVisits)
      ? medical.veterinaryVisits
      : [];
    const medications = Array.isArray(medical?.medications)
      ? medical.medications
      : [];
    const vaccinations = Array.isArray(record?.vaccinations)
      ? record.vaccinations
      : [];

    const escapeHtml = (value = "") =>
      String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const valueOrDash = (value) => escapeHtml(sanitizeString(value) || "-");
    const yesNo = (value) => (toBoolean(value) ? "Yes" : "No");
    const listItems = (items = []) => {
      const normalized = normalizeStringArray(items);
      if (!normalized.length) return "<p class=\"empty\">No records yet.</p>";
      return `<ul>${normalized
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("")}</ul>`;
    };

    const renderVisit = (visit = {}, index) => `
      <article class="record-card">
        <div class="record-head">
          <strong>${valueOrDash(visit.interventionType || "Intervention")}</strong>
          <span>${valueOrDash(visit.visitDate)}</span>
        </div>
        <dl>
          <div><dt>Veterinarian</dt><dd>${valueOrDash(visit.veterinarianName)}</dd></div>
          <div><dt>Clinic</dt><dd>${valueOrDash(visit.clinic)}</dd></div>
          <div><dt>Reason</dt><dd>${valueOrDash(visit.reason)}</dd></div>
          <div><dt>Diagnosis</dt><dd>${valueOrDash(visit.diagnosis)}</dd></div>
          <div><dt>Medicines needed</dt><dd>${yesNo(visit.medicinesNeeded)}</dd></div>
          <div><dt>Medicine notes</dt><dd>${valueOrDash(visit.medicinesNotes)}</dd></div>
          <div><dt>Surgical intervention</dt><dd>${yesNo(visit.surgicalIntervention)}</dd></div>
          <div><dt>Recorded by</dt><dd>${valueOrDash([visit.recordedByName, visit.recordedByRole].filter(Boolean).join(" - "))}</dd></div>
        </dl>
        ${visit.notes ? `<p class="notes">${escapeHtml(visit.notes)}</p>` : ""}
      </article>
    `;

    const renderMedication = (medication = {}) => `
      <article class="mini-card">
        <strong>${valueOrDash(medication.name || "Medication")}</strong>
        <span>${valueOrDash(
          [medication.dosage, medication.frequency].filter(Boolean).join(" - ")
        )}</span>
        <small>${valueOrDash(
          [medication.startDate, medication.endDate].filter(Boolean).join(" to ")
        )}</small>
      </article>
    `;

    const renderVaccine = (vaccine = {}) => `
      <article class="mini-card">
        <strong>${valueOrDash(vaccine.vaccineName || "Vaccine")}</strong>
        <span>Administered: ${valueOrDash(vaccine.dateAdministered)}</span>
        <span>Next dose: ${valueOrDash(vaccine.nextDoseDate)}</span>
        <small>${valueOrDash(
          [vaccine.veterinarian, vaccine.batchNumber].filter(Boolean).join(" - ")
        )}</small>
      </article>
    `;

    res.status(200).send(`
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${valueOrDash(identity.petName || "Pet")} - Digital Health Booklet</title>
        <style>
          :root { color-scheme: light; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; background:#f2f6f3; color:#17231c; margin:0; padding:16px; }
          main { max-width:920px; margin:0 auto; }
          header { background:#ffffff; border:1px solid #dce8df; border-radius:16px; padding:18px; }
          h1 { margin:0; font-size:24px; line-height:1.2; }
          h2 { margin:0 0 12px; font-size:18px; }
          p { color:#526158; line-height:1.45; }
          nav { display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; }
          nav a { color:#1f7a3b; border:1px solid #bfe7cc; background:#effaf2; border-radius:999px; padding:8px 11px; text-decoration:none; font-weight:700; font-size:13px; }
          section { background:#ffffff; border:1px solid #dce8df; border-radius:16px; padding:16px; margin-top:12px; }
          .grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:10px; }
          dl { display:grid; gap:8px; margin:0; }
          .grid > div, dl > div { background:#f7faf8; border:1px solid #e5eee8; border-radius:12px; padding:10px; }
          dt { font-size:12px; color:#65746b; font-weight:700; margin-bottom:4px; }
          dd { margin:0; font-size:15px; color:#17231c; overflow-wrap:anywhere; }
          ul { margin:0; padding-left:20px; color:#24332a; }
          li { margin:5px 0; }
          .record-card, .mini-card { border:1px solid #e0e9e3; border-radius:14px; background:#fbfdfb; padding:12px; margin-top:10px; }
          .record-head { display:flex; justify-content:space-between; gap:10px; margin-bottom:10px; color:#1d2c24; }
          .record-head span, small { color:#65746b; }
          .mini-card { display:grid; gap:4px; }
          .notes { margin:10px 0 0; background:#f1f7f3; border-radius:10px; padding:10px; }
          .empty { color:#7a877f; margin:0; }
          .stamp { margin-top:8px; font-size:12px; color:#728078; }
        </style>
      </head>
      <body>
        <main>
          <header>
            <h1>${valueOrDash(identity.petName || "Pet")} Digital Health Booklet</h1>
            <p>This QR page contains the pet identity and medical history shared by the owner or veterinarian.</p>
            <nav>
              <a href="#identity">Identity</a>
              <a href="#medical-history">Medical history</a>
              <a href="#interventions">Interventions</a>
              <a href="#vaccinations">Vaccinations</a>
            </nav>
            <div class="stamp">Generated ${valueOrDash(parsed?.generatedAt)}</div>
          </header>

          <section id="identity">
            <h2>Identity</h2>
            <div class="grid">
              <div><dt>Name</dt><dd>${valueOrDash(identity.petName)}</dd></div>
              <div><dt>Species</dt><dd>${valueOrDash(identity.species)}</dd></div>
              <div><dt>Breed</dt><dd>${valueOrDash(identity.breed)}</dd></div>
              <div><dt>Gender</dt><dd>${valueOrDash(identity.gender)}</dd></div>
              <div><dt>Birth date / age</dt><dd>${valueOrDash(identity.birthDateOrAge)}</dd></div>
              <div><dt>Weight</dt><dd>${valueOrDash(identity.weight)}</dd></div>
              <div><dt>Color / markings</dt><dd>${valueOrDash(identity.colorMarkings)}</dd></div>
              <div><dt>Microchip ID</dt><dd>${valueOrDash(identity.microchipId)}</dd></div>
              <div><dt>Passport number</dt><dd>${valueOrDash(identity.passportNumber)}</dd></div>
              <div><dt>Sterilized</dt><dd>${yesNo(identity.sterilized)}</dd></div>
            </div>
          </section>

          <section>
            <h2>Owner</h2>
            <div class="grid">
              <div><dt>Name</dt><dd>${valueOrDash(ownerInfo.name)}</dd></div>
              <div><dt>Phone</dt><dd>${valueOrDash(ownerInfo.phone)}</dd></div>
              <div><dt>Email</dt><dd>${valueOrDash(ownerInfo.email)}</dd></div>
              <div><dt>Emergency contact</dt><dd>${valueOrDash(ownerInfo.emergencyContact)}</dd></div>
            </div>
          </section>

          <section id="medical-history">
            <h2>Medical history</h2>
            <div class="grid">
              <div><dt>Allergies</dt><dd>${listItems(illnesses.allergies)}</dd></div>
              <div><dt>Chronic diseases</dt><dd>${listItems(illnesses.chronicDiseases)}</dd></div>
              <div><dt>Previous surgeries</dt><dd>${listItems(illnesses.previousSurgeries)}</dd></div>
              <div><dt>Special conditions</dt><dd>${listItems(illnesses.specialConditions)}</dd></div>
            </div>
          </section>

          <section id="interventions">
            <h2>Veterinary interventions</h2>
            ${
              visits.length
                ? visits.map(renderVisit).join("")
                : "<p class=\"empty\">No interventions recorded yet.</p>"
            }
          </section>

          <section>
            <h2>Current or recent medications</h2>
            ${
              medications.length
                ? medications.map(renderMedication).join("")
                : "<p class=\"empty\">No medications recorded yet.</p>"
            }
          </section>

          <section id="vaccinations">
            <h2>Vaccinations</h2>
            ${
              vaccinations.length
                ? vaccinations.map(renderVaccine).join("")
                : "<p class=\"empty\">No vaccinations recorded yet.</p>"
            }
          </section>
        </main>
      </body>
      </html>
    `);
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};

