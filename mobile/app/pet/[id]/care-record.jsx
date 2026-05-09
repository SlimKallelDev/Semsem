import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import AppTopBar from "../../../components/AppTopBar";
import ThemedText from "../../../components/ThemedText";
import { useUser } from "../../../contexts/UserContext";
import {
  getPetById,
  getPetCareRecord,
  getPetCareRecordQr,
  updatePetCareRecord,
} from "../../../services/petService";

const GREEN = "#3DB85C";

const splitLines = (value) =>
  String(value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

const joinLines = (value) => (Array.isArray(value) ? value.join("\n") : "");

const buildInitialForm = () => ({
  petName: "",
  species: "",
  breed: "",
  gender: "",
  birthDateOrAge: "",
  weight: "",
  colorMarkings: "",
  microchipId: "",
  passportNumber: "",
  sterilized: "no",
  adoptionDate: "",
  ownerName: "",
  ownerPhone: "",
  ownerEmail: "",
  ownerAddress: "",
  ownerEmergencyContact: "",
  visitDate: "",
  veterinarianName: "",
  clinic: "",
  reason: "",
  diagnosis: "",
  notes: "",
  allergies: "",
  chronicDiseases: "",
  previousSurgeries: "",
  specialConditions: "",
  medicationName: "",
  medicationDosage: "",
  medicationFrequency: "",
  medicationStartDate: "",
  medicationEndDate: "",
  vaccineName: "",
  vaccineDateAdministered: "",
  vaccineNextDoseDate: "",
  vaccineVeterinarian: "",
  vaccineBatchNumber: "",
});

const mapRecordToForm = (record = {}, pet = null) => {
  const identity = record?.identityProfile || {};
  const owner = identity?.ownerInfo || {};
  const medical = record?.medicalHistory || {};
  const firstVisit = Array.isArray(medical?.veterinaryVisits)
    ? medical.veterinaryVisits[0] || {}
    : {};
  const illness = medical?.illnessesConditions || {};
  const firstMedication = Array.isArray(medical?.medications)
    ? medical.medications[0] || {}
    : {};
  const firstVaccine = Array.isArray(record?.vaccinations)
    ? record.vaccinations[0] || {}
    : {};

  return {
    petName: identity?.petName || pet?.name || "",
    species: identity?.species || pet?.type || "",
    breed: identity?.breed || pet?.breed || "",
    gender: identity?.gender || "",
    birthDateOrAge: identity?.birthDateOrAge || "",
    weight: identity?.weight || "",
    colorMarkings: identity?.colorMarkings || "",
    microchipId: identity?.microchipId || "",
    passportNumber: identity?.passportNumber || "",
    sterilized: identity?.sterilized ? "yes" : "no",
    adoptionDate: identity?.adoptionDate || "",
    ownerName: owner?.name || pet?.owner?.name || "",
    ownerPhone: owner?.phone || "",
    ownerEmail: owner?.email || pet?.owner?.email || "",
    ownerAddress: owner?.address || "",
    ownerEmergencyContact: owner?.emergencyContact || "",
    visitDate: firstVisit?.visitDate || "",
    veterinarianName: firstVisit?.veterinarianName || "",
    clinic: firstVisit?.clinic || "",
    reason: firstVisit?.reason || "",
    diagnosis: firstVisit?.diagnosis || "",
    notes: firstVisit?.notes || "",
    allergies: joinLines(illness?.allergies),
    chronicDiseases: joinLines(illness?.chronicDiseases),
    previousSurgeries: joinLines(illness?.previousSurgeries),
    specialConditions: joinLines(illness?.specialConditions),
    medicationName: firstMedication?.name || "",
    medicationDosage: firstMedication?.dosage || "",
    medicationFrequency: firstMedication?.frequency || "",
    medicationStartDate: firstMedication?.startDate || "",
    medicationEndDate: firstMedication?.endDate || "",
    vaccineName: firstVaccine?.vaccineName || "",
    vaccineDateAdministered: firstVaccine?.dateAdministered || "",
    vaccineNextDoseDate: firstVaccine?.nextDoseDate || "",
    vaccineVeterinarian: firstVaccine?.veterinarian || "",
    vaccineBatchNumber: firstVaccine?.batchNumber || "",
  };
};

const mapFormToPayload = (form = {}) => ({
  identityProfile: {
    petName: form.petName,
    species: form.species,
    breed: form.breed,
    gender: form.gender,
    birthDateOrAge: form.birthDateOrAge,
    weight: form.weight,
    colorMarkings: form.colorMarkings,
    microchipId: form.microchipId,
    passportNumber: form.passportNumber,
    sterilized: form.sterilized === "yes",
    adoptionDate: form.adoptionDate,
    ownerInfo: {
      name: form.ownerName,
      phone: form.ownerPhone,
      email: form.ownerEmail,
      address: form.ownerAddress,
      emergencyContact: form.ownerEmergencyContact,
    },
  },
  medicalHistory: {
    veterinaryVisits: [
      {
        visitDate: form.visitDate,
        veterinarianName: form.veterinarianName,
        clinic: form.clinic,
        reason: form.reason,
        diagnosis: form.diagnosis,
        notes: form.notes,
      },
    ],
    illnessesConditions: {
      allergies: splitLines(form.allergies),
      chronicDiseases: splitLines(form.chronicDiseases),
      previousSurgeries: splitLines(form.previousSurgeries),
      specialConditions: splitLines(form.specialConditions),
    },
    medications: [
      {
        name: form.medicationName,
        dosage: form.medicationDosage,
        frequency: form.medicationFrequency,
        startDate: form.medicationStartDate,
        endDate: form.medicationEndDate,
      },
    ],
  },
  vaccinations: [
    {
      vaccineName: form.vaccineName,
      dateAdministered: form.vaccineDateAdministered,
      nextDoseDate: form.vaccineNextDoseDate,
      veterinarian: form.vaccineVeterinarian,
      batchNumber: form.vaccineBatchNumber,
    },
  ],
});

function Field({ label, value, onChangeText, placeholder, multiline = false }) {
  return (
    <View style={styles.fieldWrap}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9AA8A0"
        style={[styles.input, multiline && styles.multilineInput]}
        multiline={multiline}
      />
    </View>
  );
}

export default function PetCareRecordScreen() {
  const { id } = useLocalSearchParams();
  const petId = Array.isArray(id) ? id[0] : id;
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [pet, setPet] = useState(null);
  const [form, setForm] = useState(buildInitialForm());
  const [scanUrl, setScanUrl] = useState("");
  const [qrImageUrl, setQrImageUrl] = useState("");

  const isOwner = useMemo(() => {
    const currentUserId = user?._id || user?.id || user?.$id || null;
    const ownerId = pet?.owner?._id || pet?.owner?.id || pet?.owner || null;
    if (!currentUserId || !ownerId) return false;
    return String(currentUserId) === String(ownerId);
  }, [pet, user]);

  const updateField = (key, value) =>
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

  useEffect(() => {
    if (!petId) return;

    const loadAll = async () => {
      try {
        setLoading(true);
        const [petData, recordData] = await Promise.all([
          getPetById(petId),
          getPetCareRecord(petId),
        ]);
        setPet(petData);
        setForm(mapRecordToForm(recordData?.careRecord || {}, petData));
      } catch (error) {
        console.log("Care record load error:", error?.message);
        Alert.alert("Error", "Failed to load pet care record.");
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [petId]);

  const handleSave = async () => {
    try {
      if (!isOwner) {
        Alert.alert("Forbidden", "Only the pet owner can update this care record.");
        return;
      }
      setSaving(true);
      await updatePetCareRecord(petId, mapFormToPayload(form));
      Alert.alert("Saved", "Care record updated successfully.");
    } catch (error) {
      Alert.alert("Error", error?.response?.data?.message || "Failed to save care record.");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateQr = async () => {
    try {
      setGeneratingQr(true);
      await updatePetCareRecord(petId, mapFormToPayload(form));
      const data = await getPetCareRecordQr(petId);
      const url = String(data?.scanUrl || "");
      if (!url) {
        throw new Error("QR URL is missing");
      }

      const imageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
        url
      )}`;

      setScanUrl(url);
      setQrImageUrl(imageUrl);
    } catch (error) {
      Alert.alert(
        "QR generation failed",
        error?.response?.data?.message || error?.message || "Could not generate QR."
      );
    } finally {
      setGeneratingQr(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <AppTopBar title="Pet Care Record" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <AppTopBar title="Pet Care Record (MVP)" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>1. Pet Identity Profile</ThemedText>
          <Field label="Pet name" value={form.petName} onChangeText={(v) => updateField("petName", v)} />
          <Field label="Species" value={form.species} onChangeText={(v) => updateField("species", v)} />
          <Field label="Breed" value={form.breed} onChangeText={(v) => updateField("breed", v)} />
          <Field label="Gender" value={form.gender} onChangeText={(v) => updateField("gender", v)} />
          <Field label="Date of birth / age" value={form.birthDateOrAge} onChangeText={(v) => updateField("birthDateOrAge", v)} />
          <Field label="Weight" value={form.weight} onChangeText={(v) => updateField("weight", v)} />
          <Field label="Color/markings" value={form.colorMarkings} onChangeText={(v) => updateField("colorMarkings", v)} />
          <Field label="Microchip ID" value={form.microchipId} onChangeText={(v) => updateField("microchipId", v)} />
          <Field label="Passport number" value={form.passportNumber} onChangeText={(v) => updateField("passportNumber", v)} />
          <Field label="Sterilized (yes/no)" value={form.sterilized} onChangeText={(v) => updateField("sterilized", v)} />
          <Field label="Adoption date" value={form.adoptionDate} onChangeText={(v) => updateField("adoptionDate", v)} />
          <Field label="Owner name" value={form.ownerName} onChangeText={(v) => updateField("ownerName", v)} />
          <Field label="Owner phone" value={form.ownerPhone} onChangeText={(v) => updateField("ownerPhone", v)} />
          <Field label="Owner email" value={form.ownerEmail} onChangeText={(v) => updateField("ownerEmail", v)} />
          <Field label="Owner address" value={form.ownerAddress} onChangeText={(v) => updateField("ownerAddress", v)} />
          <Field label="Emergency contact" value={form.ownerEmergencyContact} onChangeText={(v) => updateField("ownerEmergencyContact", v)} />
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>2. Medical History</ThemedText>
          <Field label="Visit date" value={form.visitDate} onChangeText={(v) => updateField("visitDate", v)} />
          <Field label="Veterinarian name" value={form.veterinarianName} onChangeText={(v) => updateField("veterinarianName", v)} />
          <Field label="Clinic" value={form.clinic} onChangeText={(v) => updateField("clinic", v)} />
          <Field label="Reason for visit" value={form.reason} onChangeText={(v) => updateField("reason", v)} multiline />
          <Field label="Diagnosis" value={form.diagnosis} onChangeText={(v) => updateField("diagnosis", v)} multiline />
          <Field label="Notes" value={form.notes} onChangeText={(v) => updateField("notes", v)} multiline />
          <Field label="Allergies (one per line)" value={form.allergies} onChangeText={(v) => updateField("allergies", v)} multiline />
          <Field label="Chronic diseases (one per line)" value={form.chronicDiseases} onChangeText={(v) => updateField("chronicDiseases", v)} multiline />
          <Field label="Previous surgeries (one per line)" value={form.previousSurgeries} onChangeText={(v) => updateField("previousSurgeries", v)} multiline />
          <Field label="Special conditions (one per line)" value={form.specialConditions} onChangeText={(v) => updateField("specialConditions", v)} multiline />
          <Field label="Medication name" value={form.medicationName} onChangeText={(v) => updateField("medicationName", v)} />
          <Field label="Medication dosage" value={form.medicationDosage} onChangeText={(v) => updateField("medicationDosage", v)} />
          <Field label="Medication frequency" value={form.medicationFrequency} onChangeText={(v) => updateField("medicationFrequency", v)} />
          <Field label="Medication start date" value={form.medicationStartDate} onChangeText={(v) => updateField("medicationStartDate", v)} />
          <Field label="Medication end date" value={form.medicationEndDate} onChangeText={(v) => updateField("medicationEndDate", v)} />
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>3. Vaccination Record</ThemedText>
          <Field label="Vaccine name" value={form.vaccineName} onChangeText={(v) => updateField("vaccineName", v)} />
          <Field label="Date administered" value={form.vaccineDateAdministered} onChangeText={(v) => updateField("vaccineDateAdministered", v)} />
          <Field label="Next dose date" value={form.vaccineNextDoseDate} onChangeText={(v) => updateField("vaccineNextDoseDate", v)} />
          <Field label="Veterinarian" value={form.vaccineVeterinarian} onChangeText={(v) => updateField("vaccineVeterinarian", v)} />
          <Field label="Batch/serial number" value={form.vaccineBatchNumber} onChangeText={(v) => updateField("vaccineBatchNumber", v)} />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.disabledButton]}
          disabled={saving}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <ThemedText style={styles.primaryButtonText}>
            {saving ? "Saving..." : "Save Care Record"}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, generatingQr && styles.disabledButton]}
          disabled={generatingQr}
          onPress={handleGenerateQr}
          activeOpacity={0.85}
        >
          <ThemedText style={styles.secondaryButtonText}>
            {generatingQr ? "Generating QR..." : "Generate Full-Data QR"}
          </ThemedText>
        </TouchableOpacity>

        {!!qrImageUrl && (
          <View style={styles.qrCard}>
            <ThemedText style={styles.qrTitle}>QR preview</ThemedText>
            <Image source={{ uri: qrImageUrl }} style={styles.qrImage} />
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => scanUrl && Linking.openURL(scanUrl)}
            >
              <ThemedText style={styles.linkText}>Open veterinarian view page</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4F6F4" },
  container: { padding: 16, paddingBottom: 40, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E3EAE5",
    padding: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E2B24",
    marginBottom: 8,
  },
  fieldWrap: { marginBottom: 10 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#304038", marginBottom: 5 },
  input: {
    backgroundColor: "#F7F9F8",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2DB",
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: "#152019",
  },
  multilineInput: { minHeight: 72, textAlignVertical: "top" },
  primaryButton: {
    backgroundColor: GREEN,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  secondaryButtonText: { color: GREEN, fontWeight: "800", fontSize: 15 },
  disabledButton: { opacity: 0.65 },
  qrCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E3EAE5",
    padding: 12,
    alignItems: "center",
    gap: 10,
  },
  qrTitle: { fontSize: 16, fontWeight: "800", color: "#233028" },
  qrImage: { width: 280, height: 280, borderRadius: 8, backgroundColor: "#F0F3F1" },
  linkButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#EEF8F1",
  },
  linkText: { color: "#2A7C41", fontWeight: "700" },
});
