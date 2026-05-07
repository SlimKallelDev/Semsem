import { COUNTRIES } from "./countries";

const trimValue = (value) => String(value || "").trim();

export const normalizeLocationKey = (value) =>
  trimValue(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const COUNTRY_LOOKUP = COUNTRIES.reduce((lookup, country) => {
  lookup[normalizeLocationKey(country)] = country;
  return lookup;
}, {});

const COUNTRY_ALIASES = {
  republicoftunisia: "Tunisia",
  tn: "Tunisia",
  tounes: "Tunisia",
  tunisie: "Tunisia",
  tunisianrepublic: "Tunisia",
};

export const GOVERNORATES_BY_COUNTRY = {
  Tunisia: [
    "Ariana",
    "Beja",
    "Ben Arous",
    "Bizerte",
    "Gabes",
    "Gafsa",
    "Jendouba",
    "Kairouan",
    "Kasserine",
    "Kebili",
    "Kef",
    "Mahdia",
    "Manouba",
    "Medenine",
    "Monastir",
    "Nabeul",
    "Sfax",
    "Sidi Bouzid",
    "Siliana",
    "Sousse",
    "Tataouine",
    "Tozeur",
    "Tunis",
    "Zaghouan",
  ],
};

const GOVERNORATE_ALIASES_BY_COUNTRY = {
  Tunisia: {
    elariana: "Ariana",
    lamanouba: "Manouba",
    lekef: "Kef",
    mannouba: "Manouba",
    manubah: "Manouba",
    madanin: "Medenine",
    medenin: "Medenine",
    qabis: "Gabes",
    qafsa: "Gafsa",
    sfakess: "Sfax",
    soussa: "Sousse",
    tunisgovernorate: "Tunis",
  },
};

export function resolveCountryName(country) {
  const rawCountry = trimValue(country);
  if (!rawCountry) return "";

  const key = normalizeLocationKey(rawCountry);
  return COUNTRY_ALIASES[key] || COUNTRY_LOOKUP[key] || rawCountry;
}

export function getGovernoratesForCountry(country) {
  const canonicalCountry = resolveCountryName(country);
  return GOVERNORATES_BY_COUNTRY[canonicalCountry] || [];
}

export function hasGovernorateListForCountry(country) {
  return getGovernoratesForCountry(country).length > 0;
}

function findGovernorateMatch(country, governorate) {
  const options = getGovernoratesForCountry(country);
  const key = normalizeLocationKey(governorate);

  if (!key || !options.length) {
    return "";
  }

  const canonicalCountry = resolveCountryName(country);
  const aliases = GOVERNORATE_ALIASES_BY_COUNTRY[canonicalCountry] || {};
  if (aliases[key]) {
    return aliases[key];
  }

  const normalizedOptions = options.map((option) => ({
    label: option,
    key: normalizeLocationKey(option),
  }));

  const exactMatch = normalizedOptions.find((option) => option.key === key);
  if (exactMatch) {
    return exactMatch.label;
  }

  if (key.length < 3) {
    return "";
  }

  const containedMatch = normalizedOptions.find(
    (option) => key.includes(option.key) || option.key.includes(key)
  );

  return containedMatch?.label || "";
}

export function resolveGovernorateForCountry(
  country,
  governorate,
  { fallbackToRaw = true } = {}
) {
  const rawGovernorate = trimValue(governorate);
  if (!rawGovernorate) return "";

  const options = getGovernoratesForCountry(country);
  if (!options.length) {
    return rawGovernorate;
  }

  const match = findGovernorateMatch(country, rawGovernorate);
  return match || (fallbackToRaw ? rawGovernorate : "");
}

export function resolveFirstGovernorateForCountry(
  country,
  governorates,
  { fallbackToRaw = true } = {}
) {
  const values = Array.isArray(governorates) ? governorates : [governorates];
  const firstRaw = values.map(trimValue).find(Boolean) || "";

  for (const value of values) {
    const match = resolveGovernorateForCountry(country, value, {
      fallbackToRaw: false,
    });

    if (match) {
      return match;
    }
  }

  return fallbackToRaw ? firstRaw : "";
}
