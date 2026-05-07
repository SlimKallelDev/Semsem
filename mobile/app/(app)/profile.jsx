import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import UserOnly from "../../components/auth/UserOnly";
import CountrySelector from "../../components/location/CountrySelector";
import GovernorateSelector from "../../components/location/GovernorateSelector";
import ThemedText from "../../components/ThemedText";
import {
  hasGovernorateListForCountry,
  resolveCountryName,
  resolveGovernorateForCountry,
} from "../../constants/governorates";
import {
  DEFAULT_PROFILE_TYPE,
  PROFILE_TYPES,
  getProfileTypeLabel,
} from "../../constants/profileTypes";
import { useUser } from "../../contexts/UserContext";
import { getPetsByOwner } from "../../services/petService";
import { getPostsByUser } from "../../services/postService";
import {
  getUser,
  updateUser,
  updateUserAvatar,
  updateUserWithAvatar,
} from "../../services/userService";

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
  governorate: "",
  country: "",
  bio: "",
  profileType: DEFAULT_PROFILE_TYPE,
};

const AVATAR_PICKER_OPTIONS = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
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
  const { user, setUser, logout } = useUser();
  const insets = useSafeAreaInsets();
  const { returnTo: rawReturnTo } = useLocalSearchParams();

  const userId = useMemo(
    () => user?._id || user?.id || user?.$id || null,
    [user]
  );
  const returnToPath = useMemo(
    () => (Array.isArray(rawReturnTo) ? rawReturnTo[0] : rawReturnTo),
    [rawReturnTo]
  );

  const [profile, setProfile] = useState(user || null);
  const [posts, setPosts] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [selectedAvatar, setSelectedAvatar] = useState(null);

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
  const editAvatarUri = selectedAvatar?.uri || avatarUri;
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
    [profile?.governorate || profile?.city, profile?.country]
      .filter(Boolean)
      .join(", ") ||
    "Add your location";
  const phoneText = profile?.phone?.trim() || "Add your phone number";
  const profileTypeText = getProfileTypeLabel(
    profile?.profileType || DEFAULT_PROFILE_TYPE
  );
  const memberSinceText = formatMemberSince(profile?.createdAt);

  const openEditModal = () => {
    setForm({
      name: profile?.name || "",
      phone: profile?.phone || "",
      governorate: profile?.governorate || profile?.city || "",
      country: profile?.country || "",
      bio: profile?.bio || "",
      profileType: profile?.profileType || DEFAULT_PROFILE_TYPE,
    });
    setSelectedAvatar(null);
    setEditVisible(true);
  };

  const closeEditModal = () => {
    if (saving) return;
    setSelectedAvatar(null);
    setEditVisible(false);
  };

  const updateForm = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateProfileCountry = (nextCountry) => {
    setForm((current) => ({
      ...current,
      country: nextCountry,
      governorate: hasGovernorateListForCountry(nextCountry)
        ? resolveGovernorateForCountry(nextCountry, current.governorate, {
            fallbackToRaw: false,
          })
        : "",
    }));
  };

  const pickAvatarFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Gallery permission is required to choose a profile photo."
      );
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync(
      AVATAR_PICKER_OPTIONS
    );

    if (result.canceled || !result.assets?.length) {
      return null;
    }

    return result.assets[0];
  };

  const pickAvatarFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Camera permission is required to take a profile photo."
      );
      return null;
    }

    const result = await ImagePicker.launchCameraAsync(AVATAR_PICKER_OPTIONS);

    if (result.canceled || !result.assets?.length) {
      return null;
    }

    return result.assets[0];
  };

  const pickAvatarAsset = async () => {
    const source = await new Promise((resolve) => {
      Alert.alert("Profile photo", "Choose how you want to add your photo.", [
        {
          text: "Take Photo",
          onPress: () => resolve("camera"),
        },
        {
          text: "Choose from Gallery",
          onPress: () => resolve("gallery"),
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => resolve(null),
        },
      ]);
    });

    if (source === "camera") {
      return pickAvatarFromCamera();
    }

    if (source === "gallery") {
      return pickAvatarFromGallery();
    }

    return null;
  };

  const handleSaveProfile = async () => {
    if (!userId) return;

    if (!form.name.trim()) {
      Alert.alert("Missing info", "Name is required.");
      return;
    }

    if (!form.profileType) {
      Alert.alert("Missing info", "Please select a profile type.");
      return;
    }

    try {
      setSaving(true);

      const normalizedCountry = resolveCountryName(form.country);
      const normalizedGovernorate = resolveGovernorateForCountry(
        normalizedCountry,
        form.governorate
      );
      const profileUpdates = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        governorate: normalizedGovernorate.trim(),
        country: normalizedCountry.trim(),
        bio: form.bio.trim(),
        profileType: form.profileType,
      };

      const updated = selectedAvatar
        ? await updateUserWithAvatar(userId, profileUpdates, selectedAvatar)
        : await updateUser(userId, profileUpdates);

      syncProfile(updated);
      setSelectedAvatar(null);
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
      const avatarAsset = await pickAvatarAsset();

      if (!avatarAsset) return;

      setAvatarSaving(true);

      const updated = await updateUserAvatar(userId, avatarAsset);

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

  const handleSelectProfileAvatar = async () => {
    if (saving) return;

    try {
      const avatarAsset = await pickAvatarAsset();

      if (avatarAsset) {
        setSelectedAvatar(avatarAsset);
      }
    } catch (error) {
      console.log("Pick avatar error:", error.message);
      Alert.alert("Error", error.message || "Failed to choose profile photo.");
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

  const handleCloseProfile = useCallback(() => {
    const nextPath =
      typeof returnToPath === "string" ? returnToPath.trim() : "";

    if (nextPath && nextPath !== "/profile") {
      router.replace(nextPath);
      return;
    }

    router.back();
  }, [returnToPath]);

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
              onPress={handleCloseProfile}
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
                        <Ionicons name="person" size={50} color="#FFFFFF" />
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
                      size={16}
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
                  <Ionicons name="document-text-outline" size={22} color={GREEN} />
                  <ThemedText style={styles.statValue}>{postCount}</ThemedText>
                  <ThemedText style={styles.statLabel}>Posts</ThemedText>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <Ionicons name="paw-outline" size={22} color={GREEN} />
                  <ThemedText style={styles.statValue}>{petsCount}</ThemedText>
                  <ThemedText style={styles.statLabel}>Pets</ThemedText>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <Ionicons name="heart-outline" size={22} color={GREEN} />
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
                  <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                  <ThemedText style={styles.primaryActionText}>
                    Edit Profile
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={handleShareProfile}
                  activeOpacity={0.9}
                >
                  <Ionicons name="share-social-outline" size={20} color={GREEN} />
                </TouchableOpacity>
              </View>

              <View style={styles.infoCard}>
                <ThemedText style={styles.sectionTitle}>Personal Info</ThemedText>

                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="mail-outline" size={20} color={GREEN} />
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
                    <Ionicons name="call-outline" size={20} color={GREEN} />
                  </View>
                  <View style={styles.infoTextBlock}>
                    <ThemedText style={styles.infoLabel}>PHONE</ThemedText>
                    <ThemedText style={styles.infoValue}>{phoneText}</ThemedText>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="location-outline" size={20} color={GREEN} />
                  </View>
                  <View style={styles.infoTextBlock}>
                    <ThemedText style={styles.infoLabel}>LOCATION</ThemedText>
                    <ThemedText style={styles.infoValue}>{locationText}</ThemedText>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="briefcase-outline" size={20} color={GREEN} />
                  </View>
                  <View style={styles.infoTextBlock}>
                    <ThemedText style={styles.infoLabel}>PROFILE TYPE</ThemedText>
                    <ThemedText style={styles.infoValue}>{profileTypeText}</ThemedText>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="calendar-outline" size={20} color={GREEN} />
                  </View>
                  <View style={styles.infoTextBlock}>
                    <ThemedText style={styles.infoLabel}>MEMBER SINCE</ThemedText>
                    <ThemedText style={styles.infoValue}>
                      {memberSinceText}
                    </ThemedText>
                  </View>
                </View>
                </View>

              {/* ── Logout ── */}
              <TouchableOpacity
                style={styles.logoutButton}
                activeOpacity={0.85}
                onPress={async () => {
                  await logout();
                  router.replace("/(auth)/login");
                }}
              >
                <Ionicons name="log-out-outline" size={20} color="#D94F4F" />
                <ThemedText style={styles.logoutText}>Log Out</ThemedText>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>

        <Modal
          visible={editVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={closeEditModal}
        >
          <SafeAreaView style={styles.editScreen} edges={["bottom"]}>
            {/* Header */}
            <View
              style={[
                styles.editHeader,
                {
                  paddingTop:
                    Math.max(insets.top, Platform.OS === "ios" ? 44 : 0) + 10,
                },
              ]}
            >
              <TouchableOpacity
                onPress={closeEditModal}
                activeOpacity={0.8}
                style={styles.editHeaderClose}
              >
                <Ionicons name="chevron-back" size={22} color="#3C4A40" />
              </TouchableOpacity>

              <View style={styles.editHeaderCenter}>
                <ThemedText style={styles.editHeaderTitle}>Edit Profile</ThemedText>
                <ThemedText style={styles.editHeaderSubtitle}>Update your details</ThemedText>
              </View>

              <TouchableOpacity
                style={[styles.editHeaderSave, saving && { opacity: 0.6 }]}
                onPress={handleSaveProfile}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.editHeaderSaveText}>Save</ThemedText>
                )}
              </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={0}
            >
              <ScrollView
                contentContainerStyle={[
                  styles.editFormContent,
                  { paddingBottom: Math.max(48, insets.bottom + 24) },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                <View style={styles.editAvatarBlock}>
                  <View style={styles.editAvatarPreview}>
                    {editAvatarUri ? (
                      <Image
                        source={{ uri: editAvatarUri }}
                        style={styles.editAvatarImage}
                      />
                    ) : (
                      <View style={styles.editAvatarFallback}>
                        <Ionicons name="person" size={34} color="#FFFFFF" />
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.editAvatarButton}
                    onPress={handleSelectProfileAvatar}
                    disabled={saving}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="camera-outline" size={18} color={GREEN} />
                    <ThemedText style={styles.editAvatarButtonText}>
                      Change photo
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                {/* Name */}
                <ThemedText style={styles.fieldLabel}>Name *</ThemedText>
                <TextInput
                  value={form.name}
                  onChangeText={(v) => updateForm("name", v)}
                  placeholder="Your full name"
                  placeholderTextColor="#A8B5AE"
                  style={styles.input}
                  returnKeyType="next"
                />

                {/* Profile type */}
                <ThemedText style={styles.fieldLabel}>Profile type *</ThemedText>
                <View style={styles.profileTypeWrap}>
                  {PROFILE_TYPES.map((type) => {
                    const active = form.profileType === type.value;

                    return (
                      <TouchableOpacity
                        key={type.value}
                        activeOpacity={0.85}
                        disabled={saving}
                        onPress={() => updateForm("profileType", type.value)}
                        style={[styles.profileTypeChip, active && styles.profileTypeChipActive]}
                      >
                        <ThemedText
                          style={[
                            styles.profileTypeChipText,
                            active && styles.profileTypeChipTextActive,
                          ]}
                        >
                          {type.label}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Phone */}
                <ThemedText style={styles.fieldLabel}>Phone</ThemedText>
                <TextInput
                  value={form.phone}
                  onChangeText={(v) => updateForm("phone", v)}
                  placeholder="e.g. +1 234 567 8900"
                  placeholderTextColor="#A8B5AE"
                  keyboardType="phone-pad"
                  style={styles.input}
                  returnKeyType="next"
                />

                {/* Country */}
                <ThemedText style={styles.fieldLabel}>Country</ThemedText>
                <CountrySelector
                  value={form.country}
                  onChange={updateProfileCountry}
                  placeholder="Select a country"
                  placeholderTextColor="#A8B5AE"
                  buttonStyle={styles.input}
                  disabled={saving}
                />

                {/* Governorate */}
                <ThemedText style={styles.fieldLabel}>Governorate</ThemedText>
                <GovernorateSelector
                  country={form.country}
                  value={form.governorate}
                  onChange={(v) => updateForm("governorate", v)}
                  placeholder="e.g. Cairo"
                  placeholderTextColor="#A8B5AE"
                  inputStyle={styles.input}
                  disabled={saving}
                />

                {/* Bio */}
                <ThemedText style={styles.fieldLabel}>Bio</ThemedText>
                <TextInput
                  value={form.bio}
                  onChangeText={(v) => updateForm("bio", v)}
                  placeholder="Tell others about yourself and your pets…"
                  placeholderTextColor="#A8B5AE"
                  multiline
                  maxLength={240}
                  style={[styles.input, styles.textarea]}
                  textAlignVertical="top"
                />
                <ThemedText style={styles.charCount}>
                  {form.bio.length}/240
                </ThemedText>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
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
    marginBottom: 14,
  },
  avatarOuter: {
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: "#F0FFF3",
    borderWidth: 3,
    borderColor: "#E7F6EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 6,
  },
  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  avatarFallback: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: GREEN,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  cameraButton: {
    position: "absolute",
    right: -4,
    bottom: 4,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: GREEN,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 26,
    fontWeight: "800",
    color: "#101511",
  },
  handleText: {
    fontSize: 14,
    color: "#8A938D",
    marginTop: 3,
  },
  bioPill: {
    marginTop: 14,
    width: "100%",
    backgroundColor: SOFT_GREEN,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  bioText: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
    color: GREEN_DARK,
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginTop: 6,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E5EAE6",
    marginVertical: 8,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "800",
    color: "#121814",
    marginTop: 6,
  },
  statLabel: {
    fontSize: 13,
    color: "#808985",
    marginTop: 3,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  primaryAction: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryAction: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#131915",
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: SOFT_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoTextBlock: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    letterSpacing: 1.4,
    color: "#A1AAA4",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    lineHeight: 22,
    color: "#151C17",
    fontWeight: "700",
  },
  editScreen: {
    flex: 1,
    backgroundColor: "#F4F6F4",
  },
  editHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E4EDE7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    gap: 10,
  },
  editHeaderClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F5F3",
    alignItems: "center",
    justifyContent: "center",
  },
  editHeaderCenter: {
    flex: 1,
    alignItems: "center",
  },
  editHeaderTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111713",
    letterSpacing: -0.2,
  },
  editHeaderSubtitle: {
    fontSize: 12,
    color: "#8E9B93",
    marginTop: 1,
  },
  editHeaderSave: {
    minWidth: 72,
    height: 36,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  editHeaderSaveText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  editFormContent: {
    padding: 20,
    paddingBottom: 48,
  },
  editAvatarBlock: {
    alignItems: "center",
    marginBottom: 24,
  },
  editAvatarPreview: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "#F0FFF3",
    borderWidth: 3,
    borderColor: "#E7F6EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  editAvatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  editAvatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  editAvatarButton: {
    height: 40,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D5E2D9",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  editAvatarButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: GREEN,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4F5E54",
    marginBottom: 6,
    marginLeft: 2,
    letterSpacing: 0.3,
  },
  profileTypeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  profileTypeChip: {
    borderWidth: 1.5,
    borderColor: "#D5E2D9",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  profileTypeChipActive: {
    borderColor: GREEN,
    backgroundColor: "#EAF7EE",
  },
  profileTypeChipText: {
    fontSize: 13,
    color: "#4F5E54",
    fontWeight: "600",
  },
  profileTypeChipTextActive: {
    color: GREEN_DARK,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#D5E2D9",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 18,
    fontSize: 16,
    color: "#17201A",
  },
  textarea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: "#A4B0A8",
    textAlign: "right",
    marginTop: -14,
    marginBottom: 18,
    marginRight: 4,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 24,
    marginBottom: 8,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#F2DADA",
    backgroundColor: "#FFF7F7",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#D94F4F",
  },
});

