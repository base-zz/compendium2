// src/client/services/useDirectPiniaSync.js
import { useStateDataStore } from '../stores/stateDataStore'
import { directConnectionAdapter } from './directConnectionAdapter'

let subscribed = false

export function useDirectPiniaSync() {
  console.log('[PINIA-SYNC] useDirectPiniaSync initialized');
  if (subscribed) return // Prevent duplicate subscriptions
  subscribed = true

  const store = useStateDataStore()
  directConnectionAdapter.on('state-update', ({ full, state, patch, data, type }) => {
    console.log('[PINIA-SYNC] state-update event received', { full, state, patch, data, type });
    if (full || type === 'full-state') {
      store.replaceState(data || state)
    } else if ((patch || data) && (type === 'state-update' || !type)) {
      store.applyStatePatch(patch || data)
    }
  })
}
