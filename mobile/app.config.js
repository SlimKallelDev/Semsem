const baseConfig = require("./app.json");

module.exports = ({ config }) => {
  const projectId = process.env.EAS_PROJECT_ID || process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    baseConfig.expo.extra?.eas?.projectId || config.extra?.eas?.projectId;
  const expo = { ...baseConfig.expo, ...config };
  const updates = {
    ...expo.updates,
    ...(projectId ? { url: `https://u.expo.dev/${projectId}` } : {}),
  };

  return {
    ...expo,
    updates,
    runtimeVersion: { policy: "appVersion" },
    extra: {
      ...expo.extra,
      ...(projectId ? { eas: { projectId } } : {}),
    },
  };
};
