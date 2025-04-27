// Server-only StateService logic (migrated from /src/state/StateService.js)
import EventEmitter from 'events';
import { stateData } from '../../client/stateData.js';

class StateService extends EventEmitter {
  // ... (all the class code from the original StateService.js)
}

const stateService = new StateService();

export { stateService, StateService };

// Print a summary of stateData every 10 seconds for debugging
setInterval(() => {
  if (stateData && stateData.state) {
    // console.dir(stateData.state, { depth: null, colors: true });
  } else {
    console.info('[StateService] stateData not available');
  }
}, 10000);
