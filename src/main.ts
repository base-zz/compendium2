import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { IonicVue } from '@ionic/vue';
import { startSmartConnectionManager } from '@/services/smartConnectionManager.js';
import { createLogger } from '@/services/logger.js';
import App from './App.vue';
import router from './router';

// Import Ionic CSS
import '@ionic/vue/css/core.css';
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';
import '@ionic/vue/css/palettes/dark.system.css';
import './theme/variables.css';

// Create Pinia and app
const pinia = createPinia();
const app = createApp(App);

// Setup Pinia first
app.use(pinia);

// Import the preferences store
import { usePreferencesStore } from '@/stores/preferences'; // No .ts extension

// Create a function to initialize the store after Pinia is set up
const initializeStores = () => {
  const preferencesStore = usePreferencesStore();
  
  if (import.meta.env.DEV) {
    console.log('Preferences store initialized:', {
      store: preferencesStore,
      methods: Object.getOwnPropertyNames(Object.getPrototypeOf(preferencesStore)),
      hasSavePreferences: typeof preferencesStore.savePreferences === 'function'
    });
  }
  
  return { preferencesStore };
};

// Create the logger early
const logger = createLogger('main');

// Initialize stores after Pinia is set up
const initApp = async () => {
  try {
    // Initialize stores
    const { preferencesStore } = initializeStores();
    
    // Wait for store to initialize if needed
    if (preferencesStore.init) {
      await preferencesStore.init();
    }
    
    // Setup other plugins
    app.use(router);
    app.use(IonicVue);
    
    // Log app initialization
    logger.info('===== Application Initialization =====');
    logger.info(`Environment: ${import.meta.env.MODE || 'development'}`);
    logger.info('Starting connection management system...');

    // Initialize the smart connection manager
    try {
      startSmartConnectionManager();
      logger.info('Connection management system started successfully');
      
    } catch (error) {
      logger.error('Failed to start connection management system', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // Don't rethrow - we still want the app to mount
    }

    // Mount the app
    app.mount('#app');
    logger.info('Application mounted');
  } catch (error) {
    console.error('Failed to initialize app:', error);
    // Still mount the app even if initialization fails
    app.use(router);
    app.use(IonicVue);
    app.mount('#app');
  }
};

// Start the app
initApp();
