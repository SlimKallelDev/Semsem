import { DEFAULT_PROFILE_TYPE } from "./profileTypes";

export const POST_TYPES = Object.freeze({
  ADOPTION: "adoption",
  LOST: "lost",
  FOUND: "found",
  MATING: "mating",
  SALE: "sale",
  GENERAL: "general",
});

export const POST_TYPE_OPTIONS = [
  { value: POST_TYPES.GENERAL, label: "Question" },
  { value: POST_TYPES.ADOPTION, label: "Adoption" },
  { value: POST_TYPES.LOST, label: "Lost" },
  { value: POST_TYPES.FOUND, label: "Found" },
  { value: POST_TYPES.MATING, label: "Mating" },
  { value: POST_TYPES.SALE, label: "Sale" },
];

const PROFILE_POST_TYPE_MAP = {
  pet_owner: [
    POST_TYPES.ADOPTION,
    POST_TYPES.LOST,
    POST_TYPES.FOUND,
    POST_TYPES.MATING,
    POST_TYPES.SALE,
    POST_TYPES.GENERAL,
  ],
  veterinarian: [POST_TYPES.LOST, POST_TYPES.FOUND, POST_TYPES.GENERAL],
  refuge: [POST_TYPES.ADOPTION, POST_TYPES.LOST, POST_TYPES.FOUND, POST_TYPES.GENERAL],
  associations: [
    POST_TYPES.ADOPTION,
    POST_TYPES.LOST,
    POST_TYPES.FOUND,
    POST_TYPES.GENERAL,
  ],
  breeders: [
    POST_TYPES.ADOPTION,
    POST_TYPES.MATING,
    POST_TYPES.SALE,
    POST_TYPES.GENERAL,
  ],
  pet_sitters: [POST_TYPES.GENERAL],
  groomer: [POST_TYPES.GENERAL],
  pet_shops: [POST_TYPES.SALE, POST_TYPES.GENERAL],
  boarding: [POST_TYPES.GENERAL],
  admin: Object.values(POST_TYPES),
};

export const normalizePostType = (value) => {
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

export const getAllowedPostTypesForProfileType = (profileType) => {
  const normalizedProfileType = String(profileType || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  const allowedTypes =
    PROFILE_POST_TYPE_MAP[normalizedProfileType] ||
    PROFILE_POST_TYPE_MAP[DEFAULT_PROFILE_TYPE];

  return Array.isArray(allowedTypes) && allowedTypes.length > 0
    ? [...allowedTypes]
    : [POST_TYPES.GENERAL];
};

export const isPostTypeAllowedForProfileType = (profileType, postType) => {
  const normalizedPostType = normalizePostType(postType);
  return getAllowedPostTypesForProfileType(profileType).includes(
    normalizedPostType
  );
};

export const getPostTypeLabel = (postType) => {
  const normalizedPostType = normalizePostType(postType);
  const found = POST_TYPE_OPTIONS.find((item) => item.value === normalizedPostType);
  return found?.label || "Question";
};
