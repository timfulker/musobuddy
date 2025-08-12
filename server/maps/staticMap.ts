export function staticMapUrl({ lat, lng, label = "V" }: { lat: number; lng: number; label?: string }) {
  if (!process.env.GOOGLE_MAPS_SERVER_KEY) {
    throw new Error("Google Maps server key not configured");
  }
  
  const base = "https://maps.googleapis.com/maps/api/staticmap";
  const params = new URLSearchParams({
    key: process.env.GOOGLE_MAPS_SERVER_KEY,
    size: "600x320",
    scale: "2",
    maptype: "roadmap",
    markers: `label:${label}|${lat},${lng}`,
  });
  return `${base}?${params.toString()}`;
}

export function streetViewUrl({ lat, lng }: { lat: number; lng: number }) {
  if (!process.env.GOOGLE_MAPS_SERVER_KEY) {
    throw new Error("Google Maps server key not configured");
  }
  
  const base = "https://maps.googleapis.com/maps/api/streetview";
  const params = new URLSearchParams({
    key: process.env.GOOGLE_MAPS_SERVER_KEY,
    size: "600x320",
    location: `${lat},${lng}`,
    fov: "80",
    pitch: "0",
    heading: "0",
  });
  return `${base}?${params.toString()}`;
}