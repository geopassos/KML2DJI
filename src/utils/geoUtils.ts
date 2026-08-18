import { Waypoint, MissionSummary } from '../types';

const EARTH_RADIUS = 6371000; // meters

/**
 * Calculates Haversine distance in meters between two lat/lng points
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS * c;
}

/**
 * Calculates bearing in degrees (0-360) from point 1 to point 2
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const dLonRad = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(dLonRad) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLonRad);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Calculates destination point given start point, distance (m), and bearing (deg)
 */
export function calculateDestinationPoint(
  lat: number,
  lon: number,
  distanceMeters: number,
  bearingDeg: number
): { lat: number; lng: number } {
  const δ = distanceMeters / EARTH_RADIUS;
  const θ = (bearingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lon * Math.PI) / 180;

  const sinφ2 = Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ);
  const φ2 = Math.asin(sinφ2);
  const y = Math.sin(θ) * Math.sin(δ) * Math.cos(φ1);
  const x = Math.cos(δ) - Math.sin(φ1) * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);

  return {
    lat: (φ2 * 180) / Math.PI,
    lng: (((λ2 * 180) / Math.PI + 540) % 360) - 180,
  };
}

/**
 * Calculates polygon area in square meters using spherical excess formula
 */
export function calculatePolygonArea(coords: { lat: number; lng: number }[]): number {
  if (coords.length < 3) return 0;
  let total = 0;
  const len = coords.length;

  for (let i = 0; i < len; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % len];
    const radLat1 = (p1.lat * Math.PI) / 180;
    const radLat2 = (p2.lat * Math.PI) / 180;
    const radLngDiff = ((p2.lng - p1.lng) * Math.PI) / 180;
    total += radLngDiff * (2 + Math.sin(radLat1) + Math.sin(radLat2));
  }

  const area = Math.abs((total * EARTH_RADIUS * EARTH_RADIUS) / 2);
  return area; // in square meters
}

/**
 * Calculates polygon area in Hectares (ha)
 */
export function computePolygonAreaHectares(coords: { lat: number; lng: number }[]): number {
  const areaSqMeters = calculatePolygonArea(coords);
  return areaSqMeters / 10000;
}

/**
 * Computes mission flight stats from waypoint array and speed
 */
export function computeMissionSummary(waypoints: Waypoint[], defaultSpeed: number = 8): MissionSummary {
  if (waypoints.length === 0) {
    return {
      totalDistanceMeters: 0,
      estimatedFlightSeconds: 0,
      waypointCount: 0,
      estimatedPhotos: 0,
      estimatedBatteries: 1,
      bounds: {
        minLat: 0,
        maxLat: 0,
        minLng: 0,
        maxLng: 0,
        centerLat: 0,
        centerLng: 0,
      },
    };
  }

  let totalDist = 0;
  let minLat = waypoints[0].lat;
  let maxLat = waypoints[0].lat;
  let minLng = waypoints[0].lng;
  let maxLng = waypoints[0].lng;

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    if (wp.lat < minLat) minLat = wp.lat;
    if (wp.lat > maxLat) maxLat = wp.lat;
    if (wp.lng < minLng) minLng = wp.lng;
    if (wp.lng > maxLng) maxLng = wp.lng;

    if (i > 0) {
      const prev = waypoints[i - 1];
      totalDist += calculateDistance(prev.lat, prev.lng, wp.lat, wp.lng);
    }
  }

  const speed = defaultSpeed > 0 ? defaultSpeed : 8;
  // Flight time: travel time + waypoint turns / pauses (approx 2.5s per turn/action)
  const travelSeconds = totalDist / speed;
  const turnSeconds = waypoints.length * 2.5;
  const estimatedFlightSeconds = Math.round(travelSeconds + turnSeconds);

  // Batteries estimation: standard drone battery is safe for ~20-25 mins (1200-1500s)
  const batterySeconds = 1200;
  const estimatedBatteries = Math.max(1, Math.ceil(estimatedFlightSeconds / batterySeconds));

  const estimatedPhotos = waypoints.filter(w => w.action === 'takePhoto' || !w.action).length;

  return {
    totalDistanceMeters: Math.round(totalDist),
    estimatedFlightSeconds,
    waypointCount: waypoints.length,
    estimatedPhotos,
    estimatedBatteries,
    bounds: {
      minLat,
      maxLat,
      minLng,
      maxLng,
      centerLat: (minLat + maxLat) / 2,
      centerLng: (minLng + maxLng) / 2,
    },
  };
}

/**
 * Formats seconds into MM:SS or HH:MM:SS
 */
export function formatFlightTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  }
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

/**
 * Formats meters into km or m
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${meters} m`;
}
