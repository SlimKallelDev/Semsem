import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppTopBar from "../../components/AppTopBar";
import ThemedText from "../../components/ThemedText";
import { useUser } from "../../contexts/UserContext";
import { createAppointment } from "../../services/appointmentService";
import { getPetsByOwner } from "../../services/petService";
import { getUser } from "../../services/userService";

const GREEN = "#3DB85C";
const GREEN_DARK = "#227B3E";

const readParam = (value) => {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
};

const getEntityId = (value) => {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  return value?._id || value?.id || value?.userId || value?.$id || null;
};

const getDisplayName = (person) => {
  const explicit = String(person?.name || person?.fullName || "").trim();
  return explicit || person?.email || "Semsem provider";
};

const createInitialAppointmentDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date;
};

const formatDate = (value) => {
  return value.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (value) => {
  return value.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getPetSubtitle = (pet) => {
  return [pet?.type, pet?.breed].filter(Boolean).join(" - ") || "Pet";
};

export default function RequestAppointmentScreen() {
  const { providerId: rawProviderId } = useLocalSearchParams();
  const { user } = useUser();
  const providerId = readParam(rawProviderId);
  const currentUserId = getEntityId(user);

  const [provider, setProvider] = useState(null);
  const [pets, setPets] = useState([]);
  const [selectedPetIds, setSelectedPetIds] = useState([]);
  const [includeOther, setIncludeOther] = useState(false);
  const [otherPet, setOtherPet] = useState("");
  const [note, setNote] = useState("");
  const [appointmentDate, setAppointmentDate] = useState(
    createInitialAppointmentDate
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const selectedPetCount = selectedPetIds.length + (includeOther ? 1 : 0);
  const providerName = useMemo(() => getDisplayName(provider), [provider]);

  const loadScreenData = useCallback(async () => {
    if (!providerId) {
      setError("Provider not found.");
      setLoading(false);
      return;
    }

    if (!currentUserId) {
      router.replace("/(auth)/login");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [providerData, petsData] = await Promise.all([
        getUser(providerId),
        getPetsByOwner(currentUserId).catch(() => []),
      ]);

      setProvider(providerData || null);
      setPets(Array.isArray(petsData) ? petsData : []);
    } catch (loadError) {
      setError(loadError?.message || "Unable to load appointment details.");
    } finally {
      setLoading(false);
    }
  }, [currentUserId, providerId]);

  useEffect(() => {
    loadScreenData();
  }, [loadScreenData]);

  const togglePet = (petId) => {
    setSelectedPetIds((current) => {
      const exists = current.some((id) => String(id) === String(petId));
      if (exists) {
        return current.filter((id) => String(id) !== String(petId));
      }

      return [...current, petId];
    });
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS !== "ios") {
      setShowDatePicker(false);
    }

    if (!selectedDate) return;

    setAppointmentDate((current) => {
      const next = new Date(current);
      next.setFullYear(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      );
      return next;
    });
  };

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS !== "ios") {
      setShowTimePicker(false);
    }

    if (!selectedTime) return;

    setAppointmentDate((current) => {
      const next = new Date(current);
      next.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!providerId || !currentUserId) return;

    if (appointmentDate <= new Date()) {
      Alert.alert("Appointment", "Please choose a future date and time.");
      return;
    }

    if (selectedPetIds.length === 0 && !includeOther) {
      Alert.alert("Appointment", "Select at least one pet or choose Other.");
      return;
    }

    if (includeOther && !otherPet.trim()) {
      Alert.alert("Appointment", "Describe the other pet before sending.");
      return;
    }

    try {
      setSubmitting(true);

      await createAppointment({
        provider: providerId,
        requestedFor: appointmentDate.toISOString(),
        pets: selectedPetIds,
        otherPet: includeOther ? otherPet.trim() : "",
        note: note.trim(),
      });

      Alert.alert(
        "Appointment requested",
        `${providerName} can now accept or decline your request.`,
        [
          {
            text: "OK",
            onPress: () =>
              router.replace({
                pathname: "/myspace",
                params: { tab: "appointments" },
              }),
          },
        ]
      );
    } catch (submitError) {
      Alert.alert(
        "Appointment",
        submitError?.message || "Failed to request appointment."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <AppTopBar title="Appointment" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppTopBar title="Request Appointment" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={18} color="#C74747" />
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          ) : null}

          <View style={styles.card}>
            <ThemedText style={styles.eyebrow}>Service provider</ThemedText>
            <ThemedText style={styles.providerName} numberOfLines={2}>
              {providerName}
            </ThemedText>
            <ThemedText style={styles.providerMeta} numberOfLines={1}>
              {[provider?.governorate || provider?.city, provider?.country]
                .filter(Boolean)
                .join(", ") || "Location not shared"}
            </ThemedText>
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.sectionTitle}>Date and time</ThemedText>

            <View style={styles.dateGrid}>
              <TouchableOpacity
                style={styles.dateButton}
                activeOpacity={0.86}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={GREEN_DARK} />
                <View style={styles.dateButtonTextWrap}>
                  <ThemedText style={styles.dateButtonLabel}>Date</ThemedText>
                  <ThemedText style={styles.dateButtonValue}>
                    {formatDate(appointmentDate)}
                  </ThemedText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateButton}
                activeOpacity={0.86}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={18} color={GREEN_DARK} />
                <View style={styles.dateButtonTextWrap}>
                  <ThemedText style={styles.dateButtonLabel}>Time</ThemedText>
                  <ThemedText style={styles.dateButtonValue}>
                    {formatTime(appointmentDate)}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            </View>

            {showDatePicker ? (
              <DateTimePicker
                mode="date"
                value={appointmentDate}
                minimumDate={new Date()}
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={handleDateChange}
              />
            ) : null}

            {showTimePicker ? (
              <DateTimePicker
                mode="time"
                value={appointmentDate}
                display="default"
                onChange={handleTimeChange}
              />
            ) : null}
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText style={styles.sectionTitle}>Pets</ThemedText>
              <ThemedText style={styles.selectionCount}>
                {selectedPetCount} selected
              </ThemedText>
            </View>

            {pets.length === 0 ? (
              <View style={styles.emptyPetsCard}>
                <ThemedText style={styles.emptyPetsText}>
                  You do not have pets yet. Choose Other to continue.
                </ThemedText>
              </View>
            ) : (
              pets.map((pet) => {
                const petId = getEntityId(pet);
                const selected = selectedPetIds.some(
                  (id) => String(id) === String(petId)
                );

                return (
                  <TouchableOpacity
                    key={String(petId)}
                    style={[styles.petRow, selected && styles.petRowSelected]}
                    activeOpacity={0.86}
                    onPress={() => petId && togglePet(petId)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        selected && styles.checkboxSelected,
                      ]}
                    >
                      {selected ? (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      ) : null}
                    </View>

                    <View style={styles.petTextWrap}>
                      <ThemedText style={styles.petName} numberOfLines={1}>
                        {pet?.name || "Unnamed pet"}
                      </ThemedText>
                      <ThemedText style={styles.petMeta} numberOfLines={1}>
                        {getPetSubtitle(pet)}
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            <TouchableOpacity
              style={[styles.petRow, includeOther && styles.petRowSelected]}
              activeOpacity={0.86}
              onPress={() => setIncludeOther((current) => !current)}
            >
              <View
                style={[
                  styles.checkbox,
                  includeOther && styles.checkboxSelected,
                ]}
              >
                {includeOther ? (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                ) : null}
              </View>

              <View style={styles.petTextWrap}>
                <ThemedText style={styles.petName}>Other</ThemedText>
                <ThemedText style={styles.petMeta}>
                  Use this for a pet that is not saved in your profile.
                </ThemedText>
              </View>
            </TouchableOpacity>

            {includeOther ? (
              <TextInput
                value={otherPet}
                onChangeText={setOtherPet}
                placeholder="Describe the other pet"
                placeholderTextColor="#97A19B"
                style={styles.textInput}
              />
            ) : null}
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.sectionTitle}>Note</ThemedText>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Add a short note for the provider"
              placeholderTextColor="#97A19B"
              style={[styles.textInput, styles.noteInput]}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.disabledButton]}
            activeOpacity={0.9}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="send-outline" size={18} color="#FFFFFF" />
                <ThemedText style={styles.submitButtonText}>
                  Send request
                </ThemedText>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F6F4",
  },
  keyboardView: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 34,
    gap: 12,
  },
  errorCard: {
    borderWidth: 1,
    borderColor: "#F0C9C9",
    backgroundColor: "#FFF5F5",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: "#A83E3E",
    fontSize: 13,
    fontWeight: "700",
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E1ECE5",
    backgroundColor: "#FFFFFF",
    padding: 14,
    shadowColor: "#173423",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  eyebrow: {
    color: GREEN_DARK,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  providerName: {
    marginTop: 5,
    color: "#17201A",
    fontSize: 22,
    fontWeight: "900",
  },
  providerMeta: {
    marginTop: 4,
    color: "#68746D",
    fontSize: 13,
    fontWeight: "700",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitle: {
    color: "#17201A",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
  },
  selectionCount: {
    color: GREEN_DARK,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 10,
  },
  dateGrid: {
    flexDirection: "row",
    gap: 10,
  },
  dateButton: {
    flex: 1,
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D8E7DD",
    backgroundColor: "#F8FCF9",
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateButtonTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  dateButtonLabel: {
    color: "#6C7A72",
    fontSize: 11,
    fontWeight: "800",
  },
  dateButtonValue: {
    marginTop: 2,
    color: "#17201A",
    fontSize: 13,
    fontWeight: "900",
  },
  emptyPetsCard: {
    borderWidth: 1,
    borderColor: "#E5ECE8",
    backgroundColor: "#FAFCFB",
    borderRadius: 16,
    padding: 12,
  },
  emptyPetsText: {
    color: "#6A776F",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  petRow: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4ECE7",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 11,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  petRowSelected: {
    borderColor: "#BFE6C9",
    backgroundColor: "#F1FBF3",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#BFCAC3",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxSelected: {
    borderColor: GREEN,
    backgroundColor: GREEN,
  },
  petTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  petName: {
    color: "#17201A",
    fontSize: 14.5,
    fontWeight: "900",
  },
  petMeta: {
    marginTop: 2,
    color: "#66736B",
    fontSize: 12.5,
    fontWeight: "700",
  },
  textInput: {
    minHeight: 46,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#DDE8E1",
    backgroundColor: "#FAFCFB",
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: "#17201A",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  noteInput: {
    minHeight: 104,
    lineHeight: 20,
  },
  submitButton: {
    height: 52,
    borderRadius: 17,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.75,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
});
