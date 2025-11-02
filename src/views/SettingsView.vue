<template>
  <ion-page>
    <generic-header title="Settings" />
    <ion-content class="content-with-header">
      <ion-list>
        <ion-item button @click="logout" detail>
          <ion-icon :icon="logOut" slot="start"></ion-icon>
          <ion-label>Logout</ion-label>
        </ion-item>

        <ion-item button @click="() => router.push('/userinfo')" detail>
          <ion-icon :icon="personCircle" slot="start"></ion-icon>
          <ion-label>User Profile</ion-label>
        </ion-item>

        <ion-item button @click="() => router.push('/bluetooth')" detail>
          <ion-icon :icon="bluetooth" slot="start"></ion-icon>
          <ion-label>Bluetooth Management</ion-label>
        </ion-item>

        <!-- <ion-item button @click="() => router.push('/theme')" detail>
          <ion-icon src="/img/theme.svg" slot="start" class="external-icon"></ion-icon>
          <ion-label>Theme</ion-label>
        </ion-item>

        <ion-item button @click="() => router.push('/systemConfig')" detail>
          <ion-icon src="/img/cog.svg" slot="start"></ion-icon>
          <ion-label>System Configuration</ion-label>
        </ion-item> -->

        <!-- <ion-item button @click="() => router.push('/deviceconfig')" detail>
          <ion-icon :icon="desktop" slot="start"></ion-icon>
          <ion-label>Device Configuration</ion-label>
        </ion-item> -->

        <!-- Unit Preferences -->
        <ion-item>
          <ion-icon :icon="options" slot="start"></ion-icon>
          <ion-label>Unit Preferences</ion-label>
        </ion-item>
        <unit-preferences-editor />
        
        <!-- Logging Preferences -->
        <logging-preferences />
        
        <!-- Connection Status -->
        <!-- <ion-item>
          <ion-icon :icon="wifi" slot="start"></ion-icon>
          <ion-label>Connection Status</ion-label>
        </ion-item> -->
        <connectivity-component />
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { IonPage, IonContent, IonList, IonItem, IonLabel, IonIcon } from "@ionic/vue";
import { personCircle, logOut, options, bluetooth } from "ionicons/icons";
import { useRouter } from "vue-router";
import GenericHeader from "@/components/GenericHeader.vue";
import UnitPreferencesEditor from "@/components/UnitPreferencesEditor.vue";
import LoggingPreferences from "@/components/LoggingPreferences.vue";
import ConnectivityComponent from "@/components/ConnectivityComponent.vue";

const router = useRouter();

const logout = async () => {
  try {
    // Clear authentication flags
    localStorage.removeItem('authenticated');
    localStorage.removeItem('isAuthenticated');
    
    // Clear any user-specific preferences or data if needed
    // await preferencesStore.clearUserData();
    
    // Navigate to login page
    await router.push('/login');
  } catch (error) {
    console.error('Error during logout:', error);
  }
};
</script>

<style scoped></style>
