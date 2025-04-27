import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useStateDataStore } from '@/client/stores/stateDataStore';
import { connectionBridge } from '@/client/services/connectionBridge';

// Mock the connectionBridge
vi.mock('@/client/services/connectionBridge', () => {
  const alertServiceMock = {
    active: {
      getUserDefinedAlerts: vi.fn().mockResolvedValue([
        { id: 'alert1', name: 'Test Alert 1', dataSource: 'navigation.position', condition: 'gt', value: 10 },
        { id: 'alert2', name: 'Test Alert 2', dataSource: 'navigation.depth', condition: 'lt', value: 5 }
      ]),
      createUserDefinedAlert: vi.fn().mockImplementation((alertDef) => ({ id: 'new-alert', ...alertDef })),
      updateUserDefinedAlert: vi.fn().mockImplementation((id, alertDef) => ({ id, ...alertDef })),
      deleteUserDefinedAlert: vi.fn().mockResolvedValue({ success: true }),
      muteAlert: vi.fn().mockResolvedValue({ success: true }),
      unmuteAlert: vi.fn().mockResolvedValue({ success: true }),
      getMuteStatus: vi.fn().mockResolvedValue({ isMuted: false }),
      setUpdateInterval: vi.fn(),
      shouldUpdate: vi.fn().mockReturnValue(true),
      processAlert: vi.fn().mockImplementation((alertDef) => {
        // Simulate alert triggering for alert1 only
        if (alertDef.id === 'alert1') {
          return {
            id: 'triggered-alert1',
            alertDefId: alertDef.id,
            message: `Alert ${alertDef.name} triggered`,
            timestamp: new Date().toISOString(),
            acknowledged: false
          };
        }
        return null;
      })
    }
  };

  return {
    connectionBridge: {
      services: {
        get: vi.fn().mockImplementation((name) => {
          if (name === 'alert') {
            return alertServiceMock;
          }
          return {};
        })
      },
      on: vi.fn().mockReturnValue(() => {}),
      emit: vi.fn()
    }
  };
});

// Mock the StateData and StateService
vi.mock('@/state', () => {
  const mockStateData = {
    get: vi.fn().mockImplementation((path) => {
      if (path === 'navigation') {
        return {
          position: { latitude: 37.7749, longitude: -122.4194 },
          depth: { belowTransducer: 10 }
        };
      }
      if (path === 'alerts') {
        return {
          active: [],
          history: []
        };
      }
      return {};
    }),
    update: vi.fn(),
    on: vi.fn().mockReturnValue(() => {}),
    EVENTS: { PATH_CHANGED: 'path-changed' }
  };

  return {
    stateData: mockStateData,
    stateService: {
      isInitialized: vi.fn().mockReturnValue(true)
    },
    initialize: vi.fn().mockResolvedValue(true)
  };
});

describe('StateDataStore Alert Management', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useStateDataStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty alerts state', () => {
    expect(store.alertsState).toBeDefined();
    expect(store.alertsState.active).toEqual([]);
    expect(store.alertsState.history).toEqual([]);
    expect(store.alertsState.definitions).toEqual([]);
    expect(store.alertsState.isRunning).toBe(false);
    expect(store.alertsState.processingQueue).toEqual([]);
  });

  it('should load alert definitions', async () => {
    await store.loadAlertDefinitions();
    
    expect(connectionBridge.services.get).toHaveBeenCalledWith('alert');
    expect(store.alertsState.definitions).toHaveLength(2);
    expect(store.alertsState.definitions[0].id).toBe('alert1');
    expect(store.alertsState.definitions[1].id).toBe('alert2');
  });

  it('should add a new alert definition', async () => {
    const newAlert = {
      name: 'New Alert',
      dataSource: 'navigation.wind',
      condition: 'gt',
      value: 20
    };

    const result = await store.addAlertDefinition(newAlert);
    
    expect(connectionBridge.services.get).toHaveBeenCalledWith('alert');
    expect(result.id).toBe('new-alert');
    expect(result.name).toBe('New Alert');
    
    // Check that it was added to the store state
    expect(store.alertsState.definitions).toContainEqual(result);
  });

  it('should update an existing alert definition', async () => {
    // First load the definitions
    await store.loadAlertDefinitions();
    
    const updatedAlert = {
      name: 'Updated Alert 1',
      dataSource: 'navigation.position',
      condition: 'lt',
      value: 15
    };

    const result = await store.updateAlertDefinition('alert1', updatedAlert);
    
    expect(connectionBridge.services.get).toHaveBeenCalledWith('alert');
    expect(result.id).toBe('alert1');
    expect(result.name).toBe('Updated Alert 1');
    
    // Check that it was updated in the store state
    const alertInStore = store.alertsState.definitions.find(a => a.id === 'alert1');
    expect(alertInStore).toEqual(result);
  });

  it('should delete an alert definition', async () => {
    // First load the definitions
    await store.loadAlertDefinitions();
    
    await store.deleteAlertDefinition('alert1');
    
    expect(connectionBridge.services.get).toHaveBeenCalledWith('alert');
    
    // Check that it was removed from the store state
    const alertInStore = store.alertsState.definitions.find(a => a.id === 'alert1');
    expect(alertInStore).toBeUndefined();
  });

  it('should start and stop alert monitoring', async () => {
    // Start monitoring
    store.startAlertMonitoring();
    expect(store.alertsState.isRunning).toBe(true);
    
    // Stop monitoring
    store.stopAlertMonitoring();
    expect(store.alertsState.isRunning).toBe(false);
  });

  it('should process alerts and add triggered alerts to active list', async () => {
    // Load definitions and start monitoring
    await store.loadAlertDefinitions();
    store.startAlertMonitoring();
    
    // Manually trigger alert checking
    await store.checkAlerts({
      navigation: {
        position: { latitude: 37.7749, longitude: -122.4194 },
        depth: { belowTransducer: 10 }
      }
    });
    
    // Check that processAlert was called for both alert definitions
    expect(connectionBridge.services.get('alert').active.processAlert).toHaveBeenCalledTimes(2);
    
    // Check that the triggered alert was added to active alerts
    expect(store.alertsState.active).toHaveLength(1);
    expect(store.alertsState.active[0].alertDefId).toBe('alert1');
  });

  it('should handle alert muting and unmuting', async () => {
    await store.muteAlert('alert1', 3600000);
    expect(connectionBridge.services.get('alert').active.muteAlert).toHaveBeenCalledWith('alert1', 3600000);
    
    await store.unmuteAlert('alert1');
    expect(connectionBridge.services.get('alert').active.unmuteAlert).toHaveBeenCalledWith('alert1');
    
    const muteStatus = await store.getMuteStatus('alert1');
    expect(connectionBridge.services.get('alert').active.getMuteStatus).toHaveBeenCalledWith('alert1');
    expect(muteStatus.isMuted).toBe(false);
  });

  it('should set update interval for alert data sources', () => {
    store.setUpdateInterval('navigation.position', 5000);
    expect(connectionBridge.services.get('alert').active.setUpdateInterval).toHaveBeenCalledWith('navigation.position', 5000);
  });

  it('should expose computed properties for alert state', async () => {
    // Load definitions and start monitoring
    await store.loadAlertDefinitions();
    store.startAlertMonitoring();
    
    // Initially no active alerts
    expect(store.hasActiveAlerts).toBe(false);
    expect(store.pendingAlertCount).toBe(0);
    
    // Trigger an alert
    await store.checkAlerts({
      navigation: {
        position: { latitude: 37.7749, longitude: -122.4194 },
        depth: { belowTransducer: 10 }
      }
    });
    
    // Now we should have an active alert
    expect(store.hasActiveAlerts).toBe(true);
  });
});
