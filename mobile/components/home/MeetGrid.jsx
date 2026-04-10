import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";

import { useLocationFilter } from "../../contexts/LocationFilterContext";
import petService from "../../services/petService";
import ThemedText from "../ThemedText";
import MeetCard from "./MeetCard";

const GREEN = "#3DB85C";
const PET_FILTERS = [
  { label: "All", value: "all" },
  { label: "Cats", value: "cat" },
  { label: "Dogs", value: "dog" },
  { label: "Birds", value: "bird" },
  { label: "Others", value: "other" },
];

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

function buildSubtitle(count, label) {
  if (label === "Near Me") {
    return `${count} pets near you`;
  }

  if (label === "In All the World") {
    return `${count} pets around the world`;
  }

  return `${count} pets in ${label}`;
}

export default function MeetGrid({ ownerId }) {
  const { filters, selectionLabel } = useLocationFilter();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedType, setSelectedType] = useState("all");

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
    [filters.city, filters.country, ownerId]
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GREEN} />
        <ThemedText style={styles.stateText}>Loading pets...</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <ThemedText style={styles.stateText}>{error}</ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      data={filteredPets}
      keyExtractor={(item, index) =>
        (item?._id || item?.id || index).toString()
      }
      numColumns={2}
      renderItem={({ item, index }) => (
        <MeetCard pet={item} isLastInRow={(index + 1) % 2 === 0} />
      )}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.list}
      columnWrapperStyle={styles.row}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadPets(true)}
          tintColor={GREEN}
        />
      }
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <View style={styles.topRow}>
            <View style={styles.titleBlock}>
              <ThemedText style={styles.title}>To Meet</ThemedText>
              <ThemedText style={styles.subtitle}>
                {buildSubtitle(filteredPets.length, selectionLabel)}
              </ThemedText>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {PET_FILTERS.map((filter) => {
              const active = selectedType === filter.value;

              return (
                <TouchableOpacity
                  key={filter.value}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.88}
                  onPress={() => setSelectedType(filter.value)}
                >
                  <ThemedText
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {filter.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="paw-outline" size={28} color={GREEN} />
          <ThemedText style={styles.emptyTitle}>No pets match this view</ThemedText>
          <ThemedText style={styles.emptyText}>
            Try another pet type or change the location filter above.
          </ThemedText>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 40,
  },
  row: {
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  headerBlock: {
    backgroundColor: "#FFFFFF",
    paddingTop: 20,
    paddingBottom: 14,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E9EFEB",
  },
  topRow: {
    paddingHorizontal: 16,
  },
  titleBlock: {
    paddingRight: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#161F19",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    color: "#79847D",
  },
  chipsRow: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 2,
  },
  chip: {
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#E5E9E6",
    backgroundColor: "#F9FAF9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  chipActive: {
    backgroundColor: "#FFFFFF",
    borderColor: GREEN,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#606964",
  },
  chipTextActive: {
    color: GREEN,
    fontWeight: "800",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  stateText: {
    marginTop: 10,
    fontSize: 14,
    opacity: 0.72,
    textAlign: "center",
  },
  emptyState: {
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8EFEB",
    paddingVertical: 26,
    paddingHorizontal: 24,
    alignItems: "center",
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
