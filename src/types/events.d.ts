interface AnchorEvent {
    position: AnchorPosition;
    timestamp: Date;
    event: 'dropped' | 'raised' | 'dragging';
  }
  
  interface NetworkEvent {
    online: boolean;
    type?: 'satellite' | 'cellular' | 'wifi';
    quality?: 'poor' | 'good';
  }
  
  interface SyncEvent {
    table: string;
    success: boolean;
    duration: number;
    attempt: number;
  }