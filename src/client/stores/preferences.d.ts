import { DefineStoreOptions } from 'pinia';

declare module 'pinia' {
  export interface PiniaCustomProperties {
    // Add any custom properties/methods here
  }
  
  export interface PiniaCustomStateProperties {
    // Add any custom state properties here
  }
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'log';

declare function createLogger(namespace: string): {
  [key in LogLevel]: (...args: any[]) => void;
};

export interface Preferences {
  units: {
    useImperial: boolean;
    depthDecimals: number;
    speedDecimals: number;
    temperatureDecimals: number;
    distanceDecimals: number;
    angleDecimals: number;
  };
  display: {
    darkMode: boolean;
    highContrast: boolean;
  };
  logging: {
    debug: boolean;
    data: boolean;
    info: boolean;
    warn: boolean;
    error: boolean;
    remote: boolean;
    namespaces: string[];
  };
}

export interface PreferencesState {
  preferences: Preferences;
}

export type PreferencesGetters = {
  useImperial: boolean;
  darkMode: boolean;
  loggingEnabled: { remoteLogging: any; namespaces: string[] };
  availableLoggers: Array<{ name: string; description: string }>;
};

export interface PreferencesActions {
  // Initialize the store
  init(): void;
  
  // Unit and display preferences
  formatValue(value: any, unit: string, customDecimals?: number): string;
  getFormattedValueDetails(value: any, unit: string, customDecimals?: number): any;
  toggleUnits(): boolean;
  
  // Logging preferences
  setLoggingPreference(key: string, value: any, enabled?: boolean): boolean;
  setRemoteLogging(key: string, value: any): void;
  resetLoggingPreferences(): boolean;
  applyLoggingPreferences(): Promise<boolean>;
  
  // Persistence
  savePreferences(): Promise<boolean>;
  resetPreferences(): Promise<void>;
  applyLoggingPreferences(): Promise<boolean>;
}

export type PreferencesStore = ReturnType<typeof usePreferencesStore>;

export declare const usePreferencesStore: () => PreferencesState & PreferencesGetters & PreferencesActions;
