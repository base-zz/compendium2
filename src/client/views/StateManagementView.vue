<template>
  <ion-page>
    <generic-header title="State Management" />
    <ion-content class="content-with-header">
      <div class="container">
        <StateManager />
        
        <div class="state-viewer-container">
          <h2>State Data Viewer</h2>
          <StateDataViewer />  
        </div>

        <div class="domain-data" v-if="currentState">
          <h2>Active Domain Data</h2>

          <div
            v-for="domain in currentState.activeDomains"
            :key="domain"
            class="domain-card"
          >
            <h3>{{ getDomainLabel(domain) }}</h3>
            <pre>{{ JSON.stringify(getDomainData(domain), null, 2) }}</pre>
            <ion-button size="small" @click="refreshDomain(domain)">
              <ion-icon :icon="refresh" slot="start"></ion-icon>
              Refresh
            </ion-button>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import { IonPage, IonContent, IonButton, IonIcon } from "@ionic/vue";
import { refresh } from "ionicons/icons";
import { ref, onMounted, onUnmounted } from "vue";
import StateManager from "@client/components/StateManager.vue";
import StateDataViewer from "@client/components/StateDataViewer.vue";
// Import stateDataStore instead of functions from @/state
import { useStateDataStore } from "@/client/stores/stateDataStore";
import GenericHeader from "@client/components/GenericHeader.vue";

export default {
  name: "StateManagementView",
  components: {
    IonPage,
    IonContent,
    IonButton,
    IonIcon,
    StateManager,
    StateDataViewer,
    GenericHeader,
  },
  setup() {
    const currentState = ref(null);
    const domainData = ref({});

    // Domain labels for display
    const domainLabels = {
      navigation: "Navigation",
      anchor: "Anchor",
      environment: "Environment",
      vessel: "Vessel",
      alerts: "Alerts",
      external: "External"
    };

    // Get label for a domain
    const getDomainLabel = (domain) => {
      return domainLabels[domain] || domain;
    };

    // Get data for a specific domain
    const getDomainData = (domain) => {
      return domainData.value[domain] || {};
    };

    // Refresh a specific domain
    const refreshDomain = async (domain) => {
      try {
        console.log(`Refreshing ${domain} domain`);
        // Use stateDataStore to get the latest data
        const stateDataStore = useStateDataStore();
        
        // Map domain names to their corresponding state properties
        switch (domain) {
          case 'navigation':
            domainData.value[domain] = stateDataStore.navigationState;
            break;
          case 'anchor':
            domainData.value[domain] = stateDataStore.anchorState;
            break;
          case 'environment':
            domainData.value[domain] = stateDataStore.environmentState;
            break;
          case 'vessel':
            domainData.value[domain] = stateDataStore.vesselState;
            break;
          case 'alerts':
            domainData.value[domain] = stateDataStore.alertsState;
            break;
          case 'external':
            domainData.value[domain] = stateDataStore.externalState;
            break;
          default:
            console.warn(`Unknown domain: ${domain}`);
        }
        
        // Log the refreshed data for debugging
        console.log(`[StateManagementView] Refreshed ${domain} data:`, JSON.stringify(domainData.value[domain]));
      } catch (error) {
        console.error(`Error refreshing ${domain} domain:`, error);
      }
    };

    // Update all active domains
    const updateActiveDomains = () => {
      if (!currentState.value) return;

      currentState.value.activeDomains.forEach((domain) => {
        refreshDomain(domain);
      });
    };

    // Handle state change events
    const handleStateChange = (event) => {
      currentState.value = event.detail.profile;
      updateActiveDomains();
    };

    onMounted(async () => {
      // Initialize state management using stateDataStore instead
      // await initializeStateManagement();
      const stateDataStore = useStateDataStore();
      await stateDataStore.init();

      // Get current state from stateDataStore
      // currentState.value = getCurrentState();
      currentState.value = {
        id: 'default',
        name: 'Default State',
        activeDomains: ['navigation', 'anchor', 'environment'],
        inactiveDomains: []
      };

      // Update active domains
      updateActiveDomains();

      // Listen for state changes
      document.addEventListener("vesselStateChanged", handleStateChange);
    });

    onUnmounted(() => {
      // Remove event listener
      document.removeEventListener("vesselStateChanged", handleStateChange);
    });

    return {
      currentState,
      getDomainLabel,
      getDomainData,
      refreshDomain,
      refresh,
    };
  },
};
</script>

<style scoped>
.container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.domain-data {
  margin-top: 30px;
}

.state-viewer-container {
  margin-top: 30px;
  margin-bottom: 30px;
}

.domain-card {
  background-color: #f5f7fa;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.domain-card h3 {
  margin-top: 0;
  color: #3880ff;
  border-bottom: 1px solid #ddd;
  padding-bottom: 8px;
  margin-bottom: 15px;
}

pre {
  background-color: #f0f0f0;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.9rem;
  margin-bottom: 10px;
}
</style>
