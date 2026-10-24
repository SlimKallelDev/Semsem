import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ExpoLocation from "expo-location";
import { Alert, Linking } from "react-native";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  resolveCountryName,
  resolveFirstGovernorateForCountry,
  resolveGovernorateForCountry,
} from "../constants/governorates";

const LocationFilterContext = createContext(null);

const STORAGE_KEYS = {
  detectionEnabled: "@location-filter/detection-enabled",
  askedOnLaunch: "@location-filter/asked-on-launch",
  detectedGovernorate: "@location-filter/detected-governorate",
  detectedCountry: "@location-filter/detected-country",
};

const trimValue = (value) => String(value || "").trim();

const normalizePlace = ({ governorate = "", country = "" } = {}) => {
  const normalizedCountry = resolveCountryName(country);

  return {
    governorate: resolveGovernorateForCountry(
      normalizedCountry,
      governorate
    ),
    country: normalizedCountry,
  };
};

const hasDetectedPlace = (place) =>
  Boolean(place?.governorate) && Boolean(place?.country);

function askForActivation() {
  return new Promise((resolve) => {
    let settled = false;
    const finalize = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    Alert.alert(
      "Enable detect location",
      "Activate detect location so Semsem can use your country and city for Near me filters.",
      [
        {
          text: "Not now",
          style: "cancel",
          onPress: () => finalize(false),
        },
        {
          text: "Activate",
          onPress: () => finalize(true),
        },
      ],
      {
        cancelable: true,
        onDismiss: () => finalize(false),
      }
    );
  });
}

function askToOpenSettings() {
  return new Promise((resolve) => {
    let settled = false;
    const finalize = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    Alert.alert(
      "Location permission needed",
      "Near me needs location permission. Open settings to allow location access.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => finalize(false),
        },
        {
          text: "Open settings",
          onPress: () => finalize(true),
        },
      ],
      {
        cancelable: true,
        onDismiss: () => finalize(false),
      }
    );
  });
}

export function LocationFilterProvider({ children }) {
  const [mode, setMode] = useState("worldwide");
  const [selectedGovernorate, setSelectedGovernorate] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [detectedGovernorate, setDetectedGovernorate] = useState("");
  const [detectedCountry, setDetectedCountry] = useState("");
  const [locationDetectionEnabled, setLocationDetectionEnabled] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [locationPermissionCanAskAgain, setLocationPermissionCanAskAgain] =
    useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationBootstrapped, setLocationBootstrapped] = useState(false);

  const nearbySummary = useMemo(
    () => [detectedCountry, detectedGovernorate].filter(Boolean).join(", "),
    [detectedGovernorate, detectedCountry]
  );

  const updatePermissionState = useCallback((permission) => {
    if (!permission) return;

    setLocationPermissionGranted(Boolean(permission.granted));
    setLocationPermissionCanAskAgain(permission.canAskAgain !== false);
  }, []);

  const refreshPermissionState = useCallback(async () => {
    try {
      const permission = await ExpoLocation.getForegroundPermissionsAsync();
      updatePermissionState(permission);
      return permission;
    } catch (error) {
      console.log("Location permission check error:", error?.message || error);
      return null;
    }
  }, [updatePermissionState]);

  const resolveDevicePlace = useCallback(async () => {
    let position = null;

    try {
      position = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });
    } catch (error) {
      try {
        position = await ExpoLocation.getLastKnownPositionAsync({
          maxAge: 1000 * 60 * 15,
        });
      } catch (fallbackError) {
        console.log(
          "Location lookup error:",
          fallbackError?.message || fallbackError
        );
      }
    }

    if (!position?.coords) {
      return null;
    }

    const addresses = await ExpoLocation.reverseGeocodeAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });

    const firstAddress = Array.isArray(addresses) ? addresses[0] : null;
    const detectedCountry = resolveCountryName(
      firstAddress?.country || firstAddress?.isoCountryCode
    );
    const detectedGovernorate = resolveFirstGovernorateForCountry(
      detectedCountry,
      [
        firstAddress?.governorate,
        firstAddress?.region,
        firstAddress?.subregion,
        firstAddress?.district,
        firstAddress?.city,
      ],
      { fallbackToRaw: false }
    );
    const place = normalizePlace({
      governorate: detectedGovernorate,
      country: detectedCountry,
    });

    return hasDetectedPlace(place) ? place : null;
  }, []);

  const saveDetectedPlace = useCallback(async ({ governorate, country }) => {
    const normalized = normalizePlace({ governorate, country });

    setDetectedGovernorate(normalized.governorate);
    setDetectedCountry(normalized.country);

    await AsyncStorage.multiSet([
      [STORAGE_KEYS.detectedGovernorate, normalized.governorate],
      [STORAGE_KEYS.detectedCountry, normalized.country],
    ]);

    return normalized;
  }, []);

  const clearDetectedPlace = useCallback(async () => {
    setDetectedGovernorate("");
    setDetectedCountry("");

    await AsyncStorage.multiRemove([
      STORAGE_KEYS.detectedGovernorate,
      STORAGE_KEYS.detectedCountry,
    ]);
  }, []);

  const openAppSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.log("Open settings error:", error?.message || error);
    }
  }, []);

  const enableNearMe = useCallback(
    async ({
      allowPermissionPrompt = true,
      promptToOpenSettings = false,
      switchToWorldwideOnFail = true,
    } = {}) => {
      setLocationLoading(true);

      try {
        let permission = await refreshPermissionState();

        if (!permission?.granted && allowPermissionPrompt) {
          permission = await ExpoLocation.requestForegroundPermissionsAsync();
          updatePermissionState(permission);
        }

        if (!permission?.granted) {
          if (
            promptToOpenSettings &&
            permission &&
            permission.canAskAgain === false
          ) {
            const shouldOpenSettings = await askToOpenSettings();
            if (shouldOpenSettings) {
              await openAppSettings();
            }
          }

          if (switchToWorldwideOnFail) {
            setMode("worldwide");
          }
          return false;
        }

        const place = await resolveDevicePlace();

        if (!place) {
          await clearDetectedPlace();
          if (switchToWorldwideOnFail) {
            setMode("worldwide");
          }
          return false;
        }

        await saveDetectedPlace(place);
        setMode("nearby");
        return true;
      } catch (error) {
        console.log("Enable near me error:", error?.message || error);
        if (switchToWorldwideOnFail) {
          setMode("worldwide");
        }
        return false;
      } finally {
        setLocationLoading(false);
      }
    },
    [
      clearDetectedPlace,
      openAppSettings,
      refreshPermissionState,
      resolveDevicePlace,
      saveDetectedPlace,
      updatePermissionState,
    ]
  );

  const promptToActivateDetection = useCallback(
    async ({ launchPrompt = false } = {}) => {
      if (!launchPrompt && locationDetectionEnabled) {
        return enableNearMe({
          allowPermissionPrompt: true,
          promptToOpenSettings: true,
          switchToWorldwideOnFail: false,
        });
      }

      const shouldActivate = await askForActivation();
      if (!shouldActivate) return false;

      setLocationDetectionEnabled(true);
      await AsyncStorage.setItem(STORAGE_KEYS.detectionEnabled, "1");

      return enableNearMe({
        allowPermissionPrompt: true,
        promptToOpenSettings: true,
        switchToWorldwideOnFail: true,
      });
    },
    [enableNearMe, locationDetectionEnabled]
  );

  const setNearby = useCallback(async () => {
    if (!locationDetectionEnabled) {
      return promptToActivateDetection();
    }

    if (
      hasDetectedPlace({
        governorate: detectedGovernorate,
        country: detectedCountry,
      })
    ) {
      setMode("nearby");
      return true;
    }

    return enableNearMe({
      allowPermissionPrompt: true,
      promptToOpenSettings: true,
      switchToWorldwideOnFail: true,
    });
  }, [
    detectedGovernorate,
    detectedCountry,
    enableNearMe,
    locationDetectionEnabled,
    promptToActivateDetection,
  ]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const values = await AsyncStorage.multiGet([
          STORAGE_KEYS.detectionEnabled,
          STORAGE_KEYS.askedOnLaunch,
          STORAGE_KEYS.detectedGovernorate,
          STORAGE_KEYS.detectedCountry,
        ]);
        const map = Object.fromEntries(values);

        const isDetectionEnabled = map[STORAGE_KEYS.detectionEnabled] === "1";
        const hasAskedOnLaunch = map[STORAGE_KEYS.askedOnLaunch] === "1";
        const cachedPlace = normalizePlace({
          governorate: map[STORAGE_KEYS.detectedGovernorate],
          country: map[STORAGE_KEYS.detectedCountry],
        });

        if (!active) return;

        setLocationDetectionEnabled(isDetectionEnabled);
        setDetectedGovernorate(cachedPlace.governorate);
        setDetectedCountry(cachedPlace.country);
        setMode(
          isDetectionEnabled && hasDetectedPlace(cachedPlace)
            ? "nearby"
            : "worldwide"
        );

        const permission = await refreshPermissionState();
        if (!active) return;

        if (isDetectionEnabled && permission?.granted) {
          const hasCurrentLocation = await enableNearMe({
            allowPermissionPrompt: false,
            promptToOpenSettings: false,
            switchToWorldwideOnFail: true,
          });

          if (!hasCurrentLocation && hasDetectedPlace(cachedPlace)) {
            setMode("nearby");
          }
        }

        if (!hasAskedOnLaunch) {
          await AsyncStorage.setItem(STORAGE_KEYS.askedOnLaunch, "1");
          if (!active) return;

          if (!isDetectionEnabled) {
            await promptToActivateDetection({ launchPrompt: true });
          }
        }
      } catch (error) {
        console.log("Location filter bootstrap error:", error?.message || error);
      } finally {
        if (active) {
          setLocationBootstrapped(true);
        }
      }
    };

    bootstrap();

    return () => {
      active = false;
    };
  }, [enableNearMe, promptToActivateDetection, refreshPermissionState]);

  const setWorldwide = useCallback(() => {
    setMode("worldwide");
  }, []);

  const applyCustomPlace = useCallback(({ governorate = "", country = "" }) => {
    const place = normalizePlace({ governorate, country });
    setSelectedGovernorate(place.governorate);
    setSelectedCountry(place.country);
    setMode("place");
  }, []);

  const filters = useMemo(() => {
    if (mode === "worldwide") {
      return { governorate: "", country: "" };
    }

    if (mode === "place") {
      return {
        governorate: selectedGovernorate.trim(),
        country: selectedCountry.trim(),
      };
    }

    return {
      governorate: detectedGovernorate,
      country: detectedCountry,
    };
  }, [
    detectedCountry,
    detectedGovernorate,
    mode,
    selectedCountry,
    selectedGovernorate,
  ]);

  const selectionLabel = useMemo(() => {
    if (mode === "worldwide") {
      return "All over the world";
    }

    if (mode === "place") {
      return (
        [selectedCountry.trim(), selectedGovernorate.trim()]
          .filter(Boolean)
          .join(", ") || "Country / City"
      );
    }

    return "Near Me";
  }, [mode, selectedCountry, selectedGovernorate]);

  const helperText = useMemo(() => {
    if (mode === "worldwide") {
      return "Browse all posts globally";
    }

    if (mode === "place") {
      return "Filter by country or city";
    }

    if (nearbySummary) {
      return `Posts around ${nearbySummary}`;
    }

    return "Enable detect location to use Near me";
  }, [mode, nearbySummary]);

  const value = useMemo(
    () => ({
      mode,
      filters,
      selectionLabel,
      helperText,
      nearbySummary,
      selectedGovernorate,
      selectedCountry,
      detectedGovernorate,
      detectedCountry,
      // Backward-compatible aliases for components not migrated yet.
      selectedCity: selectedGovernorate,
      detectedCity: detectedGovernorate,
      locationDetectionEnabled,
      locationPermissionGranted,
      locationPermissionCanAskAgain,
      locationLoading,
      locationBootstrapped,
      setNearby,
      setWorldwide,
      applyCustomPlace,
      promptToActivateDetection,
    }),
    [
      applyCustomPlace,
      detectedCountry,
      detectedGovernorate,
      filters,
      helperText,
      locationBootstrapped,
      locationDetectionEnabled,
      locationLoading,
      locationPermissionCanAskAgain,
      locationPermissionGranted,
      mode,
      nearbySummary,
      promptToActivateDetection,
      selectedCountry,
      selectedGovernorate,
      setNearby,
      setWorldwide,
      selectionLabel,
    ]
  );

  return (
    <LocationFilterContext.Provider value={value}>
      {children}
    </LocationFilterContext.Provider>
  );
}

export function useLocationFilter() {
  const context = useContext(LocationFilterContext);

  if (!context) {
    throw new Error(
      "useLocationFilter must be used within a LocationFilterProvider"
    );
  }

  return context;
}

export default LocationFilterContext;

