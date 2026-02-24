const ALARMS = {
  anchor_dragging: {
    src: "/sounds/jeremayjimenez-random-alarm-319318.mp3",
    loop: true,
  },
  ais_proximity: {
    src: "/sounds/freesound_community-red-alert_nuclear_buzzer-99741.mp3",
    loop: true,
  },
  fence_alert: {
    src: "/sounds/flutie8211-high-pitch-alarm-buzzer-464349.mp3",
    loop: true,
  },
};

const SILENCE_UNTIL_STORAGE_KEY = "alarmSoundService:silencedUntilEpochMs";
const GLOBAL_VOLUME_STORAGE_KEY = "alarmSoundService:globalVolume";
const VOLUME_OVERRIDE_STORAGE_PREFIX = "alarmSoundService:volumeOverride:";
const ALARM_ENABLED_STORAGE_PREFIX = "alarmSoundService:enabled:";

class AlarmSoundService {
  constructor() {
    this._enabled = false;
    this._audioByKey = new Map();
    this._pendingStartByKey = new Map();
    this._activeByKey = new Map();

    this._settingsVersion = 0;

    this._silencedUntilEpochMs = this._loadSilencedUntilEpochMs();

    this._globalVolume = this._loadGlobalVolume();
    this._volumeOverrideByKey = this._loadVolumeOverrides();

    this._alarmEnabledByKey = this._loadAlarmEnabledByKey();
  }

  isEnabled() {
    return this._enabled;
  }

  getSettingsVersion() {
    return this._settingsVersion;
  }

  getSilencedUntilEpochMs() {
    return this._silencedUntilEpochMs;
  }

  getGlobalVolume() {
    return this._globalVolume;
  }

  setGlobalVolume(volume) {
    const normalized = this._normalizeVolume(volume);
    if (normalized == null) {
      return;
    }
    this._globalVolume = normalized;
    try {
      window.localStorage.setItem(GLOBAL_VOLUME_STORAGE_KEY, String(normalized));
    } catch (error) {
      // ignore
    }
    this._applyVolumeToAllAudio();
  }

  getAlarmVolumeOverride(key) {
    if (!(key in ALARMS)) {
      return null;
    }
    return this._volumeOverrideByKey.get(key) ?? null;
  }

  getAlarmEnabled(key) {
    if (!(key in ALARMS)) {
      return null;
    }
    const stored = this._alarmEnabledByKey.get(key);
    if (typeof stored === "boolean") {
      return stored;
    }
    return true;
  }

  setAlarmEnabled(key, isEnabled) {
    if (!(key in ALARMS)) {
      return;
    }
    if (typeof isEnabled !== "boolean") {
      return;
    }

    this._alarmEnabledByKey.set(key, isEnabled);
    this._settingsVersion += 1;
    try {
      window.localStorage.setItem(`${ALARM_ENABLED_STORAGE_PREFIX}${key}`, isEnabled ? "1" : "0");
    } catch (error) {
      // ignore
    }

    if (!isEnabled) {
      this._clearPendingStart(key);
      this._stopNow(key);
      this._activeByKey.set(key, false);
    }
  }

  setAlarmVolumeOverride(key, volumeOrNull) {
    if (!(key in ALARMS)) {
      return;
    }

    if (volumeOrNull == null) {
      this._volumeOverrideByKey.delete(key);
      try {
        window.localStorage.removeItem(`${VOLUME_OVERRIDE_STORAGE_PREFIX}${key}`);
      } catch (error) {
        // ignore
      }
      this._applyVolumeToAudio(key);
      return;
    }

    const normalized = this._normalizeVolume(volumeOrNull);
    if (normalized == null) {
      return;
    }

    this._volumeOverrideByKey.set(key, normalized);
    try {
      window.localStorage.setItem(`${VOLUME_OVERRIDE_STORAGE_PREFIX}${key}`, String(normalized));
    } catch (error) {
      // ignore
    }
    this._applyVolumeToAudio(key);
  }

  getEffectiveVolume(key) {
    if (!(key in ALARMS)) {
      return this._globalVolume;
    }
    const override = this.getAlarmVolumeOverride(key);
    if (override == null) {
      return this._globalVolume;
    }
    return this._clamp01(this._globalVolume * override);
  }

  isSilencedNow() {
    const until = this._silencedUntilEpochMs;
    return typeof until === "number" && Number.isFinite(until) && Date.now() < until;
  }

  clearSilence() {
    this._setSilencedUntilEpochMs(null);
  }

  silenceForMs(durationMs) {
    if (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs <= 0) {
      return;
    }
    const until = Date.now() + durationMs;
    this._setSilencedUntilEpochMs(until);
  }

  silenceUntilMidnight() {
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0
    );
    const until = nextMidnight.getTime();
    if (!Number.isFinite(until)) {
      return;
    }
    this._setSilencedUntilEpochMs(until);
  }

  silenceFor24Hours() {
    this.silenceForMs(24 * 60 * 60 * 1000);
  }

  enableFromUserGesture() {
    if (this._enabled) {
      return true;
    }

    try {
      // iOS requires a user gesture to allow audio playback.
      // We "prime" the audio elements by loading them.
      Object.keys(ALARMS).forEach((key) => {
        const audio = this._getOrCreateAudio(key);
        audio.load();
      });

      this._enabled = true;
      return true;
    } catch (error) {
      // If enabling fails, remain disabled.
      this._enabled = false;
      return false;
    }
  }

  setAlarmActive(key, isActive, { delayMs } = {}) {
    if (!(key in ALARMS)) {
      return;
    }

    const isEnabled = this.getAlarmEnabled(key);
    if (isEnabled !== true) {
      this._clearPendingStart(key);
      this._stopNow(key);
      this._activeByKey.set(key, false);
      return;
    }

    if (this.isSilencedNow()) {
      this._clearPendingStart(key);
      this._stopNow(key);
      this._activeByKey.set(key, false);
      return;
    }

    const nextActive = isActive === true;
    const prevActive = this._activeByKey.get(key) === true;

    if (prevActive === nextActive) {
      return;
    }

    this._activeByKey.set(key, nextActive);

    if (!nextActive) {
      this._clearPendingStart(key);
      this._stopNow(key);
      return;
    }

    const effectiveDelayMs = typeof delayMs === "number" && Number.isFinite(delayMs) ? delayMs : 0;

    this._clearPendingStart(key);

    const timeoutId = setTimeout(() => {
      this._pendingStartByKey.delete(key);
      const stillActive = this._activeByKey.get(key) === true;
      if (!stillActive) {
        return;
      }
      if (this.isSilencedNow()) {
        this._stopNow(key);
        return;
      }
      if (!this._enabled) {
        return;
      }
      this._startNow(key);
    }, Math.max(0, effectiveDelayMs));

    this._pendingStartByKey.set(key, timeoutId);
  }

  stopAll() {
    Object.keys(ALARMS).forEach((key) => {
      this._clearPendingStart(key);
      this._stopNow(key);
      this._activeByKey.set(key, false);
    });
  }

  _setSilencedUntilEpochMs(untilEpochMs) {
    if (untilEpochMs == null) {
      this._silencedUntilEpochMs = null;
      try {
        window.localStorage.removeItem(SILENCE_UNTIL_STORAGE_KEY);
      } catch (error) {
        // ignore
      }
      this.stopAll();
      return;
    }

    if (typeof untilEpochMs !== "number" || !Number.isFinite(untilEpochMs) || untilEpochMs <= Date.now()) {
      this._silencedUntilEpochMs = null;
      try {
        window.localStorage.removeItem(SILENCE_UNTIL_STORAGE_KEY);
      } catch (error) {
        // ignore
      }
      this.stopAll();
      return;
    }

    this._silencedUntilEpochMs = untilEpochMs;
    try {
      window.localStorage.setItem(SILENCE_UNTIL_STORAGE_KEY, String(untilEpochMs));
    } catch (error) {
      // ignore
    }
    this.stopAll();
  }

  _loadSilencedUntilEpochMs() {
    try {
      const raw = window.localStorage.getItem(SILENCE_UNTIL_STORAGE_KEY);
      if (raw == null) {
        return null;
      }
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        return null;
      }
      if (parsed <= Date.now()) {
        return null;
      }
      return parsed;
    } catch (error) {
      return null;
    }
  }

  _getOrCreateAudio(key) {
    const existing = this._audioByKey.get(key);
    if (existing) {
      return existing;
    }

    const config = ALARMS[key];
    const audio = new Audio(config.src);
    audio.loop = config.loop === true;
    audio.preload = "auto";
    audio.volume = this.getEffectiveVolume(key);
    this._audioByKey.set(key, audio);
    return audio;
  }

  _startNow(key) {
    const audio = this._getOrCreateAudio(key);

    try {
      audio.volume = this.getEffectiveVolume(key);
    } catch (error) {
      // ignore
    }

    try {
      audio.currentTime = 0;
    } catch (error) {
      // ignore
    }

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // If play fails (still not enabled on iOS), do nothing.
      });
    }
  }

  _stopNow(key) {
    const audio = this._audioByKey.get(key);
    if (!audio) {
      return;
    }

    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (error) {
      // ignore
    }
  }

  _clearPendingStart(key) {
    const pending = this._pendingStartByKey.get(key);
    if (pending) {
      clearTimeout(pending);
      this._pendingStartByKey.delete(key);
    }
  }

  _applyVolumeToAudio(key) {
    const audio = this._audioByKey.get(key);
    if (!audio) {
      return;
    }
    try {
      audio.volume = this.getEffectiveVolume(key);
    } catch (error) {
      // ignore
    }
  }

  _applyVolumeToAllAudio() {
    Object.keys(ALARMS).forEach((key) => {
      this._applyVolumeToAudio(key);
    });
  }

  _normalizeVolume(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return null;
    }
    return this._clamp01(value);
  }

  _clamp01(value) {
    if (value < 0) {
      return 0;
    }
    if (value > 1) {
      return 1;
    }
    return value;
  }

  _loadGlobalVolume() {
    try {
      const raw = window.localStorage.getItem(GLOBAL_VOLUME_STORAGE_KEY);
      if (raw == null) {
        return 1;
      }
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        return 1;
      }
      return this._clamp01(parsed);
    } catch (error) {
      return 1;
    }
  }

  _loadVolumeOverrides() {
    const map = new Map();
    Object.keys(ALARMS).forEach((key) => {
      try {
        const raw = window.localStorage.getItem(`${VOLUME_OVERRIDE_STORAGE_PREFIX}${key}`);
        if (raw == null) {
          return;
        }
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) {
          return;
        }
        map.set(key, this._clamp01(parsed));
      } catch (error) {
        // ignore
      }
    });
    return map;
  }

  _loadAlarmEnabledByKey() {
    const map = new Map();
    Object.keys(ALARMS).forEach((key) => {
      try {
        const raw = window.localStorage.getItem(`${ALARM_ENABLED_STORAGE_PREFIX}${key}`);
        if (raw == null) {
          return;
        }
        if (raw === "1") {
          map.set(key, true);
          return;
        }
        if (raw === "0") {
          map.set(key, false);
          return;
        }
      } catch (error) {
        // ignore
      }
    });
    return map;
  }
}

export const alarmSoundService = new AlarmSoundService();
