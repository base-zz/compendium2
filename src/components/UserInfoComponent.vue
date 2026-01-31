<template>
  <div class="user-info-container ion-padding">
    <!-- Login/Logout Button -->
    <div class="auth-button-container">
      <ion-button
        v-if="!isLoggedIn"
        color="primary"
        @click="navigateToLogin"
        class="auth-action-button"
      >
        <ion-icon :icon="logInOutline" slot="start"></ion-icon>
        Log In
      </ion-button>
      <ion-button v-else color="danger" @click="logoutUser" class="auth-action-button">
        <ion-icon :icon="logOutOutline" slot="start"></ion-icon>
        Log Out
      </ion-button>
    </div>

    <ion-card class="dark-card">
      <ion-card-header>
        <ion-card-title>{{ mode === 'add' ? 'Add Boat' : 'Edit Boat' }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <form class="custom-form" @submit.prevent="handleSubmit">
          <!-- Boat Info Section -->
          <div class="form-group">
            <div class="form-label">Boat Information</div>

            <ion-label position="stacked">Boat Name</ion-label>
            <ion-input
              class="form-control"
              placeholder="Boat Name"
              v-model="boatInfo.boatName"
              type="text"
              required
            ></ion-input>

            <ion-label position="stacked">Boat Type</ion-label>
            <ion-select
              class="form-control"
              interface="modal"
              placeholder="Select Boat Type"
              v-model="boatInfo.boatType"
              :interface-options="{
                cssClass: 'select-modal',
                header: 'Select Boat Type',
              }"
            >
              <ion-select-option value="sail">Sail</ion-select-option>
              <ion-select-option value="power">Power</ion-select-option>
              <ion-select-option value="catamaran">Catamaran</ion-select-option>
              <ion-select-option value="other">Other</ion-select-option>
            </ion-select>

            <ion-label position="stacked">LOA (Length Overall) in feet</ion-label>
            <ion-input
              class="form-control"
              placeholder="LOA (Length Overall) in feet"
              v-model.number="boatInfo.loa"
              type="number"
              required
            ></ion-input>

            <ion-label position="stacked">Beam in feet</ion-label>
            <ion-input
              class="form-control"
              placeholder="Beam in feet"
              v-model.number="boatInfo.beam"
              type="number"
              required
            ></ion-input>

            <ion-label position="stacked">Draft in feet</ion-label>
            <ion-input
              class="form-control"
              placeholder="Draft in feet"
              v-model.number="boatInfo.draft"
              type="number"
              required
            ></ion-input>

            <ion-label position="stacked">Air Draft in feet</ion-label>
            <ion-input
              class="form-control"
              placeholder="Air Draft in feet"
              v-model.number="boatInfo.airDraft"
              type="number"
              required
            ></ion-input>

            <ion-label position="stacked">Bow Roller to Water ({{ lengthUnitLabel }})</ion-label>
            <ion-input
              class="form-control"
              placeholder="Bow Roller to Water"
              v-model.number="boatInfo.bowRollerToWater"
              type="number"
            ></ion-input>

            <ion-label position="stacked">MMSI</ion-label>
            <ion-input
              class="form-control"
              placeholder="MMSI"
              v-model="boatInfo.mmsi"
              type="text"
              required
            ></ion-input>

            <ion-button expand="block" color="primary" @click="handleSubmit">
              {{ mode === 'add' ? 'Add Boat' : 'Update Boat' }}
            </ion-button>
          </div>
        </form>
      </ion-card-content>
    </ion-card>
  </div>
</template>

<script setup>
import { reactive, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { usePreferencesStore } from "@/stores/preferences";
import {
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonInput,
  IonLabel,
  IonSelect,
  IonSelectOption,
  toastController,
} from "@ionic/vue";
import { logInOutline, logOutOutline } from "ionicons/icons";

const router = useRouter();
const preferencesStore = usePreferencesStore();
const lengthUnitLabel = computed(() => (preferencesStore?.useImperial?.value ? "ft" : "m"));

// Authentication state
const isLoggedIn = computed(() => {
  if (typeof window === 'undefined') {
    return false;
  }
  return localStorage.getItem('isAuthenticated') === 'true';
});

defineProps({
  mode: {
    type: String,
    default: 'edit'
  },
  userId: {
    type: String,
    default: ''
  }
});


const boatInfo = reactive({
  boatName: '',
  boatType: '',
  loa: null,
  beam: null,
  draft: null,
  airDraft: null,
  bowRollerToWater: null,
  mmsi: ''
});

const activeBoatId = computed(() => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("activeBoatId");
});

onMounted(() => {
  const id = activeBoatId.value;
  if (!id) return;

  try {
    const raw = localStorage.getItem(`boatInfo:${id}`);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;

    if (typeof parsed.boatName === "string") boatInfo.boatName = parsed.boatName;
    if (typeof parsed.boatType === "string") boatInfo.boatType = parsed.boatType;

    const parseNullableNumber = (value) => {
      if (typeof value === "number" && !Number.isNaN(value)) return value;
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const parsedNumber = Number(trimmed);
        if (!Number.isNaN(parsedNumber)) return parsedNumber;
      }
      return null;
    };

    const loa = parseNullableNumber(parsed.loa);
    if (loa != null) boatInfo.loa = loa;

    const beam = parseNullableNumber(parsed.beam);
    if (beam != null) boatInfo.beam = beam;

    const draft = parseNullableNumber(parsed.draft);
    if (draft != null) boatInfo.draft = draft;

    const airDraft = parseNullableNumber(parsed.airDraft);
    if (airDraft != null) boatInfo.airDraft = airDraft;

    const bowRollerToWater = parseNullableNumber(parsed.bowRollerToWater);
    if (bowRollerToWater != null) boatInfo.bowRollerToWater = bowRollerToWater;

    if (typeof parsed.mmsi === "string") boatInfo.mmsi = parsed.mmsi;
  } catch (error) {
    // Ignore invalid stored data
  }
});

async function handleSubmit() {
  try {
    const id = activeBoatId.value;
    if (!id) {
      const toast = await toastController.create({
        message: "No active boat selected. Please pair a boat first.",
        duration: 2500,
        position: "bottom",
        color: "danger",
      });
      await toast.present();
      return;
    }

    const bowRollerToWaterValue = boatInfo?.bowRollerToWater;
    const hasBowRollerToWater =
      typeof bowRollerToWaterValue === "number" && !Number.isNaN(bowRollerToWaterValue);

    const payload = {
      boatName: boatInfo.boatName,
      boatType: boatInfo.boatType,
      loa: boatInfo.loa,
      beam: boatInfo.beam,
      draft: boatInfo.draft,
      airDraft: boatInfo.airDraft,
      ...(hasBowRollerToWater ? { bowRollerToWater: bowRollerToWaterValue } : {}),
      mmsi: boatInfo.mmsi,
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(`boatInfo:${id}`, JSON.stringify(payload));
    }

    if (hasBowRollerToWater && typeof window !== "undefined") {
      const storageKey = `boatDimensions:${id}:bowRollerToWater`;
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          value: bowRollerToWaterValue,
          units: lengthUnitLabel.value,
        })
      );
    }

    const toast = await toastController.create({
      message: "Boat updated successfully!",
      duration: 2000,
      position: "bottom",
      color: "success",
    });
    await toast.present();
  } catch (error) {
    const toast = await toastController.create({
      message: error?.message || "Failed to update boat",
      duration: 2000,
      position: "bottom",
      color: "danger",
    });
    await toast.present();
  }
}

function navigateToLogin() {
  router.push("/login");
}

async function logoutUser() {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem('isAuthenticated', 'false');
    }
    const toast = await toastController.create({
      message: "Successfully logged out",
      duration: 2000,
      position: "bottom",
      color: "success",
    });
    await toast.present();
    // Clear form data
    boatInfo.boatName = '';
    boatInfo.boatType = '';
    boatInfo.loa = null;
    boatInfo.beam = null;
    boatInfo.draft = null;
    boatInfo.airDraft = null;
    boatInfo.bowRollerToWater = null;
    boatInfo.mmsi = '';
    router.push("/");
  } catch (error) {
    console.error("Error during logout:", error);
    const toast = await toastController.create({
      message: "Failed to log out",
      duration: 2000,
      position: "bottom",
      color: "danger",
    });
    await toast.present();
  }
}
</script>

<style>
 .user-info-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding-bottom: 40px; /* Add extra padding at the bottom for better scrolling */
}

.dark-card {
  background: var(--ion-background-color);
  border: 1px solid var(--ion-color-step-200);
  border-radius: 8px;
  margin: 1rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  color: var(--ion-text-color);
  font-weight: 500;
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.form-control {
  --background: var(--ion-background-color);
  --color: var(--ion-text-color);
  --placeholder-color: var(--ion-color-medium);
  --padding-start: 1rem;
  --padding-end: 1rem;
  --border-radius: 4px;
  margin-bottom: 0.75rem;
}

ion-select.form-control {
  --padding-top: 0.6rem;
  --padding-bottom: 0.6rem;
}

ion-select.form-control::part(text) {
  flex: unset;
  text-align: left;
  width: 100%;
  color: var(--ion-text-color);
}

ion-note {
  color: var(--ion-color-medium);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  display: block;
}

ion-card-header {
  padding: 1.25rem 1.25rem 0.75rem;
}

ion-card-content {
  padding: 0 1.25rem 1.25rem;
}

ion-card-title {
  color: var(--ion-text-color);
  font-size: 1.25rem;
  font-weight: 600;
}

ion-card-subtitle {
  color: var(--ion-color-medium);
  font-size: 0.875rem;
}

.save-button {
  margin-top: 1rem;
}

.auth-button-container {
  margin-bottom: 1rem;
}

.auth-action-button {
  width: 100%;
}

/* Modal Select Styles */
.select-modal {
  --ion-color-step-50: #2a2a2a;
  --ion-color-step-100: #2a2a2a;
  --ion-color-step-150: #2a2a2a;
  --ion-color-step-200: #2a2a2a;
  --ion-color-step-250: #2a2a2a;
  --ion-color-step-300: #2a2a2a;
  --ion-color-step-350: #2a2a2a;
  --ion-color-step-400: #2a2a2a;
  --background: #2a2a2a !important;
  --color: white !important;
}

.select-modal ion-item {
  --background: #2a2a2a !important;
  --color: white !important;
  --border-color: #3c3c3c !important;
}

.select-modal ion-list {
  background: #2a2a2a !important;
}

.select-modal ion-radio {
  --color: white !important;
  --color-checked: var(--ion-color-primary) !important;
}

.select-modal ion-label {
  --color: white !important;
  color: white !important;
}

.select-modal .select-interface-option {
  --background: #2a2a2a !important;
  --color: white !important;
  background: #2a2a2a !important;
  color: white !important;
  text-align: center !important;
  justify-content: center !important;
}

.select-modal .select-interface-option ion-label {
  text-align: center !important;
  width: 100% !important;
}

.select-modal .select-interface-option.select-interface-option-selected {
  --background: var(--ion-color-primary) !important;
  --color: white !important;
  background: var(--ion-color-primary) !important;
  color: white !important;
}
</style>
