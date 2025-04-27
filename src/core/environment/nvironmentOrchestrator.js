/ core/environment/EnvironmentOrchestrator.js
import { weatherService, tidalService, currentsService } from './services';

class EnvironmentOrchestrator {
  async update() {
    const [weather, tides, currents] = await Promise.all([
      weatherService.fetch(),
      tidalService.predict(),
      currentsService.get()
    ]);
    return { weather, tides, currents };
  }
}