import { BaseProvider } from './BaseProvider';
import { AnchorService } from '../../server/services/anchorService';

export class AnchorProvider extends BaseProvider {
  constructor() {
    super();
    this.priority = 'CRITICAL';
    this.service = new AnchorService();
    
    // Listen for anchor events
    this.service.on('anchor-drag', () => {
      this.emit('critical'); // Immediate sync
    });
    
    this.service.on('position-update', () => {
      this.emit('update'); // Debounced sync
    });
  }

  async getData() {
    const data = {
      position: this.service.getPosition(),
      status: this.service.getAnchorStatus(),
      rode: this.service.getRodeLength()
    };
    
    return this.formatPayload(data);
  }
}