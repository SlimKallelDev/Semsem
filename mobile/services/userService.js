import authService from "./authService";
import { request } from "./api";

export const getUser = async (userId) => {
  return request(`/users/${userId}`);
};

export const getUsers = async () => {
  return request("/users");
};

export const getUserReviews = async (userId) => {
  return request(`/users/${userId}/reviews`);
};

export const submitUserReview = async (userId, payload = {}) => {
  return request(`/users/${userId}/reviews`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const deleteMyUserReview = async (userId) => {
  return request(`/users/${userId}/reviews/me`, {
    method: "DELETE",
  });
};

const IMAGE_EXTENSION_BY_TYPE = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};

const isFormDataPayload = (payload) => {
  return typeof FormData !== "undefined" && payload instanceof FormData;
};

const getAvatarFileType = (asset) => {
  const fileType = asset?.mimeType || asset?.type;

  return fileType?.includes("/") ? fileType : "image/jpeg";
};

const getAvatarFileName = (asset) => {
  const fileType = getAvatarFileType(asset).toLowerCase();
  const extension = IMAGE_EXTENSION_BY_TYPE[fileType] || "jpg";
  const uriName = asset?.uri?.split("/")?.pop()?.split("?")?.[0];
  const baseName = asset?.fileName || uriName || `avatar.${extension}`;

  return /\.[a-z0-9]+$/i.test(baseName)
    ? baseName
    : `${baseName}.${extension}`;
};

const appendFields = (formData, payload = {}) => {
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    formData.append(key, String(value));
  });
};

const appendAvatar = (formData, avatarAsset) => {
  if (!avatarAsset?.uri && !avatarAsset?.file) {
    throw new Error("Avatar image is missing.");
  }

  const fileName = getAvatarFileName(avatarAsset);

  if (avatarAsset.file) {
    formData.append("avatar", avatarAsset.file, fileName);
    return;
  }

  formData.append("avatar", {
    uri: avatarAsset.uri,
    name: fileName,
    type: getAvatarFileType(avatarAsset),
  });
};

export const updateUser = async (userId, payload = {}) => {
  return request(`/users/${userId}`, {
    method: "PUT",
    body: isFormDataPayload(payload) ? payload : JSON.stringify(payload),
  });
};

export const updateUserWithAvatar = async (userId, payload, avatarAsset) => {
  const formData = new FormData();

  appendFields(formData, payload);
  appendAvatar(formData, avatarAsset);

  return updateUser(userId, formData);
};

export const updateUserAvatar = async (userId, avatarAsset) => {
  return updateUserWithAvatar(userId, {}, avatarAsset);
};

export default {
  login: authService.login,
  register: authService.register,
  logout: authService.logout,
  getUsers,
  getUser,
  getUserReviews,
  submitUserReview,
  deleteMyUserReview,
  updateUser,
  updateUserWithAvatar,
  updateUserAvatar,
};
