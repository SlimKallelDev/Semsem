import { router, useLocalSearchParams } from "expo-router";
import * as ExpoLinking from "expo-linking";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
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
import {
  getPetById,
  getPetCareRecord,
} from "../../services/petService";
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
    pet?.location?.country || pet?.owner?.country,
    pet?.location?.governorate ||
      pet?.location?.city ||
      pet?.owner?.governorate ||
      pet?.owner?.city,
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

const normalizeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeCareRecord = (value = {}) => ({
  identityProfile: value?.identityProfile || {},
  medicalHistory: {
    ...(value?.medicalHistory || {}),
    veterinaryVisits: normalizeArray(value?.medicalHistory?.veterinaryVisits),
    medications: normalizeArray(value?.medicalHistory?.medications),
  },
  vaccinations: normalizeArray(value?.vaccinations),
});

const valueOrDash = (value) => {
  const text = String(value || "").trim();
  return text || "Not added";
};

const buildQrImageUrl = (value) =>
  value
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
        value
      )}`
    : "";

const buildAppPetProfileLink = (petId) => {
  const encodedPetId = encodeURIComponent(String(petId || ""));
  return encodedPetId ? ExpoLinking.createURL(`/pet/${encodedPetId}`) : "";
};

const normalizeImageList = (...values) => {
  const images = [];

  values.forEach((value) => {
    const list = Array.isArray(value) ? value : [value];

    list.forEach((item) => {
      const uri = String(item || "").trim();
      if (uri && !images.includes(uri)) {
        images.push(uri);
      }
    });
  });

  return images;
};

function formatVisitDate(value) {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MedicalRecordRow({ visit, index }) {
  const isSurgical = Boolean(visit?.surgicalIntervention);
  const hasMedicines = Boolean(visit?.medicinesNeeded || visit?.medicinesNotes);

  return (
    <View style={styles.recordRow}>
      <View style={styles.recordIcon}>
        <Ionicons
          name={isSurgical ? "medkit" : "medical"}
          size={20}
          color={GREEN}
        />
      </View>

      <View style={styles.recordInfo}>
        <View style={styles.recordTitleRow}>
          <ThemedText style={styles.recordTitle} numberOfLines={1}>
            {visit?.interventionType || "Veterinary record"}
          </ThemedText>
          <View
            style={[
              styles.recordBadge,
              isSurgical && styles.recordBadgeSurgery,
            ]}
          >
            <ThemedText
              style={[
                styles.recordBadgeText,
                isSurgical && styles.recordBadgeTextSurgery,
              ]}
            >
              {isSurgical ? "Surgery" : "Check"}
            </ThemedText>
          </View>
        </View>

        <ThemedText style={styles.recordDate}>
          {formatVisitDate(visit?.visitDate)}
        </ThemedText>

        {visit?.reason ? (
          <ThemedText style={styles.recordDetail} numberOfLines={2}>
            Issue: {visit.reason}
          </ThemedText>
        ) : null}

        {visit?.diagnosis ? (
          <ThemedText style={styles.recordDetail} numberOfLines={2}>
            Diagnosis: {visit.diagnosis}
          </ThemedText>
        ) : null}

        {hasMedicines ? (
          <View style={styles.recordMedicineBox}>
            <Ionicons name="bandage-outline" size={14} color="#227B3E" />
            <ThemedText style={styles.recordMedicineText} numberOfLines={2}>
              {visit?.medicinesNotes || "Medicines needed"}
            </ThemedText>
          </View>
        ) : null}

        <ThemedText style={styles.recordMeta} numberOfLines={1}>
          {[visit?.veterinarianName, visit?.clinic].filter(Boolean).join(" - ") ||
            `Record #${index + 1}`}
        </ThemedText>
      </View>
    </View>
  );
}

export default function PetDetails() {
  const { id } = useLocalSearchParams();
  const petParamId = Array.isArray(id) ? id[0] : id;
  const { user } = useUser();

  const currentUserId = getEntityId(user);

  const [pet, setPet] = useState(null);
  const [careRecord, setCareRecord] = useState(normalizeCareRecord());
  const [careRecordLoading, setCareRecordLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const petImages = useMemo(() => {
    const images = normalizeImageList(pet?.images, pet?.image);
    return images.length
      ? images
      : ["https://via.placeholder.com/500x500.png?text=Pet"];
  }, [pet?.image, pet?.images]);
  const activeImage = petImages[activeImageIndex] || petImages[0];
  const hasMultipleImages = petImages.length > 1;

  useEffect(() => {
    if (petParamId) {
      loadPet();
    }
  }, [petParamId]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [petParamId]);

  useEffect(() => {
    if (activeImageIndex >= petImages.length) {
      setActiveImageIndex(0);
    }
  }, [activeImageIndex, petImages.length]);

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

  const loadCareRecord = async () => {
    if (!petParamId) return;

    try {
      setCareRecordLoading(true);
      const data = await getPetCareRecord(petParamId);
      setCareRecord(normalizeCareRecord(data?.careRecord || {}));
    } catch (error) {
      console.log("Load care record preview error:", error?.message || error);
      setCareRecord(normalizeCareRecord());
    } finally {
      setCareRecordLoading(false);
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
  const qrTargetUrl = useMemo(() => buildAppPetProfileLink(petId), [petId]);
  const qrImageUrl = useMemo(() => buildQrImageUrl(qrTargetUrl), [qrTargetUrl]);
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
  const canOpenCareRecord = Boolean(petId);

  useEffect(() => {
    if (canOpenCareRecord) {
      loadCareRecord();
    } else {
      setCareRecord(normalizeCareRecord());
    }
  }, [canOpenCareRecord, petParamId]);

  const identity = careRecord?.identityProfile || {};
  const visits = normalizeArray(careRecord?.medicalHistory?.veterinaryVisits);
  const medications = normalizeArray(careRecord?.medicalHistory?.medications);
  const vaccinations = normalizeArray(careRecord?.vaccinations);

  const handleOpenOwnerProfile = () => {
    if (!canOpenOwnerProfile) return;
    router.push(`/user/${ownerId}`);
  };

  const handleOpenQrTarget = async () => {
    try {
      if (!qrTargetUrl) throw new Error("Missing pet profile link");
      await Linking.openURL(qrTargetUrl);
    } catch (error) {
      Alert.alert(
        "Link unavailable",
        "The pet profile link could not be opened on this device."
      );
    }
  };

  const showPreviousImage = () => {
    if (!hasMultipleImages) return;
    setActiveImageIndex((current) =>
      current === 0 ? petImages.length - 1 : current - 1
    );
  };

  const showNextImage = () => {
    if (!hasMultipleImages) return;
    setActiveImageIndex((current) =>
      current === petImages.length - 1 ? 0 : current + 1
    );
  };

  const handleStartChat = async () => {
    try {
      if (!currentUserId) {
        router.push("/(auth)/login");
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
          <View style={styles.imageCarousel}>
            <Image source={{ uri: activeImage }} style={styles.image} />

            {hasMultipleImages ? (
              <>
                <TouchableOpacity
                  style={[styles.imageArrowButton, styles.imageArrowLeft]}
                  activeOpacity={0.82}
                  onPress={showPreviousImage}
                >
                  <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.imageArrowButton, styles.imageArrowRight]}
                  activeOpacity={0.82}
                  onPress={showNextImage}
                >
                  <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.imageCounter}>
                  <ThemedText style={styles.imageCounterText}>
                    {activeImageIndex + 1}/{petImages.length}
                  </ThemedText>
                </View>
              </>
            ) : null}
          </View>

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

          {!!qrTargetUrl && (
            <>
              <Spacer height={14} />

              <View style={styles.qrCard}>
                <View style={styles.qrCopy}>
                  <ThemedText style={styles.qrTitle}>Pet profile QR</ThemedText>
                  <ThemedText style={styles.qrSubtitle}>
                    Scan to open this pet profile in Semsem.
                  </ThemedText>
                </View>

                <TouchableOpacity
                  style={styles.qrImageWrap}
                  activeOpacity={0.86}
                  onPress={handleOpenQrTarget}
                >
                  {qrImageUrl ? (
                    <Image source={{ uri: qrImageUrl }} style={styles.qrImage} />
                  ) : (
                    <View style={styles.qrFallback}>
                      <Ionicons name="qr-code-outline" size={30} color={GREEN} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          <Spacer height={16} />

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Animal information</ThemedText>
            <View style={styles.infoGrid}>
              <View style={styles.infoTile}>
                <Ionicons name="paw-outline" size={18} color={GREEN} />
                <ThemedText style={styles.infoLabel}>Species</ThemedText>
                <ThemedText style={styles.infoTileValue} numberOfLines={1}>
                  {valueOrDash(identity?.species || pet.type)}
                </ThemedText>
              </View>

              <View style={styles.infoTile}>
                <Ionicons name="ribbon-outline" size={18} color={GREEN} />
                <ThemedText style={styles.infoLabel}>Breed</ThemedText>
                <ThemedText style={styles.infoTileValue} numberOfLines={1}>
                  {valueOrDash(identity?.breed || pet.breed)}
                </ThemedText>
              </View>

              <View style={styles.infoTile}>
                <Ionicons name="calendar-outline" size={18} color={GREEN} />
                <ThemedText style={styles.infoLabel}>Birth / age</ThemedText>
                <ThemedText style={styles.infoTileValue} numberOfLines={1}>
                  {valueOrDash(identity?.birthDateOrAge || dateLabel)}
                </ThemedText>
              </View>

              <View style={styles.infoTile}>
                <Ionicons name="location-outline" size={18} color={GREEN} />
                <ThemedText style={styles.infoLabel}>Location</ThemedText>
                <ThemedText style={styles.infoTileValue} numberOfLines={1}>
                  {valueOrDash(locationLabel)}
                </ThemedText>
              </View>
            </View>

            <View style={styles.descriptionBox}>
              <ThemedText style={styles.infoLabel}>Description</ThemedText>
              <ThemedText style={styles.description}>
                {pet.description || "No description available."}
              </ThemedText>
            </View>
          </View>

          {canOpenCareRecord ? (
            <>
              <Spacer height={14} />

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderCopy}>
                    <ThemedText style={styles.sectionTitle}>Carnet digital</ThemedText>
                    <ThemedText style={styles.sectionSubtitle}>
                      Veterinary checks, surgeries, medicines, and notes.
                    </ThemedText>
                  </View>
                  <View style={styles.recordCountPill}>
                    <ThemedText style={styles.recordCountText}>
                      {visits.length}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.carnetStatsRow}>
                  <View style={styles.carnetStat}>
                    <ThemedText style={styles.carnetStatValue}>{visits.length}</ThemedText>
                    <ThemedText style={styles.carnetStatLabel}>Records</ThemedText>
                  </View>
                  <View style={styles.carnetStatDivider} />
                  <View style={styles.carnetStat}>
                    <ThemedText style={styles.carnetStatValue}>
                      {medications.length}
                    </ThemedText>
                    <ThemedText style={styles.carnetStatLabel}>Medicines</ThemedText>
                  </View>
                  <View style={styles.carnetStatDivider} />
                  <View style={styles.carnetStat}>
                    <ThemedText style={styles.carnetStatValue}>
                      {vaccinations.length}
                    </ThemedText>
                    <ThemedText style={styles.carnetStatLabel}>Vaccines</ThemedText>
                  </View>
                </View>

                {careRecordLoading ? (
                  <View style={styles.recordLoading}>
                    <ActivityIndicator size="small" color={GREEN} />
                    <ThemedText style={styles.recordLoadingText}>
                      Loading medical records...
                    </ThemedText>
                  </View>
                ) : null}

                {!careRecordLoading && visits.length === 0 ? (
                  <View style={styles.emptyRecordBox}>
                    <Ionicons name="document-text-outline" size={24} color="#7E8B84" />
                    <ThemedText style={styles.emptyRecordTitle}>
                      No veterinary records yet
                    </ThemedText>
                    <ThemedText style={styles.emptyRecordText}>
                      Owner or veterinarian can add the first check, medicine, or surgical intervention.
                    </ThemedText>
                  </View>
                ) : null}

                {!careRecordLoading && visits.length > 0 ? (
                  <View style={styles.recordsList}>
                    {visits.map((visit, index) => (
                      <MedicalRecordRow
                        key={`${visit?.visitDate || "visit"}-${visit?.reason || index}-${index}`}
                        visit={visit}
                        index={index}
                      />
                    ))}
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={() => petId && router.push(`/pet/${petId}/care-record`)}
                  style={styles.careRecordButton}
                  activeOpacity={0.9}
                >
                  <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                  <ThemedText style={styles.careRecordButtonText}>
                    Pet Health Record
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </>
          ) : null}

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
  imageCarousel: {
    position: "relative",
    width: "100%",
    height: 300,
    borderRadius: 18,
    backgroundColor: "#E8EEEA",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E8EEEA",
  },
  imageArrowButton: {
    position: "absolute",
    top: "50%",
    width: 34,
    height: 34,
    marginTop: -17,
    borderRadius: 17,
    backgroundColor: "rgba(23, 32, 26, 0.58)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageArrowLeft: {
    left: 10,
  },
  imageArrowRight: {
    right: 10,
  },
  imageCounter: {
    position: "absolute",
    right: 10,
    bottom: 10,
    borderRadius: 999,
    backgroundColor: "rgba(23, 32, 26, 0.62)",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  imageCounterText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "800",
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6EAE8",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  sectionHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    color: "#4E4E6A",
  },
  sectionSubtitle: {
    color: "#6F7C74",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: -3,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  infoTile: {
    width: "48%",
    minHeight: 86,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2EBE5",
    backgroundColor: "#F8FBF9",
    padding: 11,
  },
  infoLabel: {
    color: "#7A857F",
    fontSize: 11.5,
    fontWeight: "800",
    marginTop: 6,
    textTransform: "uppercase",
  },
  infoTileValue: {
    color: "#17201A",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 3,
  },
  descriptionBox: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2EBE5",
    backgroundColor: "#F8FBF9",
    padding: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    color: "#545A58",
  },
  qrCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E6EAE8",
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  qrCopy: {
    flex: 1,
    minWidth: 0,
  },
  qrTitle: {
    color: "#1E2B24",
    fontSize: 16,
    fontWeight: "900",
  },
  qrSubtitle: {
    color: "#6F7C74",
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 4,
  },
  qrImageWrap: {
    width: 124,
    height: 124,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDE9E2",
    backgroundColor: "#FFFFFF",
    padding: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  qrImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#FFFFFF",
  },
  qrFallback: {
    flex: 1,
    alignSelf: "stretch",
    borderRadius: 8,
    backgroundColor: "#ECF8EF",
    alignItems: "center",
    justifyContent: "center",
  },
  recordCountPill: {
    minWidth: 36,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EAF8EE",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
  },
  recordCountText: {
    color: "#227B3E",
    fontSize: 13,
    fontWeight: "900",
  },
  carnetStatsRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2EBE5",
    backgroundColor: "#F8FBF9",
    flexDirection: "row",
    marginBottom: 12,
    overflow: "hidden",
  },
  carnetStat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  carnetStatDivider: {
    width: 1,
    backgroundColor: "#E2EBE5",
    marginVertical: 8,
  },
  carnetStatValue: {
    color: "#17201A",
    fontSize: 20,
    fontWeight: "900",
  },
  carnetStatLabel: {
    color: "#6F7C74",
    fontSize: 11.5,
    fontWeight: "800",
    marginTop: 2,
  },
  recordLoading: {
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  recordLoadingText: {
    color: "#6F7C74",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyRecordBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D9E3DD",
    backgroundColor: "#F9FBFA",
    alignItems: "center",
    padding: 18,
    marginBottom: 12,
  },
  emptyRecordTitle: {
    color: "#17201A",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 8,
    textAlign: "center",
  },
  emptyRecordText: {
    color: "#6F7C74",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 5,
  },
  recordsList: {
    gap: 10,
    marginBottom: 12,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E1ECE5",
    backgroundColor: "#FFFFFF",
    padding: 12,
    shadowColor: "#1A3028",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 7,
    elevation: 1,
  },
  recordIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#EAF8EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  recordInfo: {
    flex: 1,
    minWidth: 0,
  },
  recordTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  recordTitle: {
    flex: 1,
    color: "#17201A",
    fontSize: 15.5,
    fontWeight: "900",
  },
  recordBadge: {
    borderRadius: 999,
    backgroundColor: "#EAF8EE",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  recordBadgeSurgery: {
    backgroundColor: "#FFF1E8",
  },
  recordBadgeText: {
    color: "#227B3E",
    fontSize: 11,
    fontWeight: "900",
  },
  recordBadgeTextSurgery: {
    color: "#C66C22",
  },
  recordDate: {
    color: "#8B9690",
    fontSize: 12.5,
    fontWeight: "700",
    marginTop: 2,
  },
  recordDetail: {
    color: "#526058",
    fontSize: 13.2,
    lineHeight: 19,
    marginTop: 6,
  },
  recordMedicineBox: {
    marginTop: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDEEE2",
    backgroundColor: "#F5FCF6",
    paddingHorizontal: 9,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recordMedicineText: {
    flex: 1,
    color: "#315D42",
    fontSize: 12.5,
    fontWeight: "800",
  },
  recordMeta: {
    color: "#77827C",
    fontSize: 12.2,
    fontWeight: "700",
    marginTop: 8,
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
    backgroundColor: GREEN,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  careRecordButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
  editButtonText: {
    color: GREEN,
    fontWeight: "800",
    fontSize: 16,
  },
});

