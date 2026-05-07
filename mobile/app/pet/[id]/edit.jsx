import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AppTopBar from "../../../components/AppTopBar";
import GovernorateSelector from "../../../components/location/GovernorateSelector";
import ThemedText from "../../../components/ThemedText";
import ThemedView from "../../../components/ThemedView";
import {
  resolveCountryName,
  resolveGovernorateForCountry,
} from "../../../constants/governorates";
import { getPetById, updatePet } from "../../../services/petService";

const GREEN = "#3DB85C";
const PET_TYPES = ["Dog", "Cat", "Bird", "Rabbit", "Other"];
const MIN_IMAGES = 1;
const MAX_IMAGES = 5;

function formatDateLabel(date) {
  if (!date) return "Choose birth or adoption date";
  return date.toLocaleDateString();
}

function parseDateValue(rawDate) {
  if (!rawDate) return null;
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function EditPetScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const petParamId = Array.isArray(id) ? id[0] : id;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState("Dog");
  const [breed, setBreed] = useState("");
  const [images, setImages] = useState([]);
  const [governorate, setGovernorate] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const dateLabel = useMemo(() => formatDateLabel(date), [date]);

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
    const loadPet = async () => {
      if (!petParamId) return;

      try {
        setLoading(true);
        const pet = await getPetById(petParamId);

        setName(String(pet?.name || ""));
        setType(String(pet?.type || "Dog"));
        setBreed(String(pet?.breed || ""));
        const normalizedImages = Array.isArray(pet?.images)
          ? pet.images.filter(Boolean)
          : pet?.image
          ? [pet.image]
          : [];
        setImages(normalizedImages.slice(0, MAX_IMAGES));
        setDescription(String(pet?.description || ""));
        setDate(parseDateValue(pet?.date));
        setGovernorate(
          String(
            pet?.location?.governorate ||
              pet?.location?.city ||
              pet?.owner?.governorate ||
              pet?.owner?.city ||
              ""
          )
        );
        setCountry(String(pet?.location?.country || pet?.owner?.country || ""));
      } catch (error) {
        console.log("Load pet error:", error.message);
        Alert.alert("Error", "Failed to load pet details");
      } finally {
        setLoading(false);
      }
    };

    loadPet();
  }, [petParamId]);

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

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (event?.type === "dismissed") {
      return;
    }

    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    if (!petParamId) {
      Alert.alert("Error", "Pet id is missing");
      return;
    }

    if (!name.trim()) {
      Alert.alert("Validation Error", "Pet name is required");
      return;
    }

    if (!type.trim()) {
      Alert.alert("Validation Error", "Pet type is required");
      return;
    }

    const normalizedCountry = resolveCountryName(country);
    const normalizedGovernorate = resolveGovernorateForCountry(
      normalizedCountry,
      governorate
    );

    if (!normalizedGovernorate.trim() || !normalizedCountry.trim()) {
      Alert.alert("Validation Error", "Governorate and country are required");
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

      await updatePet(petParamId, {
        name: name.trim(),
        type: type.trim(),
        breed: breed.trim(),
        images,
        date: date ? date.toISOString() : undefined,
        description: description.trim(),
        location: {
          governorate: normalizedGovernorate.trim(),
          country: normalizedCountry.trim(),
        },
      });

      Alert.alert("Success", "Pet updated successfully");
      router.back();
    } catch (error) {
      console.log("Update pet error:", error.message);
      Alert.alert("Error", error.message || "Failed to update pet");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <AppTopBar title="Edit Pet" />
        <ThemedView style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={GREEN} />
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ThemedView style={styles.container}>
        <AppTopBar title="Edit Pet" />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: Math.max(40, insets.bottom + 20) },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerBlock}>
              <ThemedText style={styles.pageTitle}>Update Pet</ThemedText>
              <ThemedText style={styles.pageSubTitle}>
                Keep your pet profile complete and up to date.
              </ThemedText>
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.label}>Pet Name *</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Enter pet name"
                value={name}
                onChangeText={setName}
              />

              <ThemedText style={styles.label}>Type *</ThemedText>
              <View style={styles.typeRow}>
                {PET_TYPES.map((item) => {
                  const active = item === type;

                  return (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.typeButton,
                        active && styles.activeTypeButton,
                      ]}
                      onPress={() => setType(item)}
                      activeOpacity={0.86}
                    >
                      <ThemedText
                        style={active ? styles.activeTypeText : styles.typeText}
                      >
                        {item}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <ThemedText style={styles.label}>Breed</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Persian, Labrador..."
                value={breed}
                onChangeText={setBreed}
              />
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Location *</ThemedText>

              <ThemedText style={styles.label}>Country</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Tunisia"
                value={country}
                onChangeText={setCountry}
              />

              <ThemedText style={styles.label}>Governorate</ThemedText>
              <GovernorateSelector
                country={country}
                value={governorate}
                onChange={setGovernorate}
                placeholder="Tunis"
                inputStyle={styles.input}
              />
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Pet Images (1 to 5)</ThemedText>
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
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>More Details</ThemedText>

              <ThemedText style={styles.label}>Date</ThemedText>
              <TouchableOpacity
                style={styles.selectInput}
                activeOpacity={0.85}
                onPress={() => setShowDatePicker(true)}
              >
                <ThemedText
                  style={date ? styles.selectText : styles.placeholderText}
                >
                  {dateLabel}
                </ThemedText>
              </TouchableOpacity>

              {showDatePicker ? (
                <View style={styles.datePickerWrap}>
                  <DateTimePicker
                    value={date || new Date()}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    maximumDate={new Date()}
                    onChange={handleDateChange}
                  />
                  {Platform.OS === "ios" ? (
                    <TouchableOpacity
                      style={styles.dateDoneButton}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <ThemedText style={styles.dateDoneText}>Done</ThemedText>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}

              <ThemedText style={styles.label}>Description</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your pet"
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.9}
            >
              <ThemedText style={styles.submitButtonText}>
                {submitting ? "Saving..." : "Save Changes"}
              </ThemedText>
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
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#F4F6F4",
  },
  flex: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  headerBlock: {
    marginBottom: 14,
  },
  pageTitle: {
    fontSize: 27,
    fontWeight: "800",
    color: "#152019",
  },
  pageSubTitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#7D8A82",
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6EDE8",
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1D2721",
    marginBottom: 2,
  },
  label: {
    marginBottom: 8,
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#2E3A32",
  },
  input: {
    borderWidth: 1,
    borderColor: "#DCE3DE",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#FFFFFF",
    fontSize: 15,
    color: "#1B2420",
  },
  selectInput: {
    borderWidth: 1,
    borderColor: "#DCE3DE",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  selectText: {
    color: "#1B2420",
    fontSize: 15,
  },
  placeholderText: {
    color: "#93A198",
    fontSize: 15,
  },
  datePickerWrap: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E1E8E3",
    backgroundColor: "#F8FBF9",
    overflow: "hidden",
  },
  dateDoneButton: {
    borderTopWidth: 1,
    borderTopColor: "#E1E8E3",
    paddingVertical: 10,
    alignItems: "center",
  },
  dateDoneText: {
    color: GREEN,
    fontWeight: "700",
    fontSize: 15,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeButton: {
    height: 38,
    minWidth: 72,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#D9E1DB",
    backgroundColor: "#F8FAF9",
    alignItems: "center",
    justifyContent: "center",
  },
  activeTypeButton: {
    borderColor: GREEN,
    backgroundColor: GREEN,
  },
  typeText: {
    color: "#5F6C64",
    fontWeight: "600",
    fontSize: 14,
  },
  activeTypeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  imageButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  imageCountText: {
    marginTop: 6,
    marginBottom: 2,
    color: "#6F7C74",
    fontSize: 12.5,
    fontWeight: "600",
  },
  imageActionButton: {
    flex: 1,
    backgroundColor: "#F6F8F7",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DCE4DF",
  },
  imageActionButtonText: {
    fontWeight: "700",
    color: "#3A4640",
  },
  previewList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 2,
  },
  previewItem: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#E9EFEB",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E9EFEB",
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
    backgroundColor: GREEN,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
});

