// Base environment types
interface MarineEnvironment {
    weather: {
      isStorming: boolean;
      windSpeed: number; // knots
      visibility: number; // meters
    };
    tides: {
      currentHeight: number;
      nextLow: number;
      nextHigh: number;
    };
    network: {
      type: 'offline' | 'satellite' | 'cellular' | 'wifi';
      quality: 'poor' | 'fair' | 'good';
    };
    battery?: {
      level: number; // 0-1
      isCharging: boolean;
    };
  }
  
  // Position and geographic types
  interface GeoPosition {
    latitude: number;
    longitude: number;
    speed: number; // knots
    heading?: number; // degrees
    timestamp: Date;
  }
  
  interface AnchorPosition extends GeoPosition {
    rodeLength: number;
    maxRadius?: number;
  }