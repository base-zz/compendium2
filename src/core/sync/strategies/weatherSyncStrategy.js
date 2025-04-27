class WeatherSyncStrategy extends BaseSyncStrategy {
    initialize() {
      if (this.env.weather.stormLevel > 3) {
        this.syncManager.configureProvider('gps', { frequency: 1000 });
        this.syncManager.addToQueue('stormAlert');
      }
    }
  }