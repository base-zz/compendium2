import { Style, Fill, Stroke } from "ol/style";
import CircleStyle from "ol/style/Circle";

export const createStyle = (config) => {
  return new Style({
    image: config.circle
      ? new CircleStyle({
          radius: config.circle.radius,
          fill: new Fill(config.circle.fill || {}),
          stroke: new Stroke(config.circle.stroke || {}),
        })
      : undefined,
    stroke: config.stroke ? new Stroke(config.stroke) : undefined,
    fill: config.fill ? new Fill(config.fill) : undefined,
    zIndex: config.zIndex,
  });
};

export const STYLES = {
  BREADCRUMB: createStyle({
    circle: {
      radius: 3, // Smaller than boat and anchor
      fill: { color: "rgba(121,85,72,0.7)" }, // Brown color for breadcrumbs
      stroke: { color: "rgba(255,255,255,0.5)", width: 1 },
    },
    zIndex: 80,
  }),
  BOAT: createStyle({
    circle: {
      radius: 8,
      fill: { color: "#2196f3" }, // Blue
      stroke: { color: "#ffffff", width: 3 },
    },
    zIndex: 100,
  }),
  ANCHOR_DROP_LOCATION: createStyle({
    circle: {
      radius: 7, // 1px smaller than boat
      fill: { color: "rgba(67,160,71,0.5)" }, // More visible green
      stroke: { color: "rgba(255,255,255,0.5)", width: 2 }, // More visible white stroke
    },
    zIndex: 90,
  }),
  ANCHOR_LOCATION: createStyle({
    circle: {
      radius: 7, // 1px smaller than boat
      fill: { color: "#FFC107" }, // Amber color for current anchor position
      stroke: { color: "#fff", width: 2 },
    },
    zIndex: 90,
  }),
  CRITICAL_RANGE: new Style({
    stroke: new Stroke({
      color: "rgba(255,0,0,0.8)",
      width: 3,
    }),
    fill: new Fill({
      color: "rgba(255,0,0,0.1)",
    }),
  }),
  NORMAL_RANGE: new Style({
    stroke: new Stroke({
      color: "rgba(33,150,243,0.2)", // Blue color with 0.2 opacity as requested
      width: 2,
      lineDash: [4, 4], // Dotted line pattern
    }),
    fill: new Fill({
      color: "rgba(33,150,243,0.05)", // Very subtle fill
    }),
  }),
  RODE: new Style({
    stroke: new Stroke({
      color: "#FF5722", // Deep orange color for better visibility
      width: 3,        // Thicker line
      lineDash: [8, 4], // More pronounced dashed line
    }),
    zIndex: 95,       // Higher than anchor points but lower than boat
  }),
  AIS_VESSEL: createStyle({
    circle: {
      radius: 6,
      fill: { color: "#4CAF50" }, // Green for vessels
      stroke: { color: "#FFFFFF", width: 2 },
    },
    zIndex: 50,
  }),
  AIS_HAZARD: createStyle({
    circle: {
      radius: 6,
      fill: { color: "#F44336" }, // Red for hazards
      stroke: { color: "#FFFFFF", width: 2 },
    },
    zIndex: 50,
  }),
  AIS_DEFAULT: createStyle({
    circle: {
      radius: 6,
      fill: { color: "#FF9800" }, // Orange for default AIS targets
      stroke: { color: "#FFFFFF", width: 2 },
    },
    zIndex: 50,
  }),
};
