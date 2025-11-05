/**
 * Anchor Alert Utilities
 * 
 * This module contains functions for sending various anchor-related alerts
 * to the server, including anchor dragging, critical range, and AIS proximity warnings.
 */

import { connectionBridge } from "@/services/connectionBridge";

/**
 * Sends an anchor dragging alert to the server
 * @param {number} distance - Current distance to anchor
 * @param {number} rodeLength - Length of the rode
 * @param {boolean} isMetric - Whether to use metric units
 */
export function createAnchorDraggingAlert(distance, rodeLength, isMetric) {
  const unitLabel = isMetric ? 'm' : 'ft';
  const adapter = connectionBridge.adapter;
  
  // Send the alert to the server
  adapter.sendAlert({
    type: 'anchor_dragging',
    status: 'triggered',
    autoResolvable: false, // Anchor dragging requires manual acknowledgment
    data: {
      distance,
      rodeLength,
      units: unitLabel,
      message: `Anchor is dragging! Distance to anchor (${distance} ${unitLabel}) exceeds rode length (${rodeLength} ${unitLabel}).`,
      level: 'critical'
    }
  });
}

/**
 * Sends a critical range alert to the server
 * @param {number} distance - Current distance to anchor
 * @param {number} criticalRange - Critical range setting
 * @param {boolean} isMetric - Whether to use metric units
 */
export function createCriticalRangeAlert(distance, criticalRange, isMetric) {
  const unitLabel = isMetric ? 'm' : 'ft';
  const adapter = connectionBridge.adapter;
  
  // Send the alert to the server
  adapter.sendAlert({
    type: 'critical_range',
    status: 'triggered',
    autoResolvable: true, // Critical range alerts can auto-resolve when boat returns to safe range
    data: {
      distance,
      criticalRange,
      units: unitLabel,
      message: `Boat has exceeded critical range! Distance from anchor (${distance} ${unitLabel}) is beyond critical range (${criticalRange} ${unitLabel}).`,
      level: 'critical',
      cooldownMs: 60000 // 1 minute cooldown between alerts
    }
  });
}

/**
 * Sends an AIS proximity warning alert to the server
 * @param {number} targetCount - Number of targets in warning range
 * @param {number} warningRadius - Warning radius setting
 * @param {boolean} isMetric - Whether to use metric units
 */
export function createAisProximityAlert(targetCount, warningRadius, isMetric) {
  const unitLabel = isMetric ? 'm' : 'ft';
  const adapter = connectionBridge.adapter;
  
  // Send the alert to the server
  adapter.sendAlert({
    type: 'ais_proximity',
    status: 'triggered',
    autoResolvable: true, // AIS proximity alerts can auto-resolve when vessels move away
    data: {
      targetCount,
      warningRadius,
      units: unitLabel,
      message: `${targetCount} vessel(s) detected within warning radius of ${warningRadius} ${unitLabel}.`,
      level: 'warning',
      cooldownMs: 60000 // 1 minute cooldown between alerts
    }
  });
}
