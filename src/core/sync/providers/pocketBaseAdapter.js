// core/sync/providers/PocketBaseAdapter.js
import { RealtimeService } from '../push/PBRealtimeService';

export class PocketBaseAdapter {
  constructor() {
    this.client = new PocketBase('https://your-vps.url');
    this.realtime = new RealtimeService(this.client);
  }

  async execute(table, data, priority) {
    // Upsert to PB
    await this.client.collection(table).upsert(data);
    
    // Realtime push to subscribed clients
    this.realtime.pushUpdate(table, data);
  }

  subscribe(table, callback) {
    return this.realtime.subscribe(table, callback);
  }
}