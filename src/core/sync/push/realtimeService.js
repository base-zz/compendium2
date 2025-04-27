// core/sync/push/PBRealtimeService.js
export class RealtimeService {
    constructor(pbClient) {
      this.client = pbClient;
      this.subscriptions = new Map();
    }
  
    pushUpdate(table, data) {
      const channel = this.subscriptions.get(table);
      if (channel) {
        channel.send(data); // PB's realtime API
      }
    }
  
    subscribe(table, callback) {
      const channel = this.client.realtime.subscribe(table, callback);
      this.subscriptions.set(table, channel);
      return () => channel.unsubscribe();
    }
  }