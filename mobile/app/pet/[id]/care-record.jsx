import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppTopBar from "../../../components/AppTopBar";
import ThemedText from "../../../components/ThemedText";
import { isVeterinarianProfileType } from "../../../constants/profileTypes";
import { useUser } from "../../../contexts/UserContext";
import {
  getPetById,
  getPetCareRecord,
  updatePetCareRecord,
} from "../../../services/petService";

const GREEN = "#3DB85C";
const EDIT_FORBIDDEN_TITLE = "Forbidden";
const EDIT_FORBIDDEN_MESSAGE =
  "Only the pet owner or a veterinarian can update this health record.";
const WEIGHT_TRACKING_TYPE = "Weight tracking";
const INTERVENTION_TYPES = [
  "General check",
  "Vaccination",
  "Surgery",
  "Emergency",
  "Follow-up",
];
const CONDITION_OPTIONS = [
  { value: "allergies", label: "Allergy" },
  { value: "chronicDiseases", label: "Chronic disease" },
  { value: "previousSurgeries", label: "Previous surgery" },
  { value: "specialConditions", label: "Special condition" },
];

const todayLabel = () => new Date().toISOString().slice(0, 10);
const normalizeArray = (value) => (Array.isArray(value) ? value : []);

const getEntityId = (value) => {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  return value?._id || value?.id || value?.$id || null;
};

const getDisplayName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
  user?.name ||
  user?.fullName ||
  user?.email ||
  "";

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const normalizeRecord = (record = {}, pet = null) => {
  const identity = record?.identityProfile || {};
  const ownerInfo = identity?.ownerInfo || {};
  const medical = record?.medicalHistory || {};
  const illnesses = medical?.illnessesConditions || {};

  return {
    identityProfile: {
      petName: identity?.petName || pet?.name || "",
      photo: identity?.photo || pet?.image || "",
      species: identity?.species || pet?.type || "",
      breed: identity?.breed || pet?.breed || "",
      gender: identity?.gender || "",
      birthDateOrAge: identity?.birthDateOrAge || "",
      weight: identity?.weight || "",
      colorMarkings: identity?.colorMarkings || "",
      microchipId: identity?.microchipId || "",
      passportNumber: identity?.passportNumber || "",
      sterilized: Boolean(identity?.sterilized),
      adoptionDate: identity?.adoptionDate || "",
      ownerInfo: {
        name: ownerInfo?.name || pet?.owner?.name || "",
        phone: ownerInfo?.phone || pet?.owner?.phone || "",
        email: ownerInfo?.email || pet?.owner?.email || "",
        address: ownerInfo?.address || "",
        emergencyContact: ownerInfo?.emergencyContact || "",
      },
    },
    medicalHistory: {
      veterinaryVisits: normalizeArray(medical?.veterinaryVisits),
      illnessesConditions: {
        allergies: normalizeArray(illnesses?.allergies),
        chronicDiseases: normalizeArray(illnesses?.chronicDiseases),
        previousSurgeries: normalizeArray(illnesses?.previousSurgeries),
        disabilities: normalizeArray(illnesses?.disabilities),
        specialConditions: normalizeArray(illnesses?.specialConditions),
      },
      medications: normalizeArray(medical?.medications),
    },
    vaccinations: normalizeArray(record?.vaccinations),
    updatedAt: record?.updatedAt,
  };
};

const splitRecordText = (value) =>
  String(value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

const buildIdentityForm = (record = {}, pet = null) => {
  const identity = normalizeRecord(record, pet).identityProfile;

  return {
    petName: identity.petName,
    species: identity.species,
    breed: identity.breed,
    gender: identity.gender,
    birthDateOrAge: identity.birthDateOrAge,
    weight: identity.weight,
    colorMarkings: identity.colorMarkings,
    microchipId: identity.microchipId,
    passportNumber: identity.passportNumber,
    sterilized: identity.sterilized ? "yes" : "no",
    adoptionDate: identity.adoptionDate,
  };
};

const buildOwnerForm = (record = {}, pet = null) => {
  const owner = normalizeRecord(record, pet).identityProfile.ownerInfo || {};

  return {
    name: owner.name || "",
    phone: owner.phone || "",
    email: owner.email || "",
    address: owner.address || "",
    emergencyContact: owner.emergencyContact || "",
  };
};

const buildVaccineForm = (user = null) => ({
  vaccineName: "",
  dateAdministered: todayLabel(),
  nextDoseDate: "",
  veterinarian: isVeterinarianProfileType(user?.profileType)
    ? getDisplayName(user)
    : "",
  batchNumber: "",
});

const buildMedicalForm = () => ({
  category: "allergies",
  details: "",
});

const buildMedicationForm = () => ({
  name: "",
  dosage: "",
  frequency: "",
  startDate: todayLabel(),
  endDate: "",
});

const buildVisitForm = (user = null) => ({
  visitDate: todayLabel(),
  veterinarianName: isVeterinarianProfileType(user?.profileType)
    ? getDisplayName(user)
    : "",
  clinic: "",
  interventionType: "General check",
  reason: "",
  diagnosis: "",
  medicinesNeeded: "no",
  medicinesNotes: "",
  surgicalIntervention: "no",
  notes: "",
});

const buildWeightForm = () => ({
  visitDate: todayLabel(),
  weight: "",
  notes: "",
});

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  multiline = false,
}) {
  return (
    <View style={styles.fieldWrap}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9AA8A0"
        editable={editable}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.multilineInput,
          !editable && styles.inputDisabled,
        ]}
      />
    </View>
  );
}

function Segment({ options, value, onChange, disabled = false }) {
  return (
    <View style={styles.segmentRow}>
      {options.map((option) => {
        const optionValue = typeof option === "string" ? option : option.value;
        const label = typeof option === "string" ? option : option.label;
        const active = value === optionValue;

        return (
          <TouchableOpacity
            key={optionValue}
            style={[
              styles.segmentButton,
              active && styles.segmentButtonActive,
              disabled && styles.segmentButtonDisabled,
            ]}
            activeOpacity={0.86}
            disabled={disabled}
            onPress={() => onChange(optionValue)}
          >
            <ThemedText
              style={[
                styles.segmentText,
                active && styles.segmentTextActive,
                disabled && styles.segmentTextDisabled,
              ]}
            >
              {label}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SectionCard({
  children,
  count,
  form,
  icon,
  onAdd,
  subtitle,
  title,
  canEdit,
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={20} color={GREEN} />
        </View>
        <View style={styles.sectionHeaderCopy}>
          <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
          <ThemedText style={styles.sectionSubtitle}>{subtitle}</ThemedText>
        </View>
        <View style={styles.countPill}>
          <ThemedText style={styles.countText}>{count}</ThemedText>
        </View>
        {canEdit ? (
          <TouchableOpacity
            style={styles.plusButton}
            activeOpacity={0.86}
            onPress={onAdd}
          >
            <Ionicons name="add" size={19} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}
      </View>

      {children}
      {form}
    </View>
  );
}

function RecordRow({ badge, detail, icon = "document-text-outline", meta, title }) {
  return (
    <View style={styles.recordRow}>
      <View style={styles.recordIcon}>
        <Ionicons name={icon} size={19} color={GREEN} />
      </View>
      <View style={styles.recordBody}>
        <View style={styles.recordTop}>
          <ThemedText style={styles.recordTitle} numberOfLines={1}>
            {title}
          </ThemedText>
          {badge ? (
            <View style={styles.recordBadge}>
              <ThemedText style={styles.recordBadgeText}>{badge}</ThemedText>
            </View>
          ) : null}
        </View>
        {meta ? <ThemedText style={styles.recordMeta}>{meta}</ThemedText> : null}
        {detail ? (
          <ThemedText style={styles.recordDetail} numberOfLines={3}>
            {detail}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

function EmptyRows({ text }) {
  return (
    <View style={styles.emptyBox}>
      <Ionicons name="document-text-outline" size={20} color="#7D8A83" />
      <ThemedText style={styles.emptyText}>{text}</ThemedText>
    </View>
  );
}

export default function PetCareRecordScreen() {
  const { id } = useLocalSearchParams();
  const petId = Array.isArray(id) ? id[0] : id;
  const { user } = useUser();

  const [activeForm, setActiveForm] = useState(null);
  const [identityForm, setIdentityForm] = useState(buildIdentityForm());
  const [ownerForm, setOwnerForm] = useState(buildOwnerForm());
  const [vaccineForm, setVaccineForm] = useState(() => buildVaccineForm(user));
  const [medicalForm, setMedicalForm] = useState(buildMedicalForm());
  const [medicationForm, setMedicationForm] = useState(buildMedicationForm());
  const [visitForm, setVisitForm] = useState(() => buildVisitForm(user));
  const [weightForm, setWeightForm] = useState(buildWeightForm());
  const [loading, setLoading] = useState(true);
  const [pet, setPet] = useState(null);
  const [record, setRecord] = useState(normalizeRecord());
  const [saving, setSaving] = useState(false);

  const currentUserId = getEntityId(user);
  const ownerId = getEntityId(pet?.owner);
  const isOwner = Boolean(
    currentUserId && ownerId && String(currentUserId) === String(ownerId)
  );
  const isVeterinarian = isVeterinarianProfileType(user?.profileType);
  const canEdit = isOwner || isVeterinarian;

  const identity = record.identityProfile || {};
  const ownerInfo = identity.ownerInfo || {};
  const illnesses = record.medicalHistory?.illnessesConditions || {};
  const medications = normalizeArray(record.medicalHistory?.medications);
  const vaccinations = normalizeArray(record.vaccinations);
  const allVisits = normalizeArray(record.medicalHistory?.veterinaryVisits);
  const weightRecords = allVisits.filter(
    (visit) => visit?.interventionType === WEIGHT_TRACKING_TYPE
  );
  const veterinaryVisits = allVisits.filter(
    (visit) => visit?.interventionType !== WEIGHT_TRACKING_TYPE
  );
  const medicalRows = useMemo(
    () =>
      CONDITION_OPTIONS.flatMap((option) =>
        normalizeArray(illnesses?.[option.value]).map((item, index) => ({
          id: `${option.value}-${index}`,
          label: option.label,
          value: item,
        }))
      ),
    [illnesses]
  );

  useEffect(() => {
    if (!petId) return;

    const loadAll = async () => {
      try {
        setLoading(true);
        const [petData, recordData] = await Promise.all([
          getPetById(petId),
          getPetCareRecord(petId),
        ]);
        const normalized = normalizeRecord(recordData?.careRecord || {}, petData);

        setPet(petData);
        setRecord(normalized);
        setIdentityForm(buildIdentityForm(normalized, petData));
        setOwnerForm(buildOwnerForm(normalized, petData));
      } catch (error) {
        console.log("Health record load error:", error?.message || error);
        Alert.alert("Error", "Failed to load pet health record.");
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [petId]);

  useEffect(() => {
    if (!canEdit && activeForm) {
      setActiveForm(null);
    }
  }, [activeForm, canEdit]);

  const updateIdentityForm = (key, value) =>
    setIdentityForm((current) => ({ ...current, [key]: value }));
  const updateOwnerForm = (key, value) =>
    setOwnerForm((current) => ({ ...current, [key]: value }));
  const updateVaccineForm = (key, value) =>
    setVaccineForm((current) => ({ ...current, [key]: value }));
  const updateMedicalForm = (key, value) =>
    setMedicalForm((current) => ({ ...current, [key]: value }));
  const updateMedicationForm = (key, value) =>
    setMedicationForm((current) => ({ ...current, [key]: value }));
  const updateVisitForm = (key, value) =>
    setVisitForm((current) => ({ ...current, [key]: value }));
  const updateWeightForm = (key, value) =>
    setWeightForm((current) => ({ ...current, [key]: value }));

  const showForm = (section) => {
    if (!canEdit) {
      Alert.alert(EDIT_FORBIDDEN_TITLE, EDIT_FORBIDDEN_MESSAGE);
      return;
    }

    setActiveForm((current) => (current === section ? null : section));
  };

  const saveRecordPayload = async (payload, successMessage) => {
    if (!canEdit) {
      Alert.alert(EDIT_FORBIDDEN_TITLE, EDIT_FORBIDDEN_MESSAGE);
      return null;
    }

    try {
      setSaving(true);
      const response = await updatePetCareRecord(petId, payload);
      const nextRecord = normalizeRecord(response?.careRecord || payload, pet);
      setRecord(nextRecord);
      setIdentityForm(buildIdentityForm(nextRecord, pet));
      setOwnerForm(buildOwnerForm(nextRecord, pet));
      setActiveForm(null);

      if (successMessage) {
        Alert.alert("Saved", successMessage);
      }

      return nextRecord;
    } catch (error) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to save health record."
      );
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveIdentity = async () => {
    const normalized = normalizeRecord(record, pet);
    const payload = {
      ...normalized,
      identityProfile: {
        ...normalized.identityProfile,
        petName: identityForm.petName.trim(),
        species: identityForm.species.trim(),
        breed: identityForm.breed.trim(),
        gender: identityForm.gender.trim(),
        birthDateOrAge: identityForm.birthDateOrAge.trim(),
        weight: identityForm.weight.trim(),
        colorMarkings: identityForm.colorMarkings.trim(),
        microchipId: identityForm.microchipId.trim(),
        passportNumber: identityForm.passportNumber.trim(),
        sterilized: identityForm.sterilized === "yes",
        adoptionDate: identityForm.adoptionDate.trim(),
      },
    };

    await saveRecordPayload(payload, "Pet identity updated.");
  };

  const handleSaveOwner = async () => {
    const normalized = normalizeRecord(record, pet);
    const payload = {
      ...normalized,
      identityProfile: {
        ...normalized.identityProfile,
        ownerInfo: {
          name: ownerForm.name.trim(),
          phone: ownerForm.phone.trim(),
          email: ownerForm.email.trim(),
          address: ownerForm.address.trim(),
          emergencyContact: ownerForm.emergencyContact.trim(),
        },
      },
    };

    await saveRecordPayload(payload, "Owner information updated.");
  };

  const handleAddVaccine = async () => {
    if (!vaccineForm.vaccineName.trim()) {
      Alert.alert("Vaccination", "Vaccine name is required.");
      return;
    }

    const normalized = normalizeRecord(record, pet);
    const payload = {
      ...normalized,
      vaccinations: [
        {
          vaccineName: vaccineForm.vaccineName.trim(),
          dateAdministered: vaccineForm.dateAdministered.trim(),
          nextDoseDate: vaccineForm.nextDoseDate.trim(),
          veterinarian: vaccineForm.veterinarian.trim(),
          batchNumber: vaccineForm.batchNumber.trim(),
        },
        ...normalizeArray(normalized.vaccinations),
      ],
    };

    const saved = await saveRecordPayload(payload, "Vaccination record added.");
    if (saved) setVaccineForm(buildVaccineForm(user));
  };

  const handleAddMedicalHistory = async () => {
    const items = splitRecordText(medicalForm.details);

    if (!items.length) {
      Alert.alert("Medical history", "Add at least one detail.");
      return;
    }

    const normalized = normalizeRecord(record, pet);
    const currentList = normalizeArray(
      normalized.medicalHistory.illnessesConditions?.[medicalForm.category]
    );
    const payload = {
      ...normalized,
      medicalHistory: {
        ...normalized.medicalHistory,
        illnessesConditions: {
          ...normalized.medicalHistory.illnessesConditions,
          [medicalForm.category]: [...items, ...currentList],
        },
      },
    };

    const saved = await saveRecordPayload(payload, "Medical history record added.");
    if (saved) setMedicalForm(buildMedicalForm());
  };

  const handleAddMedication = async () => {
    if (!medicationForm.name.trim()) {
      Alert.alert("Medication", "Medication name is required.");
      return;
    }

    const normalized = normalizeRecord(record, pet);
    const payload = {
      ...normalized,
      medicalHistory: {
        ...normalized.medicalHistory,
        medications: [
          {
            name: medicationForm.name.trim(),
            dosage: medicationForm.dosage.trim(),
            frequency: medicationForm.frequency.trim(),
            startDate: medicationForm.startDate.trim(),
            endDate: medicationForm.endDate.trim(),
          },
          ...normalizeArray(normalized.medicalHistory.medications),
        ],
      },
    };

    const saved = await saveRecordPayload(payload, "Medication record added.");
    if (saved) setMedicationForm(buildMedicationForm());
  };

  const handleAddVisit = async () => {
    const hasDetail = [
      visitForm.reason,
      visitForm.diagnosis,
      visitForm.medicinesNotes,
      visitForm.notes,
    ].some((value) => value.trim());

    if (!hasDetail) {
      Alert.alert(
        "Veterinary visit",
        "Add at least a reason, diagnosis, medicine, or note."
      );
      return;
    }

    const normalized = normalizeRecord(record, pet);
    const payload = {
      ...normalized,
      medicalHistory: {
        ...normalized.medicalHistory,
        veterinaryVisits: [
          {
            visitDate: visitForm.visitDate.trim(),
            veterinarianName: visitForm.veterinarianName.trim(),
            clinic: visitForm.clinic.trim(),
            interventionType: visitForm.interventionType,
            reason: visitForm.reason.trim(),
            diagnosis: visitForm.diagnosis.trim(),
            medicinesNeeded: visitForm.medicinesNeeded === "yes",
            medicinesNotes: visitForm.medicinesNotes.trim(),
            surgicalIntervention:
              visitForm.surgicalIntervention === "yes" ||
              visitForm.interventionType === "Surgery",
            notes: visitForm.notes.trim(),
            recordedByRole: isVeterinarian ? "Veterinarian" : "Owner",
            recordedByName: getDisplayName(user),
          },
          ...normalizeArray(normalized.medicalHistory.veterinaryVisits),
        ],
      },
    };

    const saved = await saveRecordPayload(payload, "Veterinary visit added.");
    if (saved) setVisitForm(buildVisitForm(user));
  };

  const handleAddWeight = async () => {
    if (!weightForm.weight.trim()) {
      Alert.alert("Weight tracking", "Weight is required.");
      return;
    }

    const normalized = normalizeRecord(record, pet);
    const payload = {
      ...normalized,
      identityProfile: {
        ...normalized.identityProfile,
        weight: weightForm.weight.trim(),
      },
      medicalHistory: {
        ...normalized.medicalHistory,
        veterinaryVisits: [
          {
            visitDate: weightForm.visitDate.trim(),
            veterinarianName: isVeterinarian ? getDisplayName(user) : "",
            clinic: "",
            interventionType: WEIGHT_TRACKING_TYPE,
            reason: "Weight and growth tracking",
            diagnosis: weightForm.weight.trim(),
            medicinesNeeded: false,
            medicinesNotes: "",
            surgicalIntervention: false,
            notes: weightForm.notes.trim(),
            recordedByRole: isVeterinarian ? "Veterinarian" : "Owner",
            recordedByName: getDisplayName(user),
          },
          ...normalizeArray(normalized.medicalHistory.veterinaryVisits),
        ],
      },
    };

    const saved = await saveRecordPayload(payload, "Weight record added.");
    if (saved) setWeightForm(buildWeightForm());
  };

  const renderIdentityForm = () => {
    if (!canEdit || activeForm !== "identity") return null;

    return (
      <View style={styles.formBox}>
        <Field
          label="Pet name"
          value={identityForm.petName}
          onChangeText={(value) => updateIdentityForm("petName", value)}
        />
        <Field
          label="Species"
          value={identityForm.species}
          onChangeText={(value) => updateIdentityForm("species", value)}
        />
        <Field
          label="Breed"
          value={identityForm.breed}
          onChangeText={(value) => updateIdentityForm("breed", value)}
        />
        <Field
          label="Gender"
          value={identityForm.gender}
          onChangeText={(value) => updateIdentityForm("gender", value)}
        />
        <Field
          label="Birth date / age"
          value={identityForm.birthDateOrAge}
          onChangeText={(value) => updateIdentityForm("birthDateOrAge", value)}
          placeholder="YYYY-MM-DD or age"
        />
        <Field
          label="Weight"
          value={identityForm.weight}
          onChangeText={(value) => updateIdentityForm("weight", value)}
          placeholder="For example 8 kg"
        />
        <Field
          label="Color / markings"
          value={identityForm.colorMarkings}
          onChangeText={(value) => updateIdentityForm("colorMarkings", value)}
        />
        <Field
          label="Microchip ID"
          value={identityForm.microchipId}
          onChangeText={(value) => updateIdentityForm("microchipId", value)}
        />
        <Field
          label="Passport number"
          value={identityForm.passportNumber}
          onChangeText={(value) => updateIdentityForm("passportNumber", value)}
        />
        <ThemedText style={styles.fieldLabel}>Sterilized</ThemedText>
        <Segment
          value={identityForm.sterilized}
          onChange={(value) => updateIdentityForm("sterilized", value)}
          options={[
            { label: "No", value: "no" },
            { label: "Yes", value: "yes" },
          ]}
        />
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.disabledButton]}
          onPress={handleSaveIdentity}
          disabled={saving}
        >
          <ThemedText style={styles.saveButtonText}>
            {saving ? "Saving..." : "Save pet identity"}
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  };

  const renderOwnerForm = () => {
    if (!canEdit || activeForm !== "owner") return null;

    return (
      <View style={styles.formBox}>
        <Field
          label="Owner name"
          value={ownerForm.name}
          onChangeText={(value) => updateOwnerForm("name", value)}
        />
        <Field
          label="Phone"
          value={ownerForm.phone}
          onChangeText={(value) => updateOwnerForm("phone", value)}
        />
        <Field
          label="Email"
          value={ownerForm.email}
          onChangeText={(value) => updateOwnerForm("email", value)}
        />
        <Field
          label="Address"
          value={ownerForm.address}
          onChangeText={(value) => updateOwnerForm("address", value)}
          multiline
        />
        <Field
          label="Emergency contact"
          value={ownerForm.emergencyContact}
          onChangeText={(value) => updateOwnerForm("emergencyContact", value)}
        />
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.disabledButton]}
          onPress={handleSaveOwner}
          disabled={saving}
        >
          <ThemedText style={styles.saveButtonText}>
            {saving ? "Saving..." : "Save owner info"}
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  };

  const renderVaccineForm = () => {
    if (!canEdit || activeForm !== "vaccination") return null;

    return (
      <View style={styles.formBox}>
        <Field
          label="Vaccine name"
          value={vaccineForm.vaccineName}
          onChangeText={(value) => updateVaccineForm("vaccineName", value)}
        />
        <Field
          label="Date administered"
          value={vaccineForm.dateAdministered}
          onChangeText={(value) => updateVaccineForm("dateAdministered", value)}
          placeholder="YYYY-MM-DD"
        />
        <Field
          label="Next dose"
          value={vaccineForm.nextDoseDate}
          onChangeText={(value) => updateVaccineForm("nextDoseDate", value)}
          placeholder="YYYY-MM-DD"
        />
        <Field
          label="Veterinarian"
          value={vaccineForm.veterinarian}
          onChangeText={(value) => updateVaccineForm("veterinarian", value)}
        />
        <Field
          label="Batch number"
          value={vaccineForm.batchNumber}
          onChangeText={(value) => updateVaccineForm("batchNumber", value)}
        />
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.disabledButton]}
          onPress={handleAddVaccine}
          disabled={saving}
        >
          <ThemedText style={styles.saveButtonText}>
            {saving ? "Saving..." : "Add vaccination"}
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMedicalForm = () => {
    if (!canEdit || activeForm !== "medical") return null;

    return (
      <View style={styles.formBox}>
        <ThemedText style={styles.fieldLabel}>Record type</ThemedText>
        <Segment
          value={medicalForm.category}
          onChange={(value) => updateMedicalForm("category", value)}
          options={CONDITION_OPTIONS}
        />
        <Field
          label="Details"
          value={medicalForm.details}
          onChangeText={(value) => updateMedicalForm("details", value)}
          placeholder="One detail per line"
          multiline
        />
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.disabledButton]}
          onPress={handleAddMedicalHistory}
          disabled={saving}
        >
          <ThemedText style={styles.saveButtonText}>
            {saving ? "Saving..." : "Add medical history"}
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMedicationForm = () => {
    if (!canEdit || activeForm !== "medication") return null;

    return (
      <View style={styles.formBox}>
        <Field
          label="Medication / treatment"
          value={medicationForm.name}
          onChangeText={(value) => updateMedicationForm("name", value)}
        />
        <Field
          label="Dosage"
          value={medicationForm.dosage}
          onChangeText={(value) => updateMedicationForm("dosage", value)}
        />
        <Field
          label="Frequency"
          value={medicationForm.frequency}
          onChangeText={(value) => updateMedicationForm("frequency", value)}
        />
        <Field
          label="Start date"
          value={medicationForm.startDate}
          onChangeText={(value) => updateMedicationForm("startDate", value)}
          placeholder="YYYY-MM-DD"
        />
        <Field
          label="End date"
          value={medicationForm.endDate}
          onChangeText={(value) => updateMedicationForm("endDate", value)}
          placeholder="YYYY-MM-DD"
        />
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.disabledButton]}
          onPress={handleAddMedication}
          disabled={saving}
        >
          <ThemedText style={styles.saveButtonText}>
            {saving ? "Saving..." : "Add medication"}
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  };

  const renderVisitForm = () => {
    if (!canEdit || activeForm !== "visit") return null;

    return (
      <View style={styles.formBox}>
        <ThemedText style={styles.fieldLabel}>Visit type</ThemedText>
        <Segment
          value={visitForm.interventionType}
          onChange={(value) => updateVisitForm("interventionType", value)}
          options={INTERVENTION_TYPES}
        />
        <Field
          label="Date"
          value={visitForm.visitDate}
          onChangeText={(value) => updateVisitForm("visitDate", value)}
          placeholder="YYYY-MM-DD"
        />
        <Field
          label="Veterinarian"
          value={visitForm.veterinarianName}
          onChangeText={(value) => updateVisitForm("veterinarianName", value)}
        />
        <Field
          label="Clinic"
          value={visitForm.clinic}
          onChangeText={(value) => updateVisitForm("clinic", value)}
        />
        <Field
          label="Issue / reason"
          value={visitForm.reason}
          onChangeText={(value) => updateVisitForm("reason", value)}
          multiline
        />
        <Field
          label="Diagnosis"
          value={visitForm.diagnosis}
          onChangeText={(value) => updateVisitForm("diagnosis", value)}
          multiline
        />
        <ThemedText style={styles.fieldLabel}>Medicines needed</ThemedText>
        <Segment
          value={visitForm.medicinesNeeded}
          onChange={(value) => updateVisitForm("medicinesNeeded", value)}
          options={[
            { label: "No", value: "no" },
            { label: "Yes", value: "yes" },
          ]}
        />
        <Field
          label="Medicine details"
          value={visitForm.medicinesNotes}
          onChangeText={(value) => updateVisitForm("medicinesNotes", value)}
          multiline
        />
        <ThemedText style={styles.fieldLabel}>Surgical intervention</ThemedText>
        <Segment
          value={visitForm.surgicalIntervention}
          onChange={(value) => updateVisitForm("surgicalIntervention", value)}
          options={[
            { label: "No", value: "no" },
            { label: "Yes", value: "yes" },
          ]}
        />
        <Field
          label="Notes"
          value={visitForm.notes}
          onChangeText={(value) => updateVisitForm("notes", value)}
          multiline
        />
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.disabledButton]}
          onPress={handleAddVisit}
          disabled={saving}
        >
          <ThemedText style={styles.saveButtonText}>
            {saving ? "Saving..." : "Add veterinary visit"}
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  };

  const renderWeightForm = () => {
    if (!canEdit || activeForm !== "weight") return null;

    return (
      <View style={styles.formBox}>
        <Field
          label="Date"
          value={weightForm.visitDate}
          onChangeText={(value) => updateWeightForm("visitDate", value)}
          placeholder="YYYY-MM-DD"
        />
        <Field
          label="Weight"
          value={weightForm.weight}
          onChangeText={(value) => updateWeightForm("weight", value)}
          placeholder="For example 8 kg"
        />
        <Field
          label="Notes"
          value={weightForm.notes}
          onChangeText={(value) => updateWeightForm("notes", value)}
          multiline
        />
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.disabledButton]}
          onPress={handleAddWeight}
          disabled={saving}
        >
          <ThemedText style={styles.saveButtonText}>
            {saving ? "Saving..." : "Add weight record"}
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <AppTopBar title="Pet Health Record" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <AppTopBar title="Pet Health Record" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="heart-circle" size={34} color={GREEN} />
          </View>
          <View style={styles.heroText}>
            <ThemedText style={styles.heroTitle} numberOfLines={2}>
              {identity.petName || pet?.name || "Pet health record"}
            </ThemedText>
            <ThemedText style={styles.heroSubtitle}>
              {canEdit
                ? "Add and review records by section."
                : "Review the available pet health records."}
            </ThemedText>
          </View>
        </View>

        <SectionCard
          title="Pet identity"
          subtitle="Profile, microchip, passport, and physical details"
          icon="paw-outline"
          count={identity.petName || identity.species ? 1 : 0}
          canEdit={canEdit}
          onAdd={() => showForm("identity")}
          form={renderIdentityForm()}
        >
          <RecordRow
            icon="id-card-outline"
            title={identity.petName || pet?.name || "Pet identity"}
            meta={[identity.species, identity.breed].filter(Boolean).join(" - ")}
            detail={[
              identity.gender && `Gender: ${identity.gender}`,
              identity.birthDateOrAge && `Birth / age: ${identity.birthDateOrAge}`,
              identity.weight && `Weight: ${identity.weight}`,
              identity.microchipId && `Microchip: ${identity.microchipId}`,
            ]
              .filter(Boolean)
              .join("\n")}
            badge={identity.sterilized ? "Sterilized" : "Identity"}
          />
        </SectionCard>

        <SectionCard
          title="Owner infos"
          subtitle="Owner contact and emergency information"
          icon="person-circle-outline"
          count={ownerInfo.name || ownerInfo.phone || ownerInfo.email ? 1 : 0}
          canEdit={canEdit}
          onAdd={() => showForm("owner")}
          form={renderOwnerForm()}
        >
          <RecordRow
            icon="person-outline"
            title={ownerInfo.name || "Owner information"}
            meta={[ownerInfo.phone, ownerInfo.email].filter(Boolean).join(" - ")}
            detail={[
              ownerInfo.address && `Address: ${ownerInfo.address}`,
              ownerInfo.emergencyContact &&
                `Emergency: ${ownerInfo.emergencyContact}`,
            ]
              .filter(Boolean)
              .join("\n")}
            badge="Owner"
          />
        </SectionCard>

        <SectionCard
          title="Vaccination history"
          subtitle="Vaccines, next doses, veterinarian, and batch numbers"
          icon="shield-checkmark-outline"
          count={vaccinations.length}
          canEdit={canEdit}
          onAdd={() => showForm("vaccination")}
          form={renderVaccineForm()}
        >
          {vaccinations.length ? (
            vaccinations.map((vaccine, index) => (
              <RecordRow
                key={`${vaccine?.vaccineName || "vaccine"}-${index}`}
                icon="shield-checkmark-outline"
                title={vaccine?.vaccineName || "Vaccine"}
                meta={[
                  vaccine?.dateAdministered && `Done ${formatDate(vaccine.dateAdministered)}`,
                  vaccine?.nextDoseDate && `Next ${formatDate(vaccine.nextDoseDate)}`,
                ]
                  .filter(Boolean)
                  .join(" - ")}
                detail={[vaccine?.veterinarian, vaccine?.batchNumber]
                  .filter(Boolean)
                  .join(" - ")}
                badge="Vaccine"
              />
            ))
          ) : (
            <EmptyRows text="No vaccination record yet." />
          )}
        </SectionCard>

        <SectionCard
          title="Medical history"
          subtitle="Allergies, chronic diseases, previous surgeries, and conditions"
          icon="medical-outline"
          count={medicalRows.length}
          canEdit={canEdit}
          onAdd={() => showForm("medical")}
          form={renderMedicalForm()}
        >
          {medicalRows.length ? (
            medicalRows.map((item) => (
              <RecordRow
                key={item.id}
                icon="document-text-outline"
                title={item.label}
                detail={item.value}
                badge="History"
              />
            ))
          ) : (
            <EmptyRows text="No medical history record yet." />
          )}
        </SectionCard>

        <SectionCard
          title="Medication and treatments"
          subtitle="Current or past medicines, dosage, and treatment frequency"
          icon="bandage-outline"
          count={medications.length}
          canEdit={canEdit}
          onAdd={() => showForm("medication")}
          form={renderMedicationForm()}
        >
          {medications.length ? (
            medications.map((medication, index) => (
              <RecordRow
                key={`${medication?.name || "medication"}-${index}`}
                icon="bandage-outline"
                title={medication?.name || "Medication"}
                meta={[medication?.dosage, medication?.frequency]
                  .filter(Boolean)
                  .join(" - ")}
                detail={[
                  medication?.startDate && `Start: ${formatDate(medication.startDate)}`,
                  medication?.endDate && `End: ${formatDate(medication.endDate)}`,
                ]
                  .filter(Boolean)
                  .join("\n")}
                badge="Treatment"
              />
            ))
          ) : (
            <EmptyRows text="No medication or treatment record yet." />
          )}
        </SectionCard>

        <SectionCard
          title="Veterinary visits"
          subtitle="General checks, issues, diagnosis, surgeries, and medicines"
          icon="medkit-outline"
          count={veterinaryVisits.length}
          canEdit={canEdit}
          onAdd={() => showForm("visit")}
          form={renderVisitForm()}
        >
          {veterinaryVisits.length ? (
            veterinaryVisits.map((visit, index) => (
              <RecordRow
                key={`${visit?.visitDate || "visit"}-${visit?.reason || index}-${index}`}
                icon={visit?.surgicalIntervention ? "medkit-outline" : "medical-outline"}
                title={visit?.interventionType || "Veterinary visit"}
                meta={[
                  formatDate(visit?.visitDate),
                  visit?.veterinarianName,
                  visit?.clinic,
                ]
                  .filter(Boolean)
                  .join(" - ")}
                detail={[
                  visit?.reason && `Issue: ${visit.reason}`,
                  visit?.diagnosis && `Diagnosis: ${visit.diagnosis}`,
                  visit?.medicinesNotes && `Medicine: ${visit.medicinesNotes}`,
                  visit?.notes,
                ]
                  .filter(Boolean)
                  .join("\n")}
                badge={visit?.surgicalIntervention ? "Surgery" : "Visit"}
              />
            ))
          ) : (
            <EmptyRows text="No veterinary visit record yet." />
          )}
        </SectionCard>

        <SectionCard
          title="Weight and growth tracking"
          subtitle="Track weight changes and growth notes over time"
          icon="fitness-outline"
          count={weightRecords.length}
          canEdit={canEdit}
          onAdd={() => showForm("weight")}
          form={renderWeightForm()}
        >
          {weightRecords.length ? (
            weightRecords.map((item, index) => (
              <RecordRow
                key={`${item?.visitDate || "weight"}-${index}`}
                icon="fitness-outline"
                title={item?.diagnosis || "Weight record"}
                meta={formatDate(item?.visitDate)}
                detail={item?.notes}
                badge="Growth"
              />
            ))
          ) : (
            <EmptyRows text="No weight or growth record yet." />
          )}
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F6F4",
  },
  container: {
    padding: 16,
    paddingBottom: 42,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E0E9E4",
    padding: 14,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: "#ECF8EF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "900",
    color: "#17231C",
  },
  heroSubtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: "#6C7A72",
    fontWeight: "700",
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E0E9E4",
    padding: 13,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#ECF8EF",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#1E2B24",
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 17,
    color: "#718077",
    fontWeight: "700",
  },
  countPill: {
    minWidth: 32,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 15,
    backgroundColor: "#EEF8F1",
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    color: "#27783E",
    fontWeight: "900",
    fontSize: 13,
  },
  plusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2EBE5",
    backgroundColor: "#FBFDFC",
    padding: 11,
    marginTop: 9,
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#ECF8EF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  recordBody: {
    flex: 1,
    minWidth: 0,
  },
  recordTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  recordTitle: {
    flex: 1,
    color: "#1D2B24",
    fontSize: 15,
    fontWeight: "900",
  },
  recordMeta: {
    color: "#75827A",
    fontSize: 12.5,
    fontWeight: "700",
    marginTop: 2,
  },
  recordDetail: {
    color: "#35443B",
    fontSize: 13.2,
    lineHeight: 19,
    marginTop: 7,
  },
  recordBadge: {
    borderRadius: 999,
    backgroundColor: "#EAF8EE",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  recordBadgeText: {
    color: "#227B3E",
    fontSize: 10.5,
    fontWeight: "900",
  },
  emptyBox: {
    minHeight: 72,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D9E3DD",
    backgroundColor: "#F9FBFA",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    gap: 6,
  },
  emptyText: {
    color: "#718077",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  formBox: {
    borderTopWidth: 1,
    borderTopColor: "#E5EEE8",
    marginTop: 12,
    paddingTop: 10,
  },
  fieldWrap: {
    marginTop: 9,
  },
  fieldLabel: {
    marginTop: 9,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "900",
    color: "#304038",
  },
  input: {
    backgroundColor: "#F8FAF9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8E2DB",
    paddingHorizontal: 11,
    paddingVertical: 10,
    color: "#152019",
    fontSize: 14.5,
  },
  inputDisabled: {
    backgroundColor: "#F2F5F3",
    color: "#68756D",
  },
  multilineInput: {
    minHeight: 74,
    textAlignVertical: "top",
  },
  segmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  segmentButton: {
    minHeight: 38,
    minWidth: 76,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D9E4DD",
    backgroundColor: "#F8FAF9",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonActive: {
    borderColor: GREEN,
    backgroundColor: "#EAF8EE",
  },
  segmentButtonDisabled: {
    opacity: 0.72,
  },
  segmentText: {
    color: "#5D6B63",
    fontWeight: "800",
    fontSize: 13,
  },
  segmentTextActive: {
    color: "#1F7B39",
  },
  segmentTextDisabled: {
    color: "#75827A",
  },
  saveButton: {
    marginTop: 14,
    backgroundColor: GREEN,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.65,
  },
});
