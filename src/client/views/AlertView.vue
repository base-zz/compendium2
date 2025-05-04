<script setup>
import { ref, computed, onMounted } from "vue";
import { IonPage, IonContent, IonList, IonItem, IonLabel, IonSkeletonText } from "@ionic/vue";
import AlertViewItem from "@components/AlertViewItem.vue";
import AlertViewItemDetail from "@components/AlertViewItemDetail.vue";
import { modalController } from "@ionic/vue";
import GenericHeader from "@components/GenericHeader.vue";
import { useStateDataStore } from "@/client/stores/stateDataStore";
import { storeToRefs } from "pinia";

const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);

const activeAlerts = computed(() => state.value.alerts?.active || []);
const isLoading = ref(true);

onMounted(() => {
  setTimeout(() => { isLoading.value = false; }, 300);
});

const openAlertDetail = async (alert) => {
  const modal = await modalController.create({
    component: AlertViewItemDetail,
    componentProps: { alert },
    swipeToClose: true,
    presentingElement: document.querySelector("ion-router-outlet") || undefined,
  });
  await modal.present();
};
</script>

<template>
  <IonPage>
    <GenericHeader title="Alerts" />
    <IonContent>
      <h2 class="ion-padding">Active Alerts</h2>
      <IonList v-if="isLoading">
        <IonItem v-for="n in 3" :key="n">
          <IonSkeletonText animated style="width: 80%"></IonSkeletonText>
        </IonItem>
      </IonList>
      <IonList v-else>
        <template v-if="activeAlerts.length">
          <AlertViewItem
            v-for="alert in activeAlerts"
            :key="alert.id || alert.path || alert.timestamp"
            :alert="alert"
            @view-detail="openAlertDetail"
          />
        </template>
        <template v-else>
          <IonItem>
            <IonLabel>No active alerts</IonLabel>
          </IonItem>
        </template>
      </IonList>
    </IonContent>
  </IonPage>
</template>