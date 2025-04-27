import { BaseProvider } from './BaseProvider';
import { NavigationService } from '../../server/services/navigationService';

export class NavigationProvider extends BaseProvider {
  constructor() {
    super();
    this.priority = 'HIGH';
    this.service = new NavigationService();
    
    // Throttle position updates
    this.service.on('position-update', () => {
      this.emit('update');
    });
    
    // Immediate sync for course changes
    this.service.on('course-change', () => {
      this.emit('critical');
    });
  }

  async getData() {
    const snapshot = this.service.getSnapshot();
    
    return this.formatPayload({
      position: snapshot.position,
      heading: snapshot.instruments.heading,
      speed: snapshot.instruments.speed
    });
  }
}