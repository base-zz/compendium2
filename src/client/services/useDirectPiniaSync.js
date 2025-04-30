// src/client/services/useDirectPiniaSync.js
import { useStateDataStore } from '../stores/stateDataStore'
import { directConnectionAdapter } from './directConnectionAdapter'

let subscribed = false

export function useDirectPiniaSync() {
  console.log('[PINIA-SYNC] useDirectPiniaSync initialized');
  if (subscribed) return // Prevent duplicate subscriptions
  subscribed = true

  const store = useStateDataStore()
  directConnectionAdapter.on('state-update', ({ type, data }) => {
    console.log('[PINIA-SYNC] state-update event received', { type, data });
    if (type === 'state:full-update') {
      store.replaceState(data);
    } else if (type === 'state:patch') {
      store.applyStatePatch(data);
    }
  });
}
