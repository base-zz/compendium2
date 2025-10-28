<template>
  <div class="bluetooth-device-list">
    <ion-list>
      <bluetooth-device-item
        v-for="(device, id) in devices"
        :key="id"
        :device="device"
        :deviceId="id"
        :isSelected="isDeviceSelected(id)"
        @select="$emit('select-device', id)"
        @deselect="$emit('deselect-device', id)"
        @edit-device="$emit('edit-device', id)"
      />
    </ion-list>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
import { IonList } from '@ionic/vue';
import BluetoothDeviceItem from './BluetoothDeviceItem.vue';

const props = defineProps({
  devices: {
    type: Object,
    required: true,
    default: () => ({})
  },
  selectedDevices: {
    type: Object,
    required: true,
    default: () => ({})
  },
  showSelectedOnly: {
    type: Boolean,
    default: false
  }
});

defineEmits(['select-device', 'deselect-device', 'edit-device']);

// Helper function to check if a device is selected
const isDeviceSelected = (deviceId) => {
  return deviceId in props.selectedDevices;
};
</script>

<style scoped>
.bluetooth-device-list {
  max-height: 400px;
  overflow-y: auto;
}
</style>
