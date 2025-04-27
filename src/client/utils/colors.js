/**
 * Calculates the complementary color for a given hex color
 * @param {string} hexColor - The hex color to find the complement for (with or without # prefix)
 * @returns {string} - The complementary color as a hex string with # prefix
 */
export function getComplementaryColor(hexColor) {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert hex to RGB
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  
  // Invert the colors (255 - value)
  r = 255 - r;
  g = 255 - g;
  b = 255 - b;
  
  // Convert back to hex
  const complementHex = '#' + 
    r.toString(16).padStart(2, '0') + 
    g.toString(16).padStart(2, '0') + 
    b.toString(16).padStart(2, '0');
  
  return complementHex;
}

/**
 * Calculates a color with adjusted brightness
 * @param {string} hexColor - The hex color to adjust (with or without # prefix)
 * @param {number} factor - Adjustment factor: >1 to brighten, <1 to darken
 * @returns {string} - The adjusted color as a hex string with # prefix
 */
export function adjustBrightness(hexColor, factor) {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert hex to RGB
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  
  // Adjust brightness
  r = Math.min(255, Math.round(r * factor));
  g = Math.min(255, Math.round(g * factor));
  b = Math.min(255, Math.round(b * factor));
  
  // Convert back to hex
  const adjustedHex = '#' + 
    r.toString(16).padStart(2, '0') + 
    g.toString(16).padStart(2, '0') + 
    b.toString(16).padStart(2, '0');
  
  return adjustedHex;
}

/**
 * Converts a hex color to an RGBA string with specified opacity
 * @param {string} hexColor - The hex color (with or without # prefix)
 * @param {number} opacity - Opacity value between 0 and 1
 * @returns {string} - RGBA color string
 */
export function hexToRgba(hexColor, opacity = 1) {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Converts RGB values or an RGB/RGBA string to a hex color
 * @param {(number|string)} r - Red value (0-255) or complete RGB/RGBA string like 'rgb(255, 0, 0)' or 'rgba(255, 0, 0, 0.5)'
 * @param {number} [g] - Green value (0-255), not needed if r is an RGB/RGBA string
 * @param {number} [b] - Blue value (0-255), not needed if r is an RGB/RGBA string
 * @returns {string} - Hex color string with # prefix
 */
export function rgbToHex(r, g, b) {
  // If r is a string, parse it as an RGB/RGBA value
  if (typeof r === 'string') {
    const rgbRegex = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/i;
    const match = r.match(rgbRegex);
    
    if (match) {
      r = parseInt(match[1], 10);
      g = parseInt(match[2], 10);
      b = parseInt(match[3], 10);
    } else {
      throw new Error('Invalid RGB/RGBA string format');
    }
  }
  
  // Validate RGB values
  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
    throw new Error('RGB values must be between 0 and 255');
  }
  
  // Convert to hex and ensure 2 digits
  const hexR = r.toString(16).padStart(2, '0');
  const hexG = g.toString(16).padStart(2, '0');
  const hexB = b.toString(16).padStart(2, '0');
  
  return `#${hexR}${hexG}${hexB}`;
}

/**
 * Generates a color scheme based on a base color
 * @param {string} baseColor - The base color in hex format
 * @param {Object} [options] - Options for generating the color scheme
 * @param {number} [options.complementaryShift=180] - Degrees to shift for complementary color (default: 180 for true complement)
 * @param {number} [options.analogousAngle=30] - Degrees for analogous colors
 * @param {number} [options.triadicAngle=120] - Degrees for triadic colors
 * @param {number} [options.brightnessVariations=3] - Number of brightness variations to generate
 * @param {number} [options.brightnessStep=0.15] - Step size for brightness variations
 * @returns {Object} - Object containing various color schemes
 */
export function generateColorScheme(baseColor, options = {}) {
  // Default options
  const {
    complementaryShift = 180,
    analogousAngle = 30,
    triadicAngle = 120,
    brightnessVariations = 3,
    brightnessStep = 0.15
  } = options;
  
  // Remove # if present
  const hex = baseColor.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Convert RGB to HSL
  const rgbToHsl = (r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      
      h /= 6;
    }
    
    return [h * 360, s * 100, l * 100];
  };
  
  // Convert HSL to RGB
  const hslToRgb = (h, s, l) => {
    h /= 360;
    s /= 100;
    l /= 100;
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  };
  
  // Get HSL values of base color
  const [h, s, l] = rgbToHsl(r, g, b);
  
  // Generate color at specific hue
  const colorAtHue = (hue) => {
    // Normalize hue to 0-360 range
    hue = ((hue % 360) + 360) % 360;
    const [r, g, b] = hslToRgb(hue, s, l);
    return rgbToHex(r, g, b);
  };
  
  // Generate brightness variations
  const brightnessVariationArray = (color, variations, step) => {
    const result = [color];
    
    // Darker variations
    for (let i = 1; i <= variations; i++) {
      result.push(adjustBrightness(color, 1 - (step * i)));
    }
    
    // Lighter variations
    for (let i = 1; i <= variations; i++) {
      result.push(adjustBrightness(color, 1 + (step * i)));
    }
    
    return result;
  };
  
  // Generate the color scheme
  const complementary = colorAtHue(h + complementaryShift);
  const analogous1 = colorAtHue(h + analogousAngle);
  const analogous2 = colorAtHue(h - analogousAngle);
  const triadic1 = colorAtHue(h + triadicAngle);
  const triadic2 = colorAtHue(h + 2 * triadicAngle);
  
  return {
    base: baseColor,
    complementary,
    analogous: [analogous1, analogous2],
    triadic: [triadic1, triadic2],
    baseVariations: brightnessVariationArray(baseColor, brightnessVariations, brightnessStep),
    complementaryVariations: brightnessVariationArray(complementary, brightnessVariations, brightnessStep)
  };
}

/**
 * Creates a high-contrast color that ensures visibility against a background color
 * @param {string} backgroundColor - The background color in hex format
 * @param {Object} [options] - Options for generating the high-contrast color
 * @param {number} [options.contrastThreshold=4.5] - Minimum contrast ratio (WCAG recommends 4.5:1 for normal text)
 * @param {boolean} [options.preferBrightness=true] - If true, prioritizes brightness adjustment over hue shift
 * @param {number} [options.saturationBoost=20] - Percentage to boost saturation if needed
 * @returns {string} - A high-contrast color in hex format
 */
export function getHighContrastColor(backgroundColor, options = {}) {
  const {
    contrastThreshold = 4.5,
    preferBrightness = true,
    saturationBoost = 20
  } = options;
  
  // Remove # if present
  const hex = backgroundColor.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate relative luminance (per WCAG 2.0)
  const calculateLuminance = (r, g, b) => {
    const sRGB = [r / 255, g / 255, b / 255];
    
    // Convert to linear RGB
    const linearRGB = sRGB.map(val => {
      if (val <= 0.03928) {
        return val / 12.92;
      }
      return Math.pow((val + 0.055) / 1.055, 2.4);
    });
    
    // Calculate luminance
    return 0.2126 * linearRGB[0] + 0.7152 * linearRGB[1] + 0.0722 * linearRGB[2];
  };
  
  // Calculate contrast ratio
  const calculateContrast = (lum1, lum2) => {
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (lighter + 0.05) / (darker + 0.05);
  };
  
  // Convert RGB to HSL
  const rgbToHsl = (r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      
      h /= 6;
    }
    
    return [h * 360, s * 100, l * 100];
  };
  
  // Convert HSL to RGB
  const hslToRgb = (h, s, l) => {
    h /= 360;
    s /= 100;
    l /= 100;
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  };
  
  // Get background luminance
  const bgLuminance = calculateLuminance(r, g, b);
  
  // Convert background to HSL
  const [bgH, bgS, bgL] = rgbToHsl(r, g, b);
  
  // Start with complementary color
  let contrastH = (bgH + 180) % 360;
  let contrastS = Math.min(100, bgS + saturationBoost);
  
  // Determine if we need a light or dark color for contrast
  let contrastL;
  if (bgLuminance > 0.5) {
    // Background is light, use a dark color
    contrastL = 20;
  } else {
    // Background is dark, use a light color
    contrastL = 80;
  }
  
  // Generate initial contrast color
  let [contrastR, contrastG, contrastB] = hslToRgb(contrastH, contrastS, contrastL);
  let contrastLuminance = calculateLuminance(contrastR, contrastG, contrastB);
  let contrastRatio = calculateContrast(bgLuminance, contrastLuminance);
  
  // If we don't meet the threshold, adjust the color
  if (contrastRatio < contrastThreshold) {
    if (preferBrightness) {
      // Try adjusting brightness first
      const step = 5;
      const maxIterations = 16; // Prevent infinite loops
      let iterations = 0;
      
      while (contrastRatio < contrastThreshold && iterations < maxIterations) {
        if (bgLuminance > 0.5) {
          // Background is light, make contrast color darker
          contrastL = Math.max(0, contrastL - step);
        } else {
          // Background is dark, make contrast color lighter
          contrastL = Math.min(100, contrastL + step);
        }
        
        [contrastR, contrastG, contrastB] = hslToRgb(contrastH, contrastS, contrastL);
        contrastLuminance = calculateLuminance(contrastR, contrastG, contrastB);
        contrastRatio = calculateContrast(bgLuminance, contrastLuminance);
        iterations++;
      }
      
      // If we still don't meet the threshold, try adjusting hue
      if (contrastRatio < contrastThreshold) {
        for (let hueShift = 30; hueShift <= 180; hueShift += 30) {
          contrastH = (bgH + hueShift) % 360;
          [contrastR, contrastG, contrastB] = hslToRgb(contrastH, contrastS, contrastL);
          contrastLuminance = calculateLuminance(contrastR, contrastG, contrastB);
          contrastRatio = calculateContrast(bgLuminance, contrastLuminance);
          
          if (contrastRatio >= contrastThreshold) {
            break;
          }
        }
      }
    } else {
      // Try adjusting hue first
      for (let hueShift = 30; hueShift <= 330; hueShift += 30) {
        contrastH = (bgH + hueShift) % 360;
        [contrastR, contrastG, contrastB] = hslToRgb(contrastH, contrastS, contrastL);
        contrastLuminance = calculateLuminance(contrastR, contrastG, contrastB);
        contrastRatio = calculateContrast(bgLuminance, contrastLuminance);
        
        if (contrastRatio >= contrastThreshold) {
          break;
        }
      }
      
      // If we still don't meet the threshold, try adjusting brightness
      if (contrastRatio < contrastThreshold) {
        if (bgLuminance > 0.5) {
          contrastL = 0; // Pure black
        } else {
          contrastL = 100; // Pure white
        }
        
        [contrastR, contrastG, contrastB] = hslToRgb(contrastH, contrastS, contrastL);
      }
    }
  }
  
  // Convert back to hex
  return rgbToHex(contrastR, contrastG, contrastB);
}
