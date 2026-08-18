import { Waypoint, MissionSettings } from '../types';
import { calculateBearing } from './geoUtils';

interface Point2D {
  x: number;
  y: number;
}

/**
 * Converts a polygon into a zig-zag photogrammetry flight path grid
 */
export function generatePhotogrammetryGrid(
  polygonCoords: { lat: number; lng: number }[],
  settings: MissionSettings
): Waypoint[] {
  if (polygonCoords.length < 3) return [];

  // 1. Calculate centroid for local projection
  let sumLat = 0;
  let sumLng = 0;
  polygonCoords.forEach((p) => {
    sumLat += p.lat;
    sumLng += p.lng;
  });
  const centerLat = sumLat / polygonCoords.length;
  const centerLng = sumLng / polygonCoords.length;

  const latRad = (centerLat * Math.PI) / 180;
  const metersPerDegLat = 111132.954 - 559.822 * Math.cos(2 * latRad) + 1.175 * Math.cos(4 * latRad);
  const metersPerDegLng = 111412.84 * Math.cos(latRad) - 93.5 * Math.cos(3 * latRad);

  // Convert lat/lng to local meters (X = East, Y = North)
  const localPoly: Point2D[] = polygonCoords.map((p) => ({
    x: (p.lng - centerLng) * metersPerDegLng,
    y: (p.lat - centerLat) * metersPerDegLat,
  }));

  // Ensure polygon is closed
  if (
    localPoly[0].x !== localPoly[localPoly.length - 1].x ||
    localPoly[0].y !== localPoly[localPoly.length - 1].y
  ) {
    localPoly.push({ ...localPoly[0] });
  }

  // 2. Rotate polygon by -gridAngle
  const angleRad = (settings.gridAngle * Math.PI) / 180;
  const cosA = Math.cos(-angleRad);
  const sinA = Math.sin(-angleRad);

  const rotatedPoly: Point2D[] = localPoly.map((p) => ({
    x: p.x * cosA - p.y * sinA,
    y: p.x * sinA + p.y * cosA,
  }));

  // 3. Find bounding box in rotated space
  let minY = Infinity;
  let maxY = -Infinity;

  rotatedPoly.forEach((p) => {
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const spacing = Math.max(5, settings.gridSpacing || 30); // spacing in meters
  // Add margin if configured
  const startY = minY + (settings.margin || 0) + spacing / 2;
  const endY = maxY - (settings.margin || 0);

  if (startY > endY) {
    // Polygon too small for requested spacing, generate center line
    const midY = (minY + maxY) / 2;
    return generateLineAtY(midY, rotatedPoly, angleRad, centerLat, centerLng, metersPerDegLat, metersPerDegLng, settings, 0);
  }

  const rawFlightLines: { p1: Point2D; p2: Point2D }[] = [];

  for (let y = startY; y <= endY; y += spacing) {
    const intersections: number[] = [];

    // Find intersections with polygon edges
    for (let i = 0; i < rotatedPoly.length - 1; i++) {
      const p1 = rotatedPoly[i];
      const p2 = rotatedPoly[i + 1];

      // Check if horizontal line at y intersects segment (p1, p2)
      if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
        // Calculate X coordinate of intersection
        const t = (y - p1.y) / (p2.y - p1.y);
        const x = p1.x + t * (p2.x - p1.x);
        intersections.push(x);
      }
    }

    // Sort intersections left to right
    intersections.sort((a, b) => a - b);

    // Pair intersections (x1 to x2, x3 to x4, etc.)
    for (let i = 0; i < intersections.length - 1; i += 2) {
      const x1 = intersections[i];
      const x2 = intersections[i + 1];
      if (x2 - x1 > 2) { // At least 2 meters long
        rawFlightLines.push({
          p1: { x: x1, y },
          p2: { x: x2, y },
        });
      }
    }
  }

  // 4. Connect flight lines in a continuous zig-zag path
  const rotatedWaypoints: Point2D[] = [];
  let reverseDirection = false;

  for (let i = 0; i < rawFlightLines.length; i++) {
    const line = rawFlightLines[i];
    if (!reverseDirection) {
      rotatedWaypoints.push(line.p1);
      rotatedWaypoints.push(line.p2);
    } else {
      rotatedWaypoints.push(line.p2);
      rotatedWaypoints.push(line.p1);
    }
    reverseDirection = !reverseDirection;
  }

  // 5. Rotate back by +gridAngle and convert to lat/lng
  const cosBack = Math.cos(angleRad);
  const sinBack = Math.sin(angleRad);

  const waypoints: Waypoint[] = [];

  for (let i = 0; i < rotatedWaypoints.length; i++) {
    const pRot = rotatedWaypoints[i];
    const xOrig = pRot.x * cosBack - pRot.y * sinBack;
    const yOrig = pRot.x * sinBack + pRot.y * cosBack;

    const lat = centerLat + yOrig / metersPerDegLat;
    const lng = centerLng + xOrig / metersPerDegLng;

    // Calculate heading towards next waypoint
    let heading = 0;
    if (i < rotatedWaypoints.length - 1) {
      const nextRot = rotatedWaypoints[i + 1];
      const nextX = nextRot.x * cosBack - nextRot.y * sinBack;
      const nextY = nextRot.x * sinBack + nextRot.y * cosBack;
      const nextLat = centerLat + nextY / metersPerDegLat;
      const nextLng = centerLng + nextX / metersPerDegLng;
      heading = Math.round(calculateBearing(lat, lng, nextLat, nextLng));
    } else if (i > 0) {
      heading = waypoints[i - 1].heading ?? 0;
    }

    waypoints.push({
      id: i,
      index: i,
      lat,
      lng,
      alt: settings.flightAltitude,
      speed: settings.flightSpeed,
      heading,
      gimbalPitch: settings.gimbalPitch,
      action: 'takePhoto',
      name: `Grade_WP_${i + 1}`,
    });
  }

  return waypoints;
}

function generateLineAtY(
  y: number,
  rotatedPoly: Point2D[],
  angleRad: number,
  centerLat: number,
  centerLng: number,
  metersPerDegLat: number,
  metersPerDegLng: number,
  settings: MissionSettings,
  idOffset: number
): Waypoint[] {
  const intersections: number[] = [];
  for (let i = 0; i < rotatedPoly.length - 1; i++) {
    const p1 = rotatedPoly[i];
    const p2 = rotatedPoly[i + 1];
    if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
      const t = (y - p1.y) / (p2.y - p1.y);
      intersections.push(p1.x + t * (p2.x - p1.x));
    }
  }
  intersections.sort((a, b) => a - b);
  if (intersections.length < 2) return [];

  const cosBack = Math.cos(angleRad);
  const sinBack = Math.sin(angleRad);
  const p1Rot = { x: intersections[0], y };
  const p2Rot = { x: intersections[intersections.length - 1], y };

  const p1Orig = {
    x: p1Rot.x * cosBack - p1Rot.y * sinBack,
    y: p1Rot.x * sinBack + p1Rot.y * cosBack,
  };
  const p2Orig = {
    x: p2Rot.x * cosBack - p2Rot.y * sinBack,
    y: p2Rot.x * sinBack + p2Rot.y * cosBack,
  };

  const wp1: Waypoint = {
    id: idOffset,
    index: idOffset,
    lat: centerLat + p1Orig.y / metersPerDegLat,
    lng: centerLng + p1Orig.x / metersPerDegLng,
    alt: settings.flightAltitude,
    speed: settings.flightSpeed,
    heading: 0,
    gimbalPitch: settings.gimbalPitch,
    action: 'takePhoto',
    name: `Grade_WP_${idOffset + 1}`,
  };

  const wp2: Waypoint = {
    id: idOffset + 1,
    index: idOffset + 1,
    lat: centerLat + p2Orig.y / metersPerDegLat,
    lng: centerLng + p2Orig.x / metersPerDegLng,
    alt: settings.flightAltitude,
    speed: settings.flightSpeed,
    heading: Math.round(calculateBearing(wp1.lat, wp1.lng, centerLat + p2Orig.y / metersPerDegLat, centerLng + p2Orig.x / metersPerDegLng)),
    gimbalPitch: settings.gimbalPitch,
    action: 'takePhoto',
    name: `Grade_WP_${idOffset + 2}`,
  };

  return [wp1, wp2];
}
