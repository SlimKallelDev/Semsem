import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  View,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import GovernorateSelector from "../../../components/location/GovernorateSelector";
import ThemedView from "../../../components/ThemedView";
import ThemedText from "../../../components/ThemedText";
import {
  resolveCountryName,
  resolveGovernorateForCountry,
} from "../../../constants/governorates";
import {
  POST_TYPES,
  POST_TYPE_OPTIONS,
  getAllowedPostTypesForProfileType,
  getPostTypeLabel,
  isPostTypeAllowedForProfileType,
  normalizePostType,
} from "../../../constants/postTypes";
import { getPostById, updatePost } from "../../../services/postService";
import { useUser } from "../../../contexts/UserContext";

const MIN_IMAGES = 1;
const MAX_IMAGES = 5;

export default function EditPostScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useUser();
  const insets = useSafeAreaInsets();

  const currentUserId = useMemo(
    () => user?._id || user?.id || user?.$id || null,
    [user]
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [post, setPost] = useState(null);

  const [type, setType] = useState(POST_TYPES.GENERAL);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [petType, setPetType] = useState("");
  const [country, setCountry] = useState("");
  const [governorate, setGovernorate] = useState("");
  const allowedPostTypes = useMemo(
    () => getAllowedPostTypesForProfileType(user?.profileType),
    [user?.profileType]
  );
  const postTypeOptions = useMemo(() => {
    const baseOptions = POST_TYPE_OPTIONS.filter((item) =>
      allowedPostTypes.includes(item.value)
    );

    const normalizedCurrentType = normalizePostType(type);
    if (!normalizedCurrentType) return baseOptions;

    const existsInBase = baseOptions.some(
      (item) => item.value === normalizedCurrentType
    );

    if (existsInBase) return baseOptions;

    return [
      {
        value: normalizedCurrentType,
        label: `${getPostTypeLabel(normalizedCurrentType)} (Current)`,
      },
      ...baseOptions,
    ];
  }, [allowedPostTypes, type]);

  const addAssetsAsImages = (assets = []) => {
    if (!Array.isArray(assets) || assets.length === 0) return;

    setImages((current) => {
      const next = [...current];

      assets.forEach((asset) => {
        const uri = String(asset?.uri || "").trim();
        if (!uri || next.includes(uri) || next.length >= MAX_IMAGES) {
          return;
        }

        next.push(uri);
      });

      return next;
    });
  };

  useEffect(() => {
    if (id) {
      loadPost();
    }
  }, [id]);

  const loadPost = async () => {
    try {
      setLoading(true);

      const data = await getPostById(id);
      setPost(data);

      const ownerId = data?.user?._id || data?.user;

      if (String(ownerId) !== String(currentUserId)) {
        Alert.alert("Error", "You are not allowed to edit this post");
        router.back();
        return;
      }

      setType(normalizePostType(data?.type) || POST_TYPES.GENERAL);
      setTitle(data?.title || "");
      setDescription(data?.description || "");
      const normalizedImages = Array.isArray(data?.images)
        ? data.images.filter(Boolean)
        : data?.image
        ? [data.image]
        : [];
      setImages(normalizedImages.slice(0, MAX_IMAGES));
      setPetType(data?.pet_type || "");
      setCountry(data?.location?.country || "");
      setGovernorate(data?.location?.governorate || data?.location?.city || "");
    } catch (error) {
      console.log("Load edit post error:", error.message);
      Alert.alert("Error", error.message || "Failed to load post");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const pickFromGallery = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Gallery permission is required to choose images."
        );
        return;
      }

      const remainingSlots = MAX_IMAGES - images.length;
      if (remainingSlots <= 0) {
        Alert.alert("Limit reached", `You can upload up to ${MAX_IMAGES} images.`);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        addAssetsAsImages(result.assets);
      }
    } catch (error) {
      console.log("Gallery picker error:", error.message);
      Alert.alert("Error", "Failed to open gallery");
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Camera permission is required to take a photo."
        );
        return;
      }

      if (images.length >= MAX_IMAGES) {
        Alert.alert("Limit reached", `You can upload up to ${MAX_IMAGES} images.`);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        addAssetsAsImages(result.assets.slice(0, 1));
      }
    } catch (error) {
      console.log("Camera error:", error.message);
      Alert.alert("Error", "Failed to open camera");
    }
  };

  const handleUpdatePost = async () => {
    if (saving) return;

    if (!title.trim()) {
      Alert.alert("Validation", "Title is required");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Validation", "Description is required");
      return;
    }

    const normalizedCountry = resolveCountryName(country);
    const normalizedGovernorate = resolveGovernorateForCountry(
      normalizedCountry,
      governorate
    );

    if (!normalizedCountry.trim()) {
      Alert.alert("Validation", "Country is required");
      return;
    }

    const originalType = normalizePostType(post?.type);
    const selectedType = normalizePostType(type);
    const keepingOriginalType =
      originalType && selectedType && originalType === selectedType;

    if (
      !keepingOriginalType &&
      !isPostTypeAllowedForProfileType(user?.profileType, selectedType)
    ) {
      Alert.alert(
        "Validation",
        "This post type is not allowed for your profile type."
      );
      return;
    }

    if (images.length < MIN_IMAGES || images.length > MAX_IMAGES) {
      Alert.alert(
        "Validation",
        `Please add between ${MIN_IMAGES} and ${MAX_IMAGES} images`
      );
      return;
    }

    try {
      setSaving(true);

      await updatePost(id, {
        type: selectedType,
        title: title.trim(),
        description: description.trim(),
        images,
        pet_type: petType.trim(),
        location: {
          country: normalizedCountry.trim(),
          governorate: normalizedGovernorate.trim(),
        },
      });

      Alert.alert("Success", "Post updated successfully");
      router.replace(`/post/${id}`);
    } catch (error) {
      console.log("Update post error:", error.message);
      Alert.alert("Error", error.message || "Failed to update post");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.center}>
          <ActivityIndicator size="large" />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.center}>
          <ThemedText>Post not found.</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: Math.max(40, insets.bottom + 18) },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <ThemedText type="title" style={styles.pageTitle}>
              Update Post
            </ThemedText>

            <ThemedText style={styles.label}>Type</ThemedText>
            <View style={styles.typeRow}>
              {postTypeOptions.map((item) => {
                const active = item.value === type;

                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[styles.typeButton, active && styles.typeButtonActive]}
                    onPress={() => setType(item.value)}
                  >
                    <ThemedText
                      style={[styles.typeButtonText, active && styles.typeButtonTextActive]}
                    >
                      {item.label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ThemedText style={styles.label}>Title</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Post title"
              value={title}
              onChangeText={setTitle}
            />

            <ThemedText style={styles.label}>Description</ThemedText>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Post description"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <ThemedText style={styles.label}>Images (1 to 5)</ThemedText>
            <ThemedText style={styles.imageCountText}>
              {images.length}/{MAX_IMAGES} selected
            </ThemedText>

            <View style={styles.imageButtonsRow}>
              <TouchableOpacity
                style={styles.imageActionButton}
                onPress={takePhoto}
              >
                <ThemedText style={styles.imageActionButtonText}>
                  Take Photo
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.imageActionButton}
                onPress={pickFromGallery}
              >
                <ThemedText style={styles.imageActionButtonText}>
                  Browse
                </ThemedText>
              </TouchableOpacity>
            </View>

            {images.length > 0 && (
              <View style={styles.previewList}>
                {images.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={styles.previewItem}>
                    <Image source={{ uri }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removeImageBadge}
                      onPress={() =>
                        setImages((current) =>
                          current.filter((_, imageIndex) => imageIndex !== index)
                        )
                      }
                    >
                      <Ionicons name="close" size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <ThemedText style={styles.label}>Pet type</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Dog, Cat..."
              value={petType}
              onChangeText={setPetType}
            />

            <ThemedText style={styles.label}>Country</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Country"
              value={country}
              onChangeText={setCountry}
            />

            <ThemedText style={styles.label}>Governorate</ThemedText>
            <GovernorateSelector
              country={country}
              value={governorate}
              onChange={setGovernorate}
              placeholder="Governorate"
              inputStyle={styles.input}
            />

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.disabledButton]}
              onPress={handleUpdatePost}
              disabled={saving}
            >
              <ThemedText style={styles.saveButtonText}>
                {saving ? "Updating..." : "Save Changes"}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
            >
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F6F4",
  },
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  pageTitle: {
    marginBottom: 18,
  },
  label: {
    marginBottom: 6,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
    marginBottom: 14,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#eee",
  },
  typeButtonActive: {
    backgroundColor: "#cdeccd",
  },
  typeButtonText: {
    textTransform: "capitalize",
  },
  typeButtonTextActive: {
    fontWeight: "700",
  },
  imageCountText: {
    marginTop: -2,
    marginBottom: 8,
    color: "#6F7C74",
    fontSize: 12.5,
    fontWeight: "600",
  },
  imageButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  imageActionButton: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  imageActionButtonText: {
    fontWeight: "700",
  },
  previewList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  previewItem: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#e9e9e9",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#e9e9e9",
  },
  removeImageBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.68)",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: "#eee",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  cancelButtonText: {
    fontWeight: "700",
    color: "#222",
  },
  disabledButton: {
    opacity: 0.7,
  },
});

