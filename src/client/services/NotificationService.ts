import { PushNotifications, type PushNotification, type PushNotificationActionPerformed } from '@capacitor/push-notifications';
import { App } from '@capacitor/app';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

type NotificationData = {
  type: string;
  alertId?: string;
  alertType?: string;
  [key: string]: unknown;
};

// Notification data type for our application

export class NotificationService {
  private static instance: NotificationService;
  private router = useRouter();
  private isInitialized = false;
  
  // Track notifications
  public notifications = ref<NotificationData[]>([]);
  
  private constructor() {
    // Private constructor to enforce singleton
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Request permission to use push notifications
      const permission = await PushNotifications.requestPermissions();
      
      if (permission.receive === 'granted') {
        await PushNotifications.register();
        this.setupListeners();
        this.isInitialized = true;
        console.log('Push notifications initialized');
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  private setupListeners() {
    // Handle notifications when app is open
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received:', notification);
      this.handleNotification(notification);
    });

    // Handle notification taps
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed:', notification);
      this.handleNotificationTap(notification);
    });

    // Handle app open from notification when closed
    App.addListener('appUrlOpen', (data: { url: string }) => {
      this.handleDeepLink(data.url);
    });
  }

  private handleNotification(notification: PushNotification) {
    if (notification.data) {
      const data = notification.data as NotificationData;
      this.notifications.value.push(data);
      
      // You can add custom UI handling here if needed
      if (data.alertType) {
        this.showLocalNotification(notification.title || 'New Alert', notification.body || '', data);
      }
    }
  }

  private handleNotificationTap(action: PushNotificationActionPerformed) {
    const notification = action.notification;
    if (!notification || !notification.data) return;

    const data = notification.data as NotificationData;
    if (data.type === 'alert' && data.alertType) {
      this.navigateToAlert(data);
    }
  }

  private navigateToAlert(data: NotificationData) {
    if (!this.router) {
      console.warn('Router not initialized');
      return;
    }

    const routeMap: Record<string, string> = {
      'anchor_dragging': '/alerts/anchor',
      'critical_range': '/alerts/range',
      'ais_proximity': '/alerts/ais',
    };

    const route = routeMap[data.alertType || ''] || '/alerts';
    
    this.router.push({
      path: route,
      query: { alertId: data.alertId }
    });
  }

  private handleDeepLink(url: string) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const params = new URLSearchParams(urlObj.search);
      
      if (path.startsWith('/alerts/')) {
        const alertId = params.get('alertId');
        if (alertId) {
          this.router?.push({
            path: path,
            query: { alertId }
          });
        }
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  }

  private showLocalNotification(title: string, body: string, data: NotificationData) {
    // This is a fallback for web or when native notifications aren't available
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          body,
          data,
          icon: '/assets/icon/icon.png'
        });

        notification.onclick = () => {
          if (data.alertType) {
            this.navigateToAlert(data);
          }
          notification.close();
        };
      } catch (error) {
        console.error('Error showing local notification:', error);
      }
    }
  }

  // Public method to clear all notifications
  public clearNotifications() {
    this.notifications.value = [];
  }
}

// Export a singleton instance
export const notificationService = NotificationService.getInstance();
