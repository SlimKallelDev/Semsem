import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  StatusBar,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AppTopBar from "../../components/AppTopBar";
import CurrencySelector from "../../components/CurrencySelector";
import LocationSelector from "../../components/location/LocationSelector";
import ThemedText from "../../components/ThemedText";
import ThemedView from "../../components/ThemedView";
import { DEFAULT_CURRENCY } from "../../constants/currencies";
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
import { getPetsByOwner } from "../../services/petService";
import { createPost } from "../../services/postService";

const MAX_IMAGES = 5;
const PET_TYPE_OPTIONS = ["Dog", "Cat", "Bird", "Rabbit", "Other"];

const getEntityId = (value) => {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  return value?._id || value?.id || value?.$id || null;
};

const titleCase = (value) => {
  const text = String(value || "").trim();

  if (!text) return "";

  return text
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export default function NewPostScreen() {
  const { user, initializing } = useUser();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [type, setType] = useState(POST_TYPES.GENERAL);
  const [typeSelectOpen, setTypeSelectOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [ownedPets, setOwnedPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [selectedPetIds, setSelectedPetIds] = useState([]);
  const [includeOtherPet, setIncludeOtherPet] = useState(false);
  const [otherPetType, setOtherPetType] = useState("");
  const [customOtherPetType, setCustomOtherPetType] = useState("");
  const [images, setImages] = useState([]);
  const [governorate, setGovernorate] = useState("");
  const [country, setCountry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const allowedPostTypes = useMemo(
    () => getAllowedPostTypesForProfileType(user?.profileType),
    [user?.profileType]
  );
  const postTypeOptions = useMemo(
    () => POST_TYPE_OPTIONS.filter((item) => allowedPostTypes.includes(item.value)),
    [allowedPostTypes]
  );
  const selectedPostTypeOption = useMemo(
    () => postTypeOptions.find((item) => item.value === type) || postTypeOptions[0],
    [postTypeOptions, type]
  );
  const isSalePost = type === POST_TYPES.SALE;
  const userId = useMemo(() => getEntityId(user), [user]);
  const selectedPets = useMemo(() => {
    const selected = new Set(selectedPetIds.map((id) => String(id)));
    return ownedPets.filter((pet) => selected.has(String(getEntityId(pet))));
  }, [ownedPets, selectedPetIds]);
  const derivedPetType = useMemo(() => {
    const typeParts = selectedPets
      .map((pet) => titleCase(pet?.type))
      .filter(Boolean);
    const otherType = titleCase(
      otherPetType === "Other" ? customOtherPetType : otherPetType
    );

    if (includeOtherPet && otherType) {
      typeParts.push(otherType);
    }

    return [...new Set(typeParts)].join(", ");
  }, [customOtherPetType, includeOtherPet, otherPetType, selectedPets]);

  useEffect(() => {
    if (!initializing && !userId) {
      router.replace("/(auth)/login");
    }
  }, [initializing, userId]);

  useEffect(() => {
    const fallbackType = allowedPostTypes[0] || POST_TYPES.GENERAL;

    if (!allowedPostTypes.includes(type)) {
      setType(fallbackType);
    }
  }, [allowedPostTypes, type]);

  useEffect(() => {
    let mounted = true;

    const loadOwnedPets = async () => {
      if (!userId) {
        setOwnedPets([]);
        setSelectedPetIds([]);
        return;
      }

      try {
        setPetsLoading(true);
        const data = await getPetsByOwner(userId);
        const pets = Array.isArray(data) ? data : [];

        if (!mounted) return;

        setOwnedPets(pets);
        setSelectedPetIds((current) => {
          const validIds = new Set(
            pets.map((pet) => String(getEntityId(pet))).filter(Boolean)
          );

          return current.filter((id) => validIds.has(String(id)));
        });
      } catch (error) {
        console.log("Load post pets error:", error?.message || error);
        if (mounted) setOwnedPets([]);
      } finally {
        if (mounted) setPetsLoading(false);
      }
    };

    loadOwnedPets();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const toggleSelectedPet = (petId) => {
    const normalizedId = String(petId || "");
    if (!normalizedId) return;

    setSelectedPetIds((current) =>
      current.some((id) => String(id) === normalizedId)
        ? current.filter((id) => String(id) !== normalizedId)
        : [...current, normalizedId]
    );
  };

  const toggleOtherPet = () => {
    setIncludeOtherPet((current) => {
      const next = !current;
      if (!next) {
        setOtherPetType("");
        setCustomOtherPetType("");
      }
      return next;
    });
  };

  const handleTypeSelect = (nextType) => {
    setType(nextType);
    setTypeSelectOpen(false);

    if (nextType !== POST_TYPES.SALE) {
      setPrice("");
      setCurrency(DEFAULT_CURRENCY);
    }
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

  const handleSubmit = async () => {
    if (!userId) {
      router.replace("/(auth)/login");
      return;
    }

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

    if (!normalizedCountry.trim() || !normalizedGovernorate.trim()) {
      Alert.alert("Validation Error", "Country / city is required");
      return;
    }

    if (!isPostTypeAllowedForProfileType(user?.profileType, type)) {
      Alert.alert(
        "Validation Error",
        "This post type is not allowed for your profile type."
      );
      return;
    }

    const normalizedSalePrice = price.trim().replace(",", ".");
    const normalizedSaleCurrency = currency.trim().toUpperCase();

    if (isSalePost) {
      const salePriceNumber = Number(normalizedSalePrice);

      if (!normalizedSalePrice || !Number.isFinite(salePriceNumber) || salePriceNumber <= 0) {
        Alert.alert("Validation Error", "Enter a valid sale price.");
        return;
      }

      if (!normalizedSaleCurrency) {
        Alert.alert("Validation Error", "Enter the sale currency.");
        return;
      }
    }

    if (selectedPets.length === 0 && !includeOtherPet) {
      Alert.alert(
        "Validation Error",
        "Select at least one pet, or choose Other and select the animal type."
      );
      return;
    }

    if (includeOtherPet && !otherPetType.trim()) {
      Alert.alert("Validation Error", "Select or enter the other animal type.");
      return;
    }

    if (includeOtherPet && otherPetType === "Other" && !customOtherPetType.trim()) {
      Alert.alert("Validation Error", "Enter the other animal type.");
      return;
    }

    if (images.length > MAX_IMAGES) {
      Alert.alert("Validation Error", `Please add up to ${MAX_IMAGES} images.`);
      return;
    }

    try {
      setSubmitting(true);

      await createPost({
        title: title.trim(),
        type,
        description: description.trim(),
        images,
        pet_type: derivedPetType,
        ...(isSalePost
          ? {
              price: normalizedSalePrice,
              currency: normalizedSaleCurrency,
            }
          : {}),
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

  if (!userId) return null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
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
            <View style={styles.typeSelectWrap}>
              <TouchableOpacity
                style={styles.typeSelectButton}
                activeOpacity={0.86}
                onPress={() => setTypeSelectOpen((value) => !value)}
              >
                <ThemedText style={styles.typeSelectText} numberOfLines={1}>
                  {selectedPostTypeOption?.label || "Select post type"}
                </ThemedText>
                <Ionicons
                  name={typeSelectOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#6D7A72"
                />
              </TouchableOpacity>

              {typeSelectOpen ? (
                <View style={styles.typeOptionsList}>
                  {postTypeOptions.map((item) => {
                    const active = item.value === type;

                    return (
                      <TouchableOpacity
                        key={item.value}
                        style={[
                          styles.typeOptionRow,
                          active && styles.typeOptionRowActive,
                        ]}
                        activeOpacity={0.84}
                        onPress={() => handleTypeSelect(item.value)}
                      >
                        <ThemedText
                          style={[
                            styles.typeOptionText,
                            active && styles.typeOptionTextActive,
                          ]}
                        >
                          {item.label}
                        </ThemedText>
                        {active ? (
                          <Ionicons name="checkmark" size={18} color="#3DB85C" />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </View>

            {isSalePost ? (
              <View style={styles.saleFieldsRow}>
                <View style={styles.salePriceField}>
                  <ThemedText style={styles.label}>Price</ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="30"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.saleCurrencyField}>
                  <ThemedText style={styles.label}>Currency</ThemedText>
                  <CurrencySelector
                    value={currency}
                    onChange={setCurrency}
                    buttonStyle={styles.currencySelectButton}
                  />
                </View>
              </View>
            ) : null}

            <ThemedText style={styles.label}>Description</ThemedText>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the post"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <ThemedText style={styles.label}>Pets or animal type</ThemedText>
            <ThemedText style={styles.helperText}>
              Select one or more of your pets, or choose Other for a different animal.
            </ThemedText>

            <View style={styles.petPickerPanel}>
              {petsLoading ? (
                <View style={styles.petPickerMessage}>
                  <ThemedText style={styles.helperText}>Loading your pets...</ThemedText>
                </View>
              ) : null}

              {!petsLoading && ownedPets.length === 0 ? (
                <View style={styles.petPickerMessage}>
                  <Ionicons name="paw-outline" size={18} color="#6F7C74" />
                  <ThemedText style={styles.helperText}>
                    No saved pets yet. Use Other below.
                  </ThemedText>
                </View>
              ) : null}

              {ownedPets.length > 0 ? (
                <View style={styles.petOptionsWrap}>
                  {ownedPets.map((pet) => {
                    const petId = getEntityId(pet);
                    const active = selectedPetIds.some(
                      (id) => String(id) === String(petId)
                    );
                    const imageUri = pet?.image || pet?.images?.[0] || "";

                    return (
                      <TouchableOpacity
                        key={String(petId)}
                        style={[styles.petOption, active && styles.petOptionActive]}
                        activeOpacity={0.86}
                        onPress={() => toggleSelectedPet(petId)}
                      >
                        {imageUri ? (
                          <Image source={{ uri: imageUri }} style={styles.petOptionImage} />
                        ) : (
                          <View style={styles.petOptionFallback}>
                            <Ionicons name="paw" size={16} color="#3DB85C" />
                          </View>
                        )}

                        <View style={styles.petOptionTextWrap}>
                          <ThemedText
                            style={[
                              styles.petOptionName,
                              active && styles.petOptionNameActive,
                            ]}
                            numberOfLines={1}
                          >
                            {pet?.name || "Unnamed"}
                          </ThemedText>
                          <ThemedText style={styles.petOptionType} numberOfLines={1}>
                            {titleCase(pet?.type) || "Pet"}
                          </ThemedText>
                        </View>

                        <Ionicons
                          name={active ? "checkmark-circle" : "ellipse-outline"}
                          size={20}
                          color={active ? "#3DB85C" : "#B6C1BB"}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.otherPetOption,
                  includeOtherPet && styles.otherPetOptionActive,
                ]}
                activeOpacity={0.86}
                onPress={toggleOtherPet}
              >
                <View
                  style={[
                    styles.otherPetIcon,
                    includeOtherPet && styles.otherPetIconActive,
                  ]}
                >
                  <Ionicons
                    name={includeOtherPet ? "checkmark" : "add"}
                    size={17}
                    color={includeOtherPet ? "#FFFFFF" : "#3DB85C"}
                  />
                </View>
                <View style={styles.petOptionTextWrap}>
                  <ThemedText
                    style={[
                      styles.petOptionName,
                      includeOtherPet && styles.petOptionNameActive,
                    ]}
                  >
                    Other
                  </ThemedText>
                  <ThemedText style={styles.petOptionType}>
                    Select an animal type manually
                  </ThemedText>
                </View>
              </TouchableOpacity>

              {includeOtherPet ? (
                <View style={styles.otherTypeBlock}>
                  <View style={styles.petTypeChips}>
                    {PET_TYPE_OPTIONS.map((item) => {
                      const active = otherPetType === item;

                      return (
                        <TouchableOpacity
                          key={item}
                          style={[
                            styles.petTypeChip,
                            active && styles.petTypeChipActive,
                          ]}
                          activeOpacity={0.84}
                          onPress={() => setOtherPetType(item)}
                        >
                          <ThemedText
                            style={[
                              styles.petTypeChipText,
                              active && styles.petTypeChipTextActive,
                            ]}
                          >
                            {item}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {otherPetType === "Other" ? (
                    <TextInput
                      style={[styles.input, styles.inlineInput]}
                      placeholder="Enter animal type"
                      value={customOtherPetType}
                      onChangeText={setCustomOtherPetType}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>

            <ThemedText style={styles.petTypeSummary}>
              Animal type: {derivedPetType || "Choose pets or Other"}
            </ThemedText>

            <ThemedText style={styles.label}>Images (optional, up to 5)</ThemedText>
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

            <ThemedText style={styles.label}>Country / City *</ThemedText>
            <LocationSelector
              country={country}
              governorate={governorate}
              onChange={(location) => {
                setCountry(location.country);
                setGovernorate(location.governorate);
              }}
              placeholder="Country / City"
              buttonStyle={styles.input}
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
  typeSelectWrap: {
    marginBottom: 4,
  },
  typeSelectButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#DCE3DE",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  typeSelectText: {
    flex: 1,
    marginRight: 8,
    color: "#17201A",
    fontSize: 15,
    fontWeight: "700",
  },
  typeOptionsList: {
    borderWidth: 1,
    borderColor: "#DDE8E1",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    marginTop: 6,
    overflow: "hidden",
  },
  typeOptionRow: {
    minHeight: 46,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF3EF",
  },
  typeOptionRowActive: {
    backgroundColor: "#F0FBF3",
  },
  typeOptionText: {
    color: "#38443D",
    fontSize: 14,
    fontWeight: "700",
  },
  typeOptionTextActive: {
    color: "#227B3E",
    fontWeight: "900",
  },
  saleFieldsRow: {
    flexDirection: "row",
    gap: 10,
  },
  salePriceField: {
    flex: 1,
    minWidth: 0,
  },
  saleCurrencyField: {
    width: 150,
  },
  currencySelectButton: {
    borderColor: "#ddd",
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  helperText: {
    color: "#6F7C74",
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 8,
  },
  petPickerPanel: {
    borderWidth: 1,
    borderColor: "#DDE8E1",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    padding: 10,
    marginBottom: 8,
  },
  petPickerMessage: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#F6FAF7",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  petOptionsWrap: {
    gap: 8,
    marginBottom: 8,
  },
  petOption: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E0E8E3",
    backgroundColor: "#FBFDFC",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  petOptionActive: {
    borderColor: "#BDE8C9",
    backgroundColor: "#F0FBF3",
  },
  petOptionImage: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#E7EEE9",
  },
  petOptionFallback: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EAF8EE",
    alignItems: "center",
    justifyContent: "center",
  },
  petOptionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  petOptionName: {
    color: "#17201A",
    fontSize: 14,
    fontWeight: "800",
  },
  petOptionNameActive: {
    color: "#227B3E",
  },
  petOptionType: {
    color: "#77827C",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  otherPetOption: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCE8E1",
    backgroundColor: "#F9FCFA",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  otherPetOptionActive: {
    borderColor: "#BDE8C9",
    backgroundColor: "#F0FBF3",
  },
  otherPetIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#EAF8EE",
    alignItems: "center",
    justifyContent: "center",
  },
  otherPetIconActive: {
    backgroundColor: "#3DB85C",
  },
  otherTypeBlock: {
    marginTop: 10,
  },
  petTypeChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  petTypeChip: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#DDE8E1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  petTypeChipActive: {
    borderColor: "#3DB85C",
    backgroundColor: "#3DB85C",
  },
  petTypeChipText: {
    color: "#546158",
    fontSize: 12.5,
    fontWeight: "700",
  },
  petTypeChipTextActive: {
    color: "#FFFFFF",
  },
  inlineInput: {
    marginTop: 10,
    marginBottom: 0,
  },
  petTypeSummary: {
    color: "#227B3E",
    fontSize: 12.5,
    fontWeight: "800",
    marginBottom: 4,
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

