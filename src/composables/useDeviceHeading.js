import { ref } from 'vue';
import { Capacitor } from '@capacitor/core';
import { Motion } from '@capacitor/motion';

let orientationHandle = null;

const headingDegrees = ref(null);
const isActive = ref(false);
const lastError = ref(null);

async function requestOrientationPermissionIfNeeded() {
  lastError.value = null;

  if (typeof window === 'undefined') {
    return false;
  }

  const platform = typeof Capacitor?.getPlatform === 'function' ? Capacitor.getPlatform() : null;

  // iOS Safari-style permission gating
  if (platform === 'ios') {
    const request = async (EventCtor) => {
      if (!EventCtor || typeof EventCtor.requestPermission !== 'function') {
        return true;
      }
      const result = await EventCtor.requestPermission();
      return result === 'granted';
    };

    try {
      const motionGranted = await request(window.DeviceMotionEvent);
      if (!motionGranted) {
        return false;
      }

      const orientationGranted = await request(window.DeviceOrientationEvent);
      return orientationGranted;
    } catch (e) {
      lastError.value = e;
      return false;
    }
  }

  // Android/web: permission is handled by browser/app; assume available.
  return true;
}

function normalizeDegrees(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  const normalized = ((value % 360) + 360) % 360;
  return Math.round(normalized);
}

async function start() {
  lastError.value = null;

  if (isActive.value) {
    return true;
  }

  const granted = await requestOrientationPermissionIfNeeded();
  if (!granted) {
    return false;
  }

  try {
    orientationHandle = await Motion.addListener('orientation', (event) => {
      const next = normalizeDegrees(event?.alpha);
      headingDegrees.value = next;
    });

    isActive.value = true;
    return true;
  } catch (e) {
    lastError.value = e;
    isActive.value = false;
    return false;
  }
}

async function stop() {
  lastError.value = null;

  if (orientationHandle && typeof orientationHandle.remove === 'function') {
    try {
      await orientationHandle.remove();
    } catch (e) {
      lastError.value = e;
    }
  }

  orientationHandle = null;
  isActive.value = false;
}

export function useDeviceHeading() {
  return {
    headingDegrees,
    isActive,
    lastError,
    start,
    stop,
  };
}
