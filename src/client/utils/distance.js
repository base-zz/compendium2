/**
 * Converts latitude and longitude coordinates to feet from a central point
 * @param {number} lat - Latitude in decimal degrees
 * @param {number} lon - Longitude in decimal degrees
 * @param {number} centralLat - Central point latitude in decimal degrees
 * @param {number} centralLon - Central point longitude in decimal degrees
 * @returns {Object} - Distance in feet as x (east-west) and y (north-south) components
 */
export function latLonToFeet(lat, lon, centralLat, centralLon) {
  // Earth's radius in feet
  const earthRadiusFeet = 20902231; // 3958.8 miles * 5280 feet per mile
  
  // Convert latitude and longitude from degrees to radians
  const lat1 = degreesToRadians(centralLat);
  const lon1 = degreesToRadians(centralLon);
  const lat2 = degreesToRadians(lat);
  const lon2 = degreesToRadians(lon);
  
  // Calculate the differences
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  
  // Calculate north-south distance (y)
  const distNS = earthRadiusFeet * dLat;
  
  // Calculate east-west distance (x)
  // Adjust for the fact that longitude lines get closer together as you move away from the equator
  const distEW = earthRadiusFeet * dLon * Math.cos(lat1);
  
  return {
    x: distEW,
    y: -distNS // Negative because y increases southward in SVG
  };
}

/**
 * Converts a distance in feet to latitude/longitude from a central point
 * @param {number} xFeet - East-west distance in feet (positive is east)
 * @param {number} yFeet - North-south distance in feet (positive is north)
 * @param {number} centralLat - Central point latitude in decimal degrees
 * @param {number} centralLon - Central point longitude in decimal degrees
 * @returns {Object} - Latitude and longitude in decimal degrees
 */
export function feetToLatLon(xFeet, yFeet, centralLat, centralLon) {
  // Earth's radius in feet
  const earthRadiusFeet = 20902231; // 3958.8 miles * 5280 feet per mile
  
  // Convert central latitude from degrees to radians
  const lat1 = degreesToRadians(centralLat);
  
  // Calculate change in latitude and longitude
  const dLat = -yFeet / earthRadiusFeet; // Negative because y increases southward in SVG
  const dLon = xFeet / (earthRadiusFeet * Math.cos(lat1));
  
  // Convert back to degrees
  const newLat = centralLat + radiansToDegrees(dLat);
  const newLon = centralLon + radiansToDegrees(dLon);
  
  return {
    lat: newLat,
    lon: newLon
  };
}

/**
 * Converts latitude and longitude coordinates to meters from a central point
 * @param {number} lat - Latitude in decimal degrees
 * @param {number} lon - Longitude in decimal degrees
 * @param {number} centralLat - Central point latitude in decimal degrees
 * @param {number} centralLon - Central point longitude in decimal degrees
 * @returns {Object} - Distance in meters as x (east-west) and y (north-south) components
 */
export function latLonToMeters(lat, lon, centralLat, centralLon) {
  // Earth's radius in meters
  const earthRadiusMeters = 6371000; // 6,371 km
  
  // Convert latitude and longitude from degrees to radians
  const lat1 = degreesToRadians(centralLat);
  const lon1 = degreesToRadians(centralLon);
  const lat2 = degreesToRadians(lat);
  const lon2 = degreesToRadians(lon);
  
  // Calculate the differences
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  
  // Calculate north-south distance (y)
  const distNS = earthRadiusMeters * dLat;
  
  // Calculate east-west distance (x)
  // Adjust for the fact that longitude lines get closer together as you move away from the equator
  const distEW = earthRadiusMeters * dLon * Math.cos(lat1);
  
  return {
    x: distEW,
    y: -distNS // Negative because y increases southward in SVG
  };
}

/**
 * Converts a distance in meters to latitude/longitude from a central point
 * @param {number} xMeters - East-west distance in meters (positive is east)
 * @param {number} yMeters - North-south distance in meters (positive is north)
 * @param {number} centralLat - Central point latitude in decimal degrees
 * @param {number} centralLon - Central point longitude in decimal degrees
 * @returns {Object} - Latitude and longitude in decimal degrees
 */
export function metersToLatLon(xMeters, yMeters, centralLat, centralLon) {
  // Earth's radius in meters
  const earthRadiusMeters = 6371000; // 6,371 km
  
  // Convert central latitude from degrees to radians
  const lat1 = degreesToRadians(centralLat);
  
  // Calculate change in latitude and longitude
  const dLat = -yMeters / earthRadiusMeters; // Negative because y increases southward in SVG
  const dLon = xMeters / (earthRadiusMeters * Math.cos(lat1));
  
  // Convert back to degrees
  const newLat = centralLat + radiansToDegrees(dLat);
  const newLon = centralLon + radiansToDegrees(dLon);
  
  return {
    lat: newLat,
    lon: newLon
  };
}

/**
 * Calculates the distance between two points in meters using the Haversine formula
 * @param {number} lat1 - Latitude of first point in decimal degrees
 * @param {number} lon1 - Longitude of first point in decimal degrees
 * @param {number} lat2 - Latitude of second point in decimal degrees
 * @param {number} lon2 - Longitude of second point in decimal degrees
 * @returns {number} - Distance in meters
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  // Earth's radius in meters
  const earthRadiusMeters = 6371000; // 6,371 km
  
  // Convert latitude and longitude from degrees to radians
  const lat1Rad = degreesToRadians(lat1);
  const lon1Rad = degreesToRadians(lon1);
  const lat2Rad = degreesToRadians(lat2);
  const lon2Rad = degreesToRadians(lon2);
  
  // Differences
  const dLat = lat2Rad - lat1Rad;
  const dLon = lon2Rad - lon1Rad;
  
  // Haversine formula
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = earthRadiusMeters * c;
  
  return distance;
}

export function distanceBetween(lat1, lon1, lat2, lon2, units='ft') {
  const distance = haversineDistance(lat1, lon1, lat2, lon2);
  return units === 'ft' ? distance * 3.28084 : distance;
}

/**
 * Calculates a new latitude/longitude point given a starting point, bearing, and distance
 * @param {number} lat - Starting latitude in decimal degrees
 * @param {number} lon - Starting longitude in decimal degrees
 * @param {number} bearing - Direction to travel in degrees (0 = north, 90 = east, etc.)
 * @param {number} distance - Distance to travel
 * @param {string} units - Units for distance ('ft' or 'm')
 * @returns {Object} - New latitude and longitude in decimal degrees
 */
/**
 * Converts radians to degrees
 * @param {number} radians - Angle in radians
 * @returns {number} - Angle in degrees
 */
export function radiansToDegrees(radians) {
  return radians * 180 / Math.PI;
}

/**
 * Converts degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} - Angle in radians
 */
export function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

export function destinationPoint(lat, lon, bearing, distance, units='ft') {
  // Convert distance to meters if in feet
  const distanceInMeters = units === 'ft' ? distance / 3.28084 : distance;
  
  // Earth's radius in meters
  const earthRadiusMeters = 6371000; // 6,371 km
  
  // Convert to radians
  const latRad = degreesToRadians(lat);
  const lonRad = degreesToRadians(lon);
  const bearingRad = degreesToRadians(bearing);
  
  // Calculate angular distance
  const angularDistance = distanceInMeters / earthRadiusMeters;
  
  // Calculate new latitude
  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) + 
    Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );
  
  // Calculate new longitude
  const newLonRad = lonRad + Math.atan2(
    Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(latRad),
    Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(newLatRad)
  );
  
  // Convert back to degrees
  const newLat = radiansToDegrees(newLatRad);
  const newLon = radiansToDegrees(newLonRad);
  
  return {
    lat: newLat,
    lon: newLon
  };
}