import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_BASE_URL from "./api";

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

const FILE_URI_PATTERN = /^(file|content|ph|assets-library|asset):\/\//i;
const HTTP_URL_PATTERN = /^https?:\/\//i;

const MIME_BY_EXTENSION = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

API.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");

    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    return config;
  },
  (error) => Promise.reject(error)
);

const isLocalImageUri = (value) => {
  if (typeof value !== "string") return false;
  return FILE_URI_PATTERN.test(value.trim());
};

const getImageNameFromUri = (uri, prefix = "pet") => {
  const rawName = String(uri || "")
    .split("?")[0]
    .split("/")
    .pop();

  if (rawName && /\.[a-zA-Z0-9]+$/.test(rawName)) {
    return rawName;
  }

  return `${prefix}-${Date.now()}.jpg`;
};

const getImageMimeType = (uri) => {
  const extension = String(uri || "").split(".").pop()?.toLowerCase();
  return MIME_BY_EXTENSION[extension] || "image/jpeg";
};

const appendField = (formData, key, value) => {
  if (value === undefined || value === null) return;
  formData.append(key, String(value));
};

const normalizeImagesInput = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized ? [normalized] : [];
  }

  return [];
};

const resolvePayloadImages = (payload = {}) => {
  const fromImages = normalizeImagesInput(payload.images);
  if (fromImages.length > 0) return fromImages;
  return normalizeImagesInput(payload.image);
};

const normalizeLocation = (location = {}) => ({
  governorate: String(location?.governorate || "").trim(),
  country: String(location?.country || "").trim(),
});

const buildPetFormData = (payload = {}) => {
  const formData = new FormData();

  appendField(formData, "owner", payload.owner);
  appendField(formData, "name", payload.name);
  appendField(formData, "type", payload.type);
  appendField(formData, "breed", payload.breed);
  appendField(formData, "date", payload.date);
  appendField(formData, "description", payload.description);
  if (payload.location !== undefined) {
    formData.append("location", JSON.stringify(normalizeLocation(payload.location)));
  }
  if (payload.careRecord !== undefined) {
    formData.append("careRecord", JSON.stringify(payload.careRecord || {}));
  }

  const images = resolvePayloadImages(payload);
  images.forEach((imageUri) => {
    if (isLocalImageUri(imageUri)) {
      formData.append("images", {
        uri: imageUri,
        name: getImageNameFromUri(imageUri, "pet"),
        type: getImageMimeType(imageUri),
      });
      return;
    }

    if (HTTP_URL_PATTERN.test(imageUri)) {
      formData.append("images", imageUri);
    }
  });

  if (images.length === 0 && payload.image !== undefined) {
    formData.append("image", String(payload.image || "").trim());
  }

  if (Array.isArray(payload.images) && payload.images.length === 0) {
    formData.append("images", "");
  }

  return formData;
};

export const getPets = async (filters = {}) => {
  const params = {};

  if (filters.country) params.country = filters.country;
  if (filters.governorate) params.governorate = filters.governorate;

  const response = await API.get("/pets", { params });
  return response.data;
};

export const getPetById = async (id) => {
  const response = await API.get(`/pets/${id}`);
  return response.data;
};

export const getPetsByOwner = async (ownerId) => {
  const response = await API.get(`/pets/user/${ownerId}`);
  return response.data;
};

export const createPet = async (petData) => {
  const normalizedData = {
    ...petData,
    ...(petData?.location !== undefined
      ? { location: normalizeLocation(petData.location) }
      : {}),
  };
  const payload = buildPetFormData(normalizedData);

  const response = await API.post("/pets", payload);
  return response.data;
};

export const updatePet = async (id, petData) => {
  const normalizedData = {
    ...petData,
    ...(petData?.location !== undefined
      ? { location: normalizeLocation(petData.location) }
      : {}),
  };
  const payload = buildPetFormData(normalizedData);

  const response = await API.put(`/pets/${id}`, payload);
  return response.data;
};

export const deletePet = async (id) => {
  const response = await API.delete(`/pets/${id}`);
  return response.data;
};

export const getPetCareRecord = async (id) => {
  const response = await API.get(`/pets/${id}/care-record`);
  return response.data;
};

export const updatePetCareRecord = async (id, careRecordPayload) => {
  const response = await API.put(`/pets/${id}/care-record`, careRecordPayload);
  return response.data;
};

const extractBackendOrigin = () => {
  const normalized = String(API_BASE_URL || "").replace(/\/+$/, "");
  return normalized.endsWith("/api")
    ? normalized.slice(0, -4)
    : normalized;
};

export const getPetCareRecordQr = async (id) => {
  const response = await API.get(`/pets/${id}/care-record/qr`);
  const data = response.data || {};

  if (!data.scanUrl && data.encodedPayload) {
    const origin = extractBackendOrigin();
    data.scanUrl = `${origin}/api/pets/care-record/view?data=${data.encodedPayload}`;
  }

  return data;
};

export default {
  getPets,
  getPetById,
  getPetsByOwner,
  createPet,
  updatePet,
  deletePet,
  getPetCareRecord,
  updatePetCareRecord,
  getPetCareRecordQr,
};

