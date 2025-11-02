<template>
  <div class="alert-icon-wrapper">
    <ion-icon
      :icon="getIcon"
      :class="['alert-icon', type]"
      size="large"
    ></ion-icon>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { IonIcon } from '@ionic/vue';
import {
  alertCircle,
  warningOutline,
  informationCircle,
} from 'ionicons/icons';

const props = defineProps({
  type: {
    type: String,
    default: 'info'
  }
});

const getIcon = computed(() => {
  const iconType = (props.type || 'info').toLowerCase();
  // console.log('Computing icon for type:', iconType);
  
  switch (iconType) {
    case 'error':
      return alertCircle;
    case 'warning':
      return warningOutline;
    case 'info':
    default:
      return informationCircle;
  }
});
</script>

<style scoped>
.alert-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--ion-color-light);
}

.alert-icon {
  font-size: 32px;
}

.alert-icon.error {
  color: var(--ion-color-danger);
}

.alert-icon.warning {
  color: var(--ion-color-warning);
}

.alert-icon.info {
  color: var(--ion-color-primary);
}
</style>
