const AppVersionPolicy = require("../models/AppVersionPolicy");

const DEFAULTS = {
  ios: {
    latestVersion: "1.0.0",
    minimumSupportedVersion: "1.0.0",
    updateMessage: "A new version of Semsem is available.",
    storeUrl: "",
  },
  android: {
    latestVersion: "1.0.0",
    minimumSupportedVersion: "1.0.0",
    updateMessage: "A new version of Semsem is available.",
    storeUrl: "https://play.google.com/store/apps/details?id=com.semsem.pets",
  },
};

const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const compareVersions = (left, right) => {
  const parse = (version) => {
    const withoutBuild = version.split("+")[0];
    const [core, prerelease] = withoutBuild.split("-");
    return { core: core.split(".").map((value) => BigInt(value)), prerelease: prerelease?.split(".") };
  };
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < 3; index += 1) {
    if (a.core[index] !== b.core[index]) return a.core[index] > b.core[index] ? 1 : -1;
  }
  if (!a.prerelease && b.prerelease) return 1;
  if (a.prerelease && !b.prerelease) return -1;
  if (!a.prerelease && !b.prerelease) return 0;
  const length = Math.min(a.prerelease.length, b.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = a.prerelease[index];
    const rightPart = b.prerelease[index];
    if (leftPart === rightPart) continue;
    const leftNumeric = /^\d+$/.test(leftPart);
    const rightNumeric = /^\d+$/.test(rightPart);
    if (leftNumeric && rightNumeric) {
      const leftNumber = BigInt(leftPart);
      const rightNumber = BigInt(rightPart);
      return leftNumber > rightNumber ? 1 : -1;
    }
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    return leftPart > rightPart ? 1 : -1;
  }
  if (a.prerelease.length === b.prerelease.length) return 0;
  return a.prerelease.length > b.prerelease.length ? 1 : -1;
};

const evaluateVersionPolicy = (installedVersion, config) => {
  const mandatoryUpdateRequired = compareVersions(installedVersion, config.minimumSupportedVersion) < 0;
  const optionalUpdateAvailable = !mandatoryUpdateRequired && Boolean(config.storeUrl) &&
    compareVersions(installedVersion, config.latestVersion) < 0;
  return { mandatoryUpdateRequired, optionalUpdateAvailable };
};

const getPolicy = async () => {
  const existing = await AppVersionPolicy.findOne({ key: "global" }).lean();
  return {
    ios: { ...DEFAULTS.ios, ...(existing?.ios || {}) },
    android: { ...DEFAULTS.android, ...(existing?.android || {}) },
  };
};

const ensureDefaultPolicy = async () => AppVersionPolicy.updateOne(
  { key: "global" },
  { $setOnInsert: { key: "global", ...DEFAULTS } },
  { upsert: true }
);

const savePlatformPolicy = async (platform, values) => {
  const current = await getPolicy();
  for (const [field, value] of Object.entries(values)) {
    if (typeof value !== "string") {
      const error = new Error(`${field} must be a string`);
      error.statusCode = 400;
      throw error;
    }
  }
  const normalizedValues = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
  const next = { ...current[platform], ...normalizedValues };
  for (const field of ["latestVersion", "minimumSupportedVersion"]) {
    if (!VERSION_PATTERN.test(String(next[field] || ""))) {
      const error = new Error(`${field} must use semantic version format (x.y.z)`);
      error.statusCode = 400;
      throw error;
    }
  }
  if (compareVersions(next.minimumSupportedVersion, next.latestVersion) > 0) {
    const error = new Error("Minimum supported version cannot exceed latest version");
    error.statusCode = 400;
    throw error;
  }
  if (next.updateMessage.length > 500) {
    const error = new Error("Update message cannot exceed 500 characters");
    error.statusCode = 400;
    throw error;
  }
  if (next.storeUrl && !/^https:\/\//i.test(next.storeUrl)) {
    const error = new Error("Store URL must use HTTPS");
    error.statusCode = 400;
    throw error;
  }

  const policy = await AppVersionPolicy.findOneAndUpdate(
    { key: "global" },
    { $set: { [platform]: next } },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );
  return policy[platform];
};

module.exports = { DEFAULTS, VERSION_PATTERN, compareVersions, evaluateVersionPolicy, getPolicy, savePlatformPolicy, ensureDefaultPolicy };
