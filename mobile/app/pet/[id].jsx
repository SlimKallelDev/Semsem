import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import AppTopBar from "../../components/AppTopBar";
import Spacer from "../../components/Spacer";
import ThemedText from "../../components/ThemedText";
import ThemedView from "../../components/ThemedView";
import { useUser } from "../../contexts/UserContext";
import { startConversation } from "../../services/messageService";
import { getPetById } from "../../services/petService";
import {
  formatUserTypeRatingWithCount,
  isVeterinaryUser,
} from "../../constants/userDisplay";

const GREEN = "#3DB85C";

function getEntityId(value) {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  return value?._id || value?.id || value?.$id || null;
}

function formatLocation(pet) {
  return [
    pet?.location?.governorate ||
      pet?.location?.city ||
      pet?.owner?.governorate ||
      pet?.owner?.city,
    pet?.location?.country || pet?.owner?.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatDate(rawDate) {
  if (!rawDate) return null;
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString();
}

export default function PetDetails() {
  const { id } = useLocalSearchParams();
  const petParamId = Array.isArray(id) ? id[0] : id;
  const { user } = useUser();

  const currentUserId = getEntityId(user);

  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    if (petParamId) {
      loadPet();
    }
  }, [petParamId]);

  const loadPet = async () => {
    try {
      setLoading(true);
      const data = await getPetById(petParamId);
      setPet(data);
    } catch (error) {
      console.error("Error loading pet:", error);
      Alert.alert("Error", "Failed to load pet details");
    } finally {
      setLoading(false);
    }
  };

  const ownerId = useMemo(() => getEntityId(pet?.owner), [pet?.owner]);
  const isOwner = useMemo(() => {
    if (!currentUserId || !ownerId) return false;
    return String(currentUserId) === String(ownerId);
  }, [currentUserId, ownerId]);

  const locationLabel = useMemo(() => formatLocation(pet), [pet]);
  const dateLabel = useMemo(() => formatDate(pet?.date), [pet?.date]);
  const petId = pet?._id || pet?.id;
  const ownerName = useMemo(() => {
    const firstName = String(pet?.owner?.firstName || "").trim();
    const lastName = String(pet?.owner?.lastName || "").trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ");

    return (
      fullName ||
      pet?.owner?.name ||
      pet?.owner?.fullName ||
      pet?.owner?.username ||
      pet?.owner?.email ||
      "Unknown owner"
    );
  }, [pet?.owner]);
  const ownerAvatar =
    (isOwner && (user?.avatar || user?.image || user?.photo)) ||
    pet?.owner?.avatar ||
    pet?.owner?.image ||
    pet?.owner?.photo ||
    pet?.owner?.profileImage ||
    null;
  const canOpenOwnerProfile = !!ownerId && !isOwner;
  const ownerTypeRating = formatUserTypeRatingWithCount(pet?.owner);
  const ownerActionText = isOwner
    ? "This is your pet"
    : canOpenOwnerProfile
    ? "Tap to view profile"
    : "Profile unavailable";
  const isVeterinaryOwner = isVeterinaryUser(pet?.owner);

  const handleOpenOwnerProfile = () => {
    if (!canOpenOwnerProfile) return;
    router.push(`/user/${ownerId}`);
  };

  const handleStartChat = async () => {
    try {
      if (!currentUserId) {
        Alert.alert("Error", "You must be logged in");
        return;
      }

      if (!ownerId) {
        Alert.alert("Error", "Owner not found");
        return;
      }

      if (isOwner) {
        return;
      }

      setStartingChat(true);

      const conversation = await startConversation({
        user1: currentUserId,
        user2: ownerId,
        petId,
      });

      const conversationId = getEntityId(conversation);

      if (!conversationId) {
        throw new Error("Conversation was not created");
      }

      router.push(`/messages/${conversationId}`);
    } catch (error) {
      console.error("Error starting conversation:", error);
      Alert.alert("Error", "Failed to start conversation");
    } finally {
      setStartingChat(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <AppTopBar title="Pet Profile" />
        <ThemedView style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!pet) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <AppTopBar title="Pet Profile" />
        <ThemedView style={styles.center}>
          <ThemedText>Pet not found.</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ThemedView style={styles.screen}>
        <AppTopBar title="Pet Profile" />

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={{
              uri: pet.image || "https://via.placeholder.com/500x500.png?text=Pet",
            }}
            style={styles.image}
          />

          <View style={styles.titleBlock}>
            <ThemedText style={styles.name} numberOfLines={2}>
              {pet.name}
            </ThemedText>
            <ThemedText style={styles.info}>
              {pet.type || "Pet"} | {pet.breed || "Unknown"}
            </ThemedText>
          </View>

          <View style={styles.metaRow}>
            {!!locationLabel && (
              <View style={styles.metaPill}>
                <ThemedText style={styles.metaLabel}>Location:</ThemedText>
                <ThemedText style={styles.metaValue}>{locationLabel}</ThemedText>
              </View>
            )}
            {!!dateLabel && (
              <View style={styles.metaPill}>
                <ThemedText style={styles.metaLabel}>Date:</ThemedText>
                <ThemedText style={styles.metaValue}>{dateLabel}</ThemedText>
              </View>
            )}
          </View>

          <Spacer height={16} />

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Description</ThemedText>
            <ThemedText style={styles.description}>
              {pet.description || "No description available."}
            </ThemedText>
          </View>

          <Spacer height={14} />

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Owner</ThemedText>
            <TouchableOpacity
              style={[
                styles.ownerBanner,
                isVeterinaryOwner && styles.ownerBannerVeterinary,
                !canOpenOwnerProfile && styles.ownerBannerDisabled,
              ]}
              activeOpacity={canOpenOwnerProfile ? 0.82 : 1}
              disabled={!canOpenOwnerProfile}
              onPress={handleOpenOwnerProfile}
            >
              {ownerAvatar ? (
                <Image source={{ uri: ownerAvatar }} style={styles.ownerAvatar} />
              ) : (
                <View style={styles.ownerAvatarPlaceholder}>
                  <Ionicons name="person" size={18} color="#6D7A73" />
                </View>
              )}

              <View style={styles.ownerInfo}>
                <ThemedText style={styles.ownerText} numberOfLines={1}>
                  {ownerName}
                </ThemedText>
                <ThemedText style={styles.ownerSubText} numberOfLines={1}>
                  {ownerTypeRating}
                </ThemedText>
                <ThemedText style={styles.ownerActionText} numberOfLines={1}>
                  {ownerActionText}
                </ThemedText>
              </View>

              {canOpenOwnerProfile ? (
                <Ionicons name="chevron-forward" size={18} color="#8B9790" />
              ) : null}
            </TouchableOpacity>
          </View>

          {isOwner ? (
            <>
              <Spacer height={20} />
              <TouchableOpacity
                onPress={() => petId && router.push(`/pet/${petId}/care-record`)}
                style={styles.careRecordButton}
                activeOpacity={0.9}
              >
                <ThemedText style={styles.careRecordButtonText}>
                  Pet Care Record + QR
                </ThemedText>
              </TouchableOpacity>
              <Spacer height={12} />
              <TouchableOpacity
                onPress={() => petId && router.push(`/pet/${petId}/edit`)}
                style={styles.editButton}
                activeOpacity={0.9}
              >
                <ThemedText style={styles.editButtonText}>Update Pet</ThemedText>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Spacer height={20} />
              <TouchableOpacity
                onPress={handleStartChat}
                style={[
                  styles.messageButton,
                  startingChat && styles.messageButtonDisabled,
                ]}
                disabled={startingChat}
                activeOpacity={0.9}
              >
                <ThemedText style={styles.messageButtonText}>
                  {startingChat ? "Opening..." : "Message"}
                </ThemedText>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  screen: {
    flex: 1,
    backgroundColor: "#F4F6F4",
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: 300,
    borderRadius: 18,
    backgroundColor: "#E8EEEA",
  },
  titleBlock: {
    marginTop: 14,
  },
  name: {
    fontSize: 42,
    fontWeight: "800",
    color: "#4E4E6A",
    lineHeight: 46,
  },
  info: {
    marginTop: 4,
    fontSize: 16,
    color: "#636B66",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DEE5E0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metaLabel: {
    fontSize: 13,
    color: "#6A766F",
    fontWeight: "600",
  },
  metaValue: {
    fontSize: 13,
    color: "#24312A",
    fontWeight: "700",
  },
  section: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#F7F7F7",
    borderWidth: 1,
    borderColor: "#E6EAE8",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    color: "#4E4E6A",
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    color: "#545A58",
  },
  ownerText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1F2A24",
  },
  ownerSubText: {
    fontSize: 13,
    color: "#7A847E",
    marginTop: 2,
  },
  ownerActionText: {
    marginTop: 1,
    fontSize: 11.5,
    color: "#8A948E",
  },
  ownerBanner: {
    borderWidth: 1,
    borderColor: "#DDE6E0",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
  },
  ownerBannerVeterinary: {
    borderColor: "#BFE9CF",
    backgroundColor: "#F6FFF9",
  },
  ownerBannerDisabled: {
    opacity: 0.8,
  },
  ownerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E7ECE8",
  },
  ownerAvatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E9F0EB",
    alignItems: "center",
    justifyContent: "center",
  },
  ownerInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
    minWidth: 0,
  },
  messageButton: {
    backgroundColor: GREEN,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  messageButtonDisabled: {
    opacity: 0.7,
  },
  messageButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
  editButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: GREEN,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  careRecordButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#2D8C49",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  careRecordButtonText: {
    color: "#2D8C49",
    fontWeight: "800",
    fontSize: 16,
  },
  editButtonText: {
    color: GREEN,
    fontWeight: "800",
    fontSize: 16,
  },
});

