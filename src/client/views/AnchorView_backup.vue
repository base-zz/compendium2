<template>
  <ion-page class="page-container">
    <!-- Loading overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <ion-spinner></ion-spinner>
      <p>Initializing navigation...</p>
    </div>
    <!-- Error message -->
    <div v-if="positionError" class="error-overlay">
      <ion-icon :icon="warning"></ion-icon>
      <p>{{ positionError }}</p>
      <ion-button @click="initializeMap()">Retry</ion-button>
    </div>
    <!-- Map container as bottom layer -->
    <div v-if="useMapBackground" class="map-wrapper">
      <div ref="mapElement" class="openlayers-map">
        <!-- Map will be initialized here via JavaScript -->
      </div>
    </div>
    
    <generic-header title="Anchor"></generic-header>
    <ion-content class="ion-padding">
      <div class="anchor-container" :class="{ 'map-background': useMapBackground }">
        <div class="anchor-grid-div">
          <h2 class="title-div">Not Anchored</h2>
          <div class="grid-container">
            <div class="grid-row">
              <div class="info-rect-div">
                <div class="label-div">Range</div>
                <div class="metric-div">{{ anchorData.criticalRange.r }}</div>
              </div>
              <div class="info-rect-div">
                <div class="label-div">Rode</div>
                <div class="metric-div">{{ anchorData.rode.amount }}</div>
              </div>
              <div class="info-rect-div">
                <div class="label-div">Depth</div>
                <div class="metric-div">{{ anchorData.depth }}</div>
              </div>
              <div class="info-rect-div">
                <div class="label-div">Wind Speed</div>
                <div class="metric-div">{{ anchorData.wind.speed }}</div>
              </div>
              <div class="info-rect-div">
                <div class="label-div">Current Speed</div>
                <div class="metric-div">{{ anchorData.current.speed }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="svg-square-container" ref="svgContainer">
          <svg
            height="600"
            width="600"
            ref="svg"
            xmlns="http://www.w3.org/2000/svg"
            id="svg-canvas"
            class="instrument anchor-component square-svg"
            preserveAspectRatio="xMidYMid meet"
            viewBox="-5 -5 610 610"
          >
            <!-- Define filters for glow effects -->
            <defs>
              <filter id="glow-effect" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <g id="anchor-graph">
              <!-- DEBUG: Center crosshair for alignment -->
              <g id="debug-center-crosshair">
                <line x1="295" y1="300" x2="305" y2="300" stroke="red" stroke-width="2"/>
                <line x1="300" y1="295" x2="300" y2="305" stroke="red" stroke-width="2"/>
              </g>
              <g class="ais-targets">
                <circle
                  v-for="t in anchorData.aisTargets"
                  :key="t.id"
                  :cx="t.x"
                  :cy="t.y"
                  r="4"
                  class="ais-target pulsating3"
                  :fill="aisTargetColor"
                  :stroke="primaryContrastHex"
                  stroke-width="1"
                  filter="url(#glow-effect)"
                  :id="t.id"
                  :mmsi="t.mmsi"
                  v-on:click="showAISTarget(t.mmsi)"
                ></circle>
              </g>
              <g class="anchor-area">
                <g id="breadcrumbs">
                  <circle
                    v-for="crumb in anchorData.breadcrumbs"
                    :key="crumb.id"
                    :cx="crumb.position.x"
                    :cy="crumb.position.y"
                    r="2"
                    :id="crumb.id"
                    :opacity="crumb.opacity"
                    class="breadcrumb"
                    fill="white"
                    stroke="white"
                    stroke-width="0.5"
                  ></circle>
                </g>
                <circle
                  id="critical-range"
                  cx="300"
                  cy="300"
                  :r="scaledCriticalRangeR"
                  fill="transparent"
                  stroke="white"
                ></circle>
                <g id="boatGroup">
                  <line
                    id="rode"
                    :x1="anchorData?.rode?.x1 || 300"
                    :x2="anchorData?.rode?.x2 || 300"
                    :y1="anchorData?.rode?.y1 || 300"
                    :y2="anchorData?.rode?.y2 || 300"
                    stroke="white"
                    stroke-linecap="square"
                  ></line>
                  <circle
                    id="anchor"
                    :cx="anchorData?.rode?.x1 || 300"
                    :cy="anchorData?.rode?.y1 || 300"
                    r="5"
                    fill="white"
                  ></circle>
                  <circle
                    id="anchoDrop"
                    :cx="anchorData?.anchorDropLocation?.x || 300"
                    :cy="anchorData?.anchorDropLocation?.y || 300"
                    r="5"
                    :fill="complementaryColor"
                  ></circle>
                  <circle
                    id="boat"
                    :cx="anchorData?.rode?.x2 || 300"
                    :cy="anchorData?.rode?.y2 || 300"
                    r="8"
                    :fill="hexToRgba(complementaryColor, 0.8)"
                    :stroke="primaryContrastHex"
                    stroke-width="1.5"
                    class="pulsating"
                  ></circle>
                </g>
                <g
                  id="compass-group"
                  :style="`transform-origin: ${anchorData?.criticalRange?.x ?? 300}px ${anchorData?.criticalRange?.y ?? 300}px;`"
                >
                  <circle
                    id="compass"
                    class="compass"
                    :cx="anchorData?.criticalRange?.x ?? 300"
                    :cy="anchorData?.criticalRange?.y ?? 300"
                    :r="compassR"
                    :fill="hexToRgba(primaryColor, 0.15)"
                    :stroke="complementaryColor"
                    stroke-width="1"
                    @click="setClickAngle"
                  ></circle>
                  <text
                    v-for="d in deg_markers"
                    :key="d.lbl"
                    class="compass-label"
                    :class="[['N', 'S', 'E', 'W'].includes(d.lbl) ? 'north' : '', anchorData?.criticalRange?.r <= 0 ? 'hidden' : '']"
                    :transform="`rotate(${d.value})`"
                    :x="anchorData.value?.criticalRange?.x ?? 300"
                    :y="(anchorData.value?.criticalRange?.y ?? 300) - compassR + 6"
                  >
                    {{ d.lbl }}
                  </text>
                </g>
                <text
                  id="wind-direction"
                  dominant-baseline="bottom"
                  text-anchor="end"
                  :x="anchorData.value?.criticalRange?.x ?? 300"
                  :y="(anchorData.value?.criticalRange?.y ?? 300) - compassR + 6"
                >
                  ^
                </text>
                <g class="ais-targets" id="ais-targets">
                  <circle
                    v-for="t in anchorData.aisTargets"
                    :key="t.id"
                    :cx="t.x"
                    :cy="t.y"
                    r="4"
                    class="ais-target pulsating3"
                    :fill="aisTargetColor"
                    :stroke="primaryContrastHex"
                    stroke-width="1"
                    filter="url(#glow-effect)"
                    :id="t.id"
                    :mmsi="t.mmsi"
                    v-on:click="showAISTarget(t.mmsi)"
                  ></circle>
                </g>
              </g>
            </g>
          </svg>
        </div>
      </div>
    </ion-content>
    <!-- Floating action buttons on the left side instead of footer buttons -->
    <div class="anchor-fab-container" v-if="useMapBackground">
      <ion-fab-button id="set-anchor-params" color="primary" class="custom-fab-size">
        <img
          src="/img/anchor.svg"
          alt="Anchor"
          style="width: 30px; height: 30px; filter: brightness(0) invert(1)"
        />
      </ion-fab-button>
      <ion-fab-button
        id="present-alert"
        color="primary"
        class="custom-fab-size"
        :disabled="!anchorState.deployed"
      >
        <span class="zoom-icon">×</span>
      </ion-fab-button>
    </div>
    <!-- Alert for cancel anchor action -->
    <ion-alert
      trigger="present-alert"
      header="Cancel Anchor?"
      :buttons="alertButtons"
    ></ion-alert>
  </ion-page>
</template>

<script setup>
// ... (copy all script setup code from AnchorView.vue here)
</script>

<style scoped>
/* (copy all styles from AnchorView.vue here) */
</style>
