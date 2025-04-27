<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Home</ion-title>
        <ion-buttons slot="end">
          <ion-menu-button size="large" class="menu-icon"></ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true" class="content-with-header home-content">
      <!-- Show regular content when fitness theme is not active -->
      <div class="logo-container">
        <div class="company-name">
          <h1>Compendium</h1>
          <h6>Systems</h6>
        </div>
        <div>
          <svg
            width="500"
            height="500"
            xmlns="http://www.w3.org/2000/svg"
            xmlns:undefined="http://www.serif.com/"
            clip-rule="evenodd"
            xml:space="preserve"
            version="1.1"
            viewBox="0 0 500 750"
            id="logo"
          >
            <g transform="translate(-2, -8)">
              <title>Compendium Navigation Logo</title>
              <g transform="translate(6,130) scale(3.8)" id="Layer-1">
                <path
                  d="m58.39999,129.10001l-4,-0.40002l-4.29999,-1l-4.29999,-1.09998l-6.90002,-2.60001l-4.5,-2.39999l-4.59999,-2.40002l-4,-3l-3.89999,-3l-3.5,-3.69998l-3.60001,-3.70001l-2.3,-3.29999l-2.39999,-3.30002l-4,-7.39999l-1.5,-4l-1.60001,-4l-1.09999,-5.19998l-1.2,-5.30002l-0.70001,-10l0.60001,-4.89999l0.60001,-5l1,-4l1,-3.89999l1.59999,-4.70001l3.90001,-8.29999l2.59999,-3.80002l2.60001,-3.89999l8.5,-8.89999l4.3,-3.10001l4.2,-3.19998l9.99998,-5l4.10001,-1.30002l4.20001,-1.29999l3.79999,-0.70001l3.89999,-0.69998l5.70001,-0.30002l5.79999,-0.29999l5.40002,0.79999l5.39999,0.80002l4.29999,1.29999l4.30002,1.29999l4.29999,2l4.29999,2l4.90002,3.30002l4.89999,3.19998l8.19998,8.30002l6.40002,8.79999l1.79999,3.80002l1.89999,3.69998l3.10001,9l1.79999,9l-0.09998,16l-2.10001,9l-1.30002,3.89999l-1.29999,3.90002l-1.60001,3.09998l-1.5,3.10001l-2.60001,4l-2.59998,4l-8.80002,9.30002l-3.69998,2.79999l-3.70001,2.79999l-9.20001,4.80002l-3.19998,1.29999l-3.30002,1.20001l-4.19998,1.10001l-4.20001,1l-5,0.5l-5.10001,0.39999l-3.5,0l-4,-0.39999zm18,-5.20001l4,-0.79999l3.20001,-1.10001l3.29999,-1.10001l3.60001,-1.60001l3.60001,-1.69998l2.89999,-1.80002l2.89999,-1.89999l8,-6.70001l6,-7.09998l2.60001,-4.20001l2.5,-4.20001l1.80002,-4.69998l1.79999,-4.70001l1.20001,-4.5l1.09998,-4.39999l0,-8.60001l0,-8.5l-1.19998,-4.69998l-1.20001,-4.80002l-1.39999,-3.60001l-1.5,-3.69998l-1.39999,-2.80002l-1.39999,-2.89999l-2.90002,-4l-2.79999,-4l-3.39999,-3.39999l-3.30002,-3.39999l-4.29999,-3l-4.20001,-3l-3.79999,-1.89999l-3.70001,-1.90002l-3.79999,-1.29999l-3.70001,-1.29999l-4,-0.90002l-4,-0.89999l-16.5,0.10001l-5.29999,1.29999l-5.29999,1.40002l-3.20001,1.29999l-3.20001,1.29999l-2.39999,1.10001l-2.39999,1.30002l-3.5,2.5l-3.60001,2.39999l-6.39999,5.69998l-2.60001,3.30002l-2.59999,3.29999l-1.8,2.80002l-1.8,2.79999l-1.3,2.5l-1.29999,2.5l-1.70001,5.20001l-1.79999,5.19998l-0.8,5.10001l-0.8,5.10001l0.10001,7.29999l0.7,5l0.8,4.89999l1,3.40002l1,3.5l1.5,3.59998l1.5,3.60001l2,3.20001l2,3.29999l2,2.60001l2,2.60001l2.59999,2.69998l2.60001,2.40002l3.5,3l3.5,2.79999l3.09999,1.79999l3.10001,1.80002l6.79999,3l3.5,1l3.5,1l3.20001,0.60001l3.29999,0.5l3.5,0.39999l5.5,-0.20001l5.5,-0.19998l4,-0.70001zm-17.5,-20.10001l-1,-0.29999l-3,-0.70001l-3,-0.79999l-3,-1.5l-3,-1.5l-2,-1.60001l-2,-1.5l-1.69998,-1.5l-1.70001,-1.60001l-1.79999,-2.5l-1.89999,-2.5l-1.40001,-2.69998l-1.40001,-2.80002l-1,-3l-0.89999,-3l-0.3,-4.89999l-0.3,-5.10001l1.70001,-8l4.39999,-9.10001l4.10001,-4.09998l4,-4.10001l0.89999,0.79999l0.39999,2l0.60001,1.89999l-2.79999,3.10001l-2.90002,3.10001l-1.39999,2.60001l-1.39999,2.60001l0.60001,0.69998l5,-2.10001l5.10001,-2.09998l0.69998,0.39999l0.60001,0.29999l1.29999,2.5l1.30002,2.5l0.29999,20l0.30002,0.89999l0.39999,0.80002l1.10001,0.29999l1.09998,0.39999l7.5,0.20001l7.5,0.20001l3,-0.40002l3,-0.39999l0.70001,-3.69998l0.60001,-3.80002l-0.30002,-6.79999l-0.19998,-6.80002l1.5,-3.09998l1.5,-3l2.19998,0l9.20001,3.79999l0.5,-0.5l-3.10001,-5.60001l-2.69998,-2.79999l-2.80002,-2.80002l0.39999,-2.09998l0.30002,-2.10001l1.60001,-0.60001l3.89999,4.10001l3.89999,4l1.10001,2.10001l1.19998,2.19998l2.30002,5.5l0.69998,3.39999l0.80002,3.40002l0,6.5l-0.80002,3.89999l-0.79999,3.79999l-1.70001,3.5l-1.59998,3.5l-2.30002,3.10001l-2.29999,3.10001l-6.80002,5.5l-3,1.5l-3,1.5l-4.19998,1l-4.20001,1.10001l-8.60001,-0.10001l-1,-0.20001zm9,-6l1.5,-1.10001l1.40002,-1.89999l1.29999,-2l1.29999,-2.79999l1.20001,-2.89999l-0.20001,-0.10001l-10,0l-10,-0.10001l0.30002,1.89999l1.5,3l1.5,3l1.79999,1.89999l1.89999,1.90002l1.5,0.39999l1.5,0.39999l2,-0.39999l1.5,-1.20001zm-15.29999,-1.60001l0,-0.39999l-1.20001,-2.5l-1.19998,-2.5l-0.89999,-2.79999l-0.80002,-2.89999l-1.10001,-0.10001l-4.29999,-1.60001l-4.20001,-1.70001l-0.89999,-0.39999l-1,-0.39999l0.80002,2.39999l1.59998,2.5l1.60001,2.5l2.70001,2.60001l2.69998,2.60001l2.70001,1.5l2.79999,1.60001l0.70001,0l0,-0.40002zm26.89999,-1l2.39999,-1.29999l7.20001,-7.20001l1.29999,-2.59998l1.30002,-2.60001l-0.5,-0.5l-2.70001,1.29999l-2.69998,1.20001l-2.80002,0.89999l-2.69998,0.89999l-1.20001,3.30002l-1.10001,3.19998l-1,1.89999l-0.89999,1.80002l0,1.10001l0.89999,0l2.5,-1.40002zm-32.60001,-25.59998l0,-10l-1.39999,0l-3.19998,1.5l-3.30002,1.59998l-2.19998,2.20001l-2.20001,2.20001l0,4.5l2.10001,2.19998l2,2.20001l6.19998,3l1.5,0.5l0.5,0.10001l0,-10zm39,8.5l3.20001,-1.40002l5,-5.09998l0,-3.80002l-0.89999,-1.39999l-0.89999,-1.29999l-1.70001,-1.30002l-1.70001,-1.29999l-3,-1.5l-3,-1.39999l-1,0l0,20l0.80002,0l3.19998,-1.5zm-22.59998,-8.60001l-0.5,-0.70001l-2.80002,-5.10001l-2.79999,-5.19998l-2.70001,-5.80002l-2.69998,-5.89999l-1.10001,-3.5l-1.10001,-3.5l0.29999,-2.39999l0.40002,-2.39999l0.89999,-2.20001l1,-2.19998l1.79999,-1.80002l1.80002,-1.79999l2.69998,-1.30002l2.80002,-1.19998l6.19998,0l2.39999,1l2.5,1.10001l3.90002,3.69998l1.19998,2.5l1.10001,2.5l0,5.80002l-1.29999,4.09998l-1.40002,4.10001l-4.89999,9.70001l-4.89999,9.69998l-0.5,0.70001l-0.60001,0.70001l-1.19998,0l-0.5,-0.60001zm6.59998,-20.60001l2.10001,-1.29999l1.30002,-1.90002l1.39999,-2l0.39999,-1.69998l0.5,-1.70001l0,-3l-1,-2.19998l-1,-2.30002l-1.10001,-1.10001l-1.10001,-1.19998l-3.69998,-1.89999l-4.10001,-0.60001l-2.29999,0.60001l-2.40002,0.69998l-2.29999,2.30002l-2.39999,2.29999l-0.5,2.89999l-0.70001,2.80002l0.39999,1.59998l0.40002,1.60001l0.69998,1.5l0.80002,1.5l1,1.20001l1.09998,1.19998l1.5,0.80002l1.5,0.69998l1.20001,0.40002l1.29999,0.5l4.90002,-0.5l2.09998,-1.20001z"
                  id="path1"
                />
              </g>

              <!-- Add some tech elements around the logo -->
              <g transform="translate(250, 380)" opacity="0.3">
                <circle cx="0" cy="0" r="220" stroke-width="2" stroke-dasharray="10,10" />
                <circle cx="0" cy="0" r="200" stroke-width="2" stroke-dasharray="5,5" />
              </g>

              <circle
                cx="0"
                cy="0"
                r="235"
                stroke-width="22"
                stroke="white"
                fill="none"
                transform="translate(253, 377)"
              />

              <!-- Add a subtle glow effect -->
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </g>
          </svg>
        </div>
      </div>

      <div class="button-container">
        <ion-button @click="router.push('/anchor')" size="large" class="nav-button">
          <ion-icon src="/img/anchor.svg" class="custom-icon"></ion-icon>
        </ion-button>

        <ion-button @click="router.push('/sail')" size="large" class="nav-button">
          <ion-icon src="/img/sail-test.svg" class="custom-icon"></ion-icon>
        </ion-button>

        <ion-button @click="router.push('/pages')" size="large" class="nav-button">
          <ion-icon src="/img/pages.svg" class="custom-icon"></ion-icon>
        </ion-button>

        <ion-button @click="router.push('/alerts')" size="large" class="nav-button">
          <ion-icon :icon="notifications" class="custom-icon"></ion-icon>
        </ion-button>

        <ion-button @click="router.push('/settings')" size="large" class="nav-button">
          <ion-icon src="/img/cog.svg" class="custom-icon"></ion-icon>
        </ion-button>

        <!-- <ion-button @click="router.push('/junk3')" size="large" class="nav-button">
          <ion-icon :icon="dice" class="custom-icon"></ion-icon>
        </ion-button> -->
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import {
  IonPage,
  IonHeader,
  IonContent,
  IonButton,
  IonTitle,
  IonIcon,
  IonToolbar,
  IonButtons,
  IonMenuButton,
} from "@ionic/vue";
import { useRouter } from "vue-router";
import { ref, computed, watch, onMounted } from "vue";
import { notifications, dice, tv } from "ionicons/icons";

 
const router = useRouter();

const logoFillColor = ref("white");

onMounted(() => {
  setTimeout(() => {
    const w = window.innerWidth * 0.9;
    const svgw = 500;
    let r = w / svgw;

    // Limit the maximum scale for larger screens
    const maxScale = 0.6; // Adjust this value as needed
    if (r > maxScale) {
      r = maxScale;
    }

    // Set a minimum scale for very small screens
    const minScale = 0.3;
    if (r < minScale) {
      r = minScale;
    }

    const svg = document.getElementById("logo");
    if (svg) {
      svg.style.transformOrigin = "center";
      svg.style.transform = `scale(${r})`;
      document.getElementById("path1").style.boxShadow = "12px 8px 40px 20px #000";
    }
  }, 100); // Small delay to ensure DOM is ready
});
</script>

<style scoped>
ion-title {
  --padding: 0;
  --margin: 0;
  padding: 0;
  margin: 0;
  font-size: 17px !important;
}

ion-header {
  height: auto !important;
}

ion-toolbar {
  --min-height: 44px !important;
  min-height: 44px !important;
  --padding-top: 0 !important;
  --padding-bottom: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

#container {
  text-align: center;
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  padding: 0 20px;
}

.ios-fitness-content {
  --background: var(--ion-background-color, #ffffff) !important;
}

#container strong {
  font-size: 20px;
  line-height: 26px;
}

#container p {
  font-size: 16px;
  line-height: 22px;
  color: #8c8c8c;
  margin: 0;
}

#container a {
  text-decoration: none;
}

.logo {
  width: 200px;
  height: auto;
  margin-bottom: 20px;
}

/* iOS specific styles */
@supports (-webkit-touch-callout: none) {
  ion-header {
    height: auto !important;
    padding-top: env(safe-area-inset-top) !important;
  }

  ion-toolbar {
    --min-height: 44px !important;
    min-height: 44px !important;
    --padding-top: 0 !important;
    --padding-bottom: 0 !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
  }

  ion-title {
    font-size: 17px !important;
    --padding-start: 0 !important;
    --padding-end: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  ion-menu-button {
    font-size: 24px !important;
    width: 24px !important;
    height: 24px !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .home-content {
    --padding-top: env(safe-area-inset-top) !important;
    --padding-bottom: env(safe-area-inset-bottom) !important;
    --padding-start: env(safe-area-inset-left) !important;
    --padding-end: env(safe-area-inset-right) !important;
  }

  #container {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }

  .ios-fitness-content {
    --background: var(--ion-background-color, #ffffff) !important;
  }

  ion-content.ios-fitness-content::part(background) {
    background: var(--ion-background-color, #ffffff) !important;
  }
}

:root {
  --logo-fill-light: red; /* Light mode color */
  --logo-fill-dark: white; /* Dark mode color */
}

.company-logo {
  fill: var(--logo-fill-light); /* Default to light mode */
}
#path1 {
  fill: var(--ion-color-primary-contrast);
  /* fill: var(--logo-fill-light); */
}

.dark-mode .company-logo {
  fill: var(--logo-fill-dark); /* Change fill for dark mode */
}

ion-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding-top: var(--ion-safe-area-top);
  padding-bottom: var(--ion-safe-area-bottom);
}

.regular-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

ion-button.nav-button {
  border: 2px solid var(--ion-color-primary-contrast);
  border-radius: 8px;
  margin: 0 5px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  --background: var(--ion-color-primary);
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 16px;
  --padding-bottom: 16px;
  min-width: 60px;
  min-height: 60px;
}

ion-button.nav-button ion-icon {
  font-size: 24px;
  width: 24px;
  height: 24px;
  color: var(--ion-color-primary-contrast);
}

/* Ensure proper spacing for touch targets */
.button-container ion-button {
  margin: 10px;
}

.logo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 1rem;
  margin-top: 1rem;
  position: relative;
  width: 100%;
  max-width: 500px; /* Limit maximum width on larger screens */
  margin-left: auto;
  margin-right: auto;
  height: auto; /* Allow height to adjust based on content */
  max-height: 50vh; /* Maximum height as percentage of viewport */
}

#logo {
  max-width: 100%;
  height: auto;
  transition: transform 0.5s ease;
  filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.4));
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 50%;
  padding: 15px;
  backdrop-filter: blur(3px);
  animation-name: fadeInOpacity;
  animation-iteration-count: 1;
  animation-timing-function: ease-in;
  animation-duration: 1s;
}

@keyframes fadeInOpacity {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

.company-name {
  margin-top: 3rem;
  text-align: center;
  position: relative;
  margin-bottom: 0;
}

.company-name h1 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--ion-color-primary-contrast);
  margin: 0;
  font-family: "Prompt", sans-serif;
  letter-spacing: 0.05em;
}

/* Media queries for responsive design */
@media (min-width: 768px) {
  .logo-container {
    padding-top: 2rem;
    max-height: 40vh;
  }

  .company-name h1 {
    font-size: 2.5rem;
  }
}

@media (min-width: 1024px) {
  .logo-container {
    padding-top: 1.5rem;
    max-height: 35vh;
  }

  ion-content {
    --padding-top: 3rem;
  }
}

/* Add specific styling for larger screens */
@media (min-width: 1200px) {
  ion-content {
    --padding-top: 5rem;
  }

  .button-container {
    margin-top: 3rem;
  }
}

.button-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: 1.5rem;
  padding: 0 1rem;
  gap: 0.8rem;
}

.nav-button {
  flex: 0 0 auto;
  margin: 0.3rem;
  min-width: 120px;
  max-width: 180px;
}

@media (min-width: 768px) {
  .button-container {
    margin-top: 2rem;
    gap: 1.2rem;
  }

  .nav-button {
    margin: 0.5rem;
  }
}

.menu-icon {
  font-size: 24px;
  width: 24px;
  height: 24px;
  color: var(--ion-color-primary-contrast);
}

/* Safe area handling for mobile */
@supports (padding: max(0px)) {
  ion-header,
  ion-toolbar {
    --padding-top: max(var(--ion-safe-area-top), 16px);
  }

  ion-content {
    --padding-bottom: max(var(--ion-safe-area-bottom), 16px);
  }
}

/* Dark mode specific styling */
.dark ion-content {
  --background: var(--ion-color-dark);
}

.dark .company-name h1 {
  color: var(--ion-color-light);
}

.dark .tagline {
  color: var(--ion-color-medium-tint);
}

.menu-icon {
  font-size: 24px;
  width: 24px;
  height: 24px;
  color: var(--ion-color-primary-contrast);
}

ion-menu-button {
  font-size: 24px !important;
  width: 24px !important;
  height: 24px !important;
  margin: 0 !important;
  padding: 0 !important;
}

.custom-icon {
  width: 24px;
  height: 24px;
  color: var(--ion-color-primary-contrast) !important;
  transform: scale(1.2);
  margin: -2px;
}

.home-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  --padding-top: 3rem;
}

.custom-icon svg {
  width: 100%;
  height: 100%;
  transform: none;
}

/* Add white stroke to logo path */
.company-logo #path1 {
  stroke: white;
  stroke-width: 5px;
  stroke-linejoin: round;
  stroke-linecap: round;
}
</style>
