<template>
  <ion-buttons slot="start">
    <ion-back-button @click="() => router.push({ name: 'Settings' })"> </ion-back-button>
  </ion-buttons>
</template>

<script setup>
import { useRouter } from "vue-router";
import { IonButtons, IonBackButton } from "@ionic/vue";

const router = useRouter();
</script>

<style scoped></style>
