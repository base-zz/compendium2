import { onMounted, ref } from 'vue';
import { PushNotifications } from '@capacitor/push-notifications';
import { notificationService } from '../services/NotificationService';

export function useNotifications() {
  const notifications = ref(notificationService.notifications);
  const hasPermission = ref(false);

  const checkPermission = async () => {
    const permission = await PushNotifications.checkPermissions();
    hasPermission.value = permission.receive === 'granted';
    return hasPermission.value;
  };

  const requestPermission = async () => {
    const permission = await PushNotifications.requestPermissions();
    hasPermission.value = permission.receive === 'granted';
    return hasPermission.value;
  };

  const clearNotifications = () => {
    notificationService.clearNotifications();
  };

  onMounted(async () => {
    await notificationService.initialize();
    await checkPermission();
  });

  return {
    notifications,
    hasPermission,
    checkPermission,
    requestPermission,
    clearNotifications
  };
}
