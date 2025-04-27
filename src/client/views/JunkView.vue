<template>
  <IonPage>
    <IonHeader class="ion-no-border">
      <IonToolbar>
        <IonButtons slot="start">
          <IonMenuButton class="menu-icon" size="large"></IonMenuButton>
        </IonButtons>
        <IonTitle>Data Explorer</IonTitle>
        <IonButtons slot="end">
          <IonButton @click="fetchData">
            <IonIcon :icon="refreshOutline" class="refresh-icon" size="large"></IonIcon>
          </IonButton>
          <IonButton
            v-if="connectionStatus !== 'disconnected'"
            @click="toggleConnectionMode"
          >
            <IonIcon
              :icon="signalkConfig.usePolling ? timeOutline : flashOutline"
              class="connection-icon"
              size="large"
            ></IonIcon>
          </IonButton>
          <IonButton v-if="connectionStatus !== 'disconnected'" @click="reconnectSignalK">
            <IonIcon :icon="syncOutline" class="reconnect-icon" size="large"></IonIcon>
          </IonButton>
          <IonButton @click="toggleTransformPanel">
            <IonIcon
              :icon="constructOutline"
              class="transform-icon"
              size="large"
            ></IonIcon>
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    <IonContent class="ion-padding">
      <!-- Transform Modal -->
      <IonModal
        :is-open="showTransformPanel"
        @didDismiss="showTransformPanel = false"
        class="transform-modal"
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Data Transformation</IonTitle>
            <IonButtons slot="end">
              <IonButton @click="toggleTransformPanel">
                <IonIcon :icon="closeOutline" slot="icon-only"></IonIcon>
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent class="ion-padding">
          <!-- Create/Select Transformation -->
          <div class="transform-section">
            <h3>Name Your Transformation</h3>
            <IonItem>
              <IonLabel position="floating">Transformation Name</IonLabel>
              <IonInput
                v-model="currentTransformName"
                placeholder="Enter name for this transformation"
                class="custom"
              ></IonInput>
            </IonItem>
            <div class="button-group">
              <IonButton
                @click="createNewTransformation"
                :disabled="!currentTransformName"
                color="primary"
              >
                <IonIcon :icon="saveOutline" slot="start"></IonIcon>
                Save Transformation
              </IonButton>
              <IonButton
                @click="deleteCurrentTransformation"
                color="danger"
                :disabled="!currentTransform"
              >
                <IonIcon :icon="trashOutline" slot="start"></IonIcon>
                Delete
              </IonButton>
            </div>

            <div class="saved-transformations" v-if="transformationNames.length > 0">
              <h4>Saved Transformations</h4>
              <IonItem>
                <IonLabel>Load Existing</IonLabel>
                <IonSelect
                  v-model="selectedTransformName"
                  @ionChange="loadTransformation"
                  interface="popover"
                  placeholder="Select a saved transformation"
                >
                  <IonSelectOption
                    v-for="name in transformationNames"
                    :key="name"
                    :value="name"
                    >{{ name }}</IonSelectOption
                  >
                </IonSelect>
              </IonItem>
            </div>
          </div>

          <!-- Base Object Selection -->
          <div class="transform-section" v-if="currentTransform">
            <h3>Base Object</h3>
            <div class="base-selection">
              <div class="selected-base">
                <strong>Current Base:</strong> {{ currentTransform.baseObject || "None" }}
              </div>
              <div class="base-selection-buttons">
                <IonButton
                  @click="updateBaseObjectData"
                  color="secondary"
                  v-if="currentTransform.baseObject"
                >
                  <IonIcon :icon="refreshOutline" slot="start"></IonIcon>
                  Refresh Base Object
                </IonButton>
                <IonButton @click="useSelectionAsTemplate" color="tertiary">
                  <IonIcon :icon="constructOutline" slot="start"></IonIcon>
                  Use Selection As Template
                </IonButton>
              </div>
              <div class="selector-input" v-if="currentTransformName">
                <div class="vessel-hint" v-if="hasVesselsData">
                  <small>Tip: Try these selectors:</small>
                  <ul class="selector-examples">
                    <li><code>vessels:first</code> - First vessel</li>
                    <li><code>vessels:mmsi=368380870</code> - Vessel by MMSI</li>
                    <li><code>vessels:name=True</code> - Vessel by name</li>
                    <li><code>vessels:type=Sailing</code> - Vessel by type</li>
                    <li>
                      <code>vessels:first > navigation > position > value</code> - Nested
                      path
                    </li>
                    <li><code>collection:id=123</code> - Item by ID</li>
                    <li><code>array:first</code> - First array item</li>
                    <li><code>array[2]</code> - Array index</li>
                  </ul>
                  <IonButton size="small" fill="clear" @click="analyzeCurrentData">
                    <IonIcon :icon="searchOutline" slot="start"></IonIcon>
                    Analyze Data Structure
                  </IonButton>
                </div>
                <div class="selector-form">
                  <IonItem>
                    <IonLabel position="floating">CSS-Inspired Selector</IonLabel>
                    <IonInput
                      v-model="selectorPath"
                      placeholder="e.g., vessels:first.value"
                      class="custom"
                    ></IonInput>
                  </IonItem>
                  <IonButton
                    @click="applySelector"
                    size="small"
                    color="primary"
                    class="selector-button"
                  >
                    Apply Selector
                  </IonButton>
                </div>
              </div>
              <div class="base-object-explorer" v-if="jsonData">
                <p class="explorer-label">Select a base object from the data:</p>
                <div class="explorer-container base-explorer">
                  <JsonExplorer
                    :data="jsonData"
                    :path="''"
                    @select-field="handleBaseObjectSelect"
                    :expanded="true"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Field Mappings -->
          <div class="transform-section" v-if="currentTransform">
            <h3>Field Mappings</h3>

            <!-- Add New Field -->
            <div class="field-add">
              <IonItem>
                <IonLabel position="floating">Field Name</IonLabel>
                <IonInput
                  v-model="newFieldName"
                  placeholder="Enter field name"
                  class="custom"
                ></IonInput>
              </IonItem>
              <div class="field-path">
                <div class="selected-field-path">
                  {{ selectedFieldPath || "Select a path from below" }}
                </div>
                <IonButton
                  @click="addFieldMapping"
                  :disabled="!newFieldName || !selectedFieldPath"
                  >Add Field</IonButton
                >
              </div>
              <div class="field-explorer" v-if="baseObjectData">
                <p class="explorer-label">Select a field from the base object:</p>
                <div class="explorer-container field-explorer">
                  <JsonExplorer
                    :data="baseObjectData"
                    :path="''"
                    @select-field="handleFieldPathSelect"
                    :expanded="true"
                  />
                </div>
              </div>
            </div>

            <!-- Field List -->
            <div
              class="field-list"
              v-if="Object.keys(currentTransform.fields).length > 0"
            >
              <div
                v-for="(path, name) in currentTransform.fields"
                :key="name"
                class="field-item"
              >
                <div class="field-name">{{ name }}</div>
                <div class="field-path">{{ path }}</div>
                <IonButton fill="clear" color="danger" @click="removeField(name)">
                  <IonIcon :icon="trashOutline" slot="icon-only"></IonIcon>
                </IonButton>
              </div>
            </div>
          </div>

          <!-- Save Confirmation -->
          <div v-if="transformSaveMessage" class="save-confirmation">
            {{ transformSaveMessage }}
          </div>

          <!-- Preview Transformation -->
          <div
            class="transform-section"
            v-if="currentTransform && Object.keys(currentTransform.fields).length > 0"
          >
            <h3>Preview</h3>
            <IonButton @click="previewTransformation">
              <IonIcon :icon="refreshOutline" slot="start"></IonIcon>
              Generate Preview
            </IonButton>

            <div v-if="transformPreview" class="preview-container">
              <pre>{{ JSON.stringify(transformPreview, null, 2) }}</pre>
            </div>
          </div>
        </IonContent>
      </IonModal>

      <!-- SignalK Connection Status Section -->
      <div class="signalk-connection-section">
        <h2>SignalK Connection Status</h2>
        <div class="connection-status-display">
          <div class="connection-indicator">
            <div class="indicator-group">
              <div
                class="connection-light"
                :class="{
                  connected: connectionStatus === 'connected',
                  connecting: connectionStatus === 'connecting',
                  disconnected: connectionStatus === 'disconnected',
                  blinking: connectionStatus === 'connected' && !signalkConfig.usePolling,
                }"
              ></div>
              <div class="light-label">SignalK</div>
            </div>

            <div class="indicator-group">
              <div
                class="influx-light"
                :class="{
                  active: influxDBEnabled,
                  inactive: !influxDBEnabled,
                  blinking:
                    influxDBEnabled &&
                    lastInfluxWrite &&
                    Date.now() - lastInfluxWrite < 5000,
                }"
              ></div>
              <div class="light-label">InfluxDB</div>
            </div>

            <div class="connection-text">
              <span class="status-label">Status:</span>
              <span class="status-value" :class="'status-' + connectionStatus">
                {{ connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1) }}
              </span>
              <div class="mode-info">
                <span class="mode-label">Mode:</span>
                <span class="mode-value">
                  {{ signalkConfig.usePolling ? "Polling" : "Streaming" }}
                </span>
              </div>
              <div v-if="lastInfluxWrite" class="influx-info">
                <span class="influx-label">Last InfluxDB Write:</span>
                <span class="influx-value">
                  {{ Math.round((Date.now() - lastInfluxWrite) / 1000) }}s ago
                </span>
              </div>
            </div>
          </div>
          <div class="connection-controls">
            <IonButton
              @click="reconnectSignalK"
              :disabled="connectionStatus === 'connecting'"
              class="connection-button"
            >
              <IonIcon :icon="syncOutline" slot="start"></IonIcon>
              <strong>Reconnect</strong>
            </IonButton>
            <IonButton
              @click="toggleConnectionMode"
              :disabled="connectionStatus === 'disconnected'"
              class="connection-button"
            >
              <IonIcon
                :icon="signalkConfig.usePolling ? timeOutline : flashOutline"
                slot="start"
              ></IonIcon>
              <strong>{{
                signalkConfig.usePolling ? "Switch to Streaming" : "Switch to Polling"
              }}</strong>
            </IonButton>
          </div>
        </div>
      </div>

      <!-- InfluxDB Test Section -->
      <div class="influxdb-test-section">
        <h2>InfluxDB Query Testing</h2>

        <!-- Usage Instructions -->
        <div class="usage-instructions">
          <h4 style="color: white">How to use this tool:</h4>
          <ol>
            <li>Enable the InfluxDB connection using the toggle below</li>
            <li>Test the connection to verify it's working</li>
            <li>Write your query in the editor and execute it</li>
            <li>View and explore results in the data table below</li>
          </ol>
        </div>

        <!-- Connection Status -->
        <div class="connection-controls">
          <IonItem>
            <IonLabel>Enable InfluxDB Connection</IonLabel>
            <IonToggle v-model="influxDBEnabled" @ionChange="toggleInfluxDB"></IonToggle>
          </IonItem>
          <div class="button-group">
            <IonButton
              @click="testInfluxDBConnection"
              :disabled="!influxDBEnabled"
              class="test-button"
            >
              <strong>Test Connection</strong>
            </IonButton>
            <IonButton
              @click="forceReconnectInfluxDB"
              :disabled="!influxDBEnabled"
              class="reconnect-button"
              color="warning"
            >
              <IonIcon :icon="refreshOutline" slot="start"></IonIcon>
              <strong>Force Reconnect</strong>
            </IonButton>
          </div>
        </div>

        <div class="test-results" v-if="influxDBTestResult">
          <h3>Connection Test Results</h3>
          <div class="results-content">
            <pre>{{ JSON.stringify(influxDBTestResult, null, 2) }}</pre>
          </div>
        </div>

        <!-- Query Editor -->
        <div class="query-editor" v-if="influxDBEnabled">
          <h3>Query Editor</h3>
          <div class="editor-instructions">
            <p><strong>Type your Flux query in the text area below:</strong></p>
            <p>
              This is where you can write and edit your Flux query to retrieve data from
              InfluxDB.
            </p>
          </div>
          <div class="textarea-container">
            <textarea
              v-model="fluxQuery"
              placeholder="Enter your Flux query here..."
              rows="8"
              class="query-textarea"
            ></textarea>
          </div>

          <!-- Example Queries -->
          <div class="example-queries">
            <h4>CLICK AN EXAMPLE QUERY TO USE IT</h4>
            <div class="example-list">
              <div class="example-item" @click="setExampleQuery('basic')">
                <strong>Basic Query</strong> - Last 20 records
              </div>
              <div class="example-item" @click="setExampleQuery('timeRange')">
                <strong>Time Range</strong> - Data from last hour
              </div>
              <div class="example-item" @click="setExampleQuery('filter')">
                <strong>Filter</strong> - Filter by measurement and field
              </div>
              <div class="example-item" @click="setExampleQuery('allData')">
                <strong>All Data</strong> - Up to 100 records from past week
              </div>
              <div class="example-item diagnostic-item" @click="setExampleQuery('diagnostics')">
                <strong>Diagnostics</strong> - Count records by measurement
              </div>
              <div class="example-item diagnostic-item" @click="setExampleQuery('metaData')">
                <strong>Meta Data</strong> - View metadata records
              </div>
              <div class="example-item diagnostic-item" @click="setExampleQuery('deltaData')">
                <strong>Delta Data</strong> - View delta update records
              </div>
              <div class="example-item diagnostic-item" @click="setExampleQuery('checkBuckets')">
                <strong>Check Buckets</strong> - List all available InfluxDB buckets
              </div>
              <div class="example-item diagnostic-item" @click="setExampleQuery('recentData')">
                <strong>Recent Data</strong> - Last 10 minutes of delta updates
              </div>
            </div>
          </div>

          <div class="query-buttons">
            <IonButton
              @click="executeQuery"
              :disabled="!fluxQuery"
              class="execute-button"
            >
              <strong>Execute Query</strong>
            </IonButton>
            <IonButton @click="clearQuery" class="clear-button">
              <strong>Clear</strong>
            </IonButton>
          </div>
        </div>

        <!-- Data Exploration Section -->
        <div class="data-exploration" v-if="queryResults.length > 0 || queryError">
          <h3>Data Exploration</h3>

          <div v-if="queryError" class="query-error">
            <p><strong>Error:</strong> {{ queryError }}</p>
          </div>

          <div v-else>
            <div class="result-stats">
              <p class="stats-text">
                <span class="stats-highlight">{{ queryResults.length }}</span> rows
                returned in
                <span class="stats-highlight">{{ queryExecutionTime }}ms</span>
              </p>
            </div>

            <div class="results-table-container">
              <table class="results-table" v-if="queryResults.length > 0">
                <thead>
                  <tr>
                    <th v-for="(_, key) in queryResults[0]" :key="key">{{ key }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in queryResults" :key="index">
                    <td v-for="(value, key) in row" :key="key" @click="toggleCellExpand($event)" class="clickable-cell">
                      <span class="cell-content" :title="typeof value === 'object' ? JSON.stringify(value) : String(value)">
                        {{ typeof value === "object" ? JSON.stringify(value) : value }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Data Explorer -->
      <div class="explorer-wrapper">
        <div class="url-input">
          <IonItem>
            <IonLabel position="floating">JSON URL</IonLabel>
            <IonInput
              v-model="jsonUrl"
              placeholder="Enter URL to JSON data"
              class="custom"
            ></IonInput>
          </IonItem>
          <IonButton expand="block" @click="fetchData" class="fetch-button">
            <IonIcon :icon="cloudDownloadOutline" slot="start"></IonIcon>
            Fetch Data
          </IonButton>

          <!-- SignalK Configuration Panel -->
          <div v-if="jsonUrl && jsonUrl.includes('signalk')" class="signalk-config">
            <h4>SignalK Connection Settings</h4>

            <IonItem>
              <IonLabel>Connection Mode</IonLabel>
              <IonSelect
                v-model="signalkConfig.usePolling"
                interface="popover"
                @ionChange="initializeSignalKService"
              >
                <IonSelectOption :value="true">Polling</IonSelectOption>
                <IonSelectOption :value="false">WebSocket</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonItem v-if="signalkConfig.usePolling">
              <IonLabel position="stacked">Polling Interval (ms)</IonLabel>
              <IonRange
                :value="signalkConfig.pollingInterval"
                :min="1000"
                :max="30000"
                :step="1000"
                :pin="true"
                @ionChange="updatePollingInterval($event.detail.value)"
              >
                <IonLabel slot="start">1s</IonLabel>
                <IonLabel slot="end">30s</IonLabel>
              </IonRange>
              <div class="range-value">{{ signalkConfig.pollingInterval / 1000 }}s</div>
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Throttle Delay (ms)</IonLabel>
              <IonRange
                :value="signalkConfig.throttleDelay"
                :min="0"
                :max="2000"
                :step="100"
                :pin="true"
                @ionChange="updateThrottleDelay($event.detail.value)"
              >
                <IonLabel slot="start">0ms</IonLabel>
                <IonLabel slot="end">2s</IonLabel>
              </IonRange>
              <div class="range-value">{{ signalkConfig.throttleDelay }}ms</div>
            </IonItem>

            <div class="connection-status">
              <div :class="['status-indicator', connectionStatus]"></div>
              <span>{{
                connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)
              }}</span>
            </div>
          </div>
        </div>

        <div v-if="loading" class="loading-container">
          <IonSpinner name="circular"></IonSpinner>
          <p>Loading data...</p>
        </div>

        <div v-if="error" class="error-container">
          <IonIcon :icon="alertCircleOutline" color="danger" size="large"></IonIcon>
          <p>{{ error }}</p>
        </div>

        <div v-if="selectedPath" class="selected-path">
          <strong>Selected Path:</strong> {{ selectedPath }}
        </div>

        <div class="explorer-container" v-if="jsonData && !loading">
          <JsonExplorer
            :data="jsonData"
            :path="''"
            @select-field="handleFieldSelect"
            :expanded="true"
          />
        </div>
      </div>
    </IonContent>
  </IonPage>
</template>

<script setup>
import { ref, defineComponent, onMounted, computed, onUnmounted } from "vue";
import signalKClientModule from "@/utils/signalKClient.js";
const initializeSignalK = signalKClientModule.initialize;
const signalKClient = signalKClientModule;
import { initializeInfluxDB } from "@/utils/influxDBClient.js";
import {
  IonMenuButton,
  IonIcon,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonLabel,
  IonContent,
  IonItem,
  IonInput,
  IonSpinner,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonModal,
  IonRange,
  IonToggle,
} from "@ionic/vue";
import {
  refreshOutline,
  alertCircleOutline,
  chevronDownOutline,
  chevronForwardOutline,
  constructOutline,
  closeOutline,
  trashOutline,
  saveOutline,
  searchOutline,
  syncOutline,
  timeOutline,
  flashOutline,
  cloudDownloadOutline,
} from "ionicons/icons";
import { useDatamapping } from "../stores/datamapping";

// Data store
const datamappingStore = useDatamapping();

// Toast notification functionality
const showToast = (message) => {
  console.log("Toast message:", message);
};

// Default URL for JSON data
const jsonUrl = ref("http://openplotter.local:3000/signalk/v1/api/");
const jsonData = ref(null);
const loading = ref(false);
const error = ref(null);
const selectedPath = ref("");

// Transformation modal state
const showTransformPanel = ref(false);
const currentTransformName = ref("");
const selectedTransformName = ref("");
const newFieldName = ref("");
const selectedFieldPath = ref("");
const baseObjectData = ref(null);
const transformPreview = ref(null);
const transformSaveMessage = ref("");
const selectorPath = ref("");

// Computed properties for transformations
const transformationNames = computed(() => datamappingStore.transformationNames);
const currentTransform = computed(() => {
  if (currentTransformName.value) {
    return datamappingStore.getTransformation(currentTransformName.value);
  }
  return null;
});

// This computed property is used in the template to show vessel-specific options
const hasVesselsData = computed(() => {
  return (
    jsonData.value &&
    typeof jsonData.value === "object" &&
    jsonData.value.vessels &&
    typeof jsonData.value.vessels === "object"
  );
});

// Function to traverse and log the structure of an object
const traverseObject = (obj, path = "", depth = 0, maxDepth = 10) => {
  const returnval = [];
  // Prevent infinite recursion
  if (depth > maxDepth) return;

  // Handle null or undefined
  if (obj === null || obj === undefined) {
    console.log(`${" ".repeat(depth * 2)}${path}: null`);
    returnval.push({
      path,
      type: "null",
      value: null,
    });
    return;
  }

  // Handle different types
  if (Array.isArray(obj)) {
    console.log(`${" ".repeat(depth * 2)}${path}: ARRAY [${obj.length}]`);
    returnval.push({
      path,
      type: "array",
      value: obj,
    });
    // If it's a small array, show a sample item
    if (obj.length > 0 && obj.length <= 5) {
      traverseObject(obj[0], `${path}[0]`, depth + 1, maxDepth);
    }
  } else if (typeof obj === "object") {
    // It's an object, log its keys
    const keys = Object.keys(obj);
    console.log(
      `${" ".repeat(depth * 2)}${path || "ROOT"}: OBJECT {${keys.length} keys}`
    );
    returnval.push({
      path,
      type: "object",
      value: obj,
    });

    // Recursively process each key
    for (const key of keys) {
      const newPath = path ? `${path}.${key}` : key;
      traverseObject(obj[key], newPath, depth + 1, maxDepth);
    }
  } else {
    // It's a primitive value
    const value =
      typeof obj === "string"
        ? `"${obj.substring(0, 30)}${obj.length > 30 ? "..." : ""}"`
        : obj;
    console.log(`${" ".repeat(depth * 2)}${path}: ${typeof obj} (${value})`);
    returnval.push({
      path,
      type: typeof obj,
      value,
    });
  }
};

// Toggle transformation panel
const toggleTransformPanel = () => {
  showTransformPanel.value = !showTransformPanel.value;
};

// Create or update a transformation
const createNewTransformation = () => {
  if (currentTransformName.value) {
    datamappingStore.createTransformation(currentTransformName.value);
    selectedTransformName.value = currentTransformName.value;
    // Show confirmation message
    const existingTransform = datamappingStore.getTransformation(
      currentTransformName.value
    );
    const isNew =
      Object.keys(existingTransform.fields).length === 0 && !existingTransform.baseObject;
    transformSaveMessage.value = isNew
      ? `New transformation "${currentTransformName.value}" created!`
      : `Transformation "${currentTransformName.value}" updated!`;

    // Clear message after a delay
    setTimeout(() => {
      transformSaveMessage.value = "";
    }, 3000);
  }
};

// Delete current transformation
const deleteCurrentTransformation = () => {
  if (currentTransformName.value) {
    datamappingStore.deleteTransformation(currentTransformName.value);
    currentTransformName.value = "";
    selectedTransformName.value = "";
    transformPreview.value = null;
  }
};

// Load an existing transformation
const loadTransformation = () => {
  if (selectedTransformName.value) {
    currentTransformName.value = selectedTransformName.value;
    transformPreview.value = null;
    // Update the base object data for field selection
    updateBaseObjectData();
  }
};

// Handle base object selection from the explorer
const handleBaseObjectSelect = (path) => {
  if (currentTransformName.value) {
    datamappingStore.setTransformationBase(currentTransformName.value, path);
    // Reset field mappings when base object changes
    if (currentTransform.value) {
      currentTransform.value.fields = {};
    }
    // Update the base object data for field selection
    updateBaseObjectData();
  }
};

// Update the base object data for field selection
const updateBaseObjectData = () => {
  if (currentTransform.value && currentTransform.value.baseObject && jsonData.value) {
    // Extract the base object data using the path
    const path = currentTransform.value.baseObject.split(".");
    let data = jsonData.value;

    for (const segment of path) {
      if (data && typeof data === "object" && segment in data) {
        data = data[segment];
      } else {
        data = null;
        break;
      }
    }

    // Special handling for vessel AIS data
    // If the data is an object with multiple vessel entries
    if (
      data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      path[0] === "vessels" &&
      path.length === 1
    ) {
      // Allow selection of a specific vessel as a template
      baseObjectData.value = data;
    } else {
      baseObjectData.value = data;
    }
  } else {
    baseObjectData.value = null;
  }
};

// Add a field mapping to the transformation
const addFieldMapping = () => {
  if (currentTransformName.value && newFieldName.value && selectedFieldPath.value) {
    datamappingStore.setTransformationField(
      currentTransformName.value,
      newFieldName.value,
      selectedFieldPath.value
    );
    // Reset the field name input and selected path
    const addedFieldName = newFieldName.value;
    newFieldName.value = "";
    selectedFieldPath.value = "";
    transformSaveMessage.value = `Field '${addedFieldName}' added`;
    setTimeout(() => {
      transformSaveMessage.value = "";
    }, 2000);
  }
};

// Remove a field from the transformation
const removeField = (fieldName) => {
  if (currentTransformName.value) {
    datamappingStore.removeTransformationField(currentTransformName.value, fieldName);
  }
};

// Preview the transformation result
const previewTransformation = () => {
  if (currentTransformName.value && jsonData.value) {
    transformPreview.value = datamappingStore.applyTransformation(
      currentTransformName.value,
      jsonData.value
    );
  }
};

// SignalK data service configuration
const signalkConfig = ref({
  usePolling: true,
  pollingInterval: 5000, // 5 seconds
  throttleDelay: 500, // 500ms
});

// SignalK service instance
const signalkService = ref(null);

// Connection status
const connectionStatus = ref("disconnected");

// InfluxDB tracking
const lastInfluxWrite = ref(null);

// Fetch JSON data from the URL
const fetchData = async () => {
  if (!jsonUrl.value) {
    error.value = "Please enter a URL";
    return;
  }

  // If it's a SignalK URL, use our specialized service
  if (jsonUrl.value.includes("signalk")) {
    initializeSignalKService();
    return;
  }

  // Otherwise, use standard fetch for other URLs
  loading.value = true;
  error.value = null;
  jsonData.value = null;

  try {
    const response = await fetch(jsonUrl.value);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    jsonData.value = data;
    const r = traverseObject(data);
    console.log(r);
  } catch (err) {
    error.value = `Error fetching data: ${err.message}`;
    console.error("Error fetching JSON data:", err);
  } finally {
    loading.value = false;
  }
};

/**
 * Initialize the SignalK service with current configuration
 */
const initializeSignalKService = () => {
  // Clean up any existing service
  if (signalkService.value) {
    signalkService.value.disconnect();
  }

  loading.value = true;
  error.value = null;
  jsonData.value = null;

  try {
    // Initialize the SignalK service with current config
    signalkService.value = initializeSignalK({
      usePolling: signalkConfig.value.usePolling,
      pollingInterval: signalkConfig.value.pollingInterval,
      throttleDelay: signalkConfig.value.throttleDelay,
    });

    // Subscribe to data updates
    signalkService.value.subscribe(handleSignalKUpdate);

    showToast(
      `Connected to SignalK using ${
        signalkConfig.value.usePolling ? "polling" : "WebSocket"
      } mode`
    );
  } catch (err) {
    error.value = `Error connecting to SignalK: ${err.message}`;
    console.error("SignalK connection error:", err);
  }
};

/**
 * Handle updates from the SignalK service
 */
const handleSignalKUpdate = (update) => {
  if (update.type === "connection") {
    connectionStatus.value = update.status;

    if (update.status === "connected" || update.status === "polling") {
      loading.value = false;
    } else if (update.status === "disconnected") {
      loading.value = false;
      error.value = "Disconnected from SignalK server";
    }
  } else if (update.type === "data") {
    jsonData.value = update.data;
    loading.value = false;
  } else if (update.type === "error") {
    error.value = `SignalK error: ${update.error.message || "Unknown error"}`;
    loading.value = false;
  } else if (update.type === "influxdb_write") {
    // Update the timestamp when data is written to InfluxDB
    lastInfluxWrite.value = Date.now();
    influxDBEnabled.value = true;
  } else if (update.type === "influxdb_status") {
    // Update the InfluxDB status
    influxDBEnabled.value = update.enabled;
  }
};

/**
 * Update the polling interval
 */
const updatePollingInterval = (interval) => {
  if (!signalkService.value) return;

  try {
    signalkConfig.value.pollingInterval = interval;
    signalkService.value.setPollingInterval(interval);

    showToast(`Polling interval updated to ${interval}ms`);
  } catch (err) {
    showToast(err.message);
  }
};

/**
 * Update the throttle delay
 */
const updateThrottleDelay = (delay) => {
  if (!signalkService.value) return;

  try {
    signalkConfig.value.throttleDelay = delay;
    signalkService.value.setThrottleDelay(delay);

    showToast(`Throttle delay updated to ${delay}ms`);
  } catch (err) {
    showToast(err.message);
  }
};

/**
 * Toggle between polling and WebSocket modes
 */
const toggleConnectionMode = () => {
  if (!signalkService.value) return;

  try {
    signalkConfig.value.usePolling = !signalkConfig.value.usePolling;
    signalkService.value.togglePolling(signalkConfig.value.usePolling);

    showToast(
      `Switched to ${signalkConfig.value.usePolling ? "polling" : "WebSocket"} mode`
    );
  } catch (err) {
    showToast(err.message);
  }
};

/**
 * Force reconnection to the SignalK server
 */
const reconnectSignalK = () => {
  if (!signalkService.value) return;

  try {
    signalkService.value.reconnect();

    showToast("Reconnecting to SignalK server...");
  } catch (err) {
    showToast(err.message);
  }
};

// Handle field selection in the main explorer
const handleFieldSelect = (path) => {
  selectedPath.value = path;
  console.log("Selected path:", path);
};

// Handle field path selection for transformation
const handleFieldPathSelect = (path) => {
  selectedFieldPath.value = path;
  console.log("Selected field path:", path);

  // Auto-generate field name if empty
  if (!newFieldName.value) {
    // Extract the last part of the path as the default field name
    const pathParts = path.split(".");
    newFieldName.value = pathParts[pathParts.length - 1];
  }
};

// Use the current selection as a template
const useSelectionAsTemplate = () => {
  if (selectedPath.value && currentTransformName.value) {
    // Set the base object to the selected path
    datamappingStore.setTransformationBase(
      currentTransformName.value,
      selectedPath.value
    );

    // Update the base object data
    updateBaseObjectData();

    transformSaveMessage.value = `Using ${selectedPath.value} as template`;
    setTimeout(() => {
      transformSaveMessage.value = "";
    }, 2000);

    // Auto-generate a selector based on the path
    generateSelectorFromPath(selectedPath.value);
  } else {
    transformSaveMessage.value = "Please select an object first";
    setTimeout(() => {
      transformSaveMessage.value = "";
    }, 2000);
  }
};

// Generate a CSS-inspired selector from a path
const generateSelectorFromPath = (path) => {
  if (!path) return;

  const parts = path.split(".");
  if (parts.length === 0) return;

  // Get the data at this path to analyze it
  let targetData = null;
  let currentData = jsonData.value;
  let targetParent = null;
  let targetKey = null;

  // Navigate to the parent of the target
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (i === parts.length - 1) {
      // This is the target item
      targetParent = currentData;
      targetKey = part;
      targetData = currentData?.[part];
    } else if (currentData && typeof currentData === "object") {
      // Navigate to next level
      currentData = currentData[part];
    } else {
      // Path is invalid
      break;
    }
  }

  // If we couldn't find the data, use the path as is
  if (targetData === undefined || targetData === null) {
    selectorPath.value = parts.join(".");
    return;
  }

  // Special case for vessels collection
  if (parts[0] === "vessels" && parts.length > 1) {
    const vesselId = parts[1];

    // Check if we can get the vessel data
    if (jsonData.value?.vessels?.[vesselId]) {
      const vessel = jsonData.value.vessels[vesselId];

      if (vessel.mmsi) {
        // Use MMSI if available
        selectorPath.value = `vessels:mmsi=${vessel.mmsi}`;
      } else if (vessel.name) {
        // Use name if available
        const name = vessel.name.trim();
        selectorPath.value = `vessels:name=${name}`;
      } else {
        // Fallback to first vessel
        selectorPath.value = `vessels:first`;
      }

      // Add additional path components if they exist
      if (parts.length > 2) {
        selectorPath.value += ` > ${parts.slice(2).join(".")}`;
      }
      return;
    }
  }

  // For collections of items (objects with similar structure)
  if (targetParent && typeof targetParent === "object" && !Array.isArray(targetParent)) {
    // Check if this is a collection by examining siblings
    const keys = Object.keys(targetParent);
    if (keys.length > 1) {
      // Sample a few siblings to see if they have similar structure
      const sampleSize = Math.min(keys.length, 3);
      const samples = [];

      for (let i = 0; i < sampleSize; i++) {
        if (targetParent[keys[i]] && typeof targetParent[keys[i]] === "object") {
          samples.push(targetParent[keys[i]]);
        }
      }

      // If we have multiple objects with similar structure, try to find identifiers
      if (samples.length > 1) {
        // Check if the target has common identifiers
        if (targetData && typeof targetData === "object") {
          // Try to find a unique identifier
          if (targetData.id) {
            selectorPath.value = `${parts[0]}:id=${targetData.id}`;
          } else if (targetData.uuid) {
            selectorPath.value = `${parts[0]}:uuid=${targetData.uuid}`;
          } else if (targetData.name) {
            selectorPath.value = `${parts[0]}:name=${targetData.name}`;
          } else if (targetData.key) {
            selectorPath.value = `${parts[0]}:key=${targetData.key}`;
          } else if (targetData.type) {
            selectorPath.value = `${parts[0]}:type=${targetData.type}`;
          } else {
            // No good identifier, use index
            selectorPath.value = `${parts[0]}:first`;
          }

          // Add remaining path if any
          if (parts.length > 2) {
            selectorPath.value += ` > ${parts.slice(2).join(".")}`;
          }
          return;
        }
      }
    }
  }

  // For arrays, use index notation
  if (Array.isArray(targetParent) && !isNaN(parseInt(targetKey))) {
    const index = parseInt(targetKey);
    const arrayPath = parts.slice(0, parts.length - 1).join(".");

    // If it's the first item, use :first
    if (index === 0) {
      selectorPath.value = `${arrayPath}:first`;
    } else {
      selectorPath.value = `${arrayPath}[${index}]`;
    }
    return;
  }

  // Default fallback: use the path as is
  selectorPath.value = parts.join(".");
};

// Apply a CSS-inspired selector to select a template
const applySelector = () => {
  if (!selectorPath.value || !currentTransformName.value || !jsonData.value) {
    showToast("Please enter a valid selector");
    return;
  }

  try {
    // Parse the selector
    const selectorParts = selectorPath.value.split(">");
    let currentData = jsonData.value;
    const path = [];

    // Process each part of the selector
    for (const part of selectorParts) {
      const trimmedPart = part.trim();
      if (!trimmedPart) continue;

      // Check for array index notation [n]
      if (trimmedPart.match(/^(.+)\[(\d+)\]$/)) {
        const matches = trimmedPart.match(/^(.+)\[(\d+)\]$/);
        const arrayPath = matches[1];
        const index = parseInt(matches[2]);

        // Navigate to the array first
        if (currentData && typeof currentData === "object" && arrayPath in currentData) {
          path.push(arrayPath);
          currentData = currentData[arrayPath];

          // Then access the index
          if (Array.isArray(currentData) && index < currentData.length) {
            path.push(index.toString());
            currentData = currentData[index];
          } else {
            throw new Error(`Invalid array index: ${arrayPath}[${index}]`);
          }
        } else {
          throw new Error(`Path not found: ${arrayPath}`);
        }
      }
      // Check for special selectors like :first, :id=, :name=, etc.
      else if (trimmedPart.includes(":")) {
        const [key, selector] = trimmedPart.split(":");

        if (!key || !currentData[key]) {
          throw new Error(`Path not found: ${key}`);
        }

        path.push(key);

        // Handle array :first selector
        if (selector === "first") {
          if (Array.isArray(currentData[key]) && currentData[key].length > 0) {
            // Get the first item in the array
            path.push("0");
            currentData = currentData[key][0];
          } else if (typeof currentData[key] === "object") {
            // Get the first item in the object
            const firstKey = Object.keys(currentData[key])[0];
            if (!firstKey) {
              throw new Error(`No items found in ${key}`);
            }
            path.push(firstKey);
            currentData = currentData[key][firstKey];
          } else {
            throw new Error(`Cannot use :first on non-object/array: ${key}`);
          }
        }
        // Generic ID selector
        else if (selector.startsWith("id=")) {
          const id = selector.substring(3);
          const itemKey = findItemByProperty(currentData[key], "id", id);
          if (!itemKey) {
            throw new Error(`No item found with id: ${id}`);
          }
          path.push(itemKey);
          currentData = currentData[key][itemKey];
        }
        // Generic UUID selector
        else if (selector.startsWith("uuid=")) {
          const uuid = selector.substring(5);
          const itemKey = findItemByProperty(currentData[key], "uuid", uuid);
          if (!itemKey) {
            throw new Error(`No item found with uuid: ${uuid}`);
          }
          path.push(itemKey);
          currentData = currentData[key][itemKey];
        }
        // Generic key selector
        else if (selector.startsWith("key=")) {
          const keyValue = selector.substring(4);
          const itemKey = findItemByProperty(currentData[key], "key", keyValue);
          if (!itemKey) {
            throw new Error(`No item found with key: ${keyValue}`);
          }
          path.push(itemKey);
          currentData = currentData[key][itemKey];
        }
        // Vessel MMSI selector
        else if (selector.startsWith("mmsi=")) {
          const mmsi = selector.substring(5);
          const vesselKey = findItemByProperty(currentData[key], "mmsi", mmsi);
          if (!vesselKey) {
            throw new Error(`No vessel found with MMSI: ${mmsi}`);
          }
          path.push(vesselKey);
          currentData = currentData[key][vesselKey];
        }
        // Generic name selector (partial match)
        else if (selector.startsWith("name=")) {
          const name = selector.substring(5).toLowerCase();
          const itemKey = findItemByPartialProperty(currentData[key], "name", name);
          if (!itemKey) {
            throw new Error(`No item found with name containing: ${name}`);
          }
          path.push(itemKey);
          currentData = currentData[key][itemKey];
        }
        // Generic type selector
        else if (selector.startsWith("type=")) {
          // First try direct type property
          const type = selector.substring(5).toLowerCase();
          let itemKey = findItemByPartialProperty(currentData[key], "type", type);

          // If not found, try vessel-specific ship type
          if (!itemKey) {
            itemKey = Object.keys(currentData[key]).find((k) => {
              const shipType = currentData[key][k]?.design?.aisShipType?.value?.name;
              return shipType && shipType.toLowerCase().includes(type);
            });
          }

          if (!itemKey) {
            throw new Error(`No item found with type containing: ${type}`);
          }

          path.push(itemKey);
          currentData = currentData[key][itemKey];
        }
        // Generic code selector
        else if (selector.startsWith("code=")) {
          const code = selector.substring(5);
          const itemKey = findItemByProperty(currentData[key], "code", code);
          if (!itemKey) {
            throw new Error(`No item found with code: ${code}`);
          }
          path.push(itemKey);
          currentData = currentData[key][itemKey];
        } else {
          throw new Error(`Unknown selector: ${selector}`);
        }
      } else if (trimmedPart.includes(".")) {
        // Handle dot notation within a selector part
        const subParts = trimmedPart.split(".");
        for (const subPart of subParts) {
          if (currentData && typeof currentData === "object" && subPart in currentData) {
            path.push(subPart);
            currentData = currentData[subPart];
          } else {
            throw new Error(`Path not found: ${subPart} in ${path.join(".")}`);
          }
        }
      } else {
        // Simple property access
        if (
          currentData &&
          typeof currentData === "object" &&
          trimmedPart in currentData
        ) {
          path.push(trimmedPart);
          currentData = currentData[trimmedPart];
        } else {
          throw new Error(`Path not found: ${trimmedPart}`);
        }
      }
    }

    if (path.length > 0) {
      const fullPath = path.join(".");
      datamappingStore.setTransformationBase(currentTransformName.value, fullPath);
      updateBaseObjectData();

      showToast(`Applied selector: ${selectorPath.value}`);
    } else {
      showToast("Selector did not match any data");
    }
  } catch (error) {
    console.error("Error applying selector:", error);
    showToast(`Error: ${error.message}`);
  }
  return returnval;
};

// InfluxDB integration
const influxDBEnabled = ref(true); // Default to true since it's enabled by default in signalKClient
const influxDBTestResult = ref(null);
const influxDBClient = ref(null);

// Query editor
const fluxQuery = ref(
  'from(bucket: "signalk_data")\n  |> range(start: -1h)\n  |> filter(fn: (r) => r._measurement == "signalk")\n  |> limit(n: 10)'
);
const queryResults = ref([]);
const queryError = ref("");
const queryExecutionTime = ref(0);

// Example queries
const exampleQueries = {
  basic: 'from(bucket: "signalk_data")\n  |> range(start: -24h)\n  |> drop(columns: ["result"])\n  |> limit(n: 20)',
  timeRange:
    'from(bucket: "signalk_data")\n  |> range(start: -1h, stop: now())\n  |> filter(fn: (r) => r._measurement == "signalk_delta")\n  |> drop(columns: ["result"])\n  |> limit(n: 20)',
  filter:
    'from(bucket: "signalk_data")\n  |> range(start: -6h)\n  |> filter(fn: (r) => r._measurement == "signalk_delta")\n  |> filter(fn: (r) => r._field == "value")\n  |> drop(columns: ["result"])\n  |> limit(n: 20)',
  allData: 'from(bucket: "signalk_data")\n  |> range(start: -7d)\n  |> drop(columns: ["result"])\n  |> limit(n: 100)',
  diagnostics: 'from(bucket: "signalk_data")\n  |> range(start: -24h)\n  |> group(columns: ["_measurement"])\n  |> count()\n  |> drop(columns: ["result"])\n  |> yield(name: "measurement_counts")',
  metaData: 'from(bucket: "signalk_data")\n  |> range(start: -24h)\n  |> filter(fn: (r) => r._measurement == "signalk_meta")\n  |> sort(columns: ["_time"], desc: true)\n  |> drop(columns: ["result"])\n  |> limit(n: 20)',
  deltaData: 'from(bucket: "signalk_data")\n  |> range(start: -24h)\n  |> filter(fn: (r) => r._measurement == "signalk_delta")\n  |> keep(columns: ["_time", "_value", "_field", "path", "vessel", "source"])\n  |> sort(columns: ["_time"], desc: true)\n  |> limit(n: 20)',
  checkBuckets: 'buckets()\n  |> sort(columns: ["name"], desc: false)\n  |> drop(columns: ["result"])',
  recentData: 'from(bucket: "signalk_data")\n  |> range(start: -10m)\n  |> filter(fn: (r) => r._measurement == "signalk_delta")\n  |> keep(columns: ["_time", "_value", "_field", "path", "vessel", "source"])\n  |> sort(columns: ["_time"], desc: true)\n  |> limit(n: 20)',
};

// Set example query
function setExampleQuery(type) {
  fluxQuery.value = exampleQueries[type];
}

// Clear query
function clearQuery() {
  fluxQuery.value = "";
  queryResults.value = [];
  queryError.value = "";
}

// Toggle InfluxDB connection
function toggleInfluxDB() {
  if (influxDBEnabled.value) {
    try {
      // Initialize the InfluxDB client
      influxDBClient.value = initializeInfluxDB();
      console.log("InfluxDB client initialized");
      showToast("InfluxDB connection enabled");
    } catch (error) {
      console.error("Error initializing InfluxDB client:", error);
      influxDBEnabled.value = false;
      showToast("Failed to initialize InfluxDB client");
    }
  } else {
    // Close the connection if it exists
    if (influxDBClient.value && influxDBClient.value.close) {
      try {
        influxDBClient.value.close();
        influxDBClient.value = null;
        console.log("InfluxDB client closed");
        showToast("InfluxDB connection disabled");
      } catch (error) {
        console.error("Error closing InfluxDB client:", error);
      }
    }
  }
}

// Force reconnect to InfluxDB
async function forceReconnectInfluxDB() {
  try {
    // Use the SignalK client's force reconnect function
    const result = signalKClient.forceReconnectInfluxDB();
    
    if (result) {
      // Update the last write timestamp to show recent activity
      lastInfluxWrite.value = Date.now();
      showToast("InfluxDB connection reestablished");
    } else {
      showToast("Failed to reconnect to InfluxDB");
    }
  } catch (error) {
    console.error("Error reconnecting to InfluxDB:", error);
    showToast("Error reconnecting to InfluxDB: " + error.message);
  }
}

// Test InfluxDB connection
async function testInfluxDBConnection() {
  try {
    if (!influxDBClient.value) {
      influxDBClient.value = initializeInfluxDB();
    }

    // Try a simple query to test the connection
    const testQuery = 'from(bucket: "signalk_data") |> range(start: -1m) |> limit(n: 1)';
    const startTime = performance.now();
    const results = await influxDBClient.value.queryData(testQuery);
    const endTime = performance.now();

    influxDBTestResult.value = {
      success: true,
      message: "Connection successful",
      responseTime: Math.round(endTime - startTime) + "ms",
      resultsCount: results.length,
    };

    showToast("InfluxDB connection successful");
  } catch (error) {
    console.error("InfluxDB connection test failed:", error);
    influxDBTestResult.value = {
      success: false,
      message: "Connection failed",
      error: error.message,
    };

    showToast("InfluxDB connection failed: " + error.message);
  }
}

// Execute Flux query
async function executeQuery() {
  if (!influxDBClient.value) {
    showToast("InfluxDB client not initialized");
    return;
  }

  try {
    queryError.value = "";
    queryResults.value = [];

    const startTime = performance.now();
    const results = await influxDBClient.value.queryData(fluxQuery.value);
    const endTime = performance.now();

    queryResults.value = results;
    queryExecutionTime.value = Math.round(endTime - startTime);

    if (results.length === 0) {
      showToast("Query executed successfully, but no results returned");
    } else {
      showToast(`Query returned ${results.length} rows`);
    }
  } catch (error) {
    console.error("Query execution failed:", error);
    queryError.value = error.message;
    showToast("Query failed: " + error.message);
  }
}

// Function to toggle cell expansion when clicked
function toggleCellExpand(event) {
  const cell = event.currentTarget;
  const content = cell.querySelector('.cell-content');
  
  if (content) {
    content.classList.toggle('cell-expanded');
    
    // If we're expanding the cell, make sure it's visible by scrolling to it
    if (content.classList.contains('cell-expanded')) {
      // Ensure the expanded cell is visible
      setTimeout(() => {
        cell.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 10);
    }
  }
}

// Fetch data on component mount
onMounted(() => {
  fetchData();
});

// Clean up resources when component is unmounted
onUnmounted(() => {
  if (signalkService.value) {
    signalkService.value.disconnect();
  }
});

// Helper function to analyze data structure and generate appropriate selectors
const analyzeDataStructure = (data) => {
  console.log("Analyzing data structure:");
  traverseObject(data);

  // Return common identifiers found in the data
  const identifiers = findCommonIdentifiers(data);
  console.log("Common identifiers found:", identifiers);
  return identifiers;
};

// Analyze the current data structure and show selector hints
const analyzeCurrentData = () => {
  if (!jsonData.value) {
    showToast("No data available to analyze");
    return;
  }

  console.log("Analyzing current data structure:");
  const identifiers = analyzeDataStructure(jsonData.value);

  // Show a toast with the results
  const idTypes = Object.keys(identifiers);
  if (idTypes.length > 0) {
    showToast(`Found ${idTypes.length} identifier types: ${idTypes.join(", ")}`);
  } else {
    showToast("No common identifiers found in the data structure");
  }
};

// Helper function to find an item by exact property match
const findItemByProperty = (obj, propName, propValue) => {
  if (!obj || typeof obj !== "object") return null;

  return Object.keys(obj).find((key) => {
    const item = obj[key];
    return item && item[propName] === propValue;
  });
};

// Helper function to find an item by partial property match (for strings)
const findItemByPartialProperty = (obj, propName, propValue) => {
  if (!obj || typeof obj !== "object") return null;

  return Object.keys(obj).find((key) => {
    const item = obj[key];
    if (!item || !item[propName]) return false;

    const itemValue = String(item[propName]).toLowerCase();
    return itemValue.includes(String(propValue).toLowerCase());
  });
};

// Find common identifiers in a data structure (like id, name, etc.)
const findCommonIdentifiers = (obj, path = "", results = {}) => {
  // Handle null, undefined, or primitives
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return results;
  }

  // Process arrays
  if (Array.isArray(obj)) {
    // Sample the first few items of the array
    const sampleSize = Math.min(obj.length, 3);
    for (let i = 0; i < sampleSize; i++) {
      findCommonIdentifiers(obj[i], `${path}[${i}]`, results);
    }
    return results;
  }

  // Process objects
  const keys = Object.keys(obj);

  // Check for common identifier keys
  const identifierKeys = ["id", "uuid", "mmsi", "name", "title", "key", "code", "type"];
  for (const idKey of identifierKeys) {
    if (
      keys.includes(idKey) &&
      (typeof obj[idKey] === "string" || typeof obj[idKey] === "number")
    ) {
      // Store this identifier
      if (!results[idKey]) results[idKey] = [];
      results[idKey].push({
        path: path,
        value: obj[idKey],
      });
    }
  }

  // Recursively process each key
  for (const key of keys) {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      const newPath = path ? `${path}.${key}` : key;
      findCommonIdentifiers(obj[key], newPath, results);
    }
  }

  return results;
};

// JSON Explorer Component
const JsonExplorer = defineComponent({
  name: "JsonExplorer",
  props: {
    data: {
      type: [Object, Array, String, Number, Boolean],
      required: true,
    },
    path: {
      type: String,
      default: "",
    },
    expanded: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { emit }) {
    const isExpanded = ref(props.expanded);

    const toggleExpand = () => {
      isExpanded.value = !isExpanded.value;
    };

    const selectField = (path) => {
      emit("select-field", path);
    };

    const getType = (value) => {
      if (value === null) return "null";
      if (Array.isArray(value)) return "array";
      return typeof value;
    };

    const getFormattedValue = (value) => {
      if (value === null) return "null";
      if (typeof value === "object") return "";
      if (typeof value === "string") return `"${value}"`;
      return String(value);
    };

    const getChildPath = (key) => {
      return props.path ? `${props.path}.${key}` : key;
    };

    return {
      isExpanded,
      toggleExpand,
      selectField,
      getType,
      getFormattedValue,
      getChildPath,
      chevronDownOutline,
      chevronForwardOutline,
    };
  },
  template: `
    <div class="json-item">
      <div v-if="typeof data === 'object' && data !== null" class="object-item">
        <div class="object-header" @click="toggleExpand">
          <ion-icon :icon="isExpanded ? chevronDownOutline : chevronForwardOutline" class="expand-icon"></ion-icon>
          <span class="object-type">{{ Array.isArray(data) ? 'Array' : 'Object' }}</span>
          <span class="item-count" v-if="data !== null">[{{ Object.keys(data).length }} items]</span>
          <button class="select-btn" @click.stop="selectField(path)">Select</button>
        </div>

        <div v-if="isExpanded" class="object-children">
          <div v-for="(value, key) in data" :key="key" class="object-child">
            <div class="property-name">{{ key }}:</div>
            <json-explorer
              :data="value"
              :path="getChildPath(key)"
              @select-field="selectField"
            />
          </div>
        </div>
      </div>

      <div v-else class="primitive-item" @click="selectField(path)">
        <span class="primitive-type">{{ getType(data) }}</span>
        <span class="primitive-value">{{ getFormattedValue(data) }}</span>
        <button class="select-btn" @click.stop="selectField(path)">Select</button>
      </div>
    </div>
  `,
});
</script>

<style scoped lang="scss">
.explorer-wrapper {
  width: 100%;
}

.transform-modal {
  --height: 100%;
  --width: 100%;

  @media (min-width: 768px) {
    --width: 600px;
    --height: 90%;
    --border-radius: 10px;
  }

  /* Improve contrast in dark mode */
  @media (prefers-color-scheme: dark) {
    .selected-field-path,
    .selected-base,
    .field-item {
      background-color: var(--ion-color-dark);
      color: var(--ion-color-light);
    }
  }
}

.selector-input {
  margin: 10px 0;
  display: flex;
  flex-direction: column;
  gap: 5px;

  .vessel-hint {
    font-size: 0.8rem;
    color: var(--ion-color-medium);
    margin-bottom: 5px;

    code {
      background-color: rgba(var(--ion-color-primary-rgb), 0.1);
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 0.75rem;
    }

    .selector-examples {
      color: white;
      margin: 5px 0 0 0;
      padding-left: 15px;

      li {
        margin-bottom: 3px;
      }
    }
  }

  .selector-form {
    display: flex;
    align-items: flex-end;
    gap: 10px;

    ion-item {
      flex-grow: 1;
    }

    .selector-button {
      margin-bottom: 8px;
    }
  }
}

.base-object-explorer,
.field-explorer {
  margin-top: 15px;
  border: 1px solid var(--ion-color-primary);
  border-radius: 8px;
  padding: 10px;
  background-color: var(--ion-color-light-shade);

  .explorer-label {
    font-size: 0.9rem;
    color: var(--ion-color-dark);
    font-weight: 500;
    margin-bottom: 10px;
  }

  .explorer-container {
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid var(--ion-color-primary);
    border-radius: 4px;
    background-color: var(--ion-color-medium-shade);
    padding: 8px;
  }

  @media (prefers-color-scheme: dark) {
    background-color: var(--ion-color-dark-shade);
    border-color: var(--ion-color-primary);

    .explorer-label {
      color: var(--ion-color-light);
    }

    .explorer-container {
      background-color: var(--ion-color-dark);
      border-color: var(--ion-color-primary);
    }
  }
}

.transform-section {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--ion-color-step-150);

  h3 {
    color: var(--ion-color-primary-contrast);
    margin-top: 0;
    margin-bottom: 10px;
  }

  h4 {
    color: var(--ion-color-primary-contrast);
    margin-top: 15px;
    margin-bottom: 5px;
    font-size: 0.9em;
  }
}

.saved-transformations {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px dashed var(--ion-color-step-150);
}

.save-confirmation {
  background-color: rgba(var(--ion-color-success-rgb), 0.15);
  color: var(--ion-color-success-contrast);
  padding: 10px;
  border-radius: 5px;
  margin: 10px 0;
  text-align: center;
  font-weight: bold;
}

.button-group {
  display: flex;
  gap: 10px;
  margin: 10px 0;
  flex-wrap: wrap;

  ion-button {
    flex-grow: 1;
    min-width: 120px;
  }
}

.base-selection {
  margin-top: 10px;
}

.selected-base {
  background-color: var(--ion-color-light);
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
  color: var(--ion-color-dark);
  border: 2px solid var(--ion-color-primary);
  box-shadow: 0 0 0 1px var(--ion-color-primary);
}

.field-add {
  margin-bottom: 15px;
}

.field-path {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.selected-field-path {
  background-color: var(--ion-color-light);
  padding: 8px;
  border-radius: 4px;
  flex-grow: 1;
  color: var(--ion-color-dark);
  white-space: nowrap;
  overflow: hidden;
}

.influxdb-test-section {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid var(--ion-color-medium);
  border-radius: 8px;
}

.test-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
}

.test-results {
  background-color: var(--ion-color-light);
  padding: 10px;
  border-radius: 4px;
  overflow: auto;
  max-height: 300px;
  text-overflow: ellipsis;
  border: 2px solid var(--ion-color-primary);
  box-shadow: 0 0 0 1px var(--ion-color-primary);
}

.field-list {
  margin-top: 15px;
}

.field-item {
  display: flex;
  align-items: center;
  padding: 8px;
  background-color: var(--ion-color-light);
  border-radius: 4px;
  margin-bottom: 5px;
  color: var(--ion-color-dark);
  flex-wrap: wrap;
  border: 2px solid var(--ion-color-medium);
}

.field-name {
  font-weight: bold;
  margin-right: 10px;
  min-width: 80px;
}

/* Using the app's standard input styling from input.css */

.field-path {
  flex-grow: 1;
  font-family: monospace;
  font-size: 0.9em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-container {
  background-color: rgba(var(--ion-color-primary-rgb), 0.1);
  padding: 10px;
  border-radius: 5px;
  margin-top: 10px;
  overflow-x: auto;

  pre {
    margin: 0;
    color: var(--ion-color-primary-contrast);
  }
}

.url-input {
  margin-bottom: 20px;
}

.fetch-button {
  margin-top: 10px;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
}

.selected-path {
  background-color: rgba(var(--ion-color-primary-rgb), 0.2);
  padding: 10px;
  border-radius: 5px;
  margin: 10px 0;
  font-family: monospace;
  color: var(--ion-color-primary-contrast);
}

.explorer-container {
  border: 1px solid var(--ion-color-primary);
  border-radius: 5px;
  overflow: auto;
  max-height: 70vh;
  background-color: var(--ion-color-light);

  @media (prefers-color-scheme: dark) {
    background-color: var(--ion-color-dark);
    border-color: var(--ion-color-primary);
  }
}

:deep(.json-item) {
  font-family: monospace;
  margin: 2px 0;
  color: var(--ion-color-dark);

  @media (prefers-color-scheme: dark) {
    color: var(--ion-color-dark);
  }
}

:deep(.object-item) {
  margin-left: 0;
}

:deep(.object-header) {
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 5px;
  background-color: rgba(var(--ion-color-primary-rgb), 0.2);
  border-radius: 3px;
  color: var(--ion-color-dark);
  font-weight: 500;

  @media (prefers-color-scheme: dark) {
    background-color: rgba(var(--ion-color-primary-rgb), 0.3);
    color: var(--ion-color-light);
  }
}

:deep(.object-header:hover) {
  background-color: rgba(var(--ion-color-primary-rgb), 0.4);

  @media (prefers-color-scheme: dark) {
    background-color: rgba(var(--ion-color-primary-rgb), 0.5);
  }
}

:deep(.expand-icon) {
  margin-right: 5px;
}

:deep(.object-type) {
  color: var(--ion-color-primary-contrast);
  font-weight: bold;
  margin-right: 5px;
}

:deep(.item-count) {
  color: var(--ion-color-primary-contrast);
  font-size: 0.9em;
}

:deep(.object-children) {
  padding-left: 20px;
  border-left: 1px dotted #ccc;
  margin-left: 10px;
}

:deep(.object-child) {
  display: flex;
  margin: 5px 0;
}

:deep(.property-name) {
  color: var(--ion-color-primary-contrast);
  margin-right: 5px;
  white-space: nowrap;
}

:deep(.primitive-item) {
  display: flex;
  align-items: center;
  padding: 5px;
  border-radius: 3px;
  color: var(--ion-color-dark);

  @media (prefers-color-scheme: dark) {
    color: var(--ion-color-light);
  }
}

:deep(.primitive-item:hover) {
  background-color: rgba(var(--ion-color-primary-rgb), 0.3);

  @media (prefers-color-scheme: dark) {
    background-color: rgba(var(--ion-color-primary-rgb), 0.4);
  }
}

:deep(.primitive-type) {
  color: var(--ion-color-primary-contrast);
  font-size: 0.8em;
  margin-right: 5px;
  padding: 2px 4px;
  background-color: rgba(var(--ion-color-primary-rgb), 0.2);
  border-radius: 3px;
}

:deep(.primitive-value) {
  color: var(--ion-color-primary-contrast);
}

:deep(.select-btn) {
  margin-left: auto;
  background-color: #3880ff;
  color: white;
  border: none;
  border-radius: 3px;
  padding: 2px 8px;
  font-size: 0.8em;
  cursor: pointer;
}

:deep(.select-btn:hover) {
  background-color: #3171e0;
}
/* InfluxDB Test Section Styles */
.influxdb-test-section {
  margin-bottom: 20px;
  padding: 20px;
  border: 1px solid var(--ion-color-medium);
  border-radius: 8px;
  background-color: var(--ion-background-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.usage-instructions {
  margin-bottom: 20px;
  padding: 15px;
  background-color: rgba(56, 128, 255, 0.1);
  border-left: 4px solid var(--ion-color-primary);
  border-radius: 4px;
}

.usage-instructions h4 {
  margin-top: 0;
  color: var(--ion-color-primary);
}

.usage-instructions ol {
  margin-bottom: 0;
  padding-left: 20px;
}

.usage-instructions li {
  margin-bottom: 5px;
}

.connection-controls {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-top: 5px;
}

.reconnect-button {
  --background: var(--ion-color-warning);
  --color: var(--ion-color-warning-contrast);
}

.test-button {
  align-self: flex-start;
  --background: var(--ion-color-success);
  --color: white;
}

.test-results {
  margin-top: 15px;
  margin-bottom: 20px;
  border: 1px solid var(--ion-color-medium);
  border-radius: 8px;
  overflow: hidden;
}

.test-results h3 {
  margin: 0;
  padding: 10px 15px;
  background-color: var(--ion-color-primary);
  color: white;
}

.results-content {
  padding: 15px;
  background-color: var(--ion-color-dark);
  color: white;
  font-family: monospace;
  font-size: 14px;
  overflow-x: auto;
}

.query-editor {
  margin-top: 20px;
  padding: 15px;
  background-color: rgba(56, 128, 255, 0.05);
  border-radius: 8px;
  border: 1px solid var(--ion-color-light-shade);
}

.textarea-container {
  margin: 10px 0;
  padding: 5px;
  border: 2px dashed var(--ion-color-primary);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.9);
}

.editor-instructions {
  margin-bottom: 10px;
  color: var(--ion-color-dark);
}

.query-textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px;
  font-family: monospace;
  font-size: 14px;
  background-color: white;
  color: #333;
  border: 1px solid var(--ion-color-medium);
  border-radius: 4px;
  resize: vertical;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.example-queries {
  margin-top: 20px;
  margin-bottom: 15px;
  background-color: #f0f7ff;
  padding: 15px;
  border-radius: 8px;
  border: 2px solid var(--ion-color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.example-queries h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: var(--ion-color-primary);
  font-size: 1.1em;
  font-weight: bold;
  text-align: center;
  border-bottom: 2px solid var(--ion-color-primary);
  padding-bottom: 8px;
}

.example-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.example-item {
  padding: 12px 15px;
  background-color: white;
  border: 2px solid var(--ion-color-primary-shade);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--ion-color-dark);
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
  padding-left: 20px;
}

.example-item::before {
  content: "→";
  position: absolute;
  left: 8px;
  color: var(--ion-color-primary);
  font-weight: bold;
}

.example-item:hover {
  background-color: var(--ion-color-primary-tint);
  border-color: var(--ion-color-primary-shade);
  color: var(--ion-color-primary-contrast);
  transform: translateX(5px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.example-item:hover::before {
  color: white;
}

.example-item strong {
  color: var(--ion-color-primary-shade);
}

/* Diagnostic items styling */
.diagnostic-item {
  background-color: var(--ion-color-tertiary);
  border-color: var(--ion-color-tertiary-shade);
  color: white;
}

.diagnostic-item strong {
  color: white;
}

.diagnostic-item::before {
  color: white;
}

.diagnostic-item:hover {
  background-color: var(--ion-color-tertiary-shade);
  border-color: var(--ion-color-tertiary);
  color: white;
}

.example-item:hover strong {
  color: white;
}

.query-buttons {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.execute-button {
  --background: var(--ion-color-primary);
  --color: white;
}

.clear-button {
  --background: var(--ion-color-medium);
  --color: white;
}

.data-exploration {
  margin-top: 25px;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  border: 2px solid var(--ion-color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.data-exploration h3 {
  margin-top: 0;
  color: var(--ion-color-primary-shade);
  font-size: 1.3em;
  font-weight: bold;
  border-bottom: 2px solid var(--ion-color-primary);
  padding-bottom: 10px;
  margin-bottom: 20px;
}

.query-error {
  padding: 15px;
  background-color: #ffebee;
  color: #b71c1c;
  border: 2px solid #f44336;
  border-radius: 4px;
  margin-bottom: 15px;
  font-weight: 600;
}

.result-stats {
  padding: 15px 20px;
  background-color: #0d47a1;
  color: white;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 1.1em;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.stats-text {
  margin: 0;
  text-align: center;
  letter-spacing: 0.5px;
}

.stats-highlight {
  font-weight: 700;
  font-size: 1.2em;
  color: #ffffff;
  background-color: #1565c0;
  padding: 4px 8px;
  border-radius: 4px;
  margin: 0 4px;
}

.results-table-container {
  border: 2px solid #3880ff;
  border-radius: 4px;
  overflow: auto; /* Changed from hidden to auto to enable both scrollbars */
  max-height: 400px;
  max-width: 100%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  table-layout: auto; /* Allow table to expand based on content */
  min-width: 100%; /* Ensure table takes at least full width */
}

.results-table th {
  background-color: #3880ff;
  color: white;
  padding: 14px 10px;
  text-align: left;
  position: sticky;
  top: 0;
  z-index: 1;
  font-weight: bold;
  border-bottom: 2px solid #2d6fdb;
  white-space: nowrap; /* Prevent header text from wrapping */
  min-width: 120px; /* Minimum width for columns */
}

.results-table td {
  padding: 10px;
  border-bottom: 1px solid #d0d0d0;
  color: #000000;
  font-weight: 500;
  max-width: 300px; /* Limit cell width */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap; /* Prevent text wrapping in cells */
}

.results-table tr:nth-child(even) {
  background-color: #f5f7fa;
}

.results-table tr:nth-child(odd) {
  background-color: white;
}

.results-table tr:hover {
  background-color: #e8f1ff;
}

.cell-content {
  display: inline-block;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clickable-cell {
  cursor: pointer;
  position: relative;
}

.clickable-cell:hover {
  background-color: rgba(56, 128, 255, 0.1);
}

.cell-expanded {
  white-space: normal !important;
  max-width: none !important;
  word-break: break-all;
}
.signalk-connection-section {
  margin-bottom: 20px;
  padding: 20px;
  border: 2px solid #3880ff;
  border-radius: 8px;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.signalk-connection-section h2 {
  margin-top: 0;
  color: #0d47a1;
  font-size: 1.3em;
  font-weight: bold;
  border-bottom: 2px solid #3880ff;
  padding-bottom: 10px;
  margin-bottom: 20px;
}

.connection-status-display {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.connection-indicator {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #d0d0d0;
}

.indicator-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.light-label {
  font-size: 0.8em;
  font-weight: 600;
  color: #333333;
}

.connection-light {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #d0d0d0;
}

.connection-light.connected {
  background-color: #4caf50;
  border-color: #2e7d32;
  box-shadow: 0 0 8px #4caf50;
}

.connection-light.connecting {
  background-color: #ff9800;
  border-color: #e65100;
  box-shadow: 0 0 8px #ff9800;
}

.connection-light.disconnected {
  background-color: #f44336;
  border-color: #b71c1c;
  box-shadow: 0 0 8px #f44336;
}

.influx-light {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #d0d0d0;
}

.influx-light.active {
  background-color: #2196f3;
  border-color: #0d47a1;
  box-shadow: 0 0 8px #2196f3;
}

.influx-light.inactive {
  background-color: #9e9e9e;
  border-color: #616161;
  box-shadow: none;
}

.connection-light.blinking,
.influx-light.blinking {
  animation: blink 1.5s infinite;
}

@keyframes blink {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
  100% {
    opacity: 1;
  }
}

.connection-text {
  font-size: 1.1em;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.mode-info,
.influx-info {
  font-size: 0.9em;
  display: flex;
  align-items: center;
  gap: 5px;
}

.mode-label,
.influx-label {
  font-weight: 600;
  color: #333333;
}

.mode-value,
.influx-value {
  font-weight: 500;
  color: #0d47a1;
  background-color: #e3f2fd;
  padding: 2px 6px;
  border-radius: 4px;
}

.status-label {
  font-weight: 600;
  color: #333333;
  margin-right: 8px;
}

.status-value {
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 4px;
}

.status-connected {
  color: #2e7d32;
  background-color: #e8f5e9;
}

.status-connecting {
  color: #e65100;
  background-color: #fff3e0;
}

.status-disconnected {
  color: #b71c1c;
  background-color: #ffebee;
}

.connection-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.connection-button {
  --background: #3880ff;
  --color: white;
  font-weight: 500;
}
</style>
