import { City, Country, State } from "country-state-city";

import {
  GOVERNORATES_BY_COUNTRY,
  normalizeLocationKey,
  resolveCountryName,
  resolveGovernorateForCountry,
} from "./governorates";

const trimValue = (value) => String(value || "").trim();
let cachedLocationSearchIndex = null;

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

const CURATED_LOCATION_KEYS = new Set(
  Object.entries(GOVERNORATES_BY_COUNTRY).flatMap(([country, cities]) =>
    cities.map(
      (city) =>
        `${normalizeLocationKey(country)}:${normalizeLocationKey(city)}`
    )
  )
);

const getCountryNameByCode = () =>
  Country.getAllCountries().reduce((result, country) => {
    result[country.isoCode] = resolveCountryName(country.name);
    return result;
  }, {});

const addRowToBucket = (buckets, key, row) => {
  const normalizedKey = normalizeLocationKey(trimValue(key).slice(0, 12));
  if (!normalizedKey) return;

  const prefixes = new Set([
    normalizedKey.charAt(0),
    normalizedKey.slice(0, 2),
  ]);

  prefixes.forEach((prefix) => {
    if (!buckets.has(prefix)) {
      buckets.set(prefix, []);
    }

    buckets.get(prefix).push(row);
  });
};

const buildLocationSearchIndex = () => {
  const countryNameByCode = getCountryNameByCode();
  const governorateNameByCode = State.getAllStates().reduce((result, state) => {
    if (isGovernorateName(state.name)) {
      result[`${state.countryCode}:${state.isoCode}`] = cleanAdminName(state.name);
    }

    return result;
  }, {});
  const placeBuckets = new Map();
  const countryBuckets = new Map();

  City.getAllCities().forEach((city) => {
    const country = countryNameByCode[city.countryCode] || city.countryCode;
    const governorateName =
      governorateNameByCode[`${city.countryCode}:${city.stateCode}`];
    const row = {
      city,
      country,
      governorate: governorateName || city.name,
    };
    const cityWithoutArticle = trimValue(city.name)
      .replace(LEADING_ARTICLE_PATTERN, "")
      .trim();

    addRowToBucket(placeBuckets, city.name, row);
    addRowToBucket(placeBuckets, cityWithoutArticle, row);
    addRowToBucket(placeBuckets, governorateName, row);
    addRowToBucket(countryBuckets, country, row);
  });

  return { countryBuckets, placeBuckets };
};

function getLocationSearchIndex() {
  if (!cachedLocationSearchIndex) {
    cachedLocationSearchIndex = buildLocationSearchIndex();
  }

  return cachedLocationSearchIndex;
}

export function preloadLocationSearchOptions() {
  getLocationSearchIndex();
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

const includeCurrentOption = (options, currentLocation, queryKey) => {
  const currentCountry = trimValue(currentLocation?.country);
  const currentGovernorate = trimValue(currentLocation?.governorate);

  if (!currentCountry || !currentGovernorate) {
    return options;
  }

  const currentOption = buildOption(currentCountry, currentGovernorate);
  if (scoreOption(currentOption, queryKey) === 99) {
    return options;
  }

  const hasCurrent = options.some((option) => option.key === currentOption.key);

  return hasCurrent ? options : [currentOption, ...options];
};

export function getLocationSearchOptions(
  query,
  { currentLocation = null, limit = 80 } = {}
) {
  const queryKey = normalizeLocationKey(query);

  if (!queryKey) {
    return [];
  }

  const { countryBuckets, placeBuckets } = getLocationSearchIndex();
  const searchPrefix = queryKey.slice(0, Math.min(2, queryKey.length));
  const candidateRows = [
    ...(placeBuckets.get(searchPrefix) || []).slice(0, 800),
    ...(countryBuckets.get(searchPrefix) || []).slice(0, 400),
  ];
  const options = [];
  const optionByKey = new Map();
  const seenCities = new Set();

  Object.entries(GOVERNORATES_BY_COUNTRY).forEach(([country, cities]) => {
    cities.forEach((city) => addOption(options, optionByKey, country, city));
  });

  candidateRows.forEach((row) => {
    if (seenCities.has(row.city)) return;
    seenCities.add(row.city);
    const rowSearchKeys = [
      row.city.name,
      trimValue(row.city.name).replace(LEADING_ARTICLE_PATTERN, "").trim(),
      row.governorate,
      row.country,
    ].map(normalizeLocationKey);

    if (!rowSearchKeys.some((key) => key.startsWith(queryKey))) {
      return;
    }

    addOption(
      options,
      optionByKey,
      row.country,
      row.governorate,
      [row.city.name]
    );
  });

  const featuredCountries = FEATURED_CITY_COUNTRIES[queryKey] || [];

  return includeCurrentOption(options, currentLocation, queryKey)
    .map((option) => {
      const isFeaturedExactCity =
        option.searchKeys.includes(queryKey) &&
        featuredCountries.some(
          (country) => normalizeLocationKey(country) === option.countryKey
        );

      const baseScore = isFeaturedExactCity ? -1 : scoreOption(option, queryKey);
      const isCuratedPrefixMatch =
        CURATED_LOCATION_KEYS.has(option.key) &&
        (option.cityKey.startsWith(queryKey) ||
          option.countryKey.startsWith(queryKey) ||
          option.searchKeys.some((key) => key.startsWith(queryKey)));

      return {
        option,
        score: baseScore < 99 && isCuratedPrefixMatch ? baseScore - 20 : baseScore,
      };
    })
    .filter((item) => item.score < 99)
    .sort(
      (a, b) =>
        a.score - b.score || a.option.label.localeCompare(b.option.label)
    )
    .slice(0, limit)
    .map((item) => item.option);
}
