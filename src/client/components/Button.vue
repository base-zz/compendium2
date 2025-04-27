<template>
  <ion-button
    :class="`button-${variant}`"
    @mousedown="animatePress"
    @mouseup="animateRelease"
    @mouseleave="animateRelease"
  >
    <slot name="icon">
      <ion-icon v-if="icon" :name="icon" class="icon" />
    </slot>
    <span class="content">
      <slot></slot>
    </span>
  </ion-button>
</template>

<script setup>
import { ref } from "vue";
import { IonButton, IonIcon } from "@ionic/vue";
defineProps({
  variant: {
    type: String,
    default: "primary", // 'primary' | 'secondary' | 'danger' | 'success'
    validator: (value) => ["primary", "secondary", "danger", "success"].includes(value),
  },
  icon: String,
});

const isPressed = ref(false);

const animatePress = (e) => {
  isPressed.value = true;
  e.currentTarget.style.transform = "scale(0.98)";
};

const animateRelease = (e) => {
  isPressed.value = false;
  e.currentTarget.style.transform = "scale(1)";
};
</script>

<style scoped>
/* Base Button */
ion-button {
  /* Structure */
  --border-radius: 6px;
  --padding-top: 8px;
  --padding-bottom: 8px;
  --padding-start: 12px;
  --padding-end: 12px;
  --border-width: 1px;
  --border-style: solid;
  --border-color: rgba(0, 0, 0, 0.08);

  /* Typography */
  font-size: 0.875rem;
  font-weight: bold;
  letter-spacing: 0.5px;

  /* Effects */
  --box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  margin: 2px;
  min-height: 36px; /* Fixed height */
  transition: all 0.2s ease;
}
/* Ripple Effect */
ion-button::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 5px;
  height: 5px;
  background: rgba(255, 255, 255, 0.5);
  opacity: 0;
  border-radius: 100%;
  transform: scale(1, 1) translate(-50%, -50%);
  transform-origin: 50% 50%;
}

@media (hover: hover) {
  ion-button:hover {
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.12), 0 6px 12px rgba(0, 0, 0, 0.1);
  }
}

ion-button:active {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.05);
  transform: translateY(2px);
}

ion-button:active::after {
  animation: ripple 0.6s ease-out;
}

@keyframes ripple {
  0% {
    transform: scale(0, 0);
    opacity: 0.5;
  }
  100% {
    transform: scale(20, 20);
    opacity: 0;
  }
}

/* Icon Animation */
.icon {
  transition: transform 0.2s ease;
}

ion-button:active .icon {
  transform: scale(1.1);
}

/* Content Shift */
.content {
  display: inline-block;
  transition: transform 0.2s ease;
}

ion-button:active .content {
  transform: translateY(1px);
}

.button-primary {
  --background: var(--ion-color-primary);
  --color: var(--ion-color-primary-contrast);
}

/* Secondary (Teal) */
.button-secondary {
  --background: var(--ion-color-secondary);
  --color: var(--ion-color-secondary-contrast);
}

/* Danger (Red) - NEW */
.button-danger {
  --background: #ff3b30; /* Vibrant red */
  --color: white;
  --ion-color-danger: #ff3b30; /* Ensure Ionic recognizes it */
}

/* Success (Green) - NEW */
.button-success {
  --background: #34c759; /* Apple-style green */
  --color: white;
}
</style>
