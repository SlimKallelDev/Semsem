const { City, Country, State } = require("country-state-city");

const COUNTRIES = Country.getAllCountries();
const COUNTRY_NAMES = COUNTRIES.map((country) => country.name).sort((a, b) =>
  a.localeCompare(b)
);
const regionOptionsByCountry = new Map();
const PREFERRED_COUNTRIES = ["Tunisia", "France", "Morocco"];
const PREFERRED_REGIONS_BY_COUNTRY = {
  France: ["Paris"],
  Morocco: [
    "Casablanca",
    "Rabat",
    "Marrakesh",
    "Fes",
    "Tangier",
    "Agadir",
  ],
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

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const cleanRegionName = (value) =>
  String(value || "")
    .replace(/\s+(governorate|gouvernorat)$/i, "")
    .trim();

const rankSuggestions = (options, query, limit, preferred = []) => {
  const queryKey = normalize(query);
  if (!queryKey) return [];

  const startsWith = [];
  const contains = [];

  options.forEach((option) => {
    const optionKey = normalize(option);
    if (optionKey.startsWith(queryKey)) {
      startsWith.push(option);
    } else if (optionKey.includes(queryKey)) {
      contains.push(option);
    }
  });

  const preferredIndex = new Map(
    preferred.map((option, index) => [normalize(option), index])
  );
  const prioritize = (left, right) => {
    const leftIndex = preferredIndex.get(normalize(left));
    const rightIndex = preferredIndex.get(normalize(right));
    const leftRank = leftIndex === undefined ? Number.MAX_SAFE_INTEGER : leftIndex;
    const rightRank = rightIndex === undefined ? Number.MAX_SAFE_INTEGER : rightIndex;
    return leftRank - rightRank;
  };

  startsWith.sort(prioritize);
  contains.sort(prioritize);
  return [...startsWith, ...contains].slice(0, limit);
};

const findCountry = (countryName) => {
  const countryKey = normalize(countryName);
  return COUNTRIES.find((country) => normalize(country.name) === countryKey);
};

const getRegionOptions = (country) => {
  if (!country) return [];

  if (!regionOptionsByCountry.has(country.isoCode)) {
    const states = State.getStatesOfCountry(country.isoCode).map((state) =>
      cleanRegionName(state.name)
    );
    const cities = City.getCitiesOfCountry(country.isoCode).map(
      (city) => city.name
    );
    const options = [...new Set([...states, ...cities].filter(Boolean))].sort(
      (a, b) => a.localeCompare(b)
    );
    regionOptionsByCountry.set(country.isoCode, options);
  }

  return regionOptionsByCountry.get(country.isoCode);
};

const getLocationSuggestions = (req, res) => {
  const query = String(req.query.query || req.query.q || "").trim();
  const type = String(req.query.type || "country").trim().toLowerCase();
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 20)
    : 12;

  if (!query) {
    return res.status(200).json({ items: [] });
  }

  if (type === "country") {
    return res.status(200).json({
      items: rankSuggestions(COUNTRY_NAMES, query, limit, PREFERRED_COUNTRIES),
    });
  }

  if (type === "region") {
    const country = findCountry(req.query.country);
    return res.status(200).json({
      items: rankSuggestions(
        getRegionOptions(country),
        query,
        limit,
        PREFERRED_REGIONS_BY_COUNTRY[country?.name] || []
      ),
    });
  }

  return res.status(400).json({ message: "Invalid location suggestion type" });
};

module.exports = {
  getLocationSuggestions,
};
