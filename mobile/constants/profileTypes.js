export const PROFILE_TYPES = [
  { value: "pet_owner", label: "Pet Owner" },
  { value: "veterinarian", label: "Veterinarian" },
  { value: "refuge", label: "Refuge" },
  { value: "associations", label: "Associations" },
  { value: "breeders", label: "Breeders" },
  { value: "pet_sitters", label: "Pet Sitters" },
  { value: "groomer", label: "Groomer" },
  { value: "pet_shops", label: "Pet Shops" },
  { value: "boarding", label: "Boarding (Hotels for pets)" },
];

export const DEFAULT_PROFILE_TYPE = "pet_owner";

const PROFILE_TYPE_ALIASES = {
  vet: "veterinarian",
  veterinary: "veterinarian",
  veterinaire: "veterinarian",
};

export const normalizeProfileType = (value) => {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  return PROFILE_TYPE_ALIASES[normalized] || normalized;
};

export const getProfileTypeLabel = (value) => {
  const normalized = normalizeProfileType(value);
  const found = PROFILE_TYPES.find((item) => item.value === normalized);
  return found?.label || "Pet Owner";
};

export const isVeterinarianProfileType = (value) => {
  return normalizeProfileType(value) === "veterinarian";
};

export const isServiceProviderProfileType = (value) => {
  const normalized = normalizeProfileType(value);
  return Boolean(normalized) && normalized !== "pet_owner";
};
