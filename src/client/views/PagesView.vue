<template>
  <ion-page>
    <generic-header title="Instruments" />
    <ion-content class="content-with-header">
      <loading-content v-if="loading">loading</loading-content>

      <swiper
        v-else
        :modules="modules"
        :pagination="{ clickable: true }"
        :navigation="true"
        :speed="400"
        :initial-slide="0"
        @swiper="setSwiperRef"
        @slideChange="onSlideChange"
        class="slides-container"
        :touchEventsTarget="'container'"
        :noSwiping="false"
        :touchReleaseOnEdges="true"
        :preventInteractionOnTransition="false"
        :touchStartPreventDefault="false"
      >
        <swiper-slide v-for="(p, i) in pages" :key="'ss-' + i" class="slide-content">
          <Page :page="p" :key="'page-' + i" :pageIndex="i" />
        </swiper-slide>
      </swiper>

      <!-- Use Ionic's FAB buttons for better iOS support -->
      <ion-fab vertical="bottom" horizontal="start" slot="fixed">
        <ion-fab-button id="add-page-button" color="primary" @click="handleAddPageClick">
          <ion-icon :icon="addCircleOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button
          id="delete-page-button"
          color="danger"
          @click="handleDeletePageClick"
        >
          <ion-icon :icon="trashOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <div class="floating-container">
      <div class="page-indicator">
        <span
          class="bullet"
          :class="i === selectedPageIndex ? 'active-bullet' : ''"
          v-for="(p, i) in pages"
          :key="'bullet-' + i"
        >
          &bull;
        </span>
      </div>
    </div>
  </ion-page>
</template>

<script setup>
import { IonPage, IonContent, IonIcon, IonFab, IonFabButton } from "@ionic/vue";
import Page from "@client/components/PageComponent.vue";
import LoadingContent from "@client/components/LoadingContent.vue";
import GenericHeader from "@client/components/GenericHeader.vue";
import { usePageStore } from "@client/stores/pages.js";
import { computed, onMounted, ref } from "vue";
import { Swiper, SwiperSlide } from "swiper/vue";
import { Pagination } from "swiper/modules";
import { Navigation } from "swiper/modules";
import { addCircleOutline, trashOutline } from "ionicons/icons";
// Import Swiper styles
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

import "@ionic/vue/css/ionic-swiper.css";

//define the page store
const pageStore = usePageStore();

// Make pages reactive
const pages = computed(() => pageStore.pagedata);

/* load the stored pages */
const loading = ref(true);

onMounted(async () => {
  loading.value = true;
  const p = await pageStore.getPages();

  // Check if there's a saved page index in localStorage
  const savedPageIndex = localStorage.getItem("lastPageIndex");

  if (!(p && p.length > 0 && p[0])) {
    await pageStore.newPage();
  }

  loading.value = false;

  // Set the initial page index if available
  if (savedPageIndex !== null) {
    const index = parseInt(savedPageIndex);
    if (!isNaN(index) && index >= 0 && index < pages.value.length) {
      selectedPageIndex.value = index;

      // Wait for swiper to initialize
      setTimeout(() => {
        if (swiperRef.value) {
          swiperRef.value.slideTo(index);
        }
      }, 300);
    }
  }
});

// the selectedPage
const selectedPageIndex = ref(0);

//if slide changes set the new index for the bullet widget
function onSlideChange(e) {
  selectedPageIndex.value = e.activeIndex;
}

// Function to add a new page
async function handleAddPageClick(event) {
  // Prevent any default behavior
  if (event) event.preventDefault();

  console.log("handleAddPageClick function called");
  try {
    console.log("Adding new page");
    const newPage = await pageStore.newPage();
    console.log("New page added:", newPage);

    // Wait for the DOM to update
    setTimeout(() => {
      if (swiperRef.value) {
        console.log("Updating swiper, sliding to new page");
        swiperRef.value.update();
        swiperRef.value.slideTo(pages.value.length - 1);
      }
    }, 100);
  } catch (error) {
    console.error("Error adding new page:", error);
  }
}

// Function to delete a page
function handleDeletePageClick(event) {
  // Prevent any default behavior
  if (event) event.preventDefault();

  console.log(
    `handleDeletePageClick function called with index: ${selectedPageIndex.value}`
  );
  if (selectedPageIndex.value === undefined || selectedPageIndex.value === null) {
    console.error("Invalid page index:", selectedPageIndex.value);
    return;
  }

  try {
    console.log(`Deleting page at index ${selectedPageIndex.value}`);
    pageStore.deletePage(selectedPageIndex.value);
    console.log("Page deleted successfully");
  } catch (error) {
    console.error("Error deleting page:", error);
  }
}

const modules = [Pagination, Navigation];

const swiperRef = ref(null);

function setSwiperRef(swiper) {
  swiperRef.value = swiper;
}
</script>

<style scoped>
.slides-container {
  width: 100%;
  height: 100%;
  touch-action: pan-y;
}

.slide-content {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  touch-action: pan-y;
}

.page-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
}

.bullet {
  font-size: 24px;
  margin: 0 5px;
  opacity: 0.75;
  color: lightsteelblue;
}

.active-bullet {
  color: var(--ion-color-primary);
  color: white;
  opacity: 1;
}

.footer-button-container {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.custom-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin: 0 5px;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  touch-action: manipulation; /* Improve touch handling on iOS */
  -webkit-touch-callout: none; /* Prevent callout to copy image, etc when tap to hold */
  -webkit-user-select: none; /* Prevent text selection when tapping */
  user-select: none; /* Standard property for compatibility */
  -webkit-tap-highlight-color: transparent; /* Remove tap highlight */
}

.custom-button ion-icon {
  margin-right: 6px;
  font-size: 18px;
}

.primary-button {
  background-color: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}

.danger-button {
  background-color: var(--ion-color-danger);
  color: var(--ion-color-danger-contrast);
}

/* Active state for buttons */
.custom-button:active {
  opacity: 0.8;
  transform: translateY(1px);
}

/* Settings modal styles */
.settings-modal {
  --height: 50%;
  --width: 90%;
  --border-radius: 16px;
  --box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* Swiper specific styles */
:deep(.swiper) {
  width: 100%;
  height: 100%;
  overflow: visible;
}

:deep(.swiper-slide) {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.floating-container {
  position: fixed;
  bottom: 20px; /* Adjust this value to position above the bottom */
  left: 50%;
  transform: translateX(-50%);
  /* background-color: white; Change as needed */
  border-radius: 25px; /* Adjust for rounded corners */
  padding: 5px 5px; /* Adjust padding for size */
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); /* Add shadow for depth */
  z-index: 1000; /* Ensure it appears above other elements */
}
</style>
