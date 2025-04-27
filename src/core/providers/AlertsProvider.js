import { BaseProvider } from './BaseProvider';
import { AlertService } from '../../server/services/alertService';

export class AlertsProvider extends BaseProvider {
  constructor() {
    super();
    this.priority = 'CRITICAL';
    this.service = new AlertService();
    
    // Always sync alerts immediately
    this.service.on('new-alert', () => {
      this.emit('critical');
    });
  }

  async getData() {
    return this.formatPayload({
      active: this.service.getActiveAlerts(),
      dismissed: this.service.getDismissedAlerts()
    });
  }
}