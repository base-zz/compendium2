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
      <div class="logo-container">
        <div class="company-name">
          <h1>Compendium</h1>
          <h6>Systems</h6>
        </div>
        <div class="logo-wrapper">
          <img 
            src="/img/compendium_logo.png" 
            alt="Compendium Navigation"
            class="logo-image"
          />
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

        <ion-button @click="router.push('/weather')" size="large" class="nav-button">
          <ion-icon :icon="partlySunny" class="custom-icon"></ion-icon>
        </ion-button>

        <ion-button @click="router.push('/tides')" size="large" class="nav-button">
          <ion-icon :icon="water" class="custom-icon"></ion-icon>
        </ion-button>

        <ion-button @click="router.push('/settings')" size="large" class="nav-button">
          <ion-icon src="/img/cog.svg" class="custom-icon"></ion-icon>
        </ion-button>

        <ion-button @click="router.push('/bluetooth')" size="large" class="nav-button">
          <ion-icon :icon="bluetooth" class="custom-icon"></ion-icon>
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
import { notifications, dice, tv, partlySunny, water, bluetooth } from "ionicons/icons";

 
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
  gap: clamp(1rem, 4vh, 2.5rem);
  width: 100%;
  max-width: 500px; /* Limit maximum width on larger screens */
  margin: 0 auto;
  padding: clamp(1rem, 3vh, 2rem) 1rem;
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
  margin: 0;
  text-align: center;
  position: relative;
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
    padding: clamp(1.5rem, 4vh, 3rem) 1.5rem;
  }

  .company-name h1 {
    font-size: 2.5rem;
  }
}

@media (min-width: 1024px) {
  .logo-container {
    padding: clamp(2rem, 5vh, 3.5rem) 2rem;
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
  margin-top: clamp(1rem, 4vh, 2.5rem);
  padding: 0 1rem;
  gap: clamp(0.75rem, 3vw, 1rem);
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
}

/* Logo Styles */
.logo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  margin: 0 auto;
  padding: clamp(1rem, 3vh, 2rem) 1rem;
  gap: clamp(1rem, 4vh, 2.5rem);
}

.company-name {
  margin-bottom: clamp(1rem, 3vh, 1.75rem);
  z-index: 1;
}

.company-name h1 {
  font-size: 2.5rem;
  font-weight: 400;
  margin: 0;
  color: var(--ion-color-primary);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  letter-spacing: 0.5rem;
  text-transform: uppercase;
}

.company-name h6 {
  font-size: 1.2rem;
  margin: 0.5rem 0 0;
  color: var(--ion-color-medium);
  font-weight: 400;
  letter-spacing: 0.5rem;
  text-transform: uppercase;
}

.logo-wrapper {
  position: relative;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1rem auto;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
}

.logo-wrapper::before {
  content: '';
  position: absolute;
  width: 120%;
  height: 120%;
  background: radial-gradient(
    circle at 30% 30%,
    rgba(255, 255, 255, 0.3) 0%,
    rgba(255, 255, 255, 0) 60%
  );
  border-radius: 50%;
  animation: rotate 20s linear infinite;
  z-index: -1;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.logo-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: 
    drop-shadow(0 0 10px rgba(0, 119, 255, 0.3))
    drop-shadow(0 0 20px rgba(0, 119, 255, 0.2))
    brightness(1.1)
    contrast(1.1);
  transition: all 0.3s ease;
}

.logo-wrapper:hover .logo-image {
  filter: 
    drop-shadow(0 0 15px rgba(0, 119, 255, 0.5))
    drop-shadow(0 0 30px rgba(0, 119, 255, 0.3))
    brightness(1.2)
    contrast(1.2);
  transform: scale(1.05);
}

/* Float animation removed */

.logo-wrapper {
  transition: all 0.3s ease;
}

@media (max-width: 768px) {
  .logo-wrapper {
    width: 160px;
    height: 160px;
  }
  
  .company-name h1 {
    font-size: 2rem;
  }
  
  .company-name h6 {
    font-size: 1rem;
    letter-spacing: 0.3rem;
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
