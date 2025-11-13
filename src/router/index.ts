import { createRouter, createWebHistory } from "@ionic/vue-router";

// Type declaration for relayConnectionBridge on window
declare global {
  interface Window {
    relayConnectionBridge?: {
      _registerClientKey: () => Promise<void>;
    };
  }
}

import { useBoatConnectionStore } from "@/stores/boatConnection";
import { createLogger } from "@/services/logger";
import AnchorView from "@/views/AnchorView.vue";
import SplashScreen from "@/views/SplashScreen.vue";
import Settings from "@/views/SettingsView.vue";
import InstrumentView from "@/components/InstrumentComponent.vue";
import SailView from "@/views/SailView.vue";
import TideChart from "@/components/charts/TideChart.vue";
import DashboardView from "@/views/DashboardView.vue";
import HomePage from "@/views/HomePage.vue";
import BoatPairing from "@/components/onboarding/BoatPairing.vue";
import WeatherView from "@/views/WeatherView.vue";
import TidalView from "@/views/TidalView.vue";
const routes = [
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    meta: { title: "Page Not Found" },
    component: () => import("@/views/NotFoundView.vue"),
  },
  {
    path: "/pair",
    name: "BoatPairing",
    component: BoatPairing,
    meta: { requiresAuth: true, title: "Connect to Boat" },
  },
  {
    path: "/splash",
    name: "Splash",
    component: SplashScreen,
    meta: { requiresAuth: false, title: "Welcome" },
  },
  {
    path: "/",
    name: "Root",
    redirect: () => {
      const isAuthenticated = localStorage.getItem("isAuthenticated") === 'true';
      return isAuthenticated ? '/home' : '/splash';
    },
    meta: { requiresAuth: false },
  },
  {
    path: "/home",
    name: "Home",
    meta: { requiresAuth: true, title: "Home" },
    component: HomePage,
  },
  {
    path: "/anchor",
    name: "Anchor",
    component: AnchorView,
    meta: { title: "Anchor" },
  },
  {
    path: "/aistarget/:mmsi",
    name: "AISTarget",
    props: true,
    meta: { requiresAuth: true, title: "AIS Target" },
    component: () => import("@/views/AISTargetView.vue"),
  },

  {
    path: "/sail",
    name: "Sail",
    props: false,
    component: SailView,
    meta: { title: "Sail" },
  },

  // Settings route commented out due to import issues
  {
    path: "/settings",
    name: "Settings",
    props: false,
    component: Settings,
    meta: { title: "Settings" },
  },
  // Instrument route commented out due to import issues
  {
    path: "/instrument",
    name: "Instrument",
    props: false,
    component: InstrumentView,
    meta: { title: "Sail360" },
  },
  {
    path: "/login",
    name: "Login",
    props: false,
    component: () => import("@/views/LoginView.vue"),
    meta: { title: "Login" },
  },
  {
    path: "/register",
    name: "Register",
    props: false,
    component: () => import("@/components/RegisterComponent.vue"),
    meta: { title: "Register" },
  },
  {
    path: "/forgot-password",
    name: "ForgotPassword",
    component: () => import("@/views/PasswordResetView.vue"),
    meta: { title: "Forgot Password" },
  },
  // JunkView2 route now fixed with correct CurrentLines component path

  // {
  //   path: "/junk3",
  //   name: "Junk3",
  //   component: () => import("@/views/JunkView3.vue"),
  //   meta: { title: "Junk3" },
  // },
  // {
  //   path: "/datamonitor",
  //   name: "SignalKDataMonitor",
  //   component: () => import("@/views/SignalKDataView.vue"),
  //   meta: { title: "SignalK Data Viewer" },
  // },
  // Pages route commented out due to import issues
  {
    path: "/pages",
    name: "Pages",
    component: () => import("@/views/DashboardView.vue"),
    meta: { title: "Pages" },
  },
  {
    path: "/logging-test",
    name: "LoggingTest",
    component: () => import("@/components/LoggingTest.vue"),
    meta: { requiresAuth: true, title: "Logging Test" },
  },
  {
    path: "/weather",
    name: "Weather",
    component: WeatherView,
    meta: { title: "Weather" },
  },
  {
    path: "/tides",
    name: "Tides",
    component: TidalView,
    meta: { title: "Tides" },
  },
  {
    path: "/tide-chart",
    name: "TideChartPage",
    component: TideChart,
    meta: { requiresAuth: true, title: "Tide Chart" },
  },

  {
    path: "/dashboard",
    name: "Dashboard",
    component: DashboardView,
    meta: { title: "Dashboard" },
  },
  // Alerts route commented out due to import issues
  {
    path: "/alerts",
    name: "Alerts",
    component: () => import("@/views/AlertView.vue"),
    meta: { title: "Alerts" },
  },
  // Alert Rules Management
  {
    path: "/alert-rules",
    component: () => import("@/views/AlertRulesView.vue"),
    meta: { title: "Alert Rules" },
    children: [
      {
        path: "",
        name: "alert-rules",
        component: () => import("@/components/AlertRuleList.vue"),
        meta: { title: "Alert Rules" },
      },
      {
        path: ":mode(create|edit)/:id?",
        name: "alert-rule-editor",
        component: () => import("@/components/AlertRuleEditor.vue"),
        props: true,
        meta: { title: "Edit Alert Rule" },
      },
    ],
  },
  // UserInfo route commented out due to import issues
  {
    path: "/userinfo",
    name: "userinfo",
    component: () => import("@/views/UserInfoView.vue"),
    meta: {
      requiresAuth: true,
      title: "User Info",
    },
  },
  {
    path: "/bluetooth",
    name: "BluetoothManagement",
    component: () => import("@/views/BluetoothManagementView.vue"),
    meta: { 
      requiresAuth: true, 
      title: "Bluetooth Management" 
    },
  },
  // SetTheme route commented out due to import issues
  // {
  //   path: '/settheme',
  //   name: 'settheme',
  //   component: () => import("@/views/SetThemeView.vue"),
  //   meta: {
  //     requiresAuth: true,
  //     title: "Set Theme"
  //   }
  // },
  // DeviceConfig route commented out due to import issues
  // {
  //   path: '/deviceconfig',
  //   name: 'deviceconfig',
  //   component: () => import("@/views/DeviceConfigView.vue"),
  //   meta: {
  //     requiresAuth: true,
  //     title: "Device Config"
  //   }
  // },
  // {
  //   path: '/systemconfig',
  //   name: 'systemconfig',
  //   component: () => import("@/views/SystemConfigView.vue"),
  //   meta: {
  //     requiresAuth: true,
  //     title: "System Config"
  //   }
  // },

  // MappingManager route commented out due to import issues
  // {
  //   path: "/mappingmanager",
  //   name: "MappingManager",
  //   component: MappingManager,
  //   meta: { title: "Mapping Manager" },
  // },
  // ConnectionStatus route commented out due to import issues
  // {
  //   path: "/connection-status",
  //   name: "ConnectionStatus",
  //   component: ConnectionStatusExample,
  //   meta: { title: "VPS Connection Status" },
  // },
];

const router = createRouter({
  history: createWebHistory((import.meta as any).env?.BASE_URL),
  routes,
  // Add page transition animations
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

const routerLogger = createLogger('router') as any;

// Boat connection guard
router.beforeEach(async (to, from, next) => {
  // Skip for auth pages, pairing page, and Home page
  if (!to.meta.requiresAuth || to.name === 'BoatPairing' || to.name === 'Home') {
    return next();
  }

  const boatStore = useBoatConnectionStore();
  routerLogger.debug('Checking boat connection status', {
    route: to.name,
    boatId: boatStore.boatId,
    connectionStatus: boatStore.connectionStatus,
    vpsConnected: boatStore.vpsConnected,
    directConnected: boatStore.directConnected
  });
  
  // If we have a boat ID, allow navigation and try to connect in the background
  if (boatStore.boatId) {
    routerLogger.debug('Boat ID found, allowing navigation', { boatId: boatStore.boatId });

    // Try to connect in the background if not connected
    if (boatStore.connectionStatus !== 'connected') {
      routerLogger.debug('Attempting background boat connection');
      boatStore.initializeConnection().catch(error => {
        routerLogger.error('Background connection attempt failed', { error });
      });
    }

    return next();
  }
  
  // No boat ID found, go to pairing
  routerLogger.debug('No boat ID found, redirecting to pairing');
  return next({ name: 'BoatPairing' });
});

// Add navigation guard for page transitions
router.beforeEach((to, from, next) => {
  // Skip for boat pairing to prevent transition
  if (to.name === 'BoatPairing') {
    return next();
  }
  
  // Add transition class to the root element
  const app = document.getElementById('app');
  if (app) {
    app.classList.add('page-transition');
  }

  // Remove the class after the transition ends
  const removeTransitionClass = () => {
    if (app) {
      app.classList.remove('page-transition');
    }
    document.removeEventListener("transitionend", removeTransitionClass);
  };

  // Wait for the next render to ensure the new page is ready
  next();

  // Add transition end listener
  document.addEventListener("transitionend", removeTransitionClass, {
    once: true,
  });
});

// Navigation guard to enforce authentication and boat pairing
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem("isAuthenticated") === 'true';

  // Redirect to login if route requires auth and user is not authenticated
  if (to.meta.requiresAuth && !isAuthenticated) {
    routerLogger.debug('Redirecting to login - not authenticated', { to: to.path });
    return next({ path: "/login" });
  }

  // Redirect to home if user is already authenticated and trying to access login
  if ((to.path === "/login" || to.name === "Login") && isAuthenticated) {
    return next({ path: "/home" });
  }
  
  // For authenticated routes, ensure we have a boat ID (except Home)
  if (isAuthenticated && to.meta.requiresAuth && to.name !== 'Home') {
    const boatId = localStorage.getItem('activeBoatId');
    const boatIds = JSON.parse(localStorage.getItem('boatIds') || '[]');
    
    // If no boat ID is set but we have boats, set the first one as active
    if (!boatId && boatIds.length > 0) {
      const firstBoatId = boatIds[0];
      localStorage.setItem('activeBoatId', firstBoatId);
      routerLogger.debug('Set active boat ID', { boatId: firstBoatId });

      // Trigger client key registration if we have a connection bridge
      if (window.relayConnectionBridge) {
        routerLogger.debug('Triggering client key registration after navigation');
        window.relayConnectionBridge._registerClientKey().catch((error) => {
          routerLogger.error('Client key registration failed', { error });
        });
      }

      return next();
    }

    // If we still don't have a boat ID, redirect to boat pairing (except for Home)
    if (!boatId) {
      routerLogger.warn('No boat ID found, redirecting to boat pairing');
      return next({ name: 'BoatPairing' });
    }
  }
  
  // Continue with the navigation
  next();
});

export default router;
