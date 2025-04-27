interface SyncJob {
    table: string;
    data: Record<string, any>;
    priority: 'CRITICAL' | 'HIGH' | 'NORMAL';
    preferredBackend: string;
    attempt: number;
    nextAttemptAt: number;
  }
  
  interface SyncRule {
    frequency: number; // ms
    priorityMultipliers?: {
      CRITICAL?: number;
      HIGH?: number;
      NORMAL?: number;
    };
  }
  
  interface ThrottleConfig {
    baseInterval: number;
    priorityMultipliers: Record<'CRITICAL' | 'HIGH' | 'NORMAL', number>;
    maxJitter?: number;
  }
  
  declare class SyncOrchestrator {
    constructor(adapters: Adapter[], options?: {
      maxRetries?: number;
      enableOffline?: boolean;
    });
  
    pushUpdate(
      table: string, 
      data: Record<string, any>, 
      priority?: 'CRITICAL' | 'HIGH' | 'NORMAL',
      preferredBackend?: string
    ): Promise<void>;
  
    getThrottleInterval(
      dataType: string, 
      priority?: 'CRITICAL' | 'HIGH' | 'NORMAL'
    ): number;
  }