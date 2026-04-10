const Pet = require("../models/Pet");
const User = require("../models/User");

const OWNER_FIELDS = "_id name email image city country";

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildOwnerLocationFilter = ({ country, city }) => {
  const filter = {};

  if (country?.trim()) {
    filter.country = {
      $regex: `^${escapeRegex(country.trim())}$`,
      $options: "i",
    };
  }

  if (city?.trim()) {
    filter.city = {
      $regex: escapeRegex(city.trim()),
      $options: "i",
    };
  }

  return filter;
};

const getPets = async (req, res, next) => {
  try {
    const ownerLocationFilter = buildOwnerLocationFilter(req.query);
    const ownerIds = Object.keys(ownerLocationFilter).length
      ? await User.find(ownerLocationFilter).distinct("_id")
      : null;

    const pets = await Pet.find(
      ownerIds ? { owner: { $in: ownerIds } } : {}
    )
      .populate("owner", OWNER_FIELDS)
      .sort({ createdAt: -1 });

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

    res.status(200).json(pets);
  } catch (error) {
    next(error);
  }
};

const createPet = async (req, res, next) => {
  try {
    const { owner, name, type, breed, date, image, description } = req.body;

    if (!owner || !name || !type) {
      return res
        .status(400)
        .json({ message: "owner, name and type are required" });
    }

    const pet = await Pet.create({
      owner,
      name,
      type,
      breed,
      date,
      image,
      description,
    });

    const populatedPet = await Pet.findById(pet._id).populate(
      "owner",
      OWNER_FIELDS
    );

    res.status(201).json(populatedPet);
  } catch (error) {
    next(error);
  }
};

const updatePet = async (req, res, next) => {
  try {
    const pet = await Pet.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("owner", OWNER_FIELDS);

    if (!pet) {
      return res.status(404).json({ message: "Pet not found" });
    }

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
