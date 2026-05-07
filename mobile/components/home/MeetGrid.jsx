import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";

import { useLocationFilter } from "../../contexts/LocationFilterContext";
import petService from "../../services/petService";
import ThemedText from "../ThemedText";
import MeetCard from "./MeetCard";

const GREEN = "#3DB85C";

function matchesType(pet, selectedType) {
  if (selectedType === "all") {
    return true;
  }

  const value = (pet?.type || "").toLowerCase();

  if (selectedType === "other") {
    return value && !["cat", "dog", "bird"].some((item) => value.includes(item));
  }

  return value.includes(selectedType);
}

function buildMasonryColumns(items) {
  return items.reduce(
    (columns, pet, index) => {
      columns[index % 2].push({ pet, index });
      return columns;
    },
    [[], []]
  );
}

function buildDisplayPets(items) {
  if (!items.length || items.length % 2 === 0) {
    return items;
  }

  return [
    ...items,
    {
      _id: "synthetic-meet-card",
      isSynthetic: true,
      name: "More friends",
      type: "Pets",
      breed: "Nearby",
      location: "Soon",
    },
  ];
}

export default function MeetGrid({ ownerId, selectedType = "all" }) {
  const { filters } = useLocationFilter();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadPets = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const data = ownerId
          ? await petService.getPetsByOwner(ownerId)
          : await petService.getPets(filters);

        setPets(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading pets:", err?.response?.data || err.message);
        setError("Unable to load pets.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters.governorate, filters.country, ownerId]
  );

  useFocusEffect(
    useCallback(() => {
      loadPets();
    }, [loadPets])
  );

  const filteredPets = useMemo(
    () => pets.filter((pet) => matchesType(pet, selectedType)),
    [pets, selectedType]
  );

  const displayPets = useMemo(
    () => buildDisplayPets(filteredPets),
    [filteredPets]
  );

  const masonryColumns = useMemo(
    () => buildMasonryColumns(displayPets),
    [displayPets]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color={GREEN} />
          <ThemedText style={styles.stateText}>Loading pets...</ThemedText>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <View style={styles.stateCard}>
          <Ionicons name="alert-circle-outline" size={24} color="#7A857F" />
          <ThemedText style={styles.stateText}>{error}</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadPets(true)}
          tintColor={GREEN}
        />
      }
    >
      {filteredPets.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="paw-outline" size={28} color={GREEN} />
          <ThemedText style={styles.emptyTitle}>No pets match this view</ThemedText>
          <ThemedText style={styles.emptyText}>
            Try another pet type or change the location filter above.
          </ThemedText>
        </View>
      ) : (
        <View style={styles.masonry}>
          {masonryColumns.map((column, columnIndex) => (
            <View
              key={`column-${columnIndex}`}
              style={[
                styles.column,
                columnIndex === 0 ? styles.leftColumn : styles.rightColumn,
              ]}
            >
              {column.map(({ pet, index }) => (
                <MeetCard
                  key={(pet?._id || pet?.id || index).toString()}
                  pet={pet}
                  index={index}
                />
              ))}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: "#F4F6F4",
    paddingBottom: 32,
  },
  masonry: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingTop: 12,
    alignItems: "flex-start",
    gap: 12,
  },
  column: {
    flex: 1,
  },
  leftColumn: {
    paddingTop: 0,
  },
  rightColumn: {
    paddingTop: 0,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  stateCard: {
    minWidth: 220,
    maxWidth: 320,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E7EEEA",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 16,
    shadowColor: "#214032",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  stateText: {
    marginTop: 10,
    fontSize: 14,
    opacity: 0.72,
    textAlign: "center",
  },
  emptyState: {
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7EEEA",
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#214032",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "800",
    color: "#1A241E",
  },
  emptyText: {
    marginTop: 4,
    fontSize: 14,
    color: "#78827C",
    textAlign: "center",
    lineHeight: 20,
  },
});

