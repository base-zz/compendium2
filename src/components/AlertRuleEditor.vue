<template>
  <div class="alert-rule-editor">
    <div class="header">
      <h2>{{ isEditMode ? 'Edit Alert Rule' : 'Create Alert Rule' }}</h2>
      <button class="btn-close" @click="goBack">
        <i class="fas fa-times"></i>
      </button>
    </div>
    
    <form @submit.prevent="saveRule" class="rule-form">
      <div class="form-section">
        <h3>Rule Information</h3>
        
        <div class="form-group">
          <label for="rule-name">Rule Name</label>
          <input 
            id="rule-name" 
            v-model="rule.name" 
            type="text" 
            required 
            placeholder="Enter a descriptive name for this rule"
          />
        </div>
        
        <div class="form-group">
          <label for="rule-enabled">Status</label>
          <div class="toggle-wrapper">
            <label class="toggle">
              <input type="checkbox" v-model="rule.enabled">
              <span class="toggle-slider"></span>
            </label>
            <span class="toggle-label">{{ rule.enabled ? 'Enabled' : 'Disabled' }}</span>
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>Condition</h3>
        
        <div class="form-group">
          <label for="rule-source">Data Source</label>
          <select id="rule-source" v-model="rule.source" required @change="updateThresholdUnits">
            <option value="" disabled>Select a data source</option>
            <option v-for="source in dataSources" :key="source.value" :value="source.value">
              {{ source.label }}
            </option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="rule-operator">Operator</label>
          <select id="rule-operator" v-model="rule.operator" required>
            <option value="" disabled>Select an operator</option>
            <option v-for="op in operators" :key="op.value" :value="op.value">
              {{ op.label }}
            </option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="rule-threshold">Threshold {{ thresholdUnit ? `(${thresholdUnit})` : '' }}</label>
          <input 
            id="rule-threshold" 
            v-model.number="rule.threshold" 
            type="number" 
            step="any" 
            required 
            placeholder="Enter threshold value"
          />
        </div>
        
        <div v-if="showSecondaryThreshold" class="form-group">
          <label for="rule-secondary-threshold">Secondary Threshold {{ thresholdUnit ? `(${thresholdUnit})` : '' }}</label>
          <input 
            id="rule-secondary-threshold" 
            v-model.number="rule.secondaryThreshold" 
            type="number" 
            step="any" 
            required 
            placeholder="Enter secondary threshold value"
          />
        </div>
      </div>
      
      <div class="form-section">
        <h3>Alert Details</h3>
        
        <div class="form-group">
          <label for="rule-alert-type">Alert Type</label>
          <select id="rule-alert-type" v-model="rule.alertType" required>
            <option value="" disabled>Select alert type</option>
            <option v-for="type in alertTypes" :key="type.value" :value="type.value">
              {{ type.label }}
            </option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="rule-alert-category">Alert Category</label>
          <select id="rule-alert-category" v-model="rule.alertCategory" required>
            <option value="" disabled>Select alert category</option>
            <option v-for="category in alertCategories" :key="category.value" :value="category.value">
              {{ category.label }}
            </option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="rule-alert-level">Alert Level</label>
          <select id="rule-alert-level" v-model="rule.alertLevel" required>
            <option value="" disabled>Select alert level</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="rule-message">Alert Message</label>
          <textarea 
            id="rule-message" 
            v-model="rule.message" 
            required 
            placeholder="Enter alert message (use {value} to include the actual value)"
            rows="3"
          ></textarea>
          <small class="help-text">Use {value} to include the actual value in your message.</small>
        </div>
        
        <div class="form-group">
          <label for="rule-notify-mobile">Notify on Mobile</label>
          <div class="toggle-wrapper">
            <label class="toggle">
              <input type="checkbox" v-model="rule.notifyOnMobile">
              <span class="toggle-slider"></span>
            </label>
            <span class="toggle-label">{{ rule.notifyOnMobile ? 'Yes' : 'No' }}</span>
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>Prevention Strategies</h3>
        <p class="section-description">
          Select one or more strategies to prevent duplicate or unwanted alerts.
        </p>
        
        <div class="strategy-options">
          <div 
            v-for="strategy in preventionStrategies" 
            :key="strategy.value" 
            class="strategy-option"
            :class="{ selected: rule.strategies.includes(strategy.value) }"
            @click="toggleStrategy(strategy.value)"
          >
            <div class="strategy-header">
              <h4>{{ strategy.label }}</h4>
              <i class="fas fa-check" v-if="rule.strategies.includes(strategy.value)"></i>
            </div>
            <p>{{ strategy.description }}</p>
          </div>
        </div>
        
        <div class="strategy-settings" v-if="rule.strategies.length > 0">
          <h4>Strategy Settings</h4>
          
          <div v-if="rule.strategies.includes('COOLDOWN')" class="form-group">
            <label for="cooldown-ms">Cooldown Period (seconds)</label>
            <input 
              id="cooldown-ms" 
              v-model.number="rule.strategyOptions.cooldownMs" 
              type="number" 
              min="1" 
              step="1" 
              required 
              @input="convertSecondsToMs('cooldownMs')"
            />
          </div>
          
          <div v-if="rule.strategies.includes('DEBOUNCE')" class="form-group">
            <label for="debounce-ms">Debounce Period (seconds)</label>
            <input 
              id="debounce-ms" 
              v-model.number="rule.strategyOptions.debounceMs" 
              type="number" 
              min="1" 
              step="1" 
              required 
              @input="convertSecondsToMs('debounceMs')"
            />
          </div>
          
          <div v-if="rule.strategies.includes('HYSTERESIS')" class="form-group">
            <label for="hysteresis-margin">Hysteresis Margin {{ thresholdUnit ? `(${thresholdUnit})` : '' }}</label>
            <input 
              id="hysteresis-margin" 
              v-model.number="rule.strategyOptions.hysteresisMargin" 
              type="number" 
              min="0" 
              step="any" 
              required 
            />
          </div>
          
          <div v-if="rule.strategies.includes('STATE_TRACKING') || rule.strategies.includes('HYSTERESIS')" class="form-group">
            <label for="is-higher-bad">Value Direction</label>
            <select id="is-higher-bad" v-model="rule.strategyOptions.isHigherBad">
              <option :value="true">Higher values are bad</option>
              <option :value="false">Lower values are bad</option>
            </select>
          </div>
        </div>
      </div>
      
      <div v-if="testResult" class="test-result">
        <p v-if="testResult.status === 'no-value'">
          Current value for this data source is not available, so the rule cannot be tested right now.
        </p>
        <p v-else-if="testResult.status === 'trigger'">
          Current value: {{ testResult.value }}. This rule WOULD trigger right now.
        </p>
        <p v-else>
          Current value: {{ testResult.value }}. This rule would NOT trigger right now.
        </p>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-secondary" @click="goBack">Cancel</button>
        <button type="button" class="btn-secondary" @click="testRule">Test Rule</button>
        <button type="submit" class="btn-primary">{{ isEditMode ? 'Update Rule' : 'Create Rule' }}</button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStateDataStore } from '@/stores/stateDataStore';
import { ALERT_RULE_OPERATORS } from '@/shared/alertRuleModel.js';
import { getDataPathsFromState, getPathUnit } from '@/shared/stateDataPaths.js';

const route = useRoute();
const router = useRouter();
const stateStore = useStateDataStore();

// Determine if we're in edit mode
const isEditMode = computed(() => route.params.mode === 'edit');

// Initialize rule with default values
const rule = ref({
  name: '',
  enabled: true,
  source: '',
  operator: '',
  threshold: null,
  secondaryThreshold: null,
  alertType: 'THRESHOLD',
  alertCategory: 'SYSTEM',
  alertLevel: 'WARNING',
  message: '',
  notifyOnMobile: false,
  strategies: ['COOLDOWN'],
  strategyOptions: {
    cooldownMs: 300000, // 5 minutes in milliseconds
    debounceMs: 10000,  // 10 seconds in milliseconds
    hysteresisMargin: 1,
    isHigherBad: true
  }
});

const testResult = ref(null);

// Threshold unit based on the selected data source
const thresholdUnit = ref('');

// Load rule data if in edit mode
onMounted(async () => {
  // Load alert rules
  await stateStore.loadAlertRules();
  
  // Load available data sources from state
  loadDataSources();
  
  if (isEditMode.value && route.params.id) {
    const existingRule = stateStore.getAlertRules().find(r => r.id === route.params.id);
    
    if (existingRule) {
      rule.value = JSON.parse(JSON.stringify(existingRule));
      updateThresholdUnits();
    } else {
      // Rule not found, go back to list
      goBack();
    }
  }
});

const getCurrentValueForSource = () => {
  if (!rule.value || !rule.value.source) {
    return { hasValue: false, value: null };
  }

  if (!stateStore || !stateStore.state) {
    return { hasValue: false, value: null };
  }

  const parts = String(rule.value.source).split('.');
  let node = stateStore.state;

  for (const part of parts) {
    if (!node || typeof node !== 'object' || !(part in node)) {
      return { hasValue: false, value: null };
    }
    node = node[part];
  }

  let value = node;
  if (value && typeof value === 'object' && 'value' in value) {
    value = value.value;
  }

  if (value === null || value === undefined || Number.isNaN(value)) {
    return { hasValue: false, value: null };
  }

  return { hasValue: true, value };
};

const evaluateRuleCondition = (ruleToEval, currentValue) => {
  if (currentValue === null || currentValue === undefined) {
    return false;
  }

  const operator = ruleToEval.operator;
  const threshold = ruleToEval.threshold;
  const secondary = ruleToEval.secondaryThreshold;

  const opEquals = operator === ALERT_RULE_OPERATORS.EQUALS || operator === 'EQUALS';
  const opNotEquals = operator === ALERT_RULE_OPERATORS.NOT_EQUALS || operator === 'NOT_EQUALS';
  const opLt = operator === ALERT_RULE_OPERATORS.LESS_THAN || operator === 'LESS_THAN';
  const opLte = operator === ALERT_RULE_OPERATORS.LESS_THAN_EQUALS || operator === 'LESS_THAN_EQUALS';
  const opGt = operator === ALERT_RULE_OPERATORS.GREATER_THAN || operator === 'GREATER_THAN';
  const opGte = operator === ALERT_RULE_OPERATORS.GREATER_THAN_EQUALS || operator === 'GREATER_THAN_EQUALS';
  const opBetween = operator === ALERT_RULE_OPERATORS.BETWEEN || operator === 'BETWEEN';
  const opNotBetween = operator === ALERT_RULE_OPERATORS.NOT_BETWEEN || operator === 'NOT_BETWEEN';
  const opContains = operator === 'CONTAINS';
  const opNotContains = operator === 'NOT_CONTAINS';

  if (opEquals) {
    return currentValue === threshold;
  }

  if (opNotEquals) {
    return currentValue !== threshold;
  }

  if (opLt) {
    return Number(currentValue) < Number(threshold);
  }

  if (opLte) {
    return Number(currentValue) <= Number(threshold);
  }

  if (opGt) {
    return Number(currentValue) > Number(threshold);
  }

  if (opGte) {
    return Number(currentValue) >= Number(threshold);
  }

  if (opBetween) {
    if (threshold === null || threshold === undefined || secondary === null || secondary === undefined) {
      return false;
    }
    const low = Number(threshold);
    const high = Number(secondary);
    const value = Number(currentValue);
    return value >= Math.min(low, high) && value <= Math.max(low, high);
  }

  if (opNotBetween) {
    if (threshold === null || threshold === undefined || secondary === null || secondary === undefined) {
      return false;
    }
    const low = Number(threshold);
    const high = Number(secondary);
    const value = Number(currentValue);
    return value < Math.min(low, high) || value > Math.max(low, high);
  }

  if (opContains) {
    return String(currentValue).includes(String(threshold ?? ''));
  }

  if (opNotContains) {
    return !String(currentValue).includes(String(threshold ?? ''));
  }

  return false;
};

const testRule = () => {
  const { hasValue, value } = getCurrentValueForSource();

  if (!hasValue) {
    testResult.value = { status: 'no-value', value: null };
    return;
  }

  const wouldTrigger = evaluateRuleCondition(rule.value, value);

  testResult.value = {
    status: wouldTrigger ? 'trigger' : 'no-trigger',
    value,
  };
};

// Data sources available for alert rules - dynamically generated from state
const dataSources = ref([]);

// Load data sources from state
const loadDataSources = () => {
  // Get data paths from state
  const paths = getDataPathsFromState(stateStore.state);
  
  // Sort by label for better UX
  paths.sort((a, b) => a.label.localeCompare(b.label));
  
  // Update data sources
  dataSources.value = paths;
};

// Operators for alert conditions
const operators = [
  { value: ALERT_RULE_OPERATORS.EQUALS, label: 'Equals' },
  { value: ALERT_RULE_OPERATORS.NOT_EQUALS, label: 'Does not equal' },
  { value: ALERT_RULE_OPERATORS.LESS_THAN, label: 'Less than' },
  { value: ALERT_RULE_OPERATORS.LESS_THAN_EQUALS, label: 'Less than or equal to' },
  { value: ALERT_RULE_OPERATORS.GREATER_THAN, label: 'Greater than' },
  { value: ALERT_RULE_OPERATORS.GREATER_THAN_EQUALS, label: 'Greater than or equal to' },
  { value: ALERT_RULE_OPERATORS.BETWEEN, label: 'Between' },
  { value: ALERT_RULE_OPERATORS.NOT_BETWEEN, label: 'Not between' }
];

// Alert types
const alertTypes = [
  { value: 'THRESHOLD', label: 'Threshold' },
  { value: 'STATUS', label: 'Status' },
  { value: 'SYSTEM', label: 'System' }
];

// Alert categories
const alertCategories = [
  { value: 'NAVIGATION', label: 'Navigation' },
  { value: 'WEATHER', label: 'Weather' },
  { value: 'SYSTEM', label: 'System' },
  { value: 'ENGINE', label: 'Engine' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'TANK', label: 'Tank' }
];

// Prevention strategies
const preventionStrategies = [
  { 
    value: 'COOLDOWN', 
    label: 'Cooldown', 
    description: 'Prevents duplicate alerts for a specified time period' 
  },
  { 
    value: 'STATE_TRACKING', 
    label: 'State Tracking', 
    description: 'Only triggers alerts when crossing from normal to alert state' 
  },
  { 
    value: 'DEBOUNCE', 
    label: 'Debounce', 
    description: 'Waits for values to stabilize before triggering' 
  },
  { 
    value: 'HYSTERESIS', 
    label: 'Hysteresis', 
    description: 'Requires crossing back by a margin before retriggering' 
  }
];

// Show secondary threshold for BETWEEN and NOT_BETWEEN operators
const showSecondaryThreshold = computed(() => {
  return rule.value.operator === ALERT_RULE_OPERATORS.BETWEEN || 
         rule.value.operator === ALERT_RULE_OPERATORS.NOT_BETWEEN;
});

// Toggle a prevention strategy
const toggleStrategy = (strategy) => {
  if (rule.value.strategies.includes(strategy)) {
    rule.value.strategies = rule.value.strategies.filter(s => s !== strategy);
  } else {
    rule.value.strategies.push(strategy);
  }
};

// Update threshold units based on selected data source
const updateThresholdUnits = () => {
  // Use the getPathUnit utility to get the unit for the selected data source
  thresholdUnit.value = getPathUnit(rule.value.source) || '';
};

// Convert seconds to milliseconds for time-based settings
const convertSecondsToMs = (property) => {
  if (rule.value.strategyOptions[property]) {
    rule.value.strategyOptions[property] = rule.value.strategyOptions[property] * 1000;
  }
};

// Save the rule
const saveRule = async () => {
  let savedRule;
  if (isEditMode.value) {
    savedRule = await stateStore.updateAlertRule(rule.value.id, rule.value);
  } else {
    savedRule = await stateStore.createAlertRule(rule.value);
  }
  if (savedRule && stateStore.evaluateRuleNow) {
    stateStore.evaluateRuleNow(savedRule);
  }
  
  goBack();
};

// Go back to the alert rules list
const goBack = () => {
  router.replace({ name: 'alert-rules' });
};
</script>

<style scoped>
.alert-rule-editor {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
  padding-top: calc(env(safe-area-inset-top, 0px) + 1rem);
  height: 100%;
  overflow-y: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #666;
  padding: 0.5rem;
  border-radius: 50%;
}

.btn-close:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.rule-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-section {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.form-section h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  font-size: 1.2rem;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5rem;
}

.section-description {
  margin-top: -1rem;
  margin-bottom: 1rem;
  color: #666;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  background-color: #f9f9f9;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #2196f3;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
}

.help-text {
  display: block;
  margin-top: 0.5rem;
  color: #666;
  font-size: 0.85rem;
}

.toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: #2196F3;
}

input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

.toggle-label {
  font-weight: normal;
}

.strategy-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.strategy-option {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.strategy-option:hover {
  border-color: #2196f3;
  background-color: #f5f9ff;
}

.strategy-option.selected {
  border-color: #2196f3;
  background-color: #e3f2fd;
}

.strategy-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.strategy-header h4 {
  margin: 0;
  font-size: 1rem;
}

.strategy-header i {
  color: #2196f3;
}

.strategy-option p {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
}

.strategy-settings {
  background-color: #f9f9f9;
  border-radius: 6px;
  padding: 1rem;
  margin-top: 1rem;
}

.strategy-settings h4 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.test-result {
  margin-top: 1rem;
}

.btn-secondary {
  background-color: #f1f1f1;
  color: #333;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  font-size: 1rem;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

.btn-primary {
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  font-size: 1rem;
}

.btn-primary:hover {
  background-color: #0b7dda;
}
</style>
