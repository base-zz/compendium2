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

        <ion-item button @click="() => router.push('/theme')" detail>
          <ion-icon src="/img/theme.svg" slot="start" class="external-icon"></ion-icon>
          <ion-label>Theme</ion-label>
        </ion-item>

        <ion-item button @click="() => router.push('/systemConfig')" detail>
          <ion-icon src="/img/cog.svg" slot="start"></ion-icon>
          <ion-label>System Configuration</ion-label>
        </ion-item>

        <ion-item button @click="() => router.push('/deviceconfig')" detail>
          <ion-icon :icon="desktop" slot="start"></ion-icon>
          <ion-label>Device Configuration</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { IonPage, IonContent, IonList, IonItem, IonLabel, IonIcon } from "@ionic/vue";
import { personCircle, logOut, desktop } from "ionicons/icons";
import { useRouter } from "vue-router";
import pb from '@/client/config/pocketbase';
import GenericHeader from "@/client/components/GenericHeader.vue";

const router = useRouter();

const logout = () => {
  pb.authStore.clear();
  router.push("/login");
};
</script>

<style scoped></style>
