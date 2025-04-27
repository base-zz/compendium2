<template>
  <ion-page>
    <generic-header title="User Information" />
    <ion-content class="content-with-header">
      <UserInfoComponent
        :mode="'add'"
        :userId="userId"
        @add-boat="saveBoatToBackend"
      />
    </ion-content>
  </ion-page>
</template>

<script setup>
import { IonPage, IonContent, alertController } from "@ionic/vue";
import GenericHeader from "@client/components/GenericHeader.vue";
import UserInfoComponent from "@client/components/UserInfoComponent.vue";
import { ref } from 'vue';

// TODO: Replace with real user id from auth/user store
const userId = ref('mock-user-id');

async function saveBoatToBackend(boatData) {
  try {
    const response = await fetch('/api/boats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(boatData)
    });
    if (!response.ok) throw new Error('Failed to save boat');
    const data = await response.json();
    const alert = await alertController.create({
      header: 'Success',
      message: 'Boat added successfully!',
      buttons: ['OK']
    });
    await alert.present();
    // Optionally update boat list or redirect here
  } catch (err) {
    const alert = await alertController.create({
      header: 'Error',
      message: err.message || 'Failed to add boat',
      buttons: ['OK']
    });
    await alert.present();
  }
}
</script>

<style scoped></style>
