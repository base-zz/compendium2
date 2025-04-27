// Use this ABSOLUTELY RELIABLE config loader
const signalKConfig = {
  httpUrl: () => 'http://openplotter.local:3000/signalk/v1/api/',
  wsUrl: () => 'ws://openplotter.local:3000/signalk/v1/stream',
  selfId: 'self',
  
  discoverEndpoints: async () => {
    try {
      const response = await fetch('http://openplotter.local:3000/signalk');
      const data = await response.json();
      return {
        httpUrl: () => data.endpoints?.v1?.['signalk-http'] || this.httpUrl(),
        wsUrl: () => data.endpoints?.v1?.['signalk-ws'] || this.wsUrl(),
        selfId: data.self || this.selfId
      };
    } catch (error) {
      console.error('Discovery failed, using defaults:', error);
      return this; // Return the hardcoded defaults
    }
  }
};

export default signalKConfig;