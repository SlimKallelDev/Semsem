import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppTopBar from "../../components/AppTopBar";
import ThemedText from "../../components/ThemedText";
import { useUser } from "../../contexts/UserContext";
import {
  getAppointmentById,
  updateAppointmentDate,
  updateAppointmentStatus,
} from "../../services/appointmentService";
import { startConversation } from "../../services/messageService";

const GREEN = "#3DB85C";
const GREEN_DARK = "#227B3E";

const STATUS_META = {
  pending: {
    label: "Waiting for acceptance",
    color: "#C97815",
    bg: "#FFF4E3",
  },
  accepted: {
    label: "Accepted",
    color: GREEN_DARK,
    bg: "#EAF8EE",
  },
  rejected: {
    label: "Declined",
    color: "#C74747",
    bg: "#FDECEC",
  },
  cancelled: {
    label: "Cancelled",
    color: "#707A74",
    bg: "#EFF2F0",
  },
};

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
  return explicit || person?.email || "Semsem user";
};

const createFallbackDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date;
};

const parseAppointmentDate = (value) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date : createFallbackDate();
};

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;

  return (
    <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
      <ThemedText style={[styles.statusPillText, { color: meta.color }]}>
        {meta.label}
      </ThemedText>
    </View>
  );
}

export default function AppointmentDetailsScreen() {
  const { id } = useLocalSearchParams();
  const appointmentId = readParam(id);
  const { user, initializing } = useUser();
  const currentUserId = getEntityId(user);

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [draftDate, setDraftDate] = useState(createFallbackDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const loadAppointment = useCallback(async (isRefresh = false) => {
    if (!appointmentId || !currentUserId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await getAppointmentById(appointmentId);
      setAppointment(data || null);
    } catch (error) {
      Alert.alert("Appointment", error?.message || "Failed to load appointment.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appointmentId, currentUserId]);

  useFocusEffect(
    useCallback(() => {
      loadAppointment();
    }, [loadAppointment])
  );

  useEffect(() => {
    if (!initializing && !currentUserId) {
      router.replace("/(auth)/login");
    }
  }, [currentUserId, initializing]);

  const requesterId = getEntityId(appointment?.requester);
  const providerId = getEntityId(appointment?.provider);
  const isRequester =
    !!requesterId && !!currentUserId && String(requesterId) === String(currentUserId);
  const isProvider =
    !!providerId && !!currentUserId && String(providerId) === String(currentUserId);
  const otherPerson = isProvider ? appointment?.requester : appointment?.provider;
  const canRespond = appointment?.status === "pending" && isProvider;
  const canChangeDate = ["pending", "accepted"].includes(appointment?.status);
  const canCancel = ["pending", "accepted"].includes(appointment?.status);
  const otherPersonId = getEntityId(otherPerson);

  const selectedPets = useMemo(
    () => (Array.isArray(appointment?.pets) ? appointment.pets : []),
    [appointment?.pets]
  );
  const chatPetId = getEntityId(selectedPets[0]);

  const openProfile = (person) => {
    const personId = getEntityId(person);
    if (!personId) return;

    if (currentUserId && String(personId) === String(currentUserId)) {
      router.push({
        pathname: "/profile",
        params: { returnTo: `/appointment/${appointmentId}` },
      });
      return;
    }

    router.push(`/user/${personId}`);
  };

  const openPet = (pet) => {
    const petId = getEntityId(pet);
    if (petId) {
      router.push(`/pet/${petId}`);
    }
  };

  const handleUpdateStatus = async (status) => {
    if (!appointmentId || updating) return;

    try {
      setUpdating(true);
      const updated = await updateAppointmentStatus(appointmentId, status);
      setAppointment(updated);
    } catch (error) {
      Alert.alert("Appointment", error?.message || "Failed to update appointment.");
    } finally {
      setUpdating(false);
    }
  };

  const confirmCancel = () => {
    Alert.alert("Cancel appointment", "Are you sure you want to cancel it?", [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel appointment",
        style: "destructive",
        onPress: () => handleUpdateStatus("cancelled"),
      },
    ]);
  };

  const openDateModal = () => {
    setDraftDate(parseAppointmentDate(appointment?.requestedFor));
    setShowDatePicker(false);
    setShowTimePicker(false);
    setDateModalVisible(true);
  };

  const closeDateModal = () => {
    setDateModalVisible(false);
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const openDatePicker = () => {
    setShowTimePicker(false);
    setShowDatePicker(true);
  };

  const openTimePicker = () => {
    setShowDatePicker(false);
    setShowTimePicker(true);
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS !== "ios") {
      setShowDatePicker(false);
    }

    if (event?.type === "dismissed") return;
    if (!selectedDate) return;

    setDraftDate((current) => {
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

    if (event?.type === "dismissed") return;
    if (!selectedTime) return;

    setDraftDate((current) => {
      const next = new Date(current);
      next.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      return next;
    });
  };

  const handleSaveDate = async () => {
    if (!appointmentId || updating) return;

    const nextDate = new Date(draftDate);

    if (Number.isNaN(nextDate.getTime())) {
      Alert.alert("Appointment", "Choose a valid date and time.");
      return;
    }

    if (nextDate <= new Date()) {
      Alert.alert("Appointment", "Choose a future date and time.");
      return;
    }

    try {
      setUpdating(true);
      const nextDateValue = nextDate.toISOString();
      const updated = await updateAppointmentDate(
        appointmentId,
        nextDateValue
      );
      setAppointment((current) =>
        updated || (current ? { ...current, requestedFor: nextDateValue } : current)
      );
      closeDateModal();
      void loadAppointment(true);
    } catch (error) {
      Alert.alert("Appointment", error?.message || "Failed to change the date.");
    } finally {
      setUpdating(false);
    }
  };

  const handleStartChat = async () => {
    if (!currentUserId) {
      router.replace("/(auth)/login");
      return;
    }

    if (!otherPersonId) {
      Alert.alert("Appointment", "Unable to find the other user.");
      return;
    }

    if (startingChat) return;

    try {
      setStartingChat(true);

      const conversation = await startConversation({
        user1: currentUserId,
        user2: otherPersonId,
        petId: chatPetId,
      });

      const conversationId = getEntityId(conversation);
      if (!conversationId) {
        throw new Error("Conversation was not created");
      }

      router.push(`/messages/${conversationId}`);
    } catch (error) {
      Alert.alert(
        "Appointment",
        error?.message || "Failed to start conversation."
      );
    } finally {
      setStartingChat(false);
    }
  };

  if (!currentUserId) return null;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <AppTopBar title="Appointment" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      </SafeAreaView>
    );
  }

  if (!appointment) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <AppTopBar title="Appointment" />
        <View style={styles.center}>
          <ThemedText>Appointment not found.</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <AppTopBar title="Appointment" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAppointment(true)}
            tintColor={GREEN}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIcon}>
              <Ionicons name="calendar" size={24} color={GREEN} />
            </View>
            <StatusPill status={appointment?.status} />
          </View>

          <ThemedText style={styles.heroTitle}>
            {isProvider ? "Service request" : "Appointment request"}
          </ThemedText>
          <ThemedText style={styles.heroSubtitle}>
            With {getDisplayName(otherPerson)}
          </ThemedText>

          {appointment?.requestedFor ? (
            <View style={styles.scheduleBox}>
              <Ionicons name="time-outline" size={18} color={GREEN_DARK} />
              <ThemedText style={styles.scheduleText}>
                {formatDateTime(appointment.requestedFor)}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <ThemedText style={styles.sectionTitle}>People</ThemedText>

          <TouchableOpacity
            style={styles.personRow}
            activeOpacity={0.86}
            onPress={() => openProfile(appointment?.requester)}
          >
            <View style={styles.personIcon}>
              <Ionicons name="person-outline" size={18} color={GREEN_DARK} />
            </View>
            <View style={styles.personBody}>
              <ThemedText style={styles.personLabel}>Requester</ThemedText>
              <ThemedText style={styles.personName} numberOfLines={1}>
                {getDisplayName(appointment?.requester)}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#8D9992" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.personRow}
            activeOpacity={0.86}
            onPress={() => openProfile(appointment?.provider)}
          >
            <View style={styles.personIcon}>
              <Ionicons name="briefcase-outline" size={18} color={GREEN_DARK} />
            </View>
            <View style={styles.personBody}>
              <ThemedText style={styles.personLabel}>Service provider</ThemedText>
              <ThemedText style={styles.personName} numberOfLines={1}>
                {getDisplayName(appointment?.provider)}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#8D9992" />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <ThemedText style={styles.sectionTitle}>Animals</ThemedText>

          {selectedPets.length > 0 ? (
            selectedPets.map((pet, index) => (
              <TouchableOpacity
                key={String(getEntityId(pet) || index)}
                style={styles.petRow}
                activeOpacity={0.86}
                onPress={() => openPet(pet)}
              >
                <View style={styles.petIcon}>
                  <Ionicons name="paw-outline" size={18} color={GREEN_DARK} />
                </View>
                <View style={styles.petBody}>
                  <ThemedText style={styles.petName} numberOfLines={1}>
                    {pet?.name || "Unnamed pet"}
                  </ThemedText>
                  <ThemedText style={styles.petMeta} numberOfLines={1}>
                    {[pet?.type, pet?.breed].filter(Boolean).join(" - ") || "Pet"}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#8D9992" />
              </TouchableOpacity>
            ))
          ) : null}

          {appointment?.otherPet ? (
            <View style={styles.petRow}>
              <View style={styles.petIcon}>
                <Ionicons name="paw-outline" size={18} color={GREEN_DARK} />
              </View>
              <View style={styles.petBody}>
                <ThemedText style={styles.petName}>Other pet</ThemedText>
                <ThemedText style={styles.petMeta}>{appointment.otherPet}</ThemedText>
              </View>
            </View>
          ) : null}

          {selectedPets.length === 0 && !appointment?.otherPet ? (
            <ThemedText style={styles.emptyText}>No animals attached.</ThemedText>
          ) : null}
        </View>

        {appointment?.note ? (
          <View style={styles.sectionCard}>
            <ThemedText style={styles.sectionTitle}>Note</ThemedText>
            <ThemedText style={styles.noteText}>{appointment.note}</ThemedText>
          </View>
        ) : null}

        {canRespond ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              activeOpacity={0.88}
              disabled={updating}
              onPress={() => handleUpdateStatus("rejected")}
            >
              <ThemedText style={styles.rejectButtonText}>Decline</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              activeOpacity={0.88}
              disabled={updating}
              onPress={() => handleUpdateStatus("accepted")}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.acceptButtonText}>Accept</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {canChangeDate ? (
          <TouchableOpacity
            style={styles.rescheduleButton}
            activeOpacity={0.88}
            disabled={updating}
            onPress={openDateModal}
          >
            <Ionicons name="calendar-outline" size={17} color={GREEN_DARK} />
            <ThemedText style={styles.rescheduleButtonText}>
              Ask to edit date
            </ThemedText>
          </TouchableOpacity>
        ) : null}

        {otherPersonId ? (
          <TouchableOpacity
            style={[styles.chatButton, startingChat && styles.disabledButton]}
            activeOpacity={0.88}
            disabled={startingChat}
            onPress={handleStartChat}
          >
            {startingChat ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="chatbubble-ellipses-outline" size={17} color="#FFFFFF" />
                <ThemedText style={styles.chatButtonText}>Chat</ThemedText>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {canCancel ? (
          <TouchableOpacity
            style={styles.cancelButton}
            activeOpacity={0.88}
            disabled={updating}
            onPress={confirmCancel}
          >
            <Ionicons name="close-circle-outline" size={17} color="#B94141" />
            <ThemedText style={styles.cancelButtonText}>Cancel appointment</ThemedText>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <Modal
        visible={dateModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeDateModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dateModal}>
            <View style={styles.dateModalHeader}>
              <View>
                <ThemedText style={styles.dateModalTitle}>Edit date</ThemedText>
                <ThemedText style={styles.dateModalSubtitle}>
                  The other person will be notified about the new date.
                </ThemedText>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeDateModal}
                activeOpacity={0.82}
              >
                <Ionicons name="close" size={20} color="#59645D" />
              </TouchableOpacity>
            </View>

            <View style={styles.dateChoiceRow}>
              <TouchableOpacity
                style={styles.dateChoiceButton}
                activeOpacity={0.86}
                onPress={openDatePicker}
              >
                <Ionicons name="calendar-outline" size={18} color={GREEN_DARK} />
                <View style={styles.dateChoiceTextWrap}>
                  <ThemedText style={styles.dateChoiceLabel}>Date</ThemedText>
                  <ThemedText style={styles.dateChoiceValue}>
                    {formatDate(draftDate)}
                  </ThemedText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateChoiceButton}
                activeOpacity={0.86}
                onPress={openTimePicker}
              >
                <Ionicons name="time-outline" size={18} color={GREEN_DARK} />
                <View style={styles.dateChoiceTextWrap}>
                  <ThemedText style={styles.dateChoiceLabel}>Time</ThemedText>
                  <ThemedText style={styles.dateChoiceValue}>
                    {formatTime(draftDate)}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            </View>

            {showDatePicker ? (
              <DateTimePicker
                mode="date"
                value={draftDate}
                minimumDate={new Date()}
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={handleDateChange}
              />
            ) : null}

            {showTimePicker ? (
              <DateTimePicker
                mode="time"
                value={draftDate}
                display="default"
                onChange={handleTimeChange}
              />
            ) : null}

            <TouchableOpacity
              style={[styles.saveDateButton, updating && styles.disabledButton]}
              activeOpacity={0.88}
              disabled={updating}
              onPress={handleSaveDate}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.saveDateButtonText}>
                  Send date change
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F6F4",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
    gap: 12,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E1ECE5",
    backgroundColor: "#FFFFFF",
    padding: 15,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: "#EAF8EE",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    marginTop: 12,
    color: "#17201A",
    fontSize: 24,
    fontWeight: "900",
  },
  heroSubtitle: {
    marginTop: 4,
    color: "#53625A",
    fontSize: 14,
    fontWeight: "700",
  },
  scheduleBox: {
    marginTop: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D7EBDD",
    backgroundColor: "#F4FCF6",
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scheduleText: {
    flex: 1,
    color: GREEN_DARK,
    fontSize: 14,
    fontWeight: "900",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 140,
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: "900",
    textAlign: "center",
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E1ECE5",
    backgroundColor: "#FFFFFF",
    padding: 14,
  },
  sectionTitle: {
    color: "#17201A",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
  },
  personRow: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4ECE7",
    backgroundColor: "#FAFCFB",
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  personIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: "#EAF8EE",
    alignItems: "center",
    justifyContent: "center",
  },
  personBody: {
    flex: 1,
    minWidth: 0,
  },
  personLabel: {
    color: "#78857E",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  personName: {
    marginTop: 2,
    color: "#17201A",
    fontSize: 14.5,
    fontWeight: "900",
  },
  petRow: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4ECE7",
    backgroundColor: "#FAFCFB",
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  petIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: "#EAF8EE",
    alignItems: "center",
    justifyContent: "center",
  },
  petBody: {
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
    color: "#68746D",
    fontSize: 12.5,
    fontWeight: "700",
  },
  noteText: {
    color: "#4D5C54",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
  },
  emptyText: {
    color: "#748079",
    fontSize: 13.5,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 9,
  },
  actionButton: {
    flex: 1,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectButton: {
    backgroundColor: "#FFF2F2",
    borderWidth: 1,
    borderColor: "#F1CCCC",
  },
  rejectButtonText: {
    color: "#B94141",
    fontSize: 13.5,
    fontWeight: "900",
  },
  acceptButton: {
    backgroundColor: GREEN,
  },
  acceptButtonText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "900",
  },
  rescheduleButton: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "#CFE8D6",
    backgroundColor: "#F1FBF3",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  rescheduleButtonText: {
    color: GREEN_DARK,
    fontSize: 14,
    fontWeight: "900",
  },
  chatButton: {
    height: 48,
    borderRadius: 16,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  chatButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  cancelButton: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "#F0CCCC",
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  cancelButtonText: {
    color: "#B94141",
    fontSize: 14,
    fontWeight: "900",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 20, 0.34)",
    justifyContent: "flex-end",
  },
  dateModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  dateModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  dateModalTitle: {
    color: "#17201A",
    fontSize: 20,
    fontWeight: "900",
  },
  dateModalSubtitle: {
    marginTop: 3,
    color: "#748079",
    fontSize: 12.5,
    fontWeight: "700",
    lineHeight: 18,
  },
  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F2F5F3",
    alignItems: "center",
    justifyContent: "center",
  },
  dateChoiceRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
  },
  dateChoiceButton: {
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
  dateChoiceTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  dateChoiceLabel: {
    color: "#6C7A72",
    fontSize: 11,
    fontWeight: "800",
  },
  dateChoiceValue: {
    marginTop: 2,
    color: "#17201A",
    fontSize: 12.5,
    fontWeight: "900",
  },
  saveDateButton: {
    marginTop: 16,
    height: 50,
    borderRadius: 16,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  saveDateButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.72,
  },
});
