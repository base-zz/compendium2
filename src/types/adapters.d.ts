interface Adapter {
    name: string;
    execute(table: string, data: any): Promise<void>;
    isAvailable(): boolean;
  }
  
  interface PocketBaseAdapterConfig {
    url: string;
    autoReconnect?: boolean;
    maxQueueSize?: number;
  }
  
  declare class PocketBaseAdapter implements Adapter {
    constructor(config: PocketBaseAdapterConfig);
    // ... implements Adapter
  }
  
  declare class SignalKAdapter implements Adapter {
    constructor(signalKUrl: string);
    // ... implements Adapter
  }