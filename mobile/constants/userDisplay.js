import {
  getProfileTypeLabel,
  isVeterinarianProfileType,
} from "./profileTypes";

const clampRating = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  if (parsed <= 0) return 0;
  if (parsed >= 5) return 5;
  return Number(parsed.toFixed(1));
};

export const getUserRatingAverage = (user) => {
  return clampRating(user?.ratingAverage);
};

export const getUserRatingCount = (user) => {
  const parsed = Number(user?.ratingCount);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
};

export const formatUserTypeAndRating = (user) => {
  const profileTypeLabel = getProfileTypeLabel(user?.profileType);
  const ratingAverage = getUserRatingAverage(user);
  return `${profileTypeLabel} - ${ratingAverage.toFixed(1)}\u2605`;
};

export const formatUserTypeRatingWithCount = (user) => {
  const count = getUserRatingCount(user);
  if (count <= 0) {
    return `${formatUserTypeAndRating(user)} (0 reviews)`;
  }

  return `${formatUserTypeAndRating(user)} (${count})`;
};

export const isVeterinaryUser = (user) => {
  return isVeterinarianProfileType(user?.profileType);
};
