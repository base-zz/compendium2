<template>
  <div class="state-manager">
    <h2>Vessel State</h2>
    
    <div class="current-state" v-if="currentState">
      <div class="state-icon">
        <img :src="getStateIcon(currentState.id)" alt="State icon" width="40" height="40">
      </div>
      <div class="state-info">
        <h3>{{ currentState.name }}</h3>
        <p>{{ currentState.description }}</p>
        <div class="active-domains">
          <span v-for="domain in currentState.activeDomains" :key="domain" class="domain-badge">
            {{ domainLabels[domain] }}
          </span>
        </div>
      </div>
    </div>
    
    <div class="state-selector">
      <h4>Change State</h4>
      <div class="state-options">
        <div 
          v-for="profile in availableProfiles" 
          :key="profile.id"
          class="state-option"
          :class="{ active: currentState && currentState.id === profile.id }"
          @click="changeState(profile.id)"
        >
          <img :src="getStateIcon(profile.id)" alt="State icon" width="30" height="30">
          <span>{{ profile.name }}</span>
        </div>
      </div>
    </div>
    
    <div class="custom-states" v-if="showCustomStates">
      <h4>Custom States</h4>
      <div class="custom-state-list">
        <div 
          v-for="profile in customProfiles" 
          :key="profile.id"
          class="custom-state-item"
        >
          <div class="custom-state-info">
            <img :src="getStateIcon(profile.id)" alt="State icon" width="30" height="30">
            <span>{{ profile.name }}</span>
          </div>
          <div class="custom-state-actions">
            <ion-button size="small" @click="editCustomState(profile.id)">Edit</ion-button>
            <ion-button size="small" color="danger" @click="deleteCustomState(profile.id)">Delete</ion-button>
          </div>
        </div>
        
        <ion-button expand="block" @click="createNewCustomState">
          <img src="/img/cog.svg" alt="Settings icon" width="20" height="20" style="margin-right: 8px;">
          Create New State
        </ion-button>
      </div>
    </div>
    
    <!-- State Editor Modal -->
    <ion-modal :is-open="showStateEditor">
      <div class="state-editor">
        <h3>{{ editingState.id ? 'Edit' : 'Create' }} Custom State</h3>
        
        <ion-item>
          <ion-label position="floating">State Name</ion-label>
          <ion-input v-model="editingState.name"></ion-input>
        </ion-item>
        
        <ion-item>
          <ion-label position="floating">Description</ion-label>
          <ion-textarea v-model="editingState.description"></ion-textarea>
        </ion-item>
        
        <h4>Active Domains</h4>
        <div class="domain-checkboxes">
          <ion-item v-for="domain in availableDomains" :key="domain">
            <ion-label>{{ domainLabels[domain] }}</ion-label>
            <ion-checkbox 
              v-model="editingState.domainSelections[domain]"
              @ionChange="updateActiveDomains"
            ></ion-checkbox>
          </ion-item>
        </div>
        
        <h4>Update Frequencies</h4>
        <div class="frequency-settings">
          <ion-item v-for="domain in editingState.activeDomains" :key="domain">
            <ion-label>{{ domainLabels[domain] }}</ion-label>
            <ion-select v-model="editingState.updateFrequencies[domain]">
              <ion-select-option :value="1000">1 second</ion-select-option>
              <ion-select-option :value="5000">5 seconds</ion-select-option>
              <ion-select-option :value="10000">10 seconds</ion-select-option>
              <ion-select-option :value="30000">30 seconds</ion-select-option>
              <ion-select-option :value="60000">1 minute</ion-select-option>
              <ion-select-option :value="300000">5 minutes</ion-select-option>
              <ion-select-option :value="900000">15 minutes</ion-select-option>
              <ion-select-option :value="1800000">30 minutes</ion-select-option>
            </ion-select>
          </ion-item>
          
          <ion-item>
            <ion-label>PocketBase Sync</ion-label>
            <ion-select v-model="editingState.updateFrequencies.pocketbaseSync">
              <ion-select-option :value="10000">10 seconds</ion-select-option>
              <ion-select-option :value="30000">30 seconds</ion-select-option>
              <ion-select-option :value="60000">1 minute</ion-select-option>
              <ion-select-option :value="300000">5 minutes</ion-select-option>
              <ion-select-option :value="900000">15 minutes</ion-select-option>
              <ion-select-option :value="1800000">30 minutes</ion-select-option>
            </ion-select>
          </ion-item>
        </div>
        
        <div class="modal-buttons">
          <ion-button @click="cancelStateEdit">Cancel</ion-button>
          <ion-button @click="saveCustomState" color="primary">Save</ion-button>
        </div>
      </div>
    </ion-modal>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { 
  IonButton, 
  IonItem, 
  IonLabel, 
  IonInput, 
  IonTextarea, 
  IonCheckbox,
  IonSelect,
  IonSelectOption,
  IonModal
} from '@ionic/vue';
// Using stateDataStore instead of stateManager
import { useStateDataStore } from '../stores/stateDataStore';

export default {
  name: 'StateManager',
  components: {
    IonButton,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonCheckbox,
    IonSelect,
    IonSelectOption,
    IonModal
  },
  setup() {
    const stateDataStore = useStateDataStore();
    
    // Use stateDataStore instead of stateManager
    const currentState = computed(() => {
      // Return a simplified state object based on stateDataStore data
      return {
        id: 'current',
        name: 'Current State',
        description: 'The current vessel state based on real-time data',
        activeDomains: ['navigation', 'anchor', 'alerts']
      };
    });
    
    const availableProfiles = computed(() => {
      // Return a simplified list of profiles
      return [
        {
          id: 'anchored',
          name: 'Anchored',
          description: 'Vessel is at anchor',
          activeDomains: ['anchor', 'alerts']
        },
        {
          id: 'sailing',
          name: 'Sailing',
          description: 'Vessel is under sail',
          activeDomains: ['navigation', 'alerts']
        },
        {
          id: 'motoring',
          name: 'Motoring',
          description: 'Vessel is under power',
          activeDomains: ['navigation', 'alerts']
        }
      ];
    });
    
    const customProfiles = computed(() => {
      // Return a simplified list of custom profiles
      return [
        {
          id: 'custom-1',
          name: 'Custom Profile 1',
          description: 'A custom vessel state profile',
          activeDomains: ['navigation', 'anchor', 'alerts']
        }
      ];
    });
    
    const showCustomStates = ref(true);
    const showStateEditor = ref(false);
    
    const editingState = ref({
      id: '',
      name: '',
      description: '',
      icon: 'settings',
      activeDomains: [],
      inactiveDomains: [],
      updateFrequencies: {
        navigation: 30000,
        anchor: 30000,
        systems: 300000,
        location: 60000,
        pocketbaseSync: 300000
      },
      domainSelections: {
        navigation: false,
        anchor: false,
        systems: true,
        location: true
      }
    });
    
    const domainLabels = {
      navigation: 'Navigation',
      anchor: 'Anchor',
      systems: 'Systems',
      location: 'Location'
    };
    
    const availableDomains = ['navigation', 'anchor', 'systems', 'location'];
    
    // Change the current vessel state
    function changeState(stateId) {
      console.log(`[StateManager] Changing state to ${stateId}`);
      // Use stateDataStore to update state based on the selected profile
      if (stateId === 'anchored') {
        // Set anchor state
        stateDataStore.anchorState.isDeployed = true;
      } else if (stateId === 'sailing' || stateId === 'motoring') {
        // Set navigation state
        stateDataStore.anchorState.isDeployed = false;
      }
    }
    
    // Get the appropriate icon for a state
    function getStateIcon(stateId) {
      switch (stateId) {
        case 'marina': return '/img/home.svg';
        case 'anchored': return '/img/anchor.svg';
        case 'underway': return '/img/sail.svg';
        default: return '/img/cog.svg';
      }
    }
    
    // Create a new custom state
    function createNewCustomState() {
      // Reset editing state
      editingState.value = {
        id: '',
        name: 'New Custom State',
        description: 'Custom vessel state',
        icon: 'settings',
        activeDomains: ['systems', 'location'],
        inactiveDomains: ['navigation', 'anchor'],
        updateFrequencies: {
          navigation: 30000,
          anchor: 30000,
          systems: 300000,
          location: 60000,
          pocketbaseSync: 300000
        },
        domainSelections: {
          navigation: false,
          anchor: false,
          systems: true,
          location: true
        }
      };
      
      showStateEditor.value = true;
    }
    
    // Edit an existing custom state
    function editCustomState(stateId) {
      // Find the profile in our custom profiles
      const profile = availableProfiles.value.find(p => p.id === stateId) || 
                      customProfiles.value.find(p => p.id === stateId);
      if (!profile) return;
      
      // Set up domain selections based on active domains
      const domainSelections = {};
      availableDomains.forEach(domain => {
        domainSelections[domain] = profile.activeDomains.includes(domain);
      });
      
      editingState.value = {
        ...profile,
        domainSelections
      };
      
      showStateEditor.value = true;
    }
    
    // Delete a custom state
    function deleteCustomState(stateId) {
      const profile = customProfiles.value.find(p => p.id === stateId);
      if (!profile) return;
      
      if (confirm(`Are you sure you want to delete the state "${profile.name}"?`)) {
        console.log(`[StateManager] Deleting custom state: ${stateId}`);
        // In a real implementation, we would remove the profile from storage
      }
    }
    
    // Update active domains based on checkboxes
    function updateActiveDomains() {
      const activeDomains = [];
      const inactiveDomains = [];
      
      for (const domain in editingState.value.domainSelections) {
        if (editingState.value.domainSelections[domain]) {
          activeDomains.push(domain);
        } else {
          inactiveDomains.push(domain);
        }
      }
      
      editingState.value.activeDomains = activeDomains;
      editingState.value.inactiveDomains = inactiveDomains;
    }
    
    // Save the custom state
    function saveCustomState() {
      // Generate an ID if this is a new state
      if (!editingState.value.id) {
        editingState.value.id = 'custom_' + Date.now();
      }
      
      // Update active domains
      updateActiveDomains();
      
      // Save the profile
      console.log('[StateManager] Saving custom profile:', editingState.value);
      // We would save this to storage in a real implementation
      
      // Close the editor
      showStateEditor.value = false;
    }
    
    // Cancel state editing
    function cancelStateEdit() {
      showStateEditor.value = false;
    }
    
    onMounted(() => {
      // Initialize state if needed
      if (!currentState.value) {
        stateManager.detectInitialState();
      }
    });
    
    return {
      currentState,
      availableProfiles,
      customProfiles,
      showCustomStates,
      showStateEditor,
      editingState,
      domainLabels,
      availableDomains,
      changeState,
      getStateIcon,
      createNewCustomState,
      editCustomState,
      deleteCustomState,
      updateActiveDomains,
      saveCustomState,
      cancelStateEdit
    };
  }
};
</script>

<style scoped>
.state-manager {
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 20px;
}

.current-state {
  display: flex;
  align-items: center;
  background-color: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.state-icon {
  font-size: 2.5rem;
  margin-right: 15px;
  color: #3880ff;
}

.state-info h3 {
  margin: 0 0 5px 0;
  color: #3880ff;
}

.state-info p {
  margin: 0 0 10px 0;
  color: #666;
}

.active-domains {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.domain-badge {
  background-color: #3880ff;
  color: white;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
}

.state-selector {
  margin-bottom: 20px;
}

.state-selector h4 {
  margin-bottom: 10px;
  color: #444;
}

.state-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.state-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.state-option:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.state-option.active {
  background-color: #3880ff;
  color: white;
}

.state-option ion-icon {
  font-size: 2rem;
  margin-bottom: 5px;
}

.custom-states {
  margin-top: 30px;
}

.custom-states h4 {
  margin-bottom: 10px;
  color: #444;
}

.custom-state-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.custom-state-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: white;
  padding: 10px 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.custom-state-info {
  display: flex;
  align-items: center;
}

.custom-state-info ion-icon {
  font-size: 1.5rem;
  margin-right: 10px;
  color: #3880ff;
}

.custom-state-actions {
  display: flex;
  gap: 5px;
}

.state-editor {
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  max-width: 500px;
  margin: 0 auto;
}

.state-editor h3 {
  margin-bottom: 20px;
  color: #3880ff;
}

.domain-checkboxes {
  margin-bottom: 20px;
}

.frequency-settings {
  margin-bottom: 20px;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
</style>
