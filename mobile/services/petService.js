import axios from "axios";
import API_BASE_URL from "./api";

const API = axios.create({
  baseURL: API_BASE_URL,
});

export const getPets = async (filters = {}) => {
  const params = {};

  if (filters.country) params.country = filters.country;
  if (filters.city) params.city = filters.city;

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
  const response = await API.post("/pets", petData);
  return response.data;
};

export const updatePet = async (id, petData) => {
  const response = await API.put(`/pets/${id}`, petData);
  return response.data;
};

export const deletePet = async (id) => {
  const response = await API.delete(`/pets/${id}`);
  return response.data;
};

export default {
  getPets,
  getPetById,
  getPetsByOwner,
  createPet,
  updatePet,
  deletePet,
};
