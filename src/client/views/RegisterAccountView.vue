<template>
  <ion-page>
    <generic-header title="Register" />
    <ion-header class="content-with-header">
      <ion-toolbar>
        <ion-title>Settings</ion-title>
        <ion-buttons slot="start">
          <ion-back-button color="light"></ion-back-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-item class="header">REGISTER ACCOUNT</ion-item>
      <ion-grid :fixed="true">
        <ion-row>
          <ion-col>Name</ion-col>
          <ion-col><input type="text" v-model="name" /></ion-col>
        </ion-row>
        <ion-row>
          <ion-col>Email</ion-col>
          <ion-col><input type="text" v-model="email" /></ion-col>
        </ion-row>
        <ion-row>
          <ion-col>Vessel Name</ion-col>
          <ion-col><input type="text" v-model="vessel" /></ion-col>
        </ion-row>
        <ion-row>
          <ion-col>Avatar</ion-col>
          <ion-col>Coming soon...</ion-col>
        </ion-row>
        <ion-row>
          <ion-col></ion-col>
          <ion-col></ion-col>
        </ion-row>
      </ion-grid>
      <ion-button id="register-account">
        <ion-label>Register </ion-label>
      </ion-button>
      <ion-alert
        trigger="register-account"
        header="Complete Registration?"
        message="By clicking ok you agree to all the bullshit terms you never read. Deal?"
        :buttons="alertButtons"
      ></ion-alert>
    </ion-content>
  </ion-page>
</template>

<script setup>
import {
  IonPage,
  IonTitle,
  IonHeader,
  IonToolbar,
  IonContent,
  IonButton,
  IonBackButton,
  IonButtons,
  IonMenuButton,
  IonGrid,
  IonRow,
  IonCol,
} from "@ionic/vue";
import GenericHeader from "@/components/GenericHeader.vue";
import { ref } from "vue";

const name = ref("");
const email = ref("");
const vessel = ref("");

const alertButtons = [
  {
    text: "Cancel",
    role: "cancel",
    handler: () => {
      console.log("Alert canceled");
    },
  },
  {
    text: "OK",
    role: "confirm",
    handler: () => {
      console.log("YOURE MINE NOW BITCH!!!!");
    },
  },
];
</script>

<style scoped>
ion-content {
  --ion-background-color: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}

ion-button {
  border-radius: 5px;
}

.item {
  color: var(--ion-color-primary-contrast);
  font-size: 1em;
  font-weight: bold;
}

.centered {
  text-align: center;
  color: var(--ion-color-primary-contrast);
}

input {
  --background: var(--ion-color-primary-contrast);
  padding: 0.25em;
  color: var(--ion-color-primary-contrast);
  font-size: 0.9em;
  border: 1px solid var(--ion-color-primary-contrast);
  border-radius: 0.5em;
}

.header {
  font-size: 1.75em;
  margin: 1em 0.25em;
  --background: var(--ion-color-primary);
}

ion-grid {
  --ion-grid-width: 50%;

  --ion-grid-width-xs: 50%;
  --ion-grid-width-sm: 288px;
  --ion-grid-width-md: 384px;
  --ion-grid-width-lg: 480px;
  --ion-grid-width-xl: 570px;
}

ion-col {
  border: solid 1px var(--ion-color-primary-contrast);
  color: var(--ion-color-primary-contrast);
  text-align: center;
}
</style>
