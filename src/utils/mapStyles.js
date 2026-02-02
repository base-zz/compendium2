import { Style, Fill, Stroke, Icon } from "ol/style";
import CircleStyle from "ol/style/Circle";

const BOAT_ICON_SRC = "/img/navigate.svg";

export const getWindIconSrc = (speedValue, isDarkMode = false) => {
  const speed = speedValue != null ? Math.round(speedValue) : '';
  const windColor = isDarkMode ? '#64B5F6' : '#007BFF';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='68' height='68' viewBox='0 0 68 68'>
    <path fill='${encodeURIComponent(windColor)}' d='M32 8 L56 48 H8 Z'/>
    <text x='32' y='48' text-anchor='middle' fill='white' font-size='16' font-weight='bold' font-family='system-ui, -apple-system, sans-serif' transform='rotate(180 32 40)'>${speed}</text>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
};

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
  BREADCRUMB: () => new Style({
    image: new CircleStyle({
      radius: 7,
      fill: new Fill({ color: '#000000' }),
      stroke: new Stroke({ color: '#333333', width: 1 }),
    }),
    zIndex: 80,
  }),
  BOAT: new Style({
    image: new Icon({
      src: BOAT_ICON_SRC,
      anchor: [0.85, 0.15],
      anchorXUnits: "fraction",
      anchorYUnits: "fraction",
      imgSize: [512, 512],
      scale: 0.08,
      rotateWithView: false,
    }),
    zIndex: 100,
  }),
  ANCHOR_DROP_LOCATION: createStyle({
    circle: {
      radius: 3,
      fill: { color: "rgba(67,160,71,0.5)" },
      stroke: { color: "rgba(255,255,255,0.5)", width: 1 },
    },
    zIndex: 90,
  }),
  ANCHOR_LOCATION: createStyle({
    circle: {
      radius: 9,
      fill: { color: "#FFC107" },
      stroke: { color: "#fff", width: 2 },
    },
    zIndex: 110,
  }),
  CRITICAL_RANGE: new Style({
    stroke: new Stroke({
      color: "rgba(239, 68, 68, 0.9)",
      width: 4,
    }),
    fill: new Fill({
      color: "rgba(239, 68, 68, 0.15)",
    }),
  }),
  NORMAL_RANGE: new Style({
    stroke: new Stroke({
      color: "rgba(76,175,80,0.85)",
      width: 3,
      lineDash: [4, 4],
    }),
    fill: new Fill({
      color: "rgba(76,175,80,0.2)",
    }),
  }),
  BOAT_RANGE: new Style({
    stroke: new Stroke({
      color: "rgba(255,255,255,0.15)", // Lower opacity
      width: 2,
      lineDash: [4, 4], // Dotted line pattern
    }),
    fill: new Fill({
      color: "rgba(33,150,243,0.08)", // Lower opacity
    }),
  }),
  RODE: new Style({
    stroke: new Stroke({
      color: "#FF5722", // Deep orange color for better visibility
      width: 2,        // Thinner line
      lineDash: [8, 4], // More pronounced dashed line
    }),
    zIndex: 95,       // Higher than anchor points but lower than boat
  }),
  AIS_VESSEL: createStyle({
    circle: {
      radius: 8,
      fill: { color: "#4CAF50" }, // Green for vessels
      stroke: { color: "#FFFFFF", width: 2 },
    },
    zIndex: 50,
  }),
  AIS_HAZARD: createStyle({
    circle: {
      radius: 8,
      fill: { color: "#4CAF50" }, // Green for all AIS targets
      stroke: { color: "#FFFFFF", width: 2 },
    },
    zIndex: 50,
  }),
  AIS_DEFAULT: createStyle({
    circle: {
      radius: 8,
      fill: { color: "#4CAF50" }, // Green for all AIS targets
      stroke: { color: "#FFFFFF", width: 2 },
    },
    zIndex: 50,
  }),
  AIS_WARNING: createStyle({
    circle: {
      radius: 9, // Larger radius for targets in warning range
      fill: { color: "#F44336" }, // Red for targets in warning range
      stroke: { color: "#FFFFFF", width: 2 },
    },
    zIndex: 55, // Higher zIndex to appear above other AIS targets
  }),
};
