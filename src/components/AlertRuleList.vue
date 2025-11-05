<template>
  <ion-page>
    <generic-header title="Alert Rules" />
    <ion-content class="alert-rules-content">
      <div class="alert-rule-list">
        <div class="header">
          <button class="btn-add" @click="createNewRule">
            <i class="fas fa-plus"></i> New Rule
          </button>
        </div>
    
    <div v-if="loading" class="loading">
      <i class="fas fa-spinner fa-spin"></i> Loading alert rules...
    </div>
    
    <div v-else-if="!stateStore.getAlertRules.length" class="empty-state">
      <div class="empty-icon">
        <i class="fas fa-bell-slash"></i>
      </div>
      <h3>No Alert Rules</h3>
      <p>Create your first alert rule to get notified when specific conditions are met.</p>
      <button class="btn-primary" @click="createNewRule">Create Alert Rule</button>
    </div>
    
    <div v-else class="rule-list">
      <div v-for="rule in stateStore.getAlertRules" :key="rule.id" class="rule-card">
        <div class="rule-header">
          <div class="rule-title">
            <span :class="['status-indicator', rule.enabled ? 'enabled' : 'disabled']"></span>
            <h3>{{ rule.name }}</h3>
          </div>
          <div class="rule-actions">
            <button class="btn-toggle" @click="toggleRule(rule)" :title="rule.enabled ? 'Disable rule' : 'Enable rule'">
              <i :class="['fas', rule.enabled ? 'fa-toggle-on' : 'fa-toggle-off']"></i>
            </button>
            <button class="btn-edit" @click="editRule(rule)" title="Edit rule">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-delete" @click="confirmDeleteRule(rule)" title="Delete rule">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        
        <div class="rule-details">
          <div class="rule-condition">
            <span class="label">When</span>
            <span class="source">{{ formatSource(rule.source) }}</span>
            <span class="operator">{{ formatOperator(rule.operator) }}</span>
            <span class="threshold">{{ formatThreshold(rule) }}</span>
          </div>
          
          <div class="rule-alert">
            <span class="label">Alert</span>
            <span class="alert-type" :class="'alert-level-' + rule.alertLevel.toLowerCase()">
              {{ rule.alertLevel }}
            </span>
            <span class="alert-message">{{ rule.message }}</span>
          </div>
          
          <div class="rule-strategies">
            <span class="label">Strategies</span>
            <div class="strategy-tags">
              <span v-for="(strategy, index) in rule.strategies" :key="index" class="strategy-tag">
                {{ formatStrategy(strategy) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <teleport to="body">
      <div v-if="showDeleteConfirm" class="modal-overlay">
        <div class="modal-content">
          <h3>Delete Alert Rule</h3>
          <p>Are you sure you want to delete the rule "{{ selectedRule?.name }}"?</p>
          <p>This action cannot be undone.</p>
          <div class="modal-actions">
            <button class="btn-secondary" @click="showDeleteConfirm = false">Cancel</button>
            <button class="btn-danger" @click="deleteRule">Delete</button>
          </div>
        </div>
      </div>
    </teleport>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonContent } from '@ionic/vue';
import GenericHeader from '@/components/GenericHeader.vue';
import { useStateDataStore } from '@/stores/stateDataStore';

const router = useRouter();
const stateStore = useStateDataStore();
const loading = ref(true);
const showDeleteConfirm = ref(false);
const selectedRule = ref(null);

// Load alert rules when component mounts
onMounted(async () => {
  await stateStore.loadAlertRules();
  loading.value = false;
});

// Create a new rule
const createNewRule = () => {
  router.push({ name: 'alert-rule-editor', params: { mode: 'create' } });
};

// Edit an existing rule
const editRule = (rule) => {
  router.push({ name: 'alert-rule-editor', params: { mode: 'edit', id: rule.id } });
};

// Toggle rule enabled/disabled state
const toggleRule = async (rule) => {
  await stateStore.toggleAlertRule(rule.id, !rule.enabled);
};

// Confirm rule deletion
const confirmDeleteRule = (rule) => {
  selectedRule.value = rule;
  showDeleteConfirm.value = true;
};

// Delete the rule
const deleteRule = async () => {
  if (selectedRule.value) {
    await stateStore.deleteAlertRule(selectedRule.value.id);
    showDeleteConfirm.value = false;
    selectedRule.value = null;
  }
};

// Format the data source for display
const formatSource = (source) => {
  const sourceMappings = {
    'navigation.depth.belowKeel': 'Depth Below Keel',
    'navigation.position.speed': 'Speed Over Ground',
    'navigation.speedThroughWater': 'Speed Through Water',
    'environment.wind.speedApparent': 'Apparent Wind Speed',
    'environment.wind.speedTrue': 'True Wind Speed',
    'environment.outside.temperature': 'Outside Temperature',
    'electrical.batteries.voltage': 'Battery Voltage',
    'electrical.batteries.capacity': 'Battery Capacity',
    'tanks.fuel.level': 'Fuel Tank Level',
    'tanks.freshWater.level': 'Fresh Water Tank Level',
    'tanks.wasteWater.level': 'Waste Water Tank Level',
    'propulsion.engine.temperature': 'Engine Temperature',
    'propulsion.engine.oilPressure': 'Engine Oil Pressure'
  };
  
  return sourceMappings[source] || source;
};

// Format the operator for display
const formatOperator = (operator) => {
  const operatorMappings = {
    'EQUALS': 'equals',
    'NOT_EQUALS': 'does not equal',
    'LESS_THAN': 'is less than',
    'LESS_THAN_EQUALS': 'is less than or equal to',
    'GREATER_THAN': 'is greater than',
    'GREATER_THAN_EQUALS': 'is greater than or equal to',
    'BETWEEN': 'is between',
    'NOT_BETWEEN': 'is not between',
    'CONTAINS': 'contains',
    'NOT_CONTAINS': 'does not contain'
  };
  
  return operatorMappings[operator] || operator;
};

// Format the threshold for display
const formatThreshold = (rule) => {
  if (rule.operator === 'BETWEEN' || rule.operator === 'NOT_BETWEEN') {
    return `${rule.threshold} and ${rule.secondaryThreshold}`;
  }
  
  // Add units based on the source
  const unitsMap = {
    'navigation.depth.belowKeel': 'm',
    'navigation.position.speed': 'kts',
    'navigation.speedThroughWater': 'kts',
    'environment.wind.speedApparent': 'kts',
    'environment.wind.speedTrue': 'kts',
    'environment.outside.temperature': '°C',
    'electrical.batteries.voltage': 'V',
    'electrical.batteries.capacity': '%',
    'tanks.fuel.level': '%',
    'tanks.freshWater.level': '%',
    'tanks.wasteWater.level': '%',
    'propulsion.engine.temperature': '°C',
    'propulsion.engine.oilPressure': 'bar'
  };
  
  const unit = unitsMap[rule.source] || '';
  return `${rule.threshold}${unit}`;
};

// Format the prevention strategy for display
const formatStrategy = (strategy) => {
  const strategyMappings = {
    'COOLDOWN': 'Cooldown',
    'STATE_TRACKING': 'State Tracking',
    'DEBOUNCE': 'Debounce',
    'HYSTERESIS': 'Hysteresis'
  };
  
  return strategyMappings[strategy] || strategy;
};
</script>

<style scoped>
.alert-rules-content {
  --background: var(--app-background-color);
}

.alert-rule-list {
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100%;
}

.header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-top: 0.5rem;
}

.btn-add {
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-add:hover {
  background-color: #45a049;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  background-color: #f9f9f9;
  border-radius: 8px;
  margin-top: 1rem;
}

.empty-icon {
  font-size: 3rem;
  color: #ccc;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0.5rem 0;
  color: #333;
}

.empty-state p {
  color: #666;
  margin-bottom: 1.5rem;
}

.btn-primary {
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.btn-primary:hover {
  background-color: #0b7dda;
}

.rule-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1rem;
}

.rule-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.rule-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #f5f5f5;
  border-bottom: 1px solid #eee;
}

.rule-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rule-title h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 500;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-indicator.enabled {
  background-color: #4caf50;
}

.status-indicator.disabled {
  background-color: #ccc;
}

.rule-actions {
  display: flex;
  gap: 0.5rem;
}

.rule-actions button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  color: #666;
}

.rule-actions button:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.btn-toggle {
  font-size: 1.2rem;
}

.btn-toggle .fa-toggle-on {
  color: #4caf50;
}

.btn-toggle .fa-toggle-off {
  color: #999;
}

.rule-details {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.rule-condition, .rule-alert, .rule-strategies {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.label {
  font-weight: 500;
  color: #666;
  min-width: 60px;
}

.source {
  font-weight: 500;
  color: #2196f3;
}

.operator {
  color: #666;
}

.threshold {
  font-weight: 500;
}

.alert-type {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: uppercase;
}

.alert-level-info {
  background-color: #e3f2fd;
  color: #0d47a1;
}

.alert-level-warning {
  background-color: #fff8e1;
  color: #ff8f00;
}

.alert-level-critical {
  background-color: #ffebee;
  color: #c62828;
}

.alert-message {
  font-style: italic;
  color: #333;
}

.strategy-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.strategy-tag {
  background-color: #f1f1f1;
  color: #666;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 1rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.btn-secondary {
  background-color: #f1f1f1;
  color: #333;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

.btn-danger {
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.btn-danger:hover {
  background-color: #d32f2f;
}
</style>
