export type DroneModelKey =
  | 'mavic3e'
  | 'mavic3t'
  | 'mavic3m'
  | 'matrice30'
  | 'matrice300'
  | 'matrice350'
  | 'p4rtk'
  | 'mini4pro'
  | 'mini3pro'
  | 'air3'
  | 'custom';

export interface DronePreset {
  key: DroneModelKey;
  name: string;
  category: 'Enterprise' | 'Consumer / Pro' | 'Industrial';
  droneEnumValue: number;
  droneSubEnumValue: number;
  payloadEnumValue: number;
  payloadSubEnumValue: number;
  payloadPositionIndex: number;
  defaultSpeed: number; // m/s
  maxSpeed: number; // m/s
  sensorWidthMm: number;
  focalLengthMm: number;
  imageWidthPx: number;
  imageHeightPx: number;
  description: string;
}

export interface Waypoint {
  id: number;
  index: number;
  lat: number;
  lng: number;
  alt: number; // meters
  speed?: number; // m/s
  heading?: number; // degrees 0-360
  gimbalPitch?: number; // degrees (-90 to 0)
  action?: 'takePhoto' | 'startRecord' | 'stopRecord' | 'hover' | 'none';
  hoverSeconds?: number;
  name?: string;
  description?: string;
}

export type GeometryType = 'Point' | 'LineString' | 'Polygon' | 'MultiGeometry';

export interface ParsedGeometry {
  id: string;
  name: string;
  type: GeometryType;
  description?: string;
  coordinates: { lat: number; lng: number; alt?: number }[];
  rings?: { lat: number; lng: number; alt?: number }[][]; // For polygons (outer ring + holes)
}

export interface MissionSettings {
  missionName: string;
  dronePresetKey: DroneModelKey;
  customDroneName?: string;
  altitudeMode: 'relativeToStartPoint' | 'WGS84' | 'realTimeFollowSurface';
  flightAltitude: number; // meters
  flightSpeed: number; // m/s
  maxFlightSpeed: number; // m/s
  takeoffSecurityHeight: number; // meters
  finishAction: 'goHome' | 'noAction' | 'autoLand' | 'gotoFirstWaypoint';
  exitOnRCLost: 'executeLostAction' | 'goContinue';
  executeRCLostAction: 'goBack' | 'landing' | 'hover';
  headingMode: 'followWayline' | 'manually' | 'fixed' | 'smoothTransition';
  fixedHeadingAngle: number;
  gimbalPitch: number; // -90 nadir, -45 oblique, 0 horizon
  turnMode: 'toPointAndStopWithDiscontinuityCurvature' | 'toPointAndPassWithContinuityCurvature' | 'coordinateTurn';
  actionOnWaypoint: 'takePhoto' | 'startRecord' | 'stopRecord' | 'hover' | 'none';
  hoverSeconds: number;
  
  // Grid/Mapping parameters
  isGridGenerated: boolean;
  gridAngle: number; // degrees 0-360
  gridSpacing: number; // meters
  frontOverlap: number; // %
  sideOverlap: number; // %
  margin: number; // meters
  photoIntervalDist: number; // meters between photos
}

export interface MissionSummary {
  totalDistanceMeters: number;
  estimatedFlightSeconds: number;
  waypointCount: number;
  estimatedPhotos: number;
  estimatedBatteries: number;
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
    centerLat: number;
    centerLng: number;
  };
}
