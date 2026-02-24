import { Capacitor } from '@capacitor/core';
import { PushNotifications, type PushNotification, type PushNotificationActionPerformed } from '@capacitor/push-notifications';
import { App } from '@capacitor/app';
import { ref } from 'vue';
import mitt, { type Emitter } from 'mitt';
import { useRouter } from 'vue-router';
import type { Router } from 'vue-router';
import { createLogger } from './logger';

type NotificationData = {
  type: string;
  alertId?: string;
  alertType?: string;
  [key: string]: unknown;
};

// Notification data type for our application
type NotificationCallback = (data: NotificationData) => void;

export class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private notificationCallbacks: NotificationCallback[] = [];
  private emitter: Emitter<{ tokenChanged: string }> = mitt();
  private router: Router | null = null;
  private logger = createLogger('notification-service') as any;
  
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

  /**
   * Set the router instance for navigation
   * This should be called from a component's setup() function
   */
  public setRouter(router: Router) {
    this.router = router;
  }

  public async initialize() {
    if (this.isInitialized) return;
    
    const platform = Capacitor.getPlatform();
    const isWeb = platform === 'web';

    if (isWeb) {
      this.logger.debug('Push notifications not available in web environment');
      this.isInitialized = true; // Mark as initialized to prevent repeated attempts
      return;
    }

    if (platform === 'android') {
      this.logger.debug('Skipping push notification registration on Android because Firebase is not configured');
      this.isInitialized = true;
      return;
    }
    
    try {
      // Request permission to use push notifications
      const permission = await PushNotifications.requestPermissions();
      
      if (permission.receive === 'granted') {
        await PushNotifications.register();
        this.setupListeners();
        this.isInitialized = true;
        this.logger.debug('Push notifications initialized');
      }
    } catch (error) {
      this.logger.error('Error initializing push notifications', { error });
      // Mark as initialized even if there's an error to prevent repeated error logs
      this.isInitialized = true;
    }
  }

  /**
   * Register a callback to handle notification taps
   * @param callback Function to call when a notification is tapped
   * @returns Unsubscribe function
   */
  public onNotificationTap(callback: NotificationCallback): () => void {
    this.notificationCallbacks.push(callback);
    return () => {
      const index = this.notificationCallbacks.indexOf(callback);
      if (index > -1) {
        this.notificationCallbacks.splice(index, 1);
      }
    };
  }

  private setupListeners() {
    // Handle token refresh
    PushNotifications.addListener('registration', (token) => {
      this.logger.debug('Push registration success', { token: token.value });
      localStorage.setItem('pushToken', token.value);
      this.emitter.emit('tokenChanged', token.value);

      this.registerTokenWithVps(token.value).catch((error) => {
        this.logger.error('Failed to register push token with VPS', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    });

    // Handle notifications when app is open
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotification) => {
      const data = notification.data as NotificationData;
      this.notifications.value.push(data);
      this.logger.debug('Push notification received', data);
    });

    // Handle notification taps
    PushNotifications.addListener('pushNotificationActionPerformed', (action: PushNotificationActionPerformed) => {
      const data = action.notification.data as NotificationData;
      this.logger.debug('Push notification action performed', data);
      
      // Notify all registered callbacks
      this.notificationCallbacks.forEach(callback => callback(data));
    });

    // Handle app open from notification when closed
    App.addListener('appUrlOpen', (data: { url: string }) => {
      this.handleDeepLink(data.url);
    });
  }

  private async registerTokenWithVps(deviceToken: string) {
    if (!deviceToken || typeof deviceToken !== 'string') {
      this.logger.warn('Skipping VPS push token registration because deviceToken is missing');
      return;
    }

    const boatId = localStorage.getItem('activeBoatId');
    if (!boatId) {
      this.logger.warn('Skipping VPS push token registration because activeBoatId is missing');
      return;
    }

    const jwtToken = localStorage.getItem('authToken');
    if (!jwtToken) {
      this.logger.warn('Skipping VPS push token registration because authToken is missing');
      return;
    }

    const platform = Capacitor.getPlatform();
    if (platform !== 'ios' && platform !== 'android') {
      this.logger.warn('Skipping VPS push token registration because platform is not ios/android', {
        platform,
      });
      return;
    }

    this.logger.debug('Registering push token with VPS', {
      platform,
      boatId,
      tokenLength: deviceToken.length,
    });

    const response = await fetch('https://compendiumnav.com/api/push/register-token', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        boatId,
        platform,
        token: deviceToken,
      }),
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok) {
      this.logger.error('VPS push token registration returned non-200', {
        status: response.status,
        payload,
      });
      return;
    }

    this.logger.debug('VPS push token registration succeeded', { payload });
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
      this.logger.warn('Router not initialized');
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
      this.logger.error('Error handling deep link', { error });
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
        this.logger.error('Error showing local notification', { error });
      }
    }
  }

  // Public method to clear all notifications
  public clearNotifications() {
    this.notifications.value = [];
  }

  // Get the current push token
  public async getPushToken(): Promise<string | null> {
    // Check if we're in a web environment
    const isWebEnvironment = typeof window !== 'undefined' && window.document;
    
    if (isWebEnvironment) {
      // Push notifications not supported in web environment
      this.logger.debug('Web environment detected - push notifications not supported');
      return null;
    }

    // For native environments, use the PushNotifications plugin
    try {
      const permission = await PushNotifications.checkPermissions();
      if (permission.receive === 'granted') {
        // Get the token from the registration event data stored in localStorage
        const token = localStorage.getItem('pushToken');
        return token;
      }
    } catch (error) {
      // Ignore push token errors when permissions or plugins are unavailable
    }
    return null;
  }

  // Listen for token changes
  public onTokenChange(callback: (token: string) => void) {
    this.emitter.on('tokenChanged', callback);
    return () => this.emitter.off('tokenChanged', callback);
  }
}

// Export a singleton instance
export const notificationService = NotificationService.getInstance();

// Export a composable for Vue components
export function useNotifications() {
  const service = notificationService;
  const router = useRouter();
  
  // Set the router if available
  service.setRouter(router);
  
  // Setup notification tap handler in component's setup
  const onNotificationTap = (callback: NotificationCallback) => {
    return service.onNotificationTap(callback);
  };
  
  return {
    notifications: service.notifications,
    onNotificationTap,
    initialize: service.initialize.bind(service),
    setRouter: service.setRouter.bind(service)
  };
}
