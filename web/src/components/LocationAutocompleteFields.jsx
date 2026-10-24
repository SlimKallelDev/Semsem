import { useEffect, useId, useState } from "react";

import { apiRequest } from "../api";

const loadLocationSuggestions = async ({ query, type, country, signal }) => {
  const params = new URLSearchParams({ query, type, limit: "12" });
  if (country) params.set("country", country);

  const response = await apiRequest(`/locations/suggestions?${params}`, {
    signal,
  });
  return Array.isArray(response?.items) ? response.items : [];
};

function AutocompleteInput({
  value,
  onChange,
  placeholder,
  type,
  country = "",
}) {
  const listId = useId();
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const query = String(value || "").trim();

  useEffect(() => {
    if (!focused || !query) {
      setSuggestions([]);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        const items = await loadLocationSuggestions({
          query,
          type,
          country,
          signal: controller.signal,
        });
        setSuggestions(items);
      } catch (error) {
        if (error?.name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 100);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [country, focused, query, type]);

  const isOpen = focused && query.length > 0;

  return (
    <div className="location-autocomplete">
      <input
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={isOpen && suggestions.length > 0}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 100)}
        onChange={(event) => onChange(event.target.value, false)}
      />

      {isOpen ? (
        <div className="location-suggestions" id={listId} role="listbox">
          {loading ? <span>Searching...</span> : null}
          {!loading && suggestions.length
            ? suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  role="option"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(suggestion, true);
                    setFocused(false);
                  }}
                >
                  {suggestion}
                </button>
              ))
            : null}
          {!loading && !suggestions.length ? (
            <span>No matching location</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function LocationAutocompleteFields({
  country,
  governorate,
  onChange,
}) {
  return (
    <>
      <label>
        Country
        <AutocompleteInput
          value={country}
          type="country"
          placeholder="Start typing a country"
          onChange={(value) =>
            onChange({
              country: value,
              governorate: value === country ? governorate : "",
            })
          }
        />
      </label>
      <label>
        Governorate / city
        <AutocompleteInput
          value={governorate}
          type="region"
          country={country}
          placeholder="Start typing a city or region"
          onChange={(value) => onChange({ country, governorate: value })}
        />
      </label>
    </>
  );
}
