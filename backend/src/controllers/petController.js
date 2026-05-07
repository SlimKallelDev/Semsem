const Pet = require("../models/Pet");
const { uploadPetImageBuffer } = require("../services/cloudinaryService");

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

const getPets = async (req, res, next) => {
  try {
    const locationFilter = buildPetLocationFilter(req.query);

    const pets = await Pet.find(locationFilter)
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
    const pet = await Pet.findById(req.params.id).populate("owner", OWNER_FIELDS);

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
    const { owner, name, type, breed, date, description, location } =
      req.body;

    if (!owner || !name || !type) {
      return res
        .status(400)
        .json({ message: "owner, name and type are required" });
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

    const updates = { ...req.body };
    if (updates.location !== undefined) {
      const normalizedLocation = parseLocationInput(updates.location);

      if (!normalizedLocation.governorate || !normalizedLocation.country) {
        return res
          .status(400)
          .json({ message: "governorate and country are required for pet location" });
      }

      updates.location = normalizedLocation;
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
    const pet = await Pet.findByIdAndDelete(req.params.id);

    if (!pet) {
      return res.status(404).json({ message: "Pet not found" });
    }

    res.status(200).json({ message: "Pet deleted successfully" });
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
};

