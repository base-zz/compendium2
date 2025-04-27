<template>
  <ion-list>
    <ion-item>
      <ion-label>Use Device Theme</ion-label>
      <ion-toggle v-model="useDeviceTheme" @ionChange="toggleUseDeviceTheme"></ion-toggle>
    </ion-item>

    <ion-item v-if="!useDeviceTheme">
      <ion-label>Dark Mode</ion-label>
      <ion-toggle
        v-model="darkMode"
        @ionChange="toggleDarkMode"
        :disabled="useDeviceTheme"
      ></ion-toggle>
    </ion-item>

    <!-- <ion-radio-group v-model="selectedTheme">
      <ion-list-header>
        <ion-label>Theme</ion-label>
      </ion-list-header>

      <ion-item v-for="theme in availableThemes" :key="theme.id">
        <ion-label>{{ theme.name }}</ion-label>
        <ion-radio :value="theme.id" />
        <div class="theme-preview" :class="theme.id"></div>
      </ion-item>
    </ion-radio-group> -->
  </ion-list>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import {
  IonList,
  IonItem,
  IonLabel,
  IonRadioGroup,
  IonRadio,
  IonListHeader,
  IonToggle,
} from "@ionic/vue";
import { useThemeStore } from "@/stores/theme";

const themeStore = useThemeStore();
const availableThemes = computed(() => themeStore.getAvailableThemes());
const selectedTheme = ref(themeStore.currentTheme);
const darkMode = ref(themeStore.isDark);
const useDeviceTheme = ref(themeStore.useDeviceTheme);

onMounted(() => {
  selectedTheme.value = themeStore.currentTheme;
  darkMode.value = themeStore.isDark;
  useDeviceTheme.value = themeStore.useDeviceTheme;
});

watch(selectedTheme, async (newTheme) => {
  await themeStore.setTheme(newTheme);
});

const toggleDarkMode = async () => {
  await themeStore.toggleDarkMode();
  darkMode.value = themeStore.isDark;
};

const toggleUseDeviceTheme = async () => {
  await themeStore.toggleUseDeviceTheme();
  useDeviceTheme.value = themeStore.useDeviceTheme;
  darkMode.value = themeStore.isDark; // Update dark mode value to reflect potential changes
};
</script>

<style scoped>
.theme-preview {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  margin-left: 12px;
  border: 1px solid var(--ion-border-color);
  overflow: hidden;
}

.theme-preview.theme-marine-blue {
  background-color: #0a3d62;
}

.theme-preview.theme-marine-light {
  background-color: #3498db;
}

.theme-preview.theme-nautical {
  background-color: #003366;
}

.theme-preview.theme-coastal {
  background-color: #4a8db7;
}

.theme-preview.theme-deep-ocean {
  background-color: #001f3f;
}

.theme-preview.theme-coastal-breeze {
  background-color: #4a8db7;
}

.theme-preview.theme-vintage-nautical {
  background-color: #19376d;
}

.theme-preview.theme-northern-lights {
  background-color: #086375;
}

.theme-preview.theme-tropical-waters {
  background: linear-gradient(135deg, #00bcd4, #ff7043);
}

.theme-preview.theme-sunset-sailing {
  background: linear-gradient(135deg, #ff5722, #ffc107);
}

.theme-preview.theme-caribbean-splash {
  background: linear-gradient(135deg, #00e5ff, #e91e63);
}

.theme-preview.theme-rainbow-reef {
  background: linear-gradient(
    to right,
    #f44336,
    /* Red */ #ff9800,
    /* Orange */ #ffeb3b,
    /* Yellow */ #4caf50,
    /* Green */ #2196f3,
    /* Blue */ #9c27b0 /* Purple */
  );
}

.theme-preview.theme-fitness-nautical {
  background: linear-gradient(135deg, #5b6dcd, #1a73e8);
}

ion-radio {
  margin-right: 12px;
}
</style>
