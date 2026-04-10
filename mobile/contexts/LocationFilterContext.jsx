import { createContext, useContext, useMemo, useState } from "react";

import { useUser } from "./UserContext";

const LocationFilterContext = createContext(null);

export function LocationFilterProvider({ children }) {
  const { user } = useUser();
  const [mode, setMode] = useState("nearby");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");

  const profileCity = user?.city?.trim?.() || "";
  const profileCountry = user?.country?.trim?.() || "";

  const nearbySummary = useMemo(
    () => [profileCity, profileCountry].filter(Boolean).join(", "),
    [profileCity, profileCountry]
  );

  const filters = useMemo(() => {
    if (mode === "worldwide") {
      return { city: "", country: "" };
    }

    if (mode === "place") {
      return {
        city: selectedCity.trim(),
        country: selectedCountry.trim(),
      };
    }

    return {
      city: profileCity,
      country: profileCountry,
    };
  }, [mode, profileCity, profileCountry, selectedCity, selectedCountry]);

  const selectionLabel = useMemo(() => {
    if (mode === "worldwide") {
      return "In All the World";
    }

    if (mode === "place") {
      return (
        [selectedCity.trim(), selectedCountry.trim()]
          .filter(Boolean)
          .join(", ") || "Specific Place"
      );
    }

    return "Near Me";
  }, [mode, selectedCity, selectedCountry]);

  const helperText = useMemo(() => {
    if (mode === "worldwide") {
      return "Showing posts and pets from every region";
    }

    if (mode === "place") {
      return "Using your selected city or country";
    }

    if (nearbySummary) {
      return `Using ${nearbySummary}`;
    }

    return "Uses your profile location when available";
  }, [mode, nearbySummary]);

  const value = useMemo(
    () => ({
      mode,
      filters,
      selectionLabel,
      helperText,
      nearbySummary,
      selectedCity,
      selectedCountry,
      setNearby: () => setMode("nearby"),
      setWorldwide: () => setMode("worldwide"),
      applyCustomPlace: ({ city = "", country = "" }) => {
        setSelectedCity(city.trim());
        setSelectedCountry(country.trim());
        setMode("place");
      },
    }),
    [
      filters,
      helperText,
      mode,
      nearbySummary,
      selectedCity,
      selectedCountry,
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
