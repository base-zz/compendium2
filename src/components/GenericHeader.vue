<template>
  <keep-alive>
    <ion-header class="ion-no-border header" v-show="isHeaderVisible">
      <ion-toolbar>
        <ion-buttons
          slot="start"
          v-if="props.title && !new Set(['Home', 'Login', 'Register']).has(props.title)"
        >
          <ion-back-button default-href="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ props.title }}</ion-title>
        <ion-buttons
          slot="end"
          v-if="props.title && !new Set(['Login']).has(props.title)"
        >
          <ion-menu-button class="menu-icon"></ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
  </keep-alive>
</template>

<script setup>
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonBackButton,
} from "@ionic/vue";
import { useRoute } from "vue-router";
import { ref, watch } from "vue";
// import { useRouter } from "vue-router";
// const router = useRouter();

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
});

const isHeaderVisible = ref(true);
const route = useRoute();

watch(
  () => route.path,
  () => {
    isHeaderVisible.value = false;
    // After a short delay, make the header visible again
    setTimeout(() => {
      isHeaderVisible.value = true;
    }, 0);
  }
);

/*
 */
</script>

<style scoped>
@media (max-width: 480px) {
  .header ion-toolbar {
    --min-height: 54px;
  }
}
</style>
