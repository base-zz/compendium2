import { Dashboard, Widget } from '@/shared/types';

declare module '@/stores/dashboardStore' {
  interface DashboardStore {
    dashboards: Ref<Dashboard[]>;
    currentDashboardIndex: Ref<number>;
    isInitialized: Ref<boolean>;
    availableTemplates: any[]; // TODO: Define proper type
    
    // Methods
    init(): Promise<void>;
    getDashboards(): Promise<Dashboard[]>;
    addDashboard(dashboard: Omit<Dashboard, 'id'>): Promise<void>;
    newDashboard(name?: string): Promise<Dashboard>;
    deleteDashboard(index: number): Promise<void>;
    deleteAllDashboards(): Promise<void>;
    updateDashboard(index: number, dashboard: Partial<Dashboard>): Promise<void>;
    updateLayout(index: number, layout: any): Promise<void>; // TODO: Define layout type
    addWidget(dashboardIndex: number, widget: Omit<Widget, 'id'>): Promise<void>;
    updateWidget(dashboardIndex: number, widgetId: string, updatedWidget: Partial<Widget>): Promise<void>;
    removeWidget(dashboardIndex: number, widgetId: string): Promise<void>;
    getTemplateById(templateId: number): any; // TODO: Define template type
    getWidgetsForDashboard(dashboardIndex: number): Widget[];
    setDashboardTemplate(dashboardIndex: number, templateId: number): void;
    updateWidgets(dashboardIndex: number, widgets: Widget[]): Promise<void>;
  }

  export const useDashboardStore: () => DashboardStore;
}
