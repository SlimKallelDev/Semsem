const USER_PROFILE_TYPES = Object.freeze({
  PET_OWNER: "pet_owner",
  VETERINARIAN: "veterinarian",
  REFUGE: "refuge",
  ASSOCIATIONS: "associations",
  BREEDERS: "breeders",
  PET_SITTERS: "pet_sitters",
  GROOMER: "groomer",
  PET_SHOPS: "pet_shops",
  BOARDING: "boarding",
});

const USER_PROFILE_TYPE_VALUES = Object.values(USER_PROFILE_TYPES);
const DEFAULT_USER_PROFILE_TYPE = USER_PROFILE_TYPES.PET_OWNER;

const normalizeProfileType = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
};

const isValidProfileType = (value) => {
  const normalized = normalizeProfileType(value);
  return USER_PROFILE_TYPE_VALUES.includes(normalized);
};

const isPublicProfileType = (value) => {
  const normalized = normalizeProfileType(value);
  return USER_PROFILE_TYPE_VALUES.includes(normalized);
};

const resolveUserProfileType = (value) => {
  const normalized = normalizeProfileType(value);
  return USER_PROFILE_TYPE_VALUES.includes(normalized)
    ? normalized
    : DEFAULT_USER_PROFILE_TYPE;
};

module.exports = {
  USER_PROFILE_TYPES,
  USER_PROFILE_TYPE_VALUES,
  DEFAULT_USER_PROFILE_TYPE,
  normalizeProfileType,
  isValidProfileType,
  isPublicProfileType,
  resolveUserProfileType,
};
