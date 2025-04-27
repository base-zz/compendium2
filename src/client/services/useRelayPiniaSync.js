// src/client/services/useRelayPiniaSync.js
import { useStateDataStore } from '../stores/stateDataStore'
import { relayConnectionBridge } from '../../relay/client/RelayConnectionBridge'

let subscribed = false


export function useRelayPiniaSync() {
  if (subscribed) return // Prevent duplicate subscriptions
  subscribed = true

  const store = useStateDataStore()
  relayConnectionBridge.on('state-update', ({ type, state, patch, data }) => {
    if (type === 'full-state') {
      store.replaceState(data || state);
    } else if (type === 'state-update' && (patch || data)) {
      store.applyStatePatch(patch || data);
    }
  });
}
