<template>
  <div class="logging-test">
    <h2>Logging Test</h2>
    <ion-button @click="testLogging">Test Logging</ion-button>
    <ion-button @click="testDataLogging" color="secondary">Test Data Logging</ion-button>
    <ion-button @click="testErrorLogging" color="danger">Test Error Logging</ion-button>
    
    <div class="log-output">
      <h3>Console Output:</h3>
      <pre>{{ consoleOutput }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { createLogger } from '../services/logger.js';
import { IonButton } from '@ionic/vue';

const logger = createLogger('test');
const consoleOutput = ref('');

// Capture console output
const originalConsole = {
  log: console.log,
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error
};

function captureConsoleOutput(method, args) {
  const timestamp = new Date().toISOString().substring(11, 19);
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  
  consoleOutput.value = `[${timestamp}] [${method.toUpperCase()}] ${message}\n${consoleOutput.value}`;
  originalConsole[method](...args);
}

// Override console methods
['log', 'debug', 'info', 'warn', 'error'].forEach(method => {
  console[method] = (...args) => captureConsoleOutput(method, args);
});

function testLogging() {
  logger.info('This is a test info message');
  logger.debug('This is a test debug message');
  logger.warn('This is a test warning');
}

function testDataLogging() {
  logger.data('This is test data', { 
    timestamp: new Date().toISOString(),
    value: Math.random() * 100,
    status: 'success'
  });
}

function testErrorLogging() {
  try {
    // This will throw an error
    nonExistentFunction();
  } catch (error) {
    logger.error('Error in test:', error);
  }
}

onMounted(() => {
  logger.info('Logging test component mounted');  
});
</script>

<style scoped>
.logging-test {
  padding: 16px;
}

.log-output {
  margin-top: 20px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  font-family: monospace;
  white-space: pre-wrap;
}

pre {
  margin: 0;
  padding: 0;
  font-family: inherit;
}

ion-button {
  margin: 4px;
}
</style>
