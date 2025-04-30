// src/client/services/useRelayPiniaSync.js
import { useStateDataStore } from '../stores/stateDataStore'
import { relayConnectionBridge } from '../../relay/client/RelayConnectionBridge'

let subscribed = false


export function useRelayPiniaSync() {
  if (subscribed) return // Prevent duplicate subscriptions
  subscribed = true

  const store = useStateDataStore()
  relayConnectionBridge.on('state-update', ({ type, data }) => {
    if (type === 'state:full-update') {
      store.replaceState(data);
    } else if (type === 'state:patch') {
      store.applyStatePatch(data);
    }
  });
}
