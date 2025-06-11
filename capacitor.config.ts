import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.compendiumnav.compendium2',
  appName: 'compendium2',
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  },
  server: {
    // For local development with live reload
    // url: 'http://YOUR_DEV_SERVER:PORT',
    // cleartext: true,
    
    // Allow navigation to these URLs in the web view
    allowNavigation: ['*.yourdomain.com'] // Replace with your actual domain
  },
  ios: {
    // Required for push notifications
    // Make sure to configure your app's capabilities in Xcode:
    // 1. Enable Push Notifications in the Signing & Capabilities tab
    // 2. Add Background Modes capability and check 'Remote notifications'
    // 3. In Info.plist, add 'App uses Non-Exempt Encryption' = NO
    
    // For deep linking with custom URL scheme
    // Example: compendiumnav://alerts/123
    scheme: 'compendiumnav'
  },
  android: {
    allowMixedContent: true,
    // Required for push notifications
    // Make sure to configure your google-services.json in android/app/
    // and set up Firebase Cloud Messaging
    
    // For deep linking with https
    // Make sure to configure intent filters in AndroidManifest.xml
    // hostname is not a valid property in Capacitor 3+
  }
};

export default config;
