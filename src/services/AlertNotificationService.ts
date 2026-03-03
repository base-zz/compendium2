import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { watch, ref } from 'vue';
import { useStateDataStore } from '@/stores/stateDataStore';
import { createLogger } from './logger';

const logger = createLogger('alert-notification-service') as any;

export class AlertNotificationService {
  private static instance: AlertNotificationService;
  private isInitialized = false;
  private lastKnownAlerts = new Set<string>();
  private stateStore: any = null;
  private watchStopper: any = null;
  
  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): AlertNotificationService {
    if (!AlertNotificationService.instance) {
      AlertNotificationService.instance = new AlertNotificationService();
    }
    return AlertNotificationService.instance;
  }

  private getStateStore() {
    if (!this.stateStore) {
      try {
        this.stateStore = useStateDataStore();
      } catch (error) {
        console.warn('State store not yet available:', error);
        return null;
      }
    }
    return this.stateStore;
  }

  public async initialize() {
    if (this.isInitialized) return;
    
    const platform = Capacitor.getPlatform();
    
    // Request local notification permissions for native platforms
    if (platform !== 'web') {
      try {
        const permission = await LocalNotifications.requestPermissions();
        if (permission.display !== 'granted') {
          logger.warn('Local notification permission not granted');
          return;
        }
        logger.info('Local notification permissions granted');
      } catch (error) {
        logger.error('Error requesting local notification permissions', error);
        return;
      }
    }

    // Start monitoring alerts (deferred until store is available)
    this.startAlertMonitoring();
    this.isInitialized = true;
    logger.info('Alert notification service initialized');
  }

  private startAlertMonitoring() {
    // Try to get state store, if not available, retry later
    const store = this.getStateStore();
    if (!store) {
      // Retry in a moment
      setTimeout(() => this.startAlertMonitoring(), 1000);
      return;
    }

    // Clear any existing watcher
    if (this.watchStopper) {
      this.watchStopper();
    }

    // Watch for changes in active alerts
    this.watchStopper = watch(
      () => (store.state as any)?.alerts?.active || [],
      (newAlerts, oldAlerts) => {
        this.handleAlertChanges(newAlerts, oldAlerts);
      },
      { deep: true, immediate: true }
    );
  }

  private handleAlertChanges(newAlerts: any[], oldAlerts: any[]) {
    const currentAlertIds = new Set(newAlerts.map(alert => alert.id));
    const previousAlertIds = new Set(oldAlerts?.map(alert => alert.id) || []);

    // Find new alerts (alerts that exist now but didn't exist before)
    const newAlertIds = Array.from(currentAlertIds).filter(id => !previousAlertIds.has(id));
    
    if (newAlertIds.length > 0) {
      logger.info(`Detected ${newAlertIds.length} new alerts`, { alertIds: newAlertIds });
      
      newAlertIds.forEach(alertId => {
        const alert = newAlerts.find(a => a.id === alertId);
        if (alert) {
          this.triggerAlertNotification(alert);
        }
      });
    }

    // Update last known alerts
    this.lastKnownAlerts = currentAlertIds;
  }

  private async triggerAlertNotification(alert: any) {
    try {
      const platform = Capacitor.getPlatform();
      
      // Prepare notification data
      const notificationData = {
        type: 'alert',
        alertId: alert.id,
        alertType: alert.trigger,
        trigger: alert.trigger,
        level: alert.level || 'warning'
      };

      // Create notification content based on alert type
      const { title, body } = this.getNotificationContent(alert);

      // Use appropriate notification method based on platform
      if (platform === 'web') {
        await this.showBrowserNotification(title, body, notificationData);
      } else {
        // Use Capacitor local notifications for iOS/Android
        await this.showLocalNotification(title, body, notificationData);
      }

      logger.info('Alert notification triggered', { 
        alertId: alert.id, 
        alertType: alert.trigger,
        method: platform === 'web' ? 'browser' : 'local'
      });
    } catch (error) {
      logger.error('Error triggering alert notification', error);
    }
  }

  private getNotificationContent(alert: any) {
    const trigger = alert.trigger;
    const level = alert.level || 'warning';
    
    let title = alert.label || 'Alert';
    let body = alert.message || 'New alert detected';

    switch (trigger) {
      case 'anchor_dragging':
        title = 'ANCHOR DRAGGING';
        body = alert.message || 'Anchor is dragging! Check your position immediately.';
        break;
      
      case 'ais_proximity':
        title = 'AIS PROXIMITY WARNING';
        body = alert.message || 'Vessel detected in warning range';
        break;
      
      case 'critical_range':
        title = 'CRITICAL RANGE ALERT';
        body = alert.message || 'Boat has exceeded safe range from anchor';
        break;
      
      default:
        title = alert.label || 'ALERT';
        body = alert.message || 'New alert detected';
    }

    return { title, body };
  }

  private async showLocalNotification(title: string, body: string, data: any) {
    try {
      console.log('Creating local notification:', { title, body, data });
      
      const notificationId = parseInt(data.alertId.replace(/[^0-9]/g, '').slice(-8)) || Date.now();
      
      await LocalNotifications.schedule({
        notifications: [{
          id: notificationId,
          title,
          body,
          extra: data, // Use extra field for custom data
          schedule: { at: new Date() }, // Schedule immediately
          sound: data.level === 'critical' ? 'alarms.wav' : 'default',
          smallIcon: 'ic_stat_notification',
          largeIcon: 'ic_stat_notification',
          ongoing: data.level === 'critical', // Keep critical notifications ongoing
          autoCancel: data.level !== 'critical' // Auto-cancel non-critical notifications
        }]
      });

      console.log('Local notification scheduled successfully');

      // Listen for notification clicks
      await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        console.log('Local notification clicked:', action);
        if (action.notification.extra?.alertType) {
          this.navigateToAlert(action.notification.extra.alertType);
        }
      });

    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }

  private async showBrowserNotification(title: string, body: string, data: any) {
    try {
      // Request permission if needed
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
      }

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        console.log('Creating browser notification:', { title, body, data });
        
        const notification = new Notification(title, {
          body,
          data,
          icon: '/assets/icon/icon.png',
          tag: data.alertId, // Prevent duplicates
          requireInteraction: data.level === 'critical' // Keep critical notifications visible
        });

        console.log('Browser notification created successfully');

        // Auto-close non-critical notifications after 5 seconds
        if (data.level !== 'critical') {
          setTimeout(() => {
            notification.close();
          }, 5000);
        }

        // Handle notification click
        notification.onclick = () => {
          console.log('Notification clicked, navigating to:', data.alertType);
          // Navigate to alert view when clicked
          this.navigateToAlert(data.alertType);
          notification.close();
        };

        return notification;
      } else {
        console.warn('Notification permission not granted:', Notification.permission);
      }
    } catch (error) {
      console.error('Error showing browser notification:', error);
    }
  }

  private navigateToAlert(alertType: string) {
    // Navigate to the appropriate alert view
    const routeMap: Record<string, string> = {
      'anchor_dragging': '/anchor',
      'critical_range': '/anchor', 
      'ais_proximity': '/anchor'
    };

    const route = routeMap[alertType] || '/alerts';
    
    // Use window.location for navigation since we might not have router access
    if (typeof window !== 'undefined') {
      window.location.hash = route;
    }
  }

  // Method to manually trigger notification for testing
  public async testNotification(alertType: string = 'anchor_dragging') {
    console.log('Testing notification for alert type:', alertType);
    
    const testAlert = {
      id: 'test-' + Date.now(),
      trigger: alertType,
      label: alertType.replace('_', ' ').toUpperCase(),
      message: `Test ${alertType.replace('_', ' ')} alert`,
      level: alertType === 'anchor_dragging' ? 'critical' : 'warning'
    };

    console.log('Test alert created:', testAlert);
    await this.triggerAlertNotification(testAlert);
  }

  // Clear all notifications
  public async clearAllNotifications() {
    if (typeof Notification !== 'undefined') {
      // Close all open notifications
      Array.from(document.querySelectorAll('[data-notification-id]')).forEach(el => {
        (el as any).close?.();
      });
    }
    logger.info('All notifications cleared');
  }
}

// Export a function to get the instance (lazy initialization)
export function getAlertNotificationService() {
  return AlertNotificationService.getInstance();
}

// Export composable for Vue components
export function useAlertNotifications() {
  const service = getAlertNotificationService();
  
  return {
    initialize: service.initialize.bind(service),
    testNotification: service.testNotification.bind(service),
    clearAll: service.clearAllNotifications.bind(service)
  };
}
