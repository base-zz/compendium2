import { StoreDefinition } from 'pinia';

declare module '@client/stores/boatConnection' {
  export interface BoatConnectionState {
    boatId: string | null;
    connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
    connectionMode: 'local' | 'remote' | null;
    error: string | null;
    isInitialized: boolean;
  }

  export interface BoatConnectionGetters {
    isConnected: boolean;
    isLocal: boolean;
    isLoading: boolean;
  }

  export interface BoatConnectionActions {
    initializeConnection(): Promise<void>;
    tryLocalConnection(): Promise<{ boatId: string } | null>;
    registerWithVPS(boatId: string): Promise<void>;
    connectToVPS(boatId: string): Promise<void>;
    pairWithBoat(boatId: string): Promise<void>;
    resetConnection(): void;
  }

  export const useBoatConnectionStore: StoreDefinition<
    'boatConnection',
    BoatConnectionState,
    BoatConnectionGetters,
    BoatConnectionActions
  >;
}
