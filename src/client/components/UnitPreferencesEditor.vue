<template>
  <div class="unit-preferences-editor">
    <h3>Unit Preferences</h3>
    
    <!-- Preset selection -->
    <div class="preset-selection">
      <ion-item>
        <ion-label>Preset:</ion-label>
        <ion-select v-model="selectedPreset" @ionChange="applyPreset" interface="popover">
          <ion-select-option value="METRIC">Metric</ion-select-option>
          <ion-select-option value="IMPERIAL">Imperial</ion-select-option>
          <ion-select-option value="CUSTOM">Custom</ion-select-option>
        </ion-select>
      </ion-item>
    </div>
    
    <!-- Individual unit selections -->
    <div class="unit-selections">
      <!-- Length -->
      <ion-item>
        <ion-label>Length:</ion-label>
        <ion-select 
          v-model="preferences[UNIT_TYPES.LENGTH]" 
          @ionChange="updateUnitPreference(UNIT_TYPES.LENGTH, $event.detail.value)"
          interface="popover"
        >
          <ion-select-option v-for="unit in AVAILABLE_UNITS[UNIT_TYPES.LENGTH]" :key="unit" :value="unit">
            {{ UNIT_LABELS[unit] }}
          </ion-select-option>
        </ion-select>
      </ion-item>
      
      <!-- Speed -->
      <ion-item>
        <ion-label>Speed:</ion-label>
        <ion-select 
          v-model="preferences[UNIT_TYPES.SPEED]" 
          @ionChange="updateUnitPreference(UNIT_TYPES.SPEED, $event.detail.value)"
          interface="popover"
        >
          <ion-select-option v-for="unit in AVAILABLE_UNITS[UNIT_TYPES.SPEED]" :key="unit" :value="unit">
            {{ UNIT_LABELS[unit] }}
          </ion-select-option>
        </ion-select>
      </ion-item>
      
      <!-- Temperature -->
      <ion-item>
        <ion-label>Temperature:</ion-label>
        <ion-select 
          v-model="preferences[UNIT_TYPES.TEMPERATURE]" 
          @ionChange="updateUnitPreference(UNIT_TYPES.TEMPERATURE, $event.detail.value)"
          interface="popover"
        >
          <ion-select-option v-for="unit in AVAILABLE_UNITS[UNIT_TYPES.TEMPERATURE]" :key="unit" :value="unit">
            {{ UNIT_LABELS[unit] }}
          </ion-select-option>
        </ion-select>
      </ion-item>
      
      <!-- Pressure -->
      <ion-item>
        <ion-label>Pressure:</ion-label>
        <ion-select 
          v-model="preferences[UNIT_TYPES.PRESSURE]" 
          @ionChange="updateUnitPreference(UNIT_TYPES.PRESSURE, $event.detail.value)"
          interface="popover"
        >
          <ion-select-option v-for="unit in AVAILABLE_UNITS[UNIT_TYPES.PRESSURE]" :key="unit" :value="unit">
            {{ UNIT_LABELS[unit] }}
          </ion-select-option>
        </ion-select>
      </ion-item>
      
      <!-- Volume -->
      <ion-item>
        <ion-label>Volume:</ion-label>
        <ion-select 
          v-model="preferences[UNIT_TYPES.VOLUME]" 
          @ionChange="updateUnitPreference(UNIT_TYPES.VOLUME, $event.detail.value)"
          interface="popover"
        >
          <ion-select-option v-for="unit in AVAILABLE_UNITS[UNIT_TYPES.VOLUME]" :key="unit" :value="unit">
            {{ UNIT_LABELS[unit] }}
          </ion-select-option>
        </ion-select>
      </ion-item>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { 
  getUserUnitPreferences, 
  setUnitPreference, 
  setUnitPreset,
  UNIT_TYPES,
  AVAILABLE_UNITS,
  UNIT_LABELS
} from '@/shared/unitPreferences';
import { useStateDataStore } from '@/client/stores/stateDataStore';
import { 
  IonItem, 
  IonLabel, 
  IonSelect, 
  IonSelectOption 
} from '@ionic/vue';

const stateStore = useStateDataStore();
const preferences = ref({});
const selectedPreset = ref('METRIC');

onMounted(async () => {
  try {
    const prefs = await getUserUnitPreferences();
    preferences.value = { ...prefs };
    selectedPreset.value = prefs.preset || 'METRIC';
  } catch (error) {
    console.error('Failed to load unit preferences:', error);
  }
});

async function updateUnitPreference(unitType, unit) {
  try {
    const updatedPrefs = await setUnitPreference(unitType, unit);
    preferences.value = { ...updatedPrefs };
    selectedPreset.value = updatedPrefs.preset;
    
    // Notify the state store to update all values
    if (stateStore.updateUnitsToPreferences) {
      await stateStore.updateUnitsToPreferences();
    }
  } catch (error) {
    console.error('Failed to update unit preference:', error);
  }
}

async function applyPreset() {
  if (selectedPreset.value === 'CUSTOM') return;
  
  try {
    const updatedPrefs = await setUnitPreset(selectedPreset.value);
    preferences.value = { ...updatedPrefs };
    
    // Notify the state store to update all values
    if (stateStore.updateUnitsToPreferences) {
      await stateStore.updateUnitsToPreferences();
    }
  } catch (error) {
    console.error('Failed to apply preset:', error);
  }
}
</script>

<style scoped>
.unit-preferences-editor {
  padding: 1rem;
}

.preset-selection {
  margin-bottom: 1rem;
}

.unit-selections {
  display: flex;
  flex-direction: column;
}
</style>
