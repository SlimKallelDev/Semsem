const {
  USER_PROFILE_TYPES,
  DEFAULT_USER_PROFILE_TYPE,
  normalizeProfileType,
} = require("./profileTypes");

const POST_TYPES = Object.freeze({
  ADOPTION: "adoption",
  LOST: "lost",
  FOUND: "found",
  MATING: "mating",
  SALE: "sale",
  GENERAL: "general",
});

const POST_TYPE_VALUES = Object.values(POST_TYPES);
const DEFAULT_POST_TYPE = POST_TYPES.GENERAL;

const PROFILE_POST_TYPE_MAP = Object.freeze({
  [USER_PROFILE_TYPES.PET_OWNER]: [
    POST_TYPES.ADOPTION,
    POST_TYPES.LOST,
    POST_TYPES.FOUND,
    POST_TYPES.MATING,
    POST_TYPES.SALE,
    POST_TYPES.GENERAL,
  ],
  [USER_PROFILE_TYPES.VETERINARIAN]: [
    POST_TYPES.LOST,
    POST_TYPES.FOUND,
    POST_TYPES.GENERAL,
  ],
  [USER_PROFILE_TYPES.REFUGE]: [
    POST_TYPES.ADOPTION,
    POST_TYPES.LOST,
    POST_TYPES.FOUND,
    POST_TYPES.GENERAL,
  ],
  [USER_PROFILE_TYPES.ASSOCIATIONS]: [
    POST_TYPES.ADOPTION,
    POST_TYPES.LOST,
    POST_TYPES.FOUND,
    POST_TYPES.GENERAL,
  ],
  [USER_PROFILE_TYPES.BREEDERS]: [
    POST_TYPES.ADOPTION,
    POST_TYPES.MATING,
    POST_TYPES.SALE,
    POST_TYPES.GENERAL,
  ],
  [USER_PROFILE_TYPES.PET_SITTERS]: [POST_TYPES.GENERAL],
  [USER_PROFILE_TYPES.GROOMER]: [POST_TYPES.GENERAL],
  [USER_PROFILE_TYPES.PET_SHOPS]: [POST_TYPES.SALE, POST_TYPES.GENERAL],
  [USER_PROFILE_TYPES.BOARDING]: [POST_TYPES.GENERAL],
});

const normalizePostType = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (["question", "questions", "ask"].includes(normalized)) {
    return POST_TYPES.GENERAL;
  }

  if (["vente", "sell", "selling", "for_sale", "for-sale"].includes(normalized)) {
    return POST_TYPES.SALE;
  }

  return normalized;
};

const isValidPostType = (value) => {
  return POST_TYPE_VALUES.includes(normalizePostType(value));
};

const getAllowedPostTypesForProfileType = (profileType) => {
  const normalizedProfileType =
    normalizeProfileType(profileType) || DEFAULT_USER_PROFILE_TYPE;

  const allowedTypes = PROFILE_POST_TYPE_MAP[normalizedProfileType];
  if (Array.isArray(allowedTypes) && allowedTypes.length > 0) {
    return [...allowedTypes];
  }

  return [...PROFILE_POST_TYPE_MAP[DEFAULT_USER_PROFILE_TYPE]];
};

const isPostTypeAllowedForProfileType = (profileType, postType) => {
  const normalizedPostType = normalizePostType(postType);
  if (!POST_TYPE_VALUES.includes(normalizedPostType)) {
    return false;
  }

  return getAllowedPostTypesForProfileType(profileType).includes(
    normalizedPostType
  );
};

module.exports = {
  POST_TYPES,
  POST_TYPE_VALUES,
  DEFAULT_POST_TYPE,
  PROFILE_POST_TYPE_MAP,
  normalizePostType,
  isValidPostType,
  getAllowedPostTypesForProfileType,
  isPostTypeAllowedForProfileType,
};
