import { createRouter, createWebHistory } from "@ionic/vue-router";
import AnchorView from "@client/views/AnchorView.vue";
import SplashScreen from "@client/views/SplashScreen.vue";
import Settings from "@client/views/SettingsView.vue";
import RegisterAccount from "@client/views/RegisterAccountView.vue";
import InstrumentView from "@client/components/InstrumentComponent.vue";
import StateManagementView from "@client/views/StateManagementView.vue";
import MappingManager from "@client/views/MappingManager.vue";
import SailView from "@client/views/SailView.vue";
import ConnectionStatusExample from "@client/examples/ConnectionStatusExample.vue";
import DashboardView from "@client/views/DashboardView.vue";
import HomePage from "@client/views/HomePage.vue";
const routes = [
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    meta: { title: "Page Not Found" },
    component: () => import("@client/views/NotFoundView.vue"),
  },

  {
    path: "/",
    name: "Splash",
    component: SplashScreen,
    meta: { requiresAuth: false, title: "Welcome" },
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
    component: () => import("@client/views/AISTargetView.vue"),
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
    component: () => import("@client/views/LoginView.vue"),
    meta: { title: "Login" },
  },
  {
    path: "/register",
    name: "Register",
    props: false,
    component: () => import("@client/components/RegisterComponent.vue"),
    meta: { title: "Register" },
  },
  {
    path: "/forgot-password",
    name: "ForgotPassword",
    component: () => import("@client/views/PasswordResetView.vue"),
    meta: { title: "Forgot Password" },
  },
  // JunkView2 route now fixed with correct CurrentLines component path

  // {
  //   path: "/junk3",
  //   name: "Junk3",
  //   component: () => import("@client/views/JunkView3.vue"),
  //   meta: { title: "Junk3" },
  // },
  // {
  //   path: "/datamonitor",
  //   name: "SignalKDataMonitor",
  //   component: () => import("@client/views/SignalKDataView.vue"),
  //   meta: { title: "SignalK Data Viewer" },
  // },
  // Pages route commented out due to import issues
  {
    path: "/pages",
    name: "Pages",
    component: () => import("@client/views/DashboardView.vue"),
    meta: { title: "Pages" },
  },
  {
    path: "/logging-test",
    name: "LoggingTest",
    component: () => import("@client/components/LoggingTest.vue"),
    meta: { requiresAuth: true, title: "Logging Test" },
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
    component: () => import("@client/views/AlertView.vue"),
    meta: { title: "Alerts" },
  },
  // Alert Rules Management
  {
    path: "/alert-rules",
    component: () => import("@client/views/AlertRulesView.vue"),
    meta: { title: "Alert Rules" },
    children: [
      {
        path: "",
        name: "alert-rules",
        component: () => import("@client/components/AlertRuleList.vue"),
        meta: { title: "Alert Rules" },
      },
      {
        path: ":mode(create|edit)/:id?",
        name: "alert-rule-editor",
        component: () => import("@client/components/AlertRuleEditor.vue"),
        props: true,
        meta: { title: "Edit Alert Rule" },
      },
    ],
  },
  // UserInfo route commented out due to import issues
  {
    path: "/userinfo",
    name: "userinfo",
    component: () => import("@client/views/UserInfoView.vue"),
    meta: {
      requiresAuth: true,
      title: "User Info",
    },
  },
  // SetTheme route commented out due to import issues
  // {
  //   path: '/settheme',
  //   name: 'settheme',
  //   component: () => import("@client/views/SetThemeView.vue"),
  //   meta: {
  //     requiresAuth: true,
  //     title: "Set Theme"
  //   }
  // },
  // DeviceConfig route commented out due to import issues
  // {
  //   path: '/deviceconfig',
  //   name: 'deviceconfig',
  //   component: () => import("@client/views/DeviceConfigView.vue"),
  //   meta: {
  //     requiresAuth: true,
  //     title: "Device Config"
  //   }
  // },
  // {
  //   path: '/systemconfig',
  //   name: 'systemconfig',
  //   component: () => import("@client/views/SystemConfigView.vue"),
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
  history: createWebHistory(import.meta.env.BASE_URL),
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

// Add navigation guard for page transitions
router.beforeEach((to, from, next) => {
  // Add transition class to the root element
  const app = document.getElementById("app");
  if (app) {
    app.classList.add("page-transition");
  }

  // Remove the class after the transition ends
  const removeTransitionClass = () => {
    if (app) {
      app.classList.remove("page-transition");
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

// Navigation guard to enforce authentication
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem("isAuthenticated") === 'true';
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ path: "/login" });
  } else if ((to.path === "/login" || to.name === "Login") && isAuthenticated) {
    next({ path: "/home" });
  } else {
    next();
  }
});

export default router;
