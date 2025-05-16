<template>
  <div class="add-widget-selections" ref="add-widget-selections">
    <div class="header">ADD INSTRUMENT</div>
    <div>
      <div class="label">Select Metric to Use:</div>
      <div class="action" ref="fields">
        <ion-chip
          :key="f"
          v-for="f in navFields"
          class="field"
          @click="selectField($event)"
          ><ion-label>{{ f }}</ion-label></ion-chip
        >
      </div>
    </div>
    <div class="label">Select Graph Type</div>
    <div class="action">
      <ion-segment value="line" color="tertiary" @click="selectGraph" ref="selectedGraph">
        <ion-segment-button value="line">
          <ion-label>Line Chart</ion-label>
        </ion-segment-button>
        <ion-segment-button value="bar">
          <ion-label>Bar Chart</ion-label>
        </ion-segment-button>
      </ion-segment>
    </div>
    <div class="label">
      <ion-button size="small" @click="saveButton">Save</ion-button>
      <ion-button size="small" @click="deleteButton">Delete</ion-button>
      <ion-button size="small" @click="cancelButton">Cancel</ion-button>
    </div>
  </div>
</template>

<script setup>
import { useStateDataStore } from "@/stores/stateDataStore.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, useTemplateRef } from "vue";
// import _ from "lodash";
import Sail360 from "./Sail360Component.vue";
import Instrument from "./InstrumentComponent.vue";
import { IonChip, IonSegment, IonSegmentButton, IonLabel, IonButton } from "@ionic/vue";
import { scaleAndCenterInParent, scaleElementTo } from "../util/func1.js";

// Define the events that can be emitted
const emit = defineEmits(["save", "update", "close"]);

/* ---------------------------------------------------------------
The state data and the fields used in the add widget thing.
Need to change the navFields to use labels.
--------------------------------------------------------------- */
const stateStore = useStateDataStore();
const { navigationState } = storeToRefs(stateStore);

// Define available instrument fields based on the state structure
const navFields = [
  "Sail360",
  "Speed Over Ground",
  "Speed Through Water",
  "Depth",
  "Wind Speed (True)",
  "Wind Angle (True)",
  "Wind Speed (Apparent)",
  "Wind Angle (Apparent)",
  "Heading",
  "Course Over Ground",
  "Current Speed",
  "Current Direction",
  "Water Temperature",
  "Air Temperature",
  "Pressure"
];

const selectedField = ref(null);
const selectedGraph = ref("line");

const widgetSelections = useTemplateRef("add-widget-selections");
const fields = useTemplateRef("fields");

/* ---------------------------------------------------------------
      Buttons for addWidget actions
--------------------------------------------------------------- */

function selectField(e) {
  const sel = e.target.textContent;
  selectedField.value = sel;
  Array.from(fields.value.childNodes).forEach((e) => {
    if (e.textContent == sel) e.color = "success";
    else e.color = "";
  });
}

function selectGraph() {
  console.log("SELECTED GRAPH");
  console.log(selectedGraph.value.$el.value);
  // selectedGraph.value.$el.color = "success";
  console.log(selectedGraph.value);
}

function saveButton() {
  setTimeout(() => {}, animationTime + 10);
}

function deleteButton() {
  selectedGraph.value = "line";
}

function cancelButton() {
  selectedField.value = null;
  selectedGraph.value = "line";
}

/* ---------------------------------------------------------------
      Mounted actions. Need to setTimeout to get
      BoundingClientBox positions.
--------------------------------------------------------------- */
onMounted(() => {});
</script>

<style scoped>
.header {
  margin: 0.5em;
  font-size: 2.5em;
  font-weight: bold;
  padding-bottom: 1em;
}
.label {
  padding: 0.75em;
  font-size: 1.5em;
  font-weight: bold;
}
.action {
  padding: 1em;
}
ion-button,
button {
  border: 1px solid;
  border-radius: 5px;
  margin: 0 3px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.hidden {
  visibility: hidden;
}
</style>
