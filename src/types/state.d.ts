import { EventEmitter } from 'events';
import { MarineEnvironment, GeoPosition, AnchorPosition } from './core';

type VesselState = 'marina' | 'anchored' | 'underway';

interface StateProfile {
  syncRules: Record<string, SyncRule>;
  autoDetection: {
    speedThreshold?: number;
    maxDragDistance?: number;
  };
}

interface StateTransitionEvent {
  previous: VesselState;
  current: VesselState;
  timestamp: Date;
  trigger?: 'manual' | 'auto';
}

declare class StateManager extends EventEmitter {
  // Current state
  currentState: VesselState;
  lastTransitionTime: number;
  lastKnownPosition: GeoPosition | null;
  lastAnchorPosition: AnchorPosition | null;
  
  // Configuration
  profiles: Record<VesselState, StateProfile>;
  
  // Reactive streams
  throttleConfig$: BehaviorSubject<ThrottleConfig>;
  currentState$: BehaviorSubject<VesselState>;
  networkQuality$: BehaviorSubject<string>;

  constructor();

  // Public API
  setState(newState: VesselState): void;
  updatePosition(position: GeoPosition): void;
  getStateSnapshot(): {
    state: VesselState;
    position: GeoPosition | null;
    duration: number;
    profile: StateProfile;
  };
  
  // Throttle management
  getDynamicThrottleStream(dataType: string): Observable<number>;
  setThrottleMultiplier(type: string, multiplier: number): void;

  // Private methods (still typed)
  private _setupStateHandlers(): void;
  private _autoDetectState(): void;
  private _shouldBeInMarina(): boolean;
  private _shouldBeAnchored(): boolean;
  private _shouldBeUnderway(): boolean;
  private _isNearMarina(): boolean;
  private _isWithinAnchorRadius(): boolean;
  private _handleNetworkChange(isOnline: boolean): void;
  private _configureSyncForState(state: VesselState): void;
  private _applySyncProfile(config: Record<string, SyncRule>): void;
  private _createMarinaProfile(): StateProfile;
  private _createAnchoredProfile(): StateProfile;
  private _createUnderwayProfile(): StateProfile;
}