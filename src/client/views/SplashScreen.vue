<template>
  <ion-page>
    <ion-content :fullscreen="true" class="splash-content">
      <div class="splash-container">
        <div class="logo-container" :class="{ 'animate': isAnimating }">
          <div class="logo-wrapper">
            <img 
              src="/img/compendium_logo.png" 
              alt="Compendium Navigation"
              class="logo-image"
            />
          </div>
          <div class="company-name">
            <h1>COMPENDIUM</h1>
            <h6>SYSTEMS</h6>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { IonPage, IonContent } from '@ionic/vue';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useBoatConnectionStore } from '../stores/boatConnection';

const router = useRouter();
const boatStore = useBoatConnectionStore();
const isAnimating = ref(false);
const isLoading = ref(true);

const startExitAnimation = (route = '/home') => {
  // Add exit animation class
  const container = document.querySelector('.splash-container');
  if (container) {
    container.classList.add('exiting');
  }
  
  // Navigate after exit animation completes
  setTimeout(() => {
    router.replace(route);
  }, 500); // Time for exit animation to complete
};

const checkBoatConnection = async () => {
  try {
    // If we're already connected, go to home
    if (boatStore.connectionStatus === 'connected') {
      return startExitAnimation('/home');
    }
    
    // If we have a boat ID, try to connect
    if (boatStore.boatId) {
      await boatStore.initializeConnection();
      if (boatStore.connectionStatus === 'connected') {
        return startExitAnimation('/home');
      }
    }
    
    // If we get here, we need to pair
    return startExitAnimation('/pair');
  } catch (error) {
    console.error('Error checking boat connection:', error);
    return startExitAnimation('/pair');
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  // Start animations after a small delay
  setTimeout(() => {
    isAnimating.value = true;
    
    // Start exit sequence after 2 seconds
    setTimeout(() => {
      checkBoatConnection();
    }, 2000);
  }, 100);
});
</script>

<style scoped>
.splash-content {
  --background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  overflow: hidden;
}

.splash-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 2rem;
  text-align: center;
}

.logo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateY(30px);
  transition: all 1s cubic-bezier(0.4, 0, 0.2, 1);
}

.logo-container.animate {
  opacity: 1;
  transform: translateY(0);
}

.logo-wrapper {
  position: relative;
  width: 180px;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  padding: 1.5rem;
  overflow: hidden;
  animation: pulse 4s infinite alternate;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  }
  100% {
    transform: scale(1.05);
    box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.5);
  }
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
    drop-shadow(0 0 15px rgba(0, 174, 255, 0.6))
    brightness(1.1)
    contrast(1.1);
}

.company-name {
  margin-top: 1.5rem;
  opacity: 0;
  transform: translateY(20px);
  transition: all 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) 0.3s;
}

.animate .company-name {
  opacity: 1;
  transform: translateY(0);
  transition-delay: 0.3s;
}

/* Exit animation */
.splash-container.exiting .logo-container {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.splash-container.exiting .company-name {
  opacity: 0;
  transform: translateY(-20px);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s;
}

.company-name h1 {
  font-size: 2.5rem;
  font-weight: 400;
  margin: 0;
  color: white;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  letter-spacing: 0.5rem;
  text-transform: uppercase;
}

.company-name h6 {
  font-size: 1.2rem;
  margin: 0.8rem 0 0;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 300;
  letter-spacing: 0.5rem;
  text-transform: uppercase;
  text-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .logo-wrapper {
    width: 160px;
    height: 160px;
  }
  
  .company-name h1 {
    font-size: 2rem;
    letter-spacing: 0.4rem;
  }
  
  .company-name h6 {
    font-size: 1rem;
    letter-spacing: 0.3rem;
  }
}
</style>
