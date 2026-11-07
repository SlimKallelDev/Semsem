const { getPolicy, savePlatformPolicy, VERSION_PATTERN, evaluateVersionPolicy } = require("../services/appVersionService");

const checkAppVersion = async (req, res, next) => {
  try {
    const platform = String(req.query.platform || "").toLowerCase();
    const installedVersion = String(req.query.version || "").trim();
    if (!["ios", "android"].includes(platform) || !VERSION_PATTERN.test(installedVersion)) {
      return res.status(400).json({ message: "Valid platform and installed version are required" });
    }

    const config = (await getPolicy())[platform];
    return res.json({ platform, installedVersion, ...config, ...evaluateVersionPolicy(installedVersion, config) });
  } catch (error) {
    next(error);
  }
};

const getAppVersionPolicies = async (req, res, next) => {
  try { return res.json(await getPolicy()); } catch (error) { next(error); }
};

const updateAppVersionPolicy = async (req, res, next) => {
  try {
    const platform = String(req.params.platform || "").toLowerCase();
    if (!["ios", "android"].includes(platform)) {
      return res.status(400).json({ message: "Platform must be ios or android" });
    }
    const allowed = ["latestVersion", "minimumSupportedVersion", "updateMessage", "storeUrl"];
    const values = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
    if (Object.keys(values).length === 0) return res.status(400).json({ message: "No supported policy fields provided" });
    return res.json({ platform, policy: await savePlatformPolicy(platform, values) });
  } catch (error) { next(error); }
};

module.exports = { checkAppVersion, getAppVersionPolicies, updateAppVersionPolicy };
