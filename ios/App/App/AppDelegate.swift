import UIKit
import Capacitor
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Set the notification center delegate
        UNUserNotificationCenter.current().delegate = self
        // Request notification permissions
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if granted {
                print("Notification permission granted")
                DispatchQueue.main.async {
                    application.registerForRemoteNotifications()
                }
            } else {
                print("Notification permission denied: \(String(describing: error?.localizedDescription))")
            }
        }
        
        return true
    }

    // MARK: - Push Notifications
    
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // Convert token to string
        let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
        let token = tokenParts.joined()
        print("Device Token: \(token)")
        
        // Forward token to Capacitor
        NotificationCenter.default.post(
            name: NSNotification.Name("CAPNotifications.didRegisterForRemoteNotifications"),
            object: deviceToken
        )
    }
    
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        // Forward error to Capacitor
        NotificationCenter.default.post(
            name: NSNotification.Name("CAPNotifications.didFailToRegisterForRemoteNotifications"),
            object: error
        )
    }
    
    // Handle notification when app is in foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                              willPresent notification: UNNotification,
                              withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        
        let userInfo = notification.request.content.userInfo
        
        // Print full notification payload
        print("Received notification: \(userInfo)")
        
        // Forward to Capacitor
        NotificationCenter.default.post(
            name: NSNotification.Name("CAPNotifications.pushNotificationReceived"),
            object: userInfo,
            userInfo: userInfo
        )
        
        // Show the notification even when app is in foreground
        completionHandler([.banner, .sound, .badge])
    }
    
    // Handle notification tap
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                              didReceive response: UNNotificationResponse,
                              withCompletionHandler completionHandler: @escaping () -> Void) {
        
        let userInfo = response.notification.request.content.userInfo
        
        // Print full notification payload
        print("Tapped notification: \(userInfo)")
        
        // Forward to Capacitor
        NotificationCenter.default.post(
            name: NSNotification.Name("CAPNotifications.pushNotificationActionPerformed"),
            object: userInfo,
            userInfo: userInfo
        )
        
        // Handle the notification tap
        handleNotificationTap(userInfo: userInfo)
        
        completionHandler()
    }
    
    // Handle silent notifications (background updates)
    func application(_ application: UIApplication,
                    didReceiveRemoteNotification userInfo: [AnyHashable: Any],
                    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        
        // Print full notification payload
        print("Received silent notification: \(userInfo)")
        
        // Forward to Capacitor
        NotificationCenter.default.post(
            name: NSNotification.Name("CAPNotifications.pushNotificationReceived"),
            object: userInfo,
            userInfo: userInfo
        )
        
        // Call the completion handler with the appropriate result
        completionHandler(.newData)
    }
    
    // MARK: - URL Handling
    
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Forward URL to Capacitor
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }
    
    // MARK: - Helper Methods
    
    private func handleNotificationTap(userInfo: [AnyHashable: Any]) {
        // Handle notification tap here
        print("Handling notification tap with data: \(userInfo)")
        
        // Example: Extract data and post a notification that your TypeScript code can listen for
        if let alertData = userInfo as? [String: Any] {
            NotificationCenter.default.post(
                name: NSNotification.Name("NotificationTapped"),
                object: nil,
                userInfo: alertData
            )
        }
    }
    
    // MARK: - Lifecycle
    
    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state.
    }
    
    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, etc.
    }
    
    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state.
    }
    
    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive.
    }
    
    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate.
    }
}
