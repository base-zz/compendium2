import { createRouter, createWebHistory } from "@ionic/vue-router";
// import { RouteRecordRaw } from "vue-router";

// Commented out imports that are causing TypeScript declaration file errors
import AnchorView from "@client/views/AnchorView.vue";
import Settings from "@client/views/SettingsView.vue";
import RegisterAccount from "@client/views/RegisterAccountView.vue";
import InstrumentView from "@client/components/InstrumentComponent.vue";
import StateManagementView from "@client/views/StateManagementView.vue";
import MappingManager from "@client/views/MappingManager.vue";
import SailView from "@client/views/SailView.vue";
import ConnectionStatusExample from "@client/examples/ConnectionStatusExample.vue";

const routes = [
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    meta: { title: "Page Not Found" },
    component: () => import("@client/views/NotFoundView.vue"),
  },

  {
    path: "/",
    redirect: "/home",
  },
  {
    path: "/home",
    name: "Home",
    meta: { requiresAuth: true, title: "Home" },
    component: () => import("@client/views/HomePage.vue"),
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
    component: () => import("@client/views/PagesView.vue"),
    meta: { title: "Pages" },
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
    path: '/userinfo',
    name: 'userinfo',
    component: () => import("@client/views/UserInfoView.vue"),
    meta: {
      requiresAuth: true,
      title: "User Info"
    }
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
  // SystemConfig route commented out due to import issues
  // {
  //   path: '/systemconfig',
  //   name: 'systemconfig',
  //   component: () => import("@client/views/SystemConfigView.vue"),
  //   meta: {
  //     requiresAuth: true,
  //     title: "System Config"
  //   }
  // },
  // Units demo route removed
  {
    path: '/statetest',
    name: 'statetest',
    component: () => import("@client/components/StateDataTest.vue"),
    meta: { title: "StateData Test" },
  },
  {
    path: '/data-debug',
    name: 'data-debug',
    component: () => import("@client/components/StateDataDebugger.vue"),
    meta: { title: "State Data Debugger" },
  },
  {
    path: '/raw-data',
    name: 'raw-data',
    component: () => import("@client/components/RawDataViewer.vue"),
    meta: { title: "Raw Navigation Data" },
  },
  {
    path: '/relay-inspector',
    name: 'relay-inspector',
    component: () => import("@client/components/RelayDataInspector.vue"),
    meta: { title: "Relay Data Inspector" },
  },
  {
    path: '/nav-debug',
    name: 'nav-debug',
    component: () => import("@client/components/NavigationDataDebugger.vue"),
    meta: { title: "Navigation Data Debugger" },
  },
  {
    path: '/state-data',
    name: 'state-data',
    component: () => import("@client/components/StateDataViewer.vue"),
    meta: { title: "State Data Viewer" },
  },
  {
    path: '/state-management',
    name: 'state-management',
    component: () => import("@client/views/StateManagementView.vue"),
    meta: { title: "State Management" },
  },
  {
    path: '/state-data-test',
    name: 'state-data-test',
    component: () => import("@client/views/StateDataTestView.vue"),
    meta: { title: "State Data Test" },
  },
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
});

// Navigation guard to enforce authentication
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem("auth_token");
  if (to.meta.requiresAuth && !token) {
    next({ path: "/login" });
  } else if ((to.path === "/login" || to.name === "Login") && token) {
    next({ path: "/home" });
  } else {
    next();
  }
});

export default router;
