import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import UserOnly from "../../components/auth/UserOnly";
import ThemedText from "../../components/ThemedText";
import { useUser } from "../../contexts/UserContext";
import { getPetsByOwner } from "../../services/petService";
import { getPostsByUser } from "../../services/postService";
import { getUser, updateUser } from "../../services/userService";

const GREEN = "#3DB85C";
const GREEN_DARK = "#2A9448";
const SHEET_BG = "#FFFFFF";
const BACKDROP = "#E8ECE8";
const CARD_BG = "#FAFFFB";
const SOFT_GREEN = "#EAF7EE";
const BORDER = "#E4EFE7";

const INITIAL_FORM = {
  name: "",
  phone: "",
  city: "",
  country: "",
  bio: "",
};

const buildHandle = (name, email) => {
  const source = (name || email?.split("@")?.[0] || "semsem_user").trim();
  const normalized = source
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  return `@${normalized || "semsem_user"}`;
};

const formatMemberSince = (value) => {
  if (!value) {
    return "Recently joined";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently joined";
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

const pluralize = (count, singular, plural = `${singular}s`) => {
  return `${count} ${count === 1 ? singular : plural}`;
};

export default function ProfileScreen() {
  const { user, setUser } = useUser();

  const userId = useMemo(
    () => user?._id || user?.id || user?.$id || null,
    [user]
  );

  const [profile, setProfile] = useState(user || null);
  const [posts, setPosts] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    if (user && !profile) {
      setProfile(user);
    }
  }, [profile, user]);

  const syncProfile = useCallback(
    (nextProfile) => {
      setProfile(nextProfile);
      setUser((current) => ({
        ...(current || {}),
        ...(nextProfile || {}),
      }));
    },
    [setUser]
  );

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [profileData, postsData, petsData] = await Promise.all([
        getUser(userId).catch(() => profile || user),
        getPostsByUser(userId).catch(() => []),
        getPetsByOwner(userId).catch(() => []),
      ]);

      syncProfile(profileData || profile || user);
      setPosts(Array.isArray(postsData) ? postsData : []);
      setPets(Array.isArray(petsData) ? petsData : []);
    } catch (error) {
      console.log("Load profile error:", error.message);
      Alert.alert("Error", error.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [profile, syncProfile, user, userId]);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const avatarUri = profile?.avatar || profile?.image || "";
  const postCount = posts.length;
  const petsCount = pets.length;
  const likesCount = posts.reduce(
    (sum, item) => sum + Number(item?.likes_count || 0),
    0
  );

  const handleText = buildHandle(profile?.name, profile?.email);
  const bioText =
    profile?.bio?.trim() ||
    `Animal lover | ${pluralize(petsCount, "pet")} parent`;
  const locationText =
    [profile?.city, profile?.country].filter(Boolean).join(", ") ||
    "Add your location";
  const phoneText = profile?.phone?.trim() || "Add your phone number";
  const memberSinceText = formatMemberSince(profile?.createdAt);

  const openEditModal = () => {
    setForm({
      name: profile?.name || "",
      phone: profile?.phone || "",
      city: profile?.city || "",
      country: profile?.country || "",
      bio: profile?.bio || "",
    });
    setEditVisible(true);
  };

  const closeEditModal = () => {
    if (saving) return;
    setEditVisible(false);
  };

  const updateForm = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSaveProfile = async () => {
    if (!userId) return;

    if (!form.name.trim()) {
      Alert.alert("Missing info", "Name is required.");
      return;
    }

    try {
      setSaving(true);

      const updated = await updateUser(userId, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        bio: form.bio.trim(),
      });

      syncProfile(updated);
      setEditVisible(false);
    } catch (error) {
      console.log("Update profile error:", error.message);
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePickAvatar = async () => {
    if (!userId || avatarSaving) return;

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Gallery permission is required to choose a profile photo."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      setAvatarSaving(true);

      const updated = await updateUser(userId, {
        avatar: result.assets[0].uri,
      });

      syncProfile(updated);
    } catch (error) {
      console.log("Update avatar error:", error.message);
      Alert.alert(
        "Error",
        error.message ||
          "Failed to update profile photo. Local phone images work best for testing on this device."
      );
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `${profile?.name || "Semsem user"} on Semsem\n${bioText}`,
      });
    } catch (error) {
      console.log("Share profile error:", error.message);
    }
  };

  if (loading) {
    return (
      <UserOnly>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={GREEN} />
          </View>
        </SafeAreaView>
      </UserOnly>
    );
  }

  return (
    <UserOnly>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor={BACKDROP} />

        <View style={styles.screen}>
          <View style={styles.sheet}>
            <View style={styles.handle} />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={26} color="#6B716D" />
            </TouchableOpacity>

            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.hero}>
                <View style={styles.avatarWrap}>
                  <View style={styles.avatarOuter}>
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Ionicons name="person" size={72} color="#FFFFFF" />
                      </View>
                    )}
                  </View>

                  <View style={styles.onlineDot} />

                  <TouchableOpacity
                    style={styles.cameraButton}
                    activeOpacity={0.85}
                    onPress={handlePickAvatar}
                    disabled={avatarSaving}
                  >
                    <Ionicons
                      name={avatarSaving ? "sync" : "camera"}
                      size={20}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                </View>

                <ThemedText style={styles.name}>{profile?.name || "Semsem User"}</ThemedText>
                <ThemedText style={styles.handleText}>{handleText}</ThemedText>

                <View style={styles.bioPill}>
                  <ThemedText style={styles.bioText}>{bioText}</ThemedText>
                </View>
              </View>

              <View style={styles.statsCard}>
                <View style={styles.statItem}>
                  <Ionicons name="document-text-outline" size={28} color={GREEN} />
                  <ThemedText style={styles.statValue}>{postCount}</ThemedText>
                  <ThemedText style={styles.statLabel}>Posts</ThemedText>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <Ionicons name="paw-outline" size={28} color={GREEN} />
                  <ThemedText style={styles.statValue}>{petsCount}</ThemedText>
                  <ThemedText style={styles.statLabel}>Pets</ThemedText>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <Ionicons name="heart-outline" size={28} color={GREEN} />
                  <ThemedText style={styles.statValue}>{likesCount}</ThemedText>
                  <ThemedText style={styles.statLabel}>Likes</ThemedText>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.primaryAction}
                  onPress={openEditModal}
                  activeOpacity={0.9}
                >
                  <Ionicons name="create-outline" size={22} color="#FFFFFF" />
                  <ThemedText style={styles.primaryActionText}>
                    Edit Profile
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={handleShareProfile}
                  activeOpacity={0.9}
                >
                  <Ionicons name="share-social-outline" size={24} color={GREEN} />
                </TouchableOpacity>
              </View>

              <View style={styles.infoCard}>
                <ThemedText style={styles.sectionTitle}>Personal Info</ThemedText>

                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="mail-outline" size={24} color={GREEN} />
                  </View>
                  <View style={styles.infoTextBlock}>
                    <ThemedText style={styles.infoLabel}>EMAIL</ThemedText>
                    <ThemedText style={styles.infoValue}>
                      {profile?.email || "Not available"}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="call-outline" size={24} color={GREEN} />
                  </View>
                  <View style={styles.infoTextBlock}>
                    <ThemedText style={styles.infoLabel}>PHONE</ThemedText>
                    <ThemedText style={styles.infoValue}>{phoneText}</ThemedText>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="location-outline" size={24} color={GREEN} />
                  </View>
                  <View style={styles.infoTextBlock}>
                    <ThemedText style={styles.infoLabel}>LOCATION</ThemedText>
                    <ThemedText style={styles.infoValue}>{locationText}</ThemedText>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="calendar-outline" size={24} color={GREEN} />
                  </View>
                  <View style={styles.infoTextBlock}>
                    <ThemedText style={styles.infoLabel}>MEMBER SINCE</ThemedText>
                    <ThemedText style={styles.infoValue}>
                      {memberSinceText}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>

        <Modal
          visible={editVisible}
          animationType="slide"
          transparent
          onRequestClose={closeEditModal}
        >
          <View style={styles.modalOverlay}>
            <SafeAreaView style={styles.modalSafeArea} edges={["bottom"]}>
              <View style={styles.modalCard}>
                <View style={styles.modalHandle} />

                <View style={styles.modalHeader}>
                  <ThemedText style={styles.modalTitle}>Edit Profile</ThemedText>
                  <TouchableOpacity onPress={closeEditModal} activeOpacity={0.8}>
                    <Ionicons name="close" size={24} color="#67706B" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  contentContainerStyle={styles.modalContent}
                  showsVerticalScrollIndicator={false}
                >
                  <TextInput
                    value={form.name}
                    onChangeText={(value) => updateForm("name", value)}
                    placeholder="Name"
                    style={styles.input}
                  />

                  <TextInput
                    value={form.phone}
                    onChangeText={(value) => updateForm("phone", value)}
                    placeholder="Phone"
                    keyboardType="phone-pad"
                    style={styles.input}
                  />

                  <TextInput
                    value={form.city}
                    onChangeText={(value) => updateForm("city", value)}
                    placeholder="City"
                    style={styles.input}
                  />

                  <TextInput
                    value={form.country}
                    onChangeText={(value) => updateForm("country", value)}
                    placeholder="Country"
                    style={styles.input}
                  />

                  <TextInput
                    value={form.bio}
                    onChangeText={(value) => updateForm("bio", value)}
                    placeholder="Bio"
                    multiline
                    maxLength={240}
                    style={[styles.input, styles.textarea]}
                  />

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.modalCancelButton}
                      onPress={closeEditModal}
                      disabled={saving}
                    >
                      <ThemedText style={styles.modalCancelText}>
                        Cancel
                      </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.modalSaveButton,
                        saving && styles.modalSaveButtonDisabled,
                      ]}
                      onPress={handleSaveProfile}
                      disabled={saving}
                    >
                      <ThemedText style={styles.modalSaveText}>
                        {saving ? "Saving..." : "Save"}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      </SafeAreaView>
    </UserOnly>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKDROP,
  },
  screen: {
    flex: 1,
    backgroundColor: BACKDROP,
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BACKDROP,
  },
  sheet: {
    flex: 1,
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingTop: 12,
  },
  handle: {
    alignSelf: "center",
    width: 60,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#DFE4E0",
  },
  closeButton: {
    position: "absolute",
    top: 18,
    right: 18,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F5F7F5",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 36,
    paddingBottom: 40,
  },
  hero: {
    alignItems: "center",
    paddingBottom: 18,
  },
  avatarWrap: {
    position: "relative",
    marginBottom: 16,
  },
  avatarOuter: {
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: "#F0FFF3",
    borderWidth: 3,
    borderColor: "#E7F6EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },
  avatarImage: {
    width: 158,
    height: 158,
    borderRadius: 79,
  },
  avatarFallback: {
    width: 158,
    height: 158,
    borderRadius: 79,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: {
    position: "absolute",
    top: 12,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: GREEN,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  cameraButton: {
    position: "absolute",
    right: -2,
    bottom: 10,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: GREEN,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 34,
    fontWeight: "800",
    color: "#101511",
  },
  handleText: {
    fontSize: 18,
    color: "#8A938D",
    marginTop: 4,
  },
  bioPill: {
    marginTop: 22,
    width: "100%",
    backgroundColor: SOFT_GREEN,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  bioText: {
    textAlign: "center",
    fontSize: 18,
    lineHeight: 28,
    color: GREEN_DARK,
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    backgroundColor: CARD_BG,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 18,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E5EAE6",
    marginVertical: 10,
  },
  statValue: {
    fontSize: 34,
    fontWeight: "800",
    color: "#121814",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 16,
    color: "#808985",
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 22,
  },
  primaryAction: {
    flex: 1,
    height: 68,
    borderRadius: 22,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  secondaryAction: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCard: {
    backgroundColor: CARD_BG,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 22,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#131915",
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  infoIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: SOFT_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  infoTextBlock: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 15,
    letterSpacing: 1.8,
    color: "#A1AAA4",
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 18,
    lineHeight: 27,
    color: "#151C17",
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(14, 18, 15, 0.34)",
    justifyContent: "flex-end",
  },
  modalSafeArea: {
    width: "100%",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: "84%",
  },
  modalHandle: {
    alignSelf: "center",
    width: 56,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#DFE4E0",
    marginTop: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111713",
  },
  modalContent: {
    padding: 18,
    paddingBottom: 28,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDE7E0",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    fontSize: 16,
    color: "#17201A",
  },
  textarea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#F4F6F4",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    color: "#4B554E",
    fontSize: 16,
    fontWeight: "700",
  },
  modalSaveButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveButtonDisabled: {
    opacity: 0.7,
  },
  modalSaveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
