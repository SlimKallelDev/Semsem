import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";

import ThemedText from "../../components/ThemedText";
import { useUser } from "../../contexts/UserContext";
import { deletePet, getPetsByOwner } from "../../services/petService";

const GREEN = "#3DB85C";

function formatAge(dateValue) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Date.now() - date.getTime();
  const day = 86400000;
  if (diff >= 365 * day) return `${Math.max(1, Math.floor(diff / (365 * day)))} year${Math.floor(diff / (365 * day)) === 1 ? "" : "s"}`;
  if (diff >= 30 * day) return `${Math.max(1, Math.floor(diff / (30 * day)))} month${Math.floor(diff / (30 * day)) === 1 ? "" : "s"}`;
  return "< 1 month";
}

function typeIcon(type) {
  const t = (type || "").toLowerCase();
  if (t.includes("cat")) return "cat";
  if (t.includes("dog")) return "paw";
  if (t.includes("bird")) return "feather";
  return "paw";
}

function genderIcon(gender) {
  const g = (gender || "").toLowerCase();
  if (g.includes("female") || g === "f") return "female";
  if (g.includes("male") || g === "m") return "male";
  return "male-female";
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function PetRow({ item, onDelete }) {
  const petId = item?._id || item?.id;
  const imageUri = item?.image || "https://via.placeholder.com/200x200.png?text=Pet";
  const age = formatAge(item?.date);
  const gender = capitalize(item?.gender);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={styles.card}
      onPress={() => petId && router.push(`/pet/${petId}`)}
    >
      <Image source={{ uri: imageUri }} style={styles.cardImage} />

      <View style={styles.cardInfo}>
        {/* Name + type badge */}
        <View style={styles.nameRow}>
          <ThemedText style={styles.petName} numberOfLines={1}>
            {item?.name || "Unnamed"}
          </ThemedText>
          <View style={styles.typeBadge}>
            <Ionicons name={typeIcon(item?.type)} size={12} color={GREEN} />
            <ThemedText style={styles.typeBadgeText}>
              {capitalize(item?.type) || "Pet"}
            </ThemedText>
          </View>
        </View>

        {/* Breed */}
        <ThemedText style={styles.breed} numberOfLines={1}>
          {item?.breed || "Unknown breed"}
        </ThemedText>

        {/* Gender + age */}
        <View style={styles.metaRow}>
          {!!gender && (
            <>
              <Ionicons name={genderIcon(item?.gender)} size={13} color="#8E9B93" />
              <ThemedText style={styles.metaText}>{gender}</ThemedText>
            </>
          )}
          {!!age && (
            <>
              <Ionicons name="time-outline" size={13} color="#8E9B93" style={styles.metaGap} />
              <ThemedText style={styles.metaText}>{age}</ThemedText>
            </>
          )}
        </View>

        {/* Vaccinated badge */}
        {item?.vaccinated && (
          <View style={styles.vaccBadge}>
            <Ionicons name="shield-checkmark" size={12} color={GREEN} />
            <ThemedText style={styles.vaccText}>Vaccinated</ThemedText>
          </View>
        )}
      </View>

      {/* Edit button */}
      <TouchableOpacity
        style={styles.editBtn}
        activeOpacity={0.7}
        onPress={() => petId && router.push(`/pet/${petId}/edit`)}
      >
        <Ionicons name="create-outline" size={20} color="#B0BAB5" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function MyPetsScreen({ embedded = false, onCountChange } = {}) {
  const { user, initializing } = useUser();

  const userId = useMemo(
    () => user?._id || user?.id || user?.$id || null,
    [user]
  );

  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMyPets = useCallback(async () => {
    if (!userId) {
      setPets([]);
      onCountChange?.(0);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await getPetsByOwner(userId);
      const nextPets = Array.isArray(data) ? data : [];
      setPets(nextPets);
      onCountChange?.(nextPets.length);
    } catch (error) {
      console.error("Error loading my pets:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onCountChange, userId]);

  useFocusEffect(
    useCallback(() => {
      loadMyPets();
    }, [loadMyPets])
  );

  useEffect(() => {
    if (!embedded && !initializing && !userId) {
      router.replace("/(auth)/login");
    }
  }, [embedded, initializing, userId]);

  const handleDelete = (petId) => {
    Alert.alert("Delete Pet", "Are you sure you want to delete this pet?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePet(petId);
            setPets((prev) => {
              const nextPets = prev.filter((p) => (p._id || p.id) !== petId);
              onCountChange?.(nextPets.length);
              return nextPets;
            });
          } catch {
            Alert.alert("Error", "Failed to delete pet");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.safe, embedded && styles.embeddedSafe]}
        edges={[]}
      >
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      </SafeAreaView>
    );
  }

  if (!userId) return null;

  return (
    <SafeAreaView
      style={[styles.safe, embedded && styles.embeddedSafe]}
      edges={[]}
    >
      <FlatList
        data={pets}
        keyExtractor={(item, i) => item?._id || item?.id || String(i)}
        renderItem={({ item }) => (
          <PetRow item={item} onDelete={handleDelete} />
        )}
        contentContainerStyle={[
          styles.listContent,
          embedded && styles.embeddedListContent,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadMyPets(); }}
            tintColor={GREEN}
          />
        }
        ListHeaderComponent={!embedded ? (
          <View style={styles.pageHeader}>
            <View>
              <ThemedText style={styles.pageTitle}>My Pets</ThemedText>
            </View>
            <TouchableOpacity
              style={styles.addBtn}
              activeOpacity={0.85}
              onPress={() => router.push("/pet/new-pet")}
            >
              <Ionicons name="add" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : null}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="paw-outline" size={40} color={GREEN} />
            <ThemedText style={styles.emptyTitle}>No pets yet</ThemedText>
            <ThemedText style={styles.emptyText}>
              Tap the + button to add your first pet profile.
            </ThemedText>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F4F6F4",
  },
  embeddedSafe: {
    backgroundColor: "transparent",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  embeddedListContent: {
    paddingTop: 12,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 14,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#131F17",
    letterSpacing: -0.4,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#1A3028",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImage: {
    width: 78,
    height: 78,
    borderRadius: 14,
    backgroundColor: "#E6EDE8",
  },
  cardInfo: {
    flex: 1,
    paddingLeft: 14,
    paddingRight: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  petName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#131F17",
    flexShrink: 1,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: GREEN,
    backgroundColor: "#F0FAF3",
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: GREEN,
  },
  breed: {
    fontSize: 13,
    color: "#8E9B93",
    marginBottom: 5,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
    marginBottom: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#8E9B93",
  },
  metaGap: {
    marginLeft: 8,
  },
  vaccBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "#E8F8EE",
  },
  vaccText: {
    fontSize: 12,
    fontWeight: "600",
    color: GREEN,
  },
  editBtn: {
    padding: 6,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2C3A31",
  },
  emptyText: {
    fontSize: 14,
    color: "#8E9B93",
    textAlign: "center",
    lineHeight: 20,
  },
});
