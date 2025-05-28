import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { IonicVue } from '@ionic/vue';
import { startSmartConnectionManager } from '@client/services/smartConnectionManager.js';
import { createLogger } from './client/services/logger.js';
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

// Now that Pinia is set up, we can create the logger
const logger = createLogger('main');

// Log app initialization
logger.info('===== Application Initialization =====');
logger.info(`Environment: ${import.meta.env.MODE || 'development'}`);
logger.info('Starting connection management system...');

// Initialize the smart connection manager which will handle direct/relay connections
try {
  startSmartConnectionManager();
  logger.info('Connection management system started successfully');
} catch (error) {
  logger.error('Failed to start connection management system', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  });
  throw error; // Re-throw to prevent app from starting in a bad state
}

// Configure Vue app
app.use(IonicVue).use(router);

logger.info('Vue application created and configured');

// Wait for router to be ready before mounting
router.isReady().then(() => {
  app.mount('#app');
  logger.info('Application mounted');
});
