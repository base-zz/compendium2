import { useStateDataStore } from "@/stores/stateDataStore";

export function useAnchorCommands(deps) {
  const {
    logger,
    stateStore,
    state,
    anchorState,
    navigationState,
    boatPosition,
    preferences,
    isMetric,
    customAnchorDropDepthValue,
    hasTriedPhoneBearing,
    showSetAnchorDialog,
    updateAisTargets,
    updateCriticalRangeCircle,
    updateBoatRangeCircle,
    updateRodeLine,
    updateAnchorPoints,
    resolveAnchorDropDepth,
    normalizeDepthDatum,
    validateCoordinates,
    getComputedAnchorLocation,
    calculateDistanceMeters,
    UnitConversion,
    nextTick,
  } = deps;

const handleSaveAnchorParameters = () => {
  console.log("[AnchorView] handleSaveAnchorParameters called");
  if (!anchorState.value) {
    logger.warn("Cannot save anchor parameters - anchorState is missing");
    showSetAnchorDialog.value = false;
    return;
  }

  if (anchorState.value.anchorDeployed !== true) {
    logger.warn("Cannot save anchor parameters - anchor is not deployed");
    showSetAnchorDialog.value = false;
    return;
  }

  const rodeAmount = anchorState.value.rode?.amount;
  const critical = anchorState.value.criticalRange?.r;
  const warning = anchorState.value.warningRange?.r;

  logger.debug("Saving anchor parameters - raw values:", {
    rodeAmount,
    critical,
    warning,
    criticalUnits: anchorState.value.criticalRange?.units,
    preferredUnits: preferences.value?.units?.length || anchorState.value.rode?.units,
  });

  if (typeof rodeAmount !== "number" || Number.isNaN(rodeAmount)) {
    logger.warn("Cannot save anchor parameters - invalid rode amount", { rodeAmount });
    return;
  }
  if (typeof critical !== "number" || Number.isNaN(critical)) {
    logger.warn("Cannot save anchor parameters - invalid critical range", { critical });
    return;
  }
  if (typeof warning !== "number" || Number.isNaN(warning)) {
    logger.warn("Cannot save anchor parameters - invalid warning range", { warning });
    return;
  }

  const preferredUnits = isMetric.value ? "m" : "ft";
  if (preferredUnits !== "m" && preferredUnits !== "ft") {
    logger.warn("Cannot save anchor parameters - missing/invalid preferred length units", {
      preferredUnits,
    });
    return;
  }

  try {
    const updatedAnchorState = {
      ...anchorState.value,
      rode: {
        ...anchorState.value.rode,
        amount: rodeAmount,
        units: preferredUnits,
      },
      criticalRange: {
        ...anchorState.value.criticalRange,
        r: critical,
        units: preferredUnits,
      },
      warningRange: {
        ...anchorState.value.warningRange,
        r: warning,
        units: preferredUnits,
      },
    };

    const existingDropLocation = updatedAnchorState.anchorDropLocation;
    if (!existingDropLocation) {
      logger.warn("Cannot save anchor parameters - anchorDropLocation is missing");
      return;
    }

    const navigationDepth = navigationState.value?.depth;
    const { resolvedDropDepth, resolvedDepthSource } = resolveAnchorDropDepth({
      customDepthValue: customAnchorDropDepthValue.value,
      preferredUnits,
      existingDropDepth: existingDropLocation.depth,
      existingDepthSource: existingDropLocation.depthSource,
      navigationDepth,
    });

    if (!resolvedDropDepth) {
      logger.warn("Cannot save anchor parameters - unable to resolve anchor drop depth");
      return;
    }

    if (!resolvedDepthSource) {
      logger.warn("Cannot save anchor parameters - unable to resolve depth source");
      return;
    }

    updatedAnchorState.anchorDropLocation = {
      ...existingDropLocation,
      depth: resolvedDropDepth,
      depthSource: resolvedDepthSource,
    };

    state.value.anchor = { ...updatedAnchorState };

    // Use nextTick to ensure all reactive updates are processed before calling updateAisTargets
    nextTick(() => {
      try {
        if (typeof updateAisTargets?.cancel === "function") {
          updateAisTargets.cancel();
        }
        if (typeof updateAisTargets === "function") {
          updateAisTargets();
        }
      } catch (e) {
        logger.error("Failed to update AIS targets after saving anchor parameters", e);
      }
    });

    try {
      const unitLabel = isMetric.value ? "m" : "ft";

      if (updatedAnchorState.warningRange?.r === 0) {
        if (typeof stateStore?.resolveAlertsByTrigger === "function") {
          stateStore.resolveAlertsByTrigger("ais_proximity", {
            warningRadius: updatedAnchorState.warningRange.r,
            units: unitLabel,
            source: "AnchorView.handleSaveAnchorParameters",
          });
        }

        if (state.value?.alerts?.active && Array.isArray(state.value.alerts.active)) {
          const shouldRemove = (alert) => {
            const trigger = alert?.trigger;
            const type = alert?.type;
            return trigger === "ais_proximity" || type === "ais_proximity";
          };

          const nextActive = state.value.alerts.active.filter((alert) => !shouldRemove(alert));
          state.value.alerts.active = nextActive;
        }
      }

      if (updatedAnchorState.criticalRange?.r === 0) {
        if (typeof stateStore?.resolveAlertsByTrigger === "function") {
          stateStore.resolveAlertsByTrigger("critical_range", {
            criticalRange: updatedAnchorState.criticalRange.r,
            units: unitLabel,
            source: "AnchorView.handleSaveAnchorParameters",
          });
        }

        if (state.value?.alerts?.active && Array.isArray(state.value.alerts.active)) {
          const shouldRemove = (alert) => {
            const trigger = alert?.trigger;
            const type = alert?.type;
            return trigger === "critical_range" || type === "critical_range";
          };

          const nextActive = state.value.alerts.active.filter((alert) => !shouldRemove(alert));
          state.value.alerts.active = nextActive;
        }
      }
    } catch (e) {
      logger.error("Failed to auto-resolve alerts after anchor parameter update", e);
    }

    try {
      const storageState = {
        anchorDeployed: true,
        anchorDropLocation: updatedAnchorState.anchorDropLocation,
        anchorLocation: updatedAnchorState.anchorLocation,
        criticalRange: updatedAnchorState.criticalRange,
        warningRange: updatedAnchorState.warningRange,
        rode: updatedAnchorState.rode,
        timestamp: Date.now(),
      };
      localStorage.setItem("anchorState", JSON.stringify(storageState));
    } catch (e) {
      logger.error("Failed to save anchor parameters to localStorage", e);
    }

    try {
      // Create payload following server protocol - only send allowed fields
      const payload = {
        type: "anchor:update",
        data: {
          // Only allowed parameters - NO position data
          rode: updatedAnchorState.rode,
          criticalRange: updatedAnchorState.criticalRange,
          warningRange: updatedAnchorState.warningRange,
          
          // Always include anchorDropLocation with depth and depthSource
          anchorDropLocation: {
            depth: updatedAnchorState.anchorDropLocation.depth,
            depthSource: updatedAnchorState.anchorDropLocation.depthSource
          },
          
          // Bearing ONLY if user set it (not default value)
          // Check if bearing is different from default (180 degrees) or if user tried phone bearing
          ...(updatedAnchorState.anchorDropLocation?.bearing && 
            (updatedAnchorState.anchorDropLocation.bearing.degrees !== 180 || hasTriedPhoneBearing.value) && {
            setBearing: {
              value: updatedAnchorState.anchorDropLocation.bearing.degrees,
              units: "deg"
            }
          })
        }
      };
      
      stateStore
        .sendMessageToServer("anchor:update", payload.data, {
          source: "AnchorView.handleSaveAnchorParameters",
          timeout: 5000,
        })
        .then((response) => {
          logger.info("Server acknowledged anchor parameter update", response);
          console.log("[AnchorView] Server response for anchor parameters:", {
            fullResponse: response,
            responseData: response.data,
            serverCriticalRange: response?.data?.criticalRange,
            serverWarningRange: response?.data?.warningRange,
            serverRode: response?.data?.rode,
            serverAnchorLocation: response?.data?.anchorLocation,
            serverDropLocation: response?.data?.anchorDropLocation
          });
          logger.debug("Server response data:", {
            responseCriticalRange: response?.data?.criticalRange,
            responseCriticalR: response?.data?.criticalRange?.r,
            responseCriticalUnits: response?.data?.criticalRange?.units,
            localCriticalR: updatedAnchorState.criticalRange?.r,
            localCriticalUnits: updatedAnchorState.criticalRange?.units,
          });
          const merged = { ...updatedAnchorState, ...(response?.data || {}) };

          state.value.anchor = merged;

          try {
            if (typeof updateAisTargets?.cancel === "function") {
              updateAisTargets.cancel();
            }
            if (typeof updateAisTargets === "function") {
              updateAisTargets();
            }
          } catch (e) {
            logger.error("Failed to update AIS targets after server ack", e);
          }
        })
        .catch((error) => {
          logger.error("Failed to send updated anchor parameters to server", error);
        });
    } catch (error) {
      logger.error("Error preparing anchor parameter update for server", error);
    }

    updateCriticalRangeCircle();
    updateBoatRangeCircle();
    updateRodeLine();
    showSetAnchorDialog.value = false;
  } catch (error) {
    logger.error("Failed to save anchor parameters", error);
  }
};

// Modal Handlers
const handleSetAnchor = () => {
  logger.info("Handling set anchor action...");
  if (!validateCoordinates(boatPosition.value)) {
    logger.warn("Cannot set anchor: Invalid boat position");
    return;
  }

  try {
    // Extract values safely
    const boatLat = boatPosition.value.latitude?.value ?? boatPosition.value.latitude;
    const boatLon = boatPosition.value.longitude?.value ?? boatPosition.value.longitude;

    // Get the bearing from the anchor drop location or use a default of 180 degrees (south)
    // This ensures the anchor is placed in a different location than the boat
    const bearingDegrees = anchorState.value.anchorDropLocation?.bearing?.degrees ?? 180;

    // IMPORTANT: The bearing needs to be in radians for the calculation
    // The bearing is the direction FROM the boat TO the anchor
    const bearingRad = (bearingDegrees * Math.PI) / 180; // Convert degrees to radians

    // Make sure we have a non-zero rode length (default to 50m if not set)
    const rodeAmount = anchorState.value.rode?.amount ?? 50;
    const currentRodeUnits = anchorState.value.rode?.units || "m";
    const preferredUnits = preferences.value?.units?.length || currentRodeUnits;
    let rode = rodeAmount;
    if (preferredUnits === "m" && currentRodeUnits === "ft") {
      rode = UnitConversion.ftToM(rodeAmount);
    } else if (preferredUnits === "ft" && currentRodeUnits === "m") {
      rode = UnitConversion.mToFt(rodeAmount);
    }
    const depth = navigationState.value?.depth?.value ?? 0; // Use 0 as default if no depth

    // Debug the values being passed to getComputedAnchorLocation
    logger.debug("Computing anchor location with:", {
      dropLocation: { latitude: boatLat, longitude: boatLon },
      rode: rode,
      bearing: bearingRad,
      depth: depth,
    });

    // Calculate anchor position using the state store's function
    const computedAnchorLocation = getComputedAnchorLocation(
      { latitude: boatLat, longitude: boatLon },
      rode,
      bearingRad,
      depth,
      isMetric.value
    );

    logger.debug("Computed anchor location:", computedAnchorLocation);

    // Calculate the distance between boat and anchor positions
    const distanceToAnchor = calculateDistanceMeters(
      boatLat,
      boatLon,
      computedAnchorLocation.latitude,
      computedAnchorLocation.longitude,
      isMetric.value
    );

    logger.debug("Distance calculations:", {
      boatPosition: [boatLon, boatLat],
      anchorPosition: [computedAnchorLocation.longitude, computedAnchorLocation.latitude],
      rodeLength: rode,
      calculatedDistance: distanceToAnchor,
      difference: Math.abs(rode - distanceToAnchor),
    });

    // Log the anchor state before updating
    const normalizedNavigationDepth = normalizeDepthDatum(navigationState.value?.depth);
    const newAnchorState = {
      anchorDropLocation: {
        position: {
          latitude: { value: boatLat, units: "deg" },
          longitude: { value: boatLon, units: "deg" },
        },
        time: new Date().toISOString(),
        depth: normalizedNavigationDepth,
        bearing: { value: bearingRad, units: "rad", degrees: bearingDegrees },
      },
      anchorLocation: {
        position: {
          latitude: { value: computedAnchorLocation.latitude, units: "deg" },
          longitude: { value: computedAnchorLocation.longitude, units: "deg" },
        },
        originalPosition: {
          latitude: { value: computedAnchorLocation.latitude, units: "deg" },
          longitude: { value: computedAnchorLocation.longitude, units: "deg" },
        },
        time: new Date().toISOString(),
        depth: normalizedNavigationDepth,
        distancesFromCurrent: {
          value: 0,
        },
        distancesFromDrop: {
          value: 0,
        },
        originalBearing: { value: bearingRad, units: "rad", degrees: bearingDegrees },
        bearing: { value: bearingRad, units: "rad", degrees: bearingDegrees },
      },
      rode: {
        amount: rode,
        units: preferredUnits,
      },
      criticalRange: {
        r: anchorState.value.criticalRange?.r || rode,
        units: preferredUnits,
      },
      warningRange: {
        r: anchorState.value.warningRange?.r || 15,
        units: preferredUnits,
      },
      defaultScope: {
        value: 5,
        units: "ratio",
      },
      dragging: false,
      anchorDeployed: true,
      history: [],
      useDeviceGPS: true,
    };

    // Log the state that will be sent to the server
    logger.info(
      "Updating anchor state on server:",
      JSON.stringify(
        {
          type: "anchor:update",
          data: newAnchorState,
          timestamp: new Date().toISOString(),
          source: "AnchorView.handleSetAnchor",
        },
        null,
        2
      )
    );

    // Log the raw values being used
    logger.debug("Anchor state update details:", {
      boatPosition: { lat: boatLat, lon: boatLon },
      computedAnchorLocation,
      rode,
      depth: navigationState.value?.depth,
      bearing: { degrees: bearingDegrees, radians: bearingRad },
    });

    // Create a clean object for localStorage
    const storageState = {
      anchorDeployed: true,
      anchorDropLocation: newAnchorState.anchorDropLocation,
      anchorLocation: newAnchorState.anchorLocation,
      criticalRange: newAnchorState.criticalRange,
      warningRange: newAnchorState.warningRange,
      rode: newAnchorState.rode,
      timestamp: Date.now(),
    };

    // Update the local state first for immediate UI feedback
    state.value.anchor = { ...newAnchorState };

    try {
      // Save to local storage immediately for offline use
      localStorage.setItem("anchorState", JSON.stringify(storageState));
      logger.debug("Anchor state saved to local storage");
    } catch (e) {
      logger.error("Failed to save anchor state to localStorage", e);
      // Continue with server sync even if localStorage fails
    }

    // Send the anchor update to the server
    const stateStore = useStateDataStore();
    logger.info("Sending anchor update to server...");

    const navigationDepth = navigationState.value?.depth;
    const { resolvedDropDepth, resolvedDepthSource } = resolveAnchorDropDepth({
      customDepthValue: customAnchorDropDepthValue.value,
      preferredUnits: isMetric.value ? "m" : "ft",
      existingDropDepth: newAnchorState.anchorDropLocation?.depth,
      existingDepthSource: newAnchorState.anchorDropLocation?.depthSource,
      navigationDepth,
    });

    if (!resolvedDropDepth) {
      logger.warn("Cannot set anchor - unable to resolve anchor drop depth");
      return;
    }

    if (!resolvedDepthSource) {
      logger.warn("Cannot set anchor - unable to resolve depth source");
      return;
    }

    newAnchorState.anchorDropLocation = {
      ...newAnchorState.anchorDropLocation,
      depth: resolvedDropDepth,
      depthSource: resolvedDepthSource,
    };

    state.value.anchor = { ...newAnchorState };

    // Create payload following server protocol - only send allowed fields
    const payload = {
      type: "anchor:update",
      data: {
        action: "set_after_deploy",
        anchorDeployed: true,
        rode: newAnchorState.rode,
        criticalRange: newAnchorState.criticalRange,
        warningRange: newAnchorState.warningRange,
        
        // Depth: handle both user-entered and boat depth cases
        anchorDropLocation: {
          depth: resolvedDropDepth,
          depthSource: resolvedDepthSource
        },
        
        // Bearing as setBearing
        setBearing: {
          value: bearingDegrees,
          units: "deg"
        }
      }
    };

    stateStore
      .sendMessageToServer("anchor:update", payload.data, {
        source: "AnchorView.handleSetAnchor",
        timeout: 5000, // 5 second timeout
      })
      .then((response) => {
        logger.info("Server acknowledged anchor update", response);
        console.log("[AnchorView] Server response for set anchor:", {
          fullResponse: response,
          responseType: typeof response,
          responseKeys: response ? Object.keys(response) : 'null',
          responseData: response?.data,
          responseDataType: typeof response?.data,
          serverCriticalRange: response?.data?.criticalRange,
          serverWarningRange: response?.data?.warningRange,
          serverRode: response?.data?.rode,
          serverAnchorLocation: response?.data?.anchorLocation,
          serverDropLocation: response?.data?.anchorDropLocation,
          serverAnchorDeployed: response?.data?.anchorDeployed
        });
        // Update the local state with any server-side modifications
        state.value.anchor = { ...newAnchorState, ...(response.data || {}) };

        // Update local storage with the latest state from server
        try {
          const updatedStorageState = {
            ...storageState,
            ...(response.data || {}),
          };
          localStorage.setItem("anchorState", JSON.stringify(updatedStorageState));
          logger.info("Updated anchor state in localStorage with server response");
        } catch (e) {
          logger.error("Failed to update anchor state in localStorage", e);
        }
      })
      .catch((error) => {
        logger.error("Failed to send anchor update to server", error);
        // Don't show an alert here as it might be annoying for temporary network issues
        // The state is already saved locally
      });

    // Update the map UI
    updateAnchorPoints();
    updateCriticalRangeCircle();
    updateRodeLine();
    updateBoatRangeCircle();

    // Close the dialog
    showSetAnchorDialog.value = false;
  } catch (error) {
    logger.error("Failed to save anchor state", { error });
    console.error('Error in handleSetAnchor:', {
    error: error.message,
    stack: error.stack,
    name: error.name,
    cause: error.cause
  });
  logger.error("Failed to save anchor state", { 
    error: error.message,
    stack: error.stack,
    name: error.name,
    cause: error.cause
  });
  alert("Error saving anchor position. See console for details.");
  showSetAnchorDialog.value = false;
  }
};

  return {
    handleSaveAnchorParameters,
    handleSetAnchor,
  };
}
