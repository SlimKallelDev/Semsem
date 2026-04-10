import { useCallback, useMemo, useState } from "react";
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

import Spacer from "../../components/Spacer";
import ThemedText from "../../components/ThemedText";
import ThemedView from "../../components/ThemedView";
import { useUser } from "../../contexts/UserContext";
import { deletePet, getPetsByOwner } from "../../services/petService";

export default function MyPetsScreen() {
  const { user } = useUser();

  const userId = useMemo(
    () => user?._id || user?.id || user?.$id || null,
    [user]
  );

  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadMyPets = useCallback(async () => {
    if (!userId) {
      setPets([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const data = await getPetsByOwner(userId);
      setPets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading my pets:", error);
      Alert.alert("Error", "Failed to load your pets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadMyPets();
    }, [loadMyPets])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMyPets();
  };

  const handleDeletePet = (petId) => {
    Alert.alert("Delete pet", "Are you sure you want to delete this pet?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingId(petId);
            await deletePet(petId);
            setPets((prev) => prev.filter((item) => item._id !== petId));
          } catch (error) {
            console.error("Error deleting pet:", error);
            Alert.alert("Error", "Failed to delete pet");
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const renderPetCard = ({ item }) => {
    const petId = item?._id || item?.id;
    const imageUri =
      item?.image || "https://via.placeholder.com/400x400.png?text=Pet";

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.card}
        onPress={() => {
          if (petId) {
            router.push(`/pet/${petId}`);
          }
        }}
      >
        <Image source={{ uri: imageUri }} style={styles.cardImage} />

        <View style={styles.cardContent}>
          <ThemedText style={styles.cardTitle}>
            {item?.name || "Unnamed"}
          </ThemedText>

          <ThemedText style={styles.cardSubtitle}>
            {item?.type || "Pet"} | {item?.breed || "Unknown"}
          </ThemedText>

          {!!item?.description && (
            <ThemedText style={styles.cardDescription} numberOfLines={2}>
              {item.description}
            </ThemedText>
          )}

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => {
                if (petId) {
                  router.push(`/pet/${petId}`);
                }
              }}
            >
              <ThemedText style={styles.viewButtonText}>View</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeletePet(petId)}
              disabled={deletingId === petId}
            >
              <ThemedText style={styles.deleteButtonText}>
                {deletingId === petId ? "Deleting..." : "Delete"}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ThemedView style={styles.center}>
          <ActivityIndicator size="large" />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!userId) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ThemedView style={styles.center}>
          <ThemedText>You need to be logged in to see your pets.</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <ThemedText type="title" style={styles.title}>
              My Pets
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              View and manage the pets you own
            </ThemedText>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/pet/new-pet")}
          >
            <ThemedText style={styles.addButtonText}>+ Add Pet</ThemedText>
          </TouchableOpacity>
        </View>

        <Spacer height={16} />

        <FlatList
          data={pets}
          keyExtractor={(item, index) => item?._id || item?.id || `${index}`}
          renderItem={renderPetCard}
          contentContainerStyle={[
            styles.listContent,
            pets.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyTitle}>
                You have no pets yet
              </ThemedText>
              <ThemedText style={styles.emptyText}>
                Tap "Add Pet" to create your first pet profile.
              </ThemedText>
              <Spacer height={16} />
              <TouchableOpacity
                style={styles.emptyAction}
                onPress={() => router.push("/pet/new-pet")}
              >
                <ThemedText style={styles.emptyActionText}>
                  Add your first pet
                </ThemedText>
              </TouchableOpacity>
            </View>
          }
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  headerTextBlock: {
    flex: 1,
  },
  title: {
    fontSize: 24,
  },
  subtitle: {
    marginTop: 4,
    opacity: 0.7,
    fontSize: 14,
  },
  addButton: {
    backgroundColor: "#222",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 15,
    opacity: 0.7,
    textAlign: "center",
  },
  emptyAction: {
    backgroundColor: "#222",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyActionText: {
    color: "#fff",
    fontWeight: "700",
  },
  card: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
    marginBottom: 14,
  },
  cardImage: {
    width: "100%",
    height: 210,
    backgroundColor: "#e9e9e9",
  },
  cardContent: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 10,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: "row",
    gap: 10,
  },
  viewButton: {
    flex: 1,
    backgroundColor: "#222",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  viewButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#fbe4e7",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#c0392b",
    fontWeight: "700",
  },
});
