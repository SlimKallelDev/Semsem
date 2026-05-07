import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AppTopBar from "../../components/AppTopBar";
import GovernorateSelector from "../../components/location/GovernorateSelector";
import ThemedText from "../../components/ThemedText";
import ThemedView from "../../components/ThemedView";
import { COUNTRIES } from "../../constants/countries";
import {
  resolveCountryName,
  resolveGovernorateForCountry,
} from "../../constants/governorates";
import {
  POST_TYPES,
  POST_TYPE_OPTIONS,
  getAllowedPostTypesForProfileType,
  isPostTypeAllowedForProfileType,
} from "../../constants/postTypes";
import { useUser } from "../../contexts/UserContext";
import { createPost } from "../../services/postService";

const MIN_IMAGES = 1;
const MAX_IMAGES = 5;

export default function NewPostScreen() {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [type, setType] = useState(POST_TYPES.GENERAL);
  const [description, setDescription] = useState("");
  const [petType, setPetType] = useState("");
  const [images, setImages] = useState([]);
  const [governorate, setGovernorate] = useState("");
  const [country, setCountry] = useState("");
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const allowedPostTypes = useMemo(
    () => getAllowedPostTypesForProfileType(user?.profileType),
    [user?.profileType]
  );
  const postTypeOptions = useMemo(
    () => POST_TYPE_OPTIONS.filter((item) => allowedPostTypes.includes(item.value)),
    [allowedPostTypes]
  );

  useEffect(() => {
    const fallbackType = allowedPostTypes[0] || POST_TYPES.GENERAL;

    if (!allowedPostTypes.includes(type)) {
      setType(fallbackType);
    }
  }, [allowedPostTypes, type]);

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES;

    return COUNTRIES.filter((item) =>
      item.toLowerCase().includes(countrySearch.trim().toLowerCase())
    );
  }, [countrySearch]);

  const handleCountrySelect = (item) => {
    const nextCountry = resolveCountryName(item);

    setCountry(nextCountry);
    setGovernorate((current) =>
      resolveGovernorateForCountry(nextCountry, current, {
        fallbackToRaw: false,
      })
    );
    setCountryModalVisible(false);
    setCountrySearch("");
  };

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

  const pickFromGallery = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Gallery permission is required to choose an image."
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

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Validation Error", "Title is required");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Validation Error", "Description is required");
      return;
    }

    const normalizedCountry = resolveCountryName(country);
    const normalizedGovernorate = resolveGovernorateForCountry(
      normalizedCountry,
      governorate
    );

    if (!normalizedCountry.trim()) {
      Alert.alert("Validation Error", "Country is required");
      return;
    }

    if (!isPostTypeAllowedForProfileType(user?.profileType, type)) {
      Alert.alert(
        "Validation Error",
        "This post type is not allowed for your profile type."
      );
      return;
    }

    if (images.length < MIN_IMAGES || images.length > MAX_IMAGES) {
      Alert.alert(
        "Validation Error",
        `Please add between ${MIN_IMAGES} and ${MAX_IMAGES} images.`
      );
      return;
    }

    try {
      setSubmitting(true);

      await createPost({
        title: title.trim(),
        type,
        description: description.trim(),
        images,
        pet_type: petType.trim(),
        location: {
          governorate: normalizedGovernorate.trim(),
          country: normalizedCountry.trim(),
        },
      });

      Alert.alert("Success", "Post created successfully");
      router.back();
    } catch (error) {
      console.log("Create post error:", error.message);
      Alert.alert("Error", error.message || "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ThemedView style={styles.container}>
        <AppTopBar title="Create New Post" />

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
            <ThemedText type="title" style={styles.title}>
              Create New Post
            </ThemedText>

            <ThemedText style={styles.label}>Title</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Enter post title"
              value={title}
              onChangeText={setTitle}
            />

            <ThemedText style={styles.label}>Type</ThemedText>
            {postTypeOptions.map((item) => {
              const active = item.value === type;

              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.typeButton, active && styles.activeTypeButton]}
                  onPress={() => setType(item.value)}
                >
                  <ThemedText style={active ? styles.activeTypeText : null}>
                    {item.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}

            <ThemedText style={styles.label}>Description</ThemedText>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the post"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <ThemedText style={styles.label}>Pet Type</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="dog, cat..."
              value={petType}
              onChangeText={setPetType}
            />

            <ThemedText style={styles.label}>Post Images (1 to 5)</ThemedText>
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

            <ThemedText style={styles.sectionTitle}>Location</ThemedText>

            <ThemedText style={styles.label}>Country *</ThemedText>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setCountryModalVisible(true)}
            >
              <ThemedText
                style={country ? styles.selectText : styles.placeholderText}
              >
                {country || "Select a country"}
              </ThemedText>
            </TouchableOpacity>

            <ThemedText style={styles.label}>Governorate</ThemedText>
            <GovernorateSelector
              country={country}
              value={governorate}
              onChange={setGovernorate}
              placeholder="Tunis"
              inputStyle={styles.input}
            />

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <ThemedText style={styles.submitButtonText}>
                {submitting ? "Creating..." : "Create Post"}
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        <Modal
          visible={countryModalVisible}
          animationType="slide"
          onRequestClose={() => setCountryModalVisible(false)}
        >
          <SafeAreaView style={styles.modalSafeArea} edges={["top", "bottom"]}>
            <KeyboardAvoidingView
              style={styles.modalKeyboard}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={0}
            >
              <ThemedView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <ThemedText type="title">Select Country</ThemedText>
                  <TouchableOpacity onPress={() => setCountryModalVisible(false)}>
                    <ThemedText style={styles.closeText}>Close</ThemedText>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Search country"
                  value={countrySearch}
                  onChangeText={setCountrySearch}
                />

                <FlatList
                  data={filteredCountries}
                  keyExtractor={(item) => item}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.countryItem}
                      onPress={() => handleCountrySelect(item)}
                    >
                      <ThemedText>{item}</ThemedText>
                    </TouchableOpacity>
                  )}
                />
              </ThemedView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
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
  title: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: "bold",
  },
  label: {
    marginBottom: 8,
    marginTop: 14,
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  selectInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: "#fff",
  },
  selectText: {
    color: "#000",
  },
  placeholderText: {
    color: "#888",
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#eee",
    marginBottom: 8,
  },
  activeTypeButton: {
    backgroundColor: "#4CAF50",
  },
  activeTypeText: {
    color: "#fff",
    fontWeight: "bold",
  },
  imageButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  imageCountText: {
    marginTop: -2,
    marginBottom: 8,
    color: "#6F7C74",
    fontSize: 12.5,
    fontWeight: "600",
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
  submitButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    padding: 16,
    paddingTop: 8,
    backgroundColor: "#fff",
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalKeyboard: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  closeText: {
    color: "#4CAF50",
    fontWeight: "700",
  },
  countryItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});

