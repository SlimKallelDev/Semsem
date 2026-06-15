import { City, Country, State } from "country-state-city";

import {
  GOVERNORATES_BY_COUNTRY,
  normalizeLocationKey,
  resolveCountryName,
  resolveGovernorateForCountry,
} from "./governorates";

const trimValue = (value) => String(value || "").trim();
let cachedLocationOptions = null;

const FEATURED_CITY_COUNTRIES = {
  almarsa: ["Tunisia"],
  lamarsa: ["Tunisia"],
  marsa: ["Tunisia"],
  paris: ["France"],
  sidibousaid: ["Tunisia"],
  sousse: ["Tunisia"],
  tunis: ["Tunisia"],
};

const GOVERNORATE_SUFFIX_PATTERN = /\s+(governorate|gouvernorat)\s*$/i;
const LEADING_ARTICLE_PATTERN = /^(al|el|la|le|les|l')\s+/i;

const cleanAdminName = (value) =>
  trimValue(value).replace(GOVERNORATE_SUFFIX_PATTERN, "").trim();

const isGovernorateName = (value) => GOVERNORATE_SUFFIX_PATTERN.test(trimValue(value));

const addSearchKey = (option, value) => {
  const key = normalizeLocationKey(value);

  if (key && !option.searchKeys.includes(key)) {
    option.searchKeys.push(key);
  }
};

const getAliasValues = (aliases) =>
  aliases.flatMap((alias) => {
    const value = trimValue(alias);
    const withoutArticle = value.replace(LEADING_ARTICLE_PATTERN, "").trim();

    if (!withoutArticle || withoutArticle === value) {
      return [value];
    }

    return [
      value,
      withoutArticle,
      `Al ${withoutArticle}`,
      `El ${withoutArticle}`,
      `La ${withoutArticle}`,
    ];
  });

const buildOption = (country, governorate, aliases = []) => {
  const normalizedCountry = resolveCountryName(country);
  const normalizedGovernorate = resolveGovernorateForCountry(
    normalizedCountry,
    governorate
  );
  const label = formatLocationOption({
    country: normalizedCountry,
    governorate: normalizedGovernorate,
  });

  const option = {
    country: normalizedCountry,
    governorate: normalizedGovernorate,
    label,
    key: `${normalizeLocationKey(normalizedCountry)}:${normalizeLocationKey(
      normalizedGovernorate
    )}`,
    countryKey: normalizeLocationKey(normalizedCountry),
    cityKey: normalizeLocationKey(normalizedGovernorate),
    labelKey: normalizeLocationKey(label),
    searchKeys: [],
  };

  [
    normalizedCountry,
    normalizedGovernorate,
    label,
    ...getAliasValues(aliases),
  ].forEach((value) => addSearchKey(option, value));

  return option;
};

const addOption = (options, optionByKey, country, governorate, aliases = []) => {
  const countryName = trimValue(country);
  const cityName = trimValue(governorate);

  if (!countryName || !cityName) {
    return;
  }

  const option = buildOption(countryName, cityName, aliases);
  if (!option.country || !option.governorate) {
    return;
  }

  const existingOption = optionByKey.get(option.key);
  if (existingOption) {
    getAliasValues(aliases).forEach((alias) => addSearchKey(existingOption, alias));
    return;
  }

  optionByKey.set(option.key, option);
  options.push(option);
};

const getCountryNameByCode = () =>
  Country.getAllCountries().reduce((result, country) => {
    result[country.isoCode] = resolveCountryName(country.name);
    return result;
  }, {});

const buildLocationOptions = () => {
  const countryNameByCode = getCountryNameByCode();
  const options = [];
  const optionByKey = new Map();
  const governorateNameByCode = State.getAllStates().reduce((result, state) => {
    if (isGovernorateName(state.name)) {
      result[`${state.countryCode}:${state.isoCode}`] = cleanAdminName(state.name);
    }

    return result;
  }, {});

  City.getAllCities().forEach((city) => {
    const governorateName =
      governorateNameByCode[`${city.countryCode}:${city.stateCode}`];

    addOption(
      options,
      optionByKey,
      countryNameByCode[city.countryCode] || city.countryCode,
      governorateName || city.name,
      [city.name]
    );
  });

  Object.entries(GOVERNORATES_BY_COUNTRY).forEach(([country, cities]) => {
    cities.forEach((city) => addOption(options, optionByKey, country, city));
  });

  return options.sort((a, b) => a.label.localeCompare(b.label));
};

function getAllLocationOptions() {
  if (!cachedLocationOptions) {
    cachedLocationOptions = buildLocationOptions();
  }

  return cachedLocationOptions;
}

export function formatLocationOption({ country = "", governorate = "" } = {}) {
  return [trimValue(country), trimValue(governorate)]
    .filter(Boolean)
    .join(", ");
}

export function normalizeLocationSelection({
  country = "",
  governorate = "",
} = {}) {
  const normalizedCountry = resolveCountryName(country);
  const normalizedGovernorate = resolveGovernorateForCountry(
    normalizedCountry,
    governorate
  );

  return {
    country: normalizedCountry,
    governorate: normalizedGovernorate,
  };
}

const scoreOption = (option, queryKey) => {
  if (!queryKey) return 0;
  if (option.cityKey === queryKey || option.labelKey === queryKey) return 0;
  if (option.searchKeys.some((key) => key === queryKey)) return 1;
  if (option.cityKey.startsWith(queryKey)) return 2;
  if (option.searchKeys.some((key) => key.startsWith(queryKey))) return 3;
  if (option.cityKey.includes(queryKey)) return 4;
  if (option.searchKeys.some((key) => key.includes(queryKey))) return 5;
  if (option.countryKey === queryKey) return 6;
  if (option.countryKey.startsWith(queryKey)) return 7;
  if (option.labelKey.includes(queryKey)) return 8;
  return 99;
};

const includeCurrentOption = (options, currentLocation) => {
  const currentCountry = trimValue(currentLocation?.country);
  const currentGovernorate = trimValue(currentLocation?.governorate);

  if (!currentCountry || !currentGovernorate) {
    return options;
  }

  const currentOption = buildOption(currentCountry, currentGovernorate);
  const hasCurrent = options.some((option) => option.key === currentOption.key);

  return hasCurrent ? options : [currentOption, ...options];
};

const collectSearchOptions = (options, queryKey, matches, limit) => {
  const buckets = [[], [], [], [], [], [], []];
  let found = 0;

  options.forEach((option) => {
    if (!matches(option)) {
      return;
    }

    found += 1;
    const featuredCountries = FEATURED_CITY_COUNTRIES[queryKey] || [];
    const isFeaturedExactCity =
      option.searchKeys.includes(queryKey) &&
      featuredCountries.some(
        (country) => normalizeLocationKey(country) === option.countryKey
      );
    const score = isFeaturedExactCity
      ? 0
      : Math.min(scoreOption(option, queryKey) + 1, buckets.length - 1);

    if (buckets[score].length < limit) {
      buckets[score].push(option);
    }
  });

  return {
    found,
    options: buckets.flat().slice(0, limit),
  };
};

export function getLocationSearchOptions(
  query,
  { currentLocation = null, limit = 80 } = {}
) {
  const queryKey = normalizeLocationKey(query);

  if (!queryKey) {
    return [];
  }

  const options = includeCurrentOption(getAllLocationOptions(), currentLocation);

  const cityMatches = collectSearchOptions(
    options,
    queryKey,
    (option) => option.searchKeys.some((key) => key.includes(queryKey)),
    limit
  );

  if (cityMatches.found) {
    return cityMatches.options;
  }

  return collectSearchOptions(
    options,
    queryKey,
    (option) =>
      option.countryKey.includes(queryKey) || option.labelKey.includes(queryKey),
    limit
  ).options;
}
