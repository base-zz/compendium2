# Anchor Update Payloads (Client → Server)

## Overview
The client sends `anchor:update` messages with different `action` values depending on the workflow stage. Below are the exact payload structures for each action.

---

## 1. Drop Anchor (`action: "drop_now"`)

**When sent:** User taps “Drop Anchor” to start the drop workflow.

**Code path:**  
`AnchorView.vue` → `DropAnchorModal` → `@confirm="confirmDropAnchor"` → `useAnchorDropNowFlow.js` → `confirmDropAnchor()` → `stateStore.sendMessageToServer("anchor:update", payload.data)`

**Payload:**
```json
{
  "action": "drop_now",
  "anchorDeployed": true,
  "anchorDropLocation": {
    "depth": {
      "value": <number>,
      "units": "m" | "ft"
    },
    "depthSource": "real_time_measurement"
  }
}
```

**Notes:**
- **No rode data** is included in the initial drop.
- Only depth and deployment flag are sent.
- Server should expect this minimal payload to begin the drop session.

---

## 2. Finalize Drop (`action: "finalize_drop_now"`)

**When sent:** User finalizes the drop after setting rode length, ranges, and bearing.

**Code path:**  
`AnchorView.vue` → `SetAnchorModal` → `@save="handleFinalizeDropNow()"` → `useAnchorDropNowFlow.js` → `handleFinalizeDropNow()` → `stateStore.sendMessageToServer("anchor:update", payload.data)`

**Payload:**
```json
{
  "action": "finalize_drop_now",
  "anchorDeployed": true,
  "rode": {
    "amount": <number>,
    "units": "m" | "ft"
  },
  "warningRange": {
    "r": <number>,
    "units": "m" | "ft"
  },
  "criticalRange": {
    "r": <number>,
    "units": "m" | "ft"
  },
  "setBearing": {
    "value": <number>,
    "units": "deg"
  },
  "anchorDropLocation": {
    "depth": {
      "value": <number>,
      "units": "m" | "ft"
    },
    "depthSource": "real_time_measurement"
  }
}
```

**Notes:**
- Includes full rode, ranges, and bearing.
- Server should validate units are `"m"` or `"ft"` for all length fields.
- Bearing is always in degrees.

---

## 3. Cancel Drop (`action: "cancel_drop_now"`)

**When sent:** User cancels the drop workflow.

**Code path:**  
`AnchorView.vue` → `SetAnchorModal` → `@cancel="handleSetAnchorModalCancel()"` → `useAnchorDropNowFlow.js` → `handleSetAnchorModalCancel()` → `stateStore.sendMessageToServer("anchor:update", payload.data)`

**Payload:**
```json
{
  "action": "cancel_drop_now",
  "anchorDeployed": false
}
```

**Notes:**
- Minimal payload to abort the drop session.
- Server should clean up any pending drop state.

---

## Implementation Tips for Server AI

- Always validate `action` first.
- For `drop_now`: expect only depth; do not expect rode.
- For `finalize_drop_now`: validate rode.amount, rode.units, warningRange, criticalRange, and setBearing.
- For `cancel_drop_now`: clean up session state.
- Units for length fields are always `"m"` or `"ft"`; bearing is `"deg"`.
- `anchorDropLocation.depthSource` is always `"real_time_measurement"` in current client logic.
