/**
 * Utility functions for Google Maps integration
 */

/**
 * Generate static map URL for PDFs and previews
 */
export function getStaticMapUrl(lat: number, lng: number, label: string = 'V'): string {
  const base = "https://maps.googleapis.com/maps/api/staticmap";
  const params = new URLSearchParams({
    key: import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY || '',
    size: "600x320",
    scale: "2",
    maptype: "roadmap",
    markers: `label:${label}|${lat},${lng}`,
  });
  return `${base}?${params.toString()}`;
}

/**
 * Generate street view URL for PDFs and previews
 */
export function getStreetViewUrl(lat: number, lng: number): string {
  const base = "https://maps.googleapis.com/maps/api/streetview";
  const params = new URLSearchParams({
    key: import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY || '',
    size: "600x320",
    location: `${lat},${lng}`,
    fov: "80",
    pitch: "0",
    heading: "0",
  });
  return `${base}?${params.toString()}`;
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lng: number, precision: number = 6): string {
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
}

/**
 * Calculate distance between two points (Haversine formula)
 */
export function calculateDistance(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

/**
 * Validate latitude and longitude values
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Convert duration seconds to human readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
}