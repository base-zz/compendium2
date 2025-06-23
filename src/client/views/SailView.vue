<template>
  <ion-page>
    <generic-header title="Sail" />
    <ion-content class="content-with-header">
      <div id="container" class="container" :class="{ 'fade-in': isMounted }">
        <div class="top-left quad" ref="topLeft">
          <InstrumentView :data="depthData" :maintainSquareRatio="false" label="Depth"/>
        </div>
        <div class="top-right quad" ref="topRight">
          <InstrumentView :data="sogData" :maintainSquareRatio="false" label="SOG" />
        </div>
       
        <div class="mid-section sail quad" ref="sail360">
          <div class="sail-component-wrapper">
            <SailComponent />
          </div>
        </div>

        <div class="bottom-left quad" ref="bottomLeft">
          <InstrumentView :data="trueWindSpeedData" :maintainSquareRatio="false" label="TWS"/>
        </div>
        <div class="bottom-right quad" ref="bottomRight">
          <InstrumentView
            :data="apparentWindSpeedData"
            :maintainSquareRatio="false"
            label="AWS"
          />
        </div> 
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { onMounted, ref, onUnmounted, computed, nextTick } from "vue";
import InstrumentView from "../components/InstrumentComponent.vue";
import SailComponent from "../components/Sail360Component.vue";
import { useStateDataStore } from "../stores/stateDataStore.js";
import { storeToRefs } from "pinia";
import { IonPage, IonContent } from "@ionic/vue";
import GenericHeader from "../components/GenericHeader.vue";

const isMounted = ref(false);
const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);

const navigationState = computed(() => state?.value?.navigation);

// Computed wrappers to force reactivity for instrument props
const depthData = computed(() => ({ ...navigationState.value?.depth?.belowTransducer }));
const sogData = computed(() => ({ ...navigationState.value?.speed?.sog }));
const trueWindSpeedData = computed(() => ({ ...navigationState.value?.wind?.true?.speed }));
const apparentWindSpeedData = computed(() => ({ ...navigationState.value?.wind?.apparent?.speed }));

console.log("stateStore", stateStore );
console.log("navigationState", navigationState.value);

const topLeft = ref(null);
const topRight = ref(null);
const bottomLeft = ref(null);
const bottomRight = ref(null);
const sail360 = ref(null);

// Force widgets to use the full space of their containers
function forceWidgetSizing(quadElement) {
  if (!quadElement) return;

  // Find widget container
  const widgetContainer = quadElement.querySelector(".widget-container");
  if (widgetContainer) {
    // Remove any inline styles that might override our CSS
    widgetContainer.style.width = "100%";
    widgetContainer.style.height = "100%";
    widgetContainer.style.margin = "0";
  }

  // Special handling for Sail360View
  const sailComponent = quadElement.querySelector(".sail-component");
  if (sailComponent) {
    // Use a more Safari-friendly approach
    sailComponent.style.position = "absolute";
    sailComponent.style.width = "100%";
    sailComponent.style.height = "100%";
    sailComponent.style.maxWidth = "none";
    sailComponent.style.maxHeight = "none";
    sailComponent.style.top = "50%";
    sailComponent.style.left = "50%";
    sailComponent.style.transform = "translate(-50%, -50%)";

    // Force the viewBox to be respected
    sailComponent.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }
}

function updateAllQuads() {
  [
    topLeft.value,
    topRight.value,
    bottomLeft.value,
    bottomRight.value,
    sail360.value,
  ].forEach((quad) => {
    if (quad) forceWidgetSizing(quad);
  });
}

// Create a mutation observer to detect when widgets are added
const mutationObserver = new MutationObserver((mutations) => {
  let needsUpdate = false;

  mutations.forEach((mutation) => {
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((node) => {
        if (
          node.classList &&
          (node.classList.contains("widget-container") ||
            node.querySelector(".widget-container"))
        ) {
          needsUpdate = true;
        }
      });
    }
  });

  if (needsUpdate) {
    requestAnimationFrame(updateAllQuads);
  }
});

onMounted(async () => {
  // Wait for the next tick to ensure all child components are mounted
  await nextTick();
  
  // Observe all quad elements for DOM changes
  [
    topLeft.value,
    topRight.value,
    bottomLeft.value,
    bottomRight.value,
    sail360.value,
  ].forEach((quad) => {
    if (quad) {
      // Observe for DOM changes inside each quad
      mutationObserver.observe(quad, {
        childList: true,
        subtree: true,
      });
    }
  });

  // Initial update
  updateAllQuads();

  // Mark as mounted to trigger fade-in
  isMounted.value = true;

  // Schedule additional updates to catch late-rendered components
  [100, 500, 1000, 2000].forEach((delay) => {
    setTimeout(updateAllQuads, delay);
  });
});

// Clean up observer when component is unmounted
onUnmounted(() => {
  mutationObserver.disconnect();
});
</script>

<style scoped>
/* Container starts invisible and fades in when mounted */
#container {
  opacity: 0;
  transition: opacity 0.5s ease-in-out;
}

#container.fade-in {
  opacity: 1;
}

/* Ensure all children inherit the opacity transition */
#container > * {
  opacity: inherit;
}

ion-content {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 2fr 4fr 2fr;
  grid-column-gap: 3px;
  grid-row-gap: 3px;
  height: 100%;
  position: relative;
}

.quad {
  position: relative;
  height: 100%;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: white;
  padding: 0;
  margin: 0;
}

.sail-component-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* Force widget container to fill the quad */
.quad :deep(.widget-container) {
  width: 100% !important;
  height: 100% !important;
  margin: 0 !important;
  max-width: 100% !important;
  max-height: 100% !important;
  box-shadow: none !important;
  background-color: transparent !important;
}

/* Force SVG to fill the container with proper aspect ratio */
.quad :deep(svg) {
  position: absolute;
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* Special styling for Sail360View */
.mid-section {
  grid-area: 2 / 1 / 3 / 3;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  position: relative;
}

.mid-section :deep(.sail-component) {
  position: absolute !important;
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  max-height: none !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
}

.top-left {
  grid-area: 1 / 1 / 2 / 2;
}
.top-right {
  grid-area: 1 / 2 / 2 / 3;
}
.bottom-left {
  grid-area: 3 / 1 / 4 / 2;
}
.bottom-right {
  grid-area: 3 / 2 / 4 / 3;
}
</style>
