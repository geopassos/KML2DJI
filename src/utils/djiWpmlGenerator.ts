import JSZip from 'jszip';
import { Waypoint, MissionSettings } from '../types';
import { DRONE_PRESETS } from './presets';

/**
 * Generates DJI Pilot 2 WPML Template XML (template.kml)
 */
export function generateWpmlTemplateKml(waypoints: Waypoint[], settings: MissionSettings): string {
  const preset = DRONE_PRESETS[settings.dronePresetKey] || DRONE_PRESETS.mavic3e;
  const now = Date.now();
  const missionName = settings.missionName.replace(/[^\w\s-]/g, '_') || 'Missao_DJI';

  let placemarksXml = '';

  waypoints.forEach((wp, idx) => {
    const headingMode = settings.headingMode === 'fixed' ? 'smoothTransition' : settings.headingMode;
    const headingAngle = settings.headingMode === 'fixed' ? settings.fixedHeadingAngle : (wp.heading || 0);

    // Build Action Group if actions are specified
    let actionGroupXml = '';
    const actions: string[] = [];
    let actionId = 0;

    // Gimbal Pitch Action
    if (wp.gimbalPitch !== undefined || settings.gimbalPitch !== undefined) {
      const pitch = wp.gimbalPitch !== undefined ? wp.gimbalPitch : settings.gimbalPitch;
      actions.push(`
          <wpml:action>
            <wpml:actionId>${actionId++}</wpml:actionId>
            <wpml:actionActuatorFunc>gimbalPitch</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:gimbalPitchRotateAngle>${pitch}</wpml:gimbalPitchRotateAngle>
            </wpml:actionActuatorFuncParam>
          </wpml:action>`);
    }

    // Photo or Hover Action
    if (wp.action === 'takePhoto' || settings.actionOnWaypoint === 'takePhoto') {
      actions.push(`
          <wpml:action>
            <wpml:actionId>${actionId++}</wpml:actionId>
            <wpml:actionActuatorFunc>takePhoto</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
              <wpml:fileSuffix>WP_${idx + 1}</wpml:fileSuffix>
            </wpml:actionActuatorFuncParam>
          </wpml:action>`);
    } else if (wp.action === 'hover' || settings.actionOnWaypoint === 'hover') {
      const hoverSec = wp.hoverSeconds || settings.hoverSeconds || 2;
      actions.push(`
          <wpml:action>
            <wpml:actionId>${actionId++}</wpml:actionId>
            <wpml:actionActuatorFunc>hover</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:hoverTime>${hoverSec}</wpml:hoverTime>
            </wpml:actionActuatorFuncParam>
          </wpml:action>`);
    }

    if (actions.length > 0) {
      actionGroupXml = `
        <wpml:actionGroup>
          <wpml:actionGroupId>${idx}</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>${idx}</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>${idx}</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>sequence</wpml:actionGroupMode>
          <wpml:actionTrigger>
            <wpml:actionTriggerType>reachPoint</wpml:actionTriggerType>
          </wpml:actionTrigger>
          ${actions.join('')}
        </wpml:actionGroup>`;
    }

    placemarksXml += `
      <Placemark>
        <Point>
          <coordinates>${wp.lng.toFixed(7)},${wp.lat.toFixed(7)}</coordinates>
        </Point>
        <wpml:index>${idx}</wpml:index>
        <wpml:executeHeight>${wp.alt || settings.flightAltitude}</wpml:executeHeight>
        <wpml:waypointSpeed>${wp.speed || settings.flightSpeed}</wpml:waypointSpeed>
        <wpml:waypointHeadingParam>
          <wpml:waypointHeadingMode>${headingMode}</wpml:waypointHeadingMode>
          <wpml:waypointHeadingAngle>${headingAngle}</wpml:waypointHeadingAngle>
          <wpml:waypointPoiPoint>0.000000,0.000000,0.000000</wpml:waypointPoiPoint>
          <wpml:waypointHeadingAngleEnable>1</wpml:waypointHeadingAngleEnable>
        </wpml:waypointHeadingParam>
        <wpml:waypointTurnParam>
          <wpml:waypointTurnMode>${settings.turnMode}</wpml:waypointTurnMode>
          <wpml:waypointTurnDampingDist>0</wpml:waypointTurnDampingDist>
        </wpml:waypointTurnParam>
        <wpml:useStraightLine>1</wpml:useStraightLine>${actionGroupXml}
      </Placemark>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.dji.com/wpmz/1.0.3">
  <Document>
    <name>${missionName}</name>
    <wpml:author>Conversor DJI Drone</wpml:author>
    <wpml:createTime>${now}</wpml:createTime>
    <wpml:updateTime>${now}</wpml:updateTime>
    <wpml:missionConfig>
      <wpml:flyToWaylineMode>safely</wpml:flyToWaylineMode>
      <wpml:finishAction>${settings.finishAction}</wpml:finishAction>
      <wpml:exitOnRCLost>${settings.exitOnRCLost}</wpml:exitOnRCLost>
      <wpml:executeRCLostAction>${settings.executeRCLostAction}</wpml:executeRCLostAction>
      <wpml:takeOffSecurityHeight>${settings.takeoffSecurityHeight}</wpml:takeOffSecurityHeight>
      <wpml:globalTransitionalSpeed>${settings.flightSpeed}</wpml:globalTransitionalSpeed>
      <wpml:droneInfo>
        <wpml:droneEnumValue>${preset.droneEnumValue}</wpml:droneEnumValue>
        <wpml:droneSubEnumValue>${preset.droneSubEnumValue}</wpml:droneSubEnumValue>
      </wpml:droneInfo>
      <wpml:payloadInfo>
        <wpml:payloadEnumValue>${preset.payloadEnumValue}</wpml:payloadEnumValue>
        <wpml:payloadSubEnumValue>${preset.payloadSubEnumValue}</wpml:payloadSubEnumValue>
        <wpml:payloadPositionIndex>${preset.payloadPositionIndex}</wpml:payloadPositionIndex>
      </wpml:payloadInfo>
    </wpml:missionConfig>
    <Folder>
      <wpml:templateType>waypoint</wpml:templateType>
      <wpml:templateId>0</wpml:templateId>
      <wpml:autoFlightSpeed>${settings.flightSpeed}</wpml:autoFlightSpeed>
      <wpml:waylineCoordinateSysParam>
        <wpml:coordinateMode>WGS84</wpml:coordinateMode>
        <wpml:heightMode>${settings.altitudeMode}</wpml:heightMode>
        <wpml:positioningType>GPS</wpml:positioningType>
      </wpml:waylineCoordinateSysParam>${placemarksXml}
    </Folder>
  </Document>
</kml>`;
}

/**
 * Generates DJI Pilot 2 Waylines XML (waylines.wpml)
 */
export function generateWpmlWaylines(waypoints: Waypoint[], settings: MissionSettings): string {
  const preset = DRONE_PRESETS[settings.dronePresetKey] || DRONE_PRESETS.mavic3e;
  let pointsXml = '';

  waypoints.forEach((wp, idx) => {
    const headingMode = settings.headingMode === 'fixed' ? 'smoothTransition' : settings.headingMode;
    const headingAngle = settings.headingMode === 'fixed' ? settings.fixedHeadingAngle : (wp.heading || 0);

    let actionGroupXml = '';
    const actions: string[] = [];
    let actionId = 0;

    if (wp.gimbalPitch !== undefined || settings.gimbalPitch !== undefined) {
      const pitch = wp.gimbalPitch !== undefined ? wp.gimbalPitch : settings.gimbalPitch;
      actions.push(`
          <wpml:action>
            <wpml:actionId>${actionId++}</wpml:actionId>
            <wpml:actionActuatorFunc>gimbalPitch</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:gimbalPitchRotateAngle>${pitch}</wpml:gimbalPitchRotateAngle>
            </wpml:actionActuatorFuncParam>
          </wpml:action>`);
    }

    if (wp.action === 'takePhoto' || settings.actionOnWaypoint === 'takePhoto') {
      actions.push(`
          <wpml:action>
            <wpml:actionId>${actionId++}</wpml:actionId>
            <wpml:actionActuatorFunc>takePhoto</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
              <wpml:fileSuffix>WP_${idx + 1}</wpml:fileSuffix>
            </wpml:actionActuatorFuncParam>
          </wpml:action>`);
    }

    if (actions.length > 0) {
      actionGroupXml = `
        <wpml:actionGroup>
          <wpml:actionGroupId>${idx}</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>${idx}</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>${idx}</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>sequence</wpml:actionGroupMode>
          <wpml:actionTrigger>
            <wpml:actionTriggerType>reachPoint</wpml:actionTriggerType>
          </wpml:actionTrigger>
          ${actions.join('')}
        </wpml:actionGroup>`;
    }

    pointsXml += `
      <Placemark>
        <Point>
          <coordinates>${wp.lng.toFixed(7)},${wp.lat.toFixed(7)}</coordinates>
        </Point>
        <wpml:index>${idx}</wpml:index>
        <wpml:executeHeight>${wp.alt || settings.flightAltitude}</wpml:executeHeight>
        <wpml:waypointSpeed>${wp.speed || settings.flightSpeed}</wpml:waypointSpeed>
        <wpml:waypointHeadingParam>
          <wpml:waypointHeadingMode>${headingMode}</wpml:waypointHeadingMode>
          <wpml:waypointHeadingAngle>${headingAngle}</wpml:waypointHeadingAngle>
          <wpml:waypointPoiPoint>0.000000,0.000000,0.000000</wpml:waypointPoiPoint>
          <wpml:waypointHeadingAngleEnable>1</wpml:waypointHeadingAngleEnable>
        </wpml:waypointHeadingParam>
        <wpml:waypointTurnParam>
          <wpml:waypointTurnMode>${settings.turnMode}</wpml:waypointTurnMode>
          <wpml:waypointTurnDampingDist>0</wpml:waypointTurnDampingDist>
        </wpml:waypointTurnParam>
        <wpml:useStraightLine>1</wpml:useStraightLine>${actionGroupXml}
      </Placemark>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.dji.com/wpmz/1.0.3">
  <Document>
    <wpml:missionConfig>
      <wpml:flyToWaylineMode>safely</wpml:flyToWaylineMode>
      <wpml:finishAction>${settings.finishAction}</wpml:finishAction>
      <wpml:exitOnRCLost>${settings.exitOnRCLost}</wpml:exitOnRCLost>
      <wpml:executeRCLostAction>${settings.executeRCLostAction}</wpml:executeRCLostAction>
      <wpml:takeOffSecurityHeight>${settings.takeoffSecurityHeight}</wpml:takeOffSecurityHeight>
      <wpml:globalTransitionalSpeed>${settings.flightSpeed}</wpml:globalTransitionalSpeed>
      <wpml:droneInfo>
        <wpml:droneEnumValue>${preset.droneEnumValue}</wpml:droneEnumValue>
        <wpml:droneSubEnumValue>${preset.droneSubEnumValue}</wpml:droneSubEnumValue>
      </wpml:droneInfo>
      <wpml:payloadInfo>
        <wpml:payloadEnumValue>${preset.payloadEnumValue}</wpml:payloadEnumValue>
        <wpml:payloadSubEnumValue>${preset.payloadSubEnumValue}</wpml:payloadSubEnumValue>
        <wpml:payloadPositionIndex>${preset.payloadPositionIndex}</wpml:payloadPositionIndex>
      </wpml:payloadInfo>
    </wpml:missionConfig>
    <Folder>
      <wpml:templateId>0</wpml:templateId>
      <wpml:waylineId>0</wpml:waylineId>
      <wpml:autoFlightSpeed>${settings.flightSpeed}</wpml:autoFlightSpeed>
      <wpml:waylineCoordinateSysParam>
        <wpml:coordinateMode>WGS84</wpml:coordinateMode>
        <wpml:heightMode>${settings.altitudeMode}</wpml:heightMode>
        <wpml:positioningType>GPS</wpml:positioningType>
      </wpml:waylineCoordinateSysParam>${pointsXml}
    </Folder>
  </Document>
</kml>`;
}

/**
 * Creates DJI Pilot 2 ready .kmz zip blob containing wpmz/template.kml and wpmz/waylines.wpml
 */
export async function generateDjiWpmlKmzBlob(waypoints: Waypoint[], settings: MissionSettings): Promise<Blob> {
  const templateKml = generateWpmlTemplateKml(waypoints, settings);
  const waylinesWpml = generateWpmlWaylines(waypoints, settings);

  const zip = new JSZip();
  const wpmzFolder = zip.folder('wpmz');
  if (wpmzFolder) {
    wpmzFolder.file('template.kml', templateKml);
    wpmzFolder.file('waylines.wpml', waylinesWpml);
  } else {
    zip.file('template.kml', templateKml);
    zip.file('waylines.wpml', waylinesWpml);
  }

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.google-earth.kmz',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
}

/**
 * Generates DJI Standard KML compatible with DJI Pilot 1, DJI Terra, and Google Earth
 */
export function generateDjiStandardKml(waypoints: Waypoint[], settings: MissionSettings): string {
  const missionName = settings.missionName.replace(/[^\w\s-]/g, '_') || 'Missao_DJI';

  let placemarksXml = '';
  const lineCoords = waypoints.map(w => `${w.lng.toFixed(7)},${w.lat.toFixed(7)},${w.alt || settings.flightAltitude}`).join(' ');

  waypoints.forEach((wp, idx) => {
    placemarksXml += `
      <Placemark id="waypoint_${idx}">
        <name>WP ${idx + 1}</name>
        <description>Ponto de Voo ${idx + 1} | Alt: ${wp.alt || settings.flightAltitude}m | Vel: ${wp.speed || settings.flightSpeed}m/s</description>
        <ExtendedData>
          <Data name="waypointIndex">
            <value>${idx}</value>
          </Data>
          <Data name="altitude">
            <value>${wp.alt || settings.flightAltitude}</value>
          </Data>
          <Data name="speed">
            <value>${wp.speed || settings.flightSpeed}</value>
          </Data>
          <Data name="heading">
            <value>${wp.heading || 0}</value>
          </Data>
          <Data name="gimbalPitch">
            <value>${wp.gimbalPitch ?? settings.gimbalPitch}</value>
          </Data>
          <Data name="action">
            <value>${wp.action || 'takePhoto'}</value>
          </Data>
        </ExtendedData>
        <Point>
          <altitudeMode>relativeToGround</altitudeMode>
          <coordinates>${wp.lng.toFixed(7)},${wp.lat.toFixed(7)},${wp.alt || settings.flightAltitude}</coordinates>
        </Point>
      </Placemark>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${missionName}</name>
    <description>Plano de voo gerado para DJI Drones</description>
    <Style id="flightPathStyle">
      <LineStyle>
        <color>ff00ffff</color>
        <width>4</width>
      </LineStyle>
      <PolyStyle>
        <color>4400ffff</color>
      </PolyStyle>
    </Style>
    <Folder>
      <name>Trajetoria de Voo</name>
      <Placemark>
        <name>Linha de Voo DJI</name>
        <styleUrl>#flightPathStyle</styleUrl>
        <LineString>
          <extrude>1</extrude>
          <tessellate>1</tessellate>
          <altitudeMode>relativeToGround</altitudeMode>
          <coordinates>${lineCoords}</coordinates>
        </LineString>
      </Placemark>
    </Folder>
    <Folder>
      <name>Waypoints DJI</name>${placemarksXml}
    </Folder>
  </Document>
</kml>`;
}

/**
 * Generates Litchi / Universal Drone CSV format
 */
export function generateLitchiCsv(waypoints: Waypoint[], settings: MissionSettings): string {
  const headers = [
    'latitude',
    'longitude',
    'altitude(m)',
    'heading(deg)',
    'curvesize(m)',
    'rotationdir',
    'gimbalmode',
    'gimbalpitchangle',
    'actiontype1',
    'actionparam1',
    'actiontype2',
    'actionparam2',
    'altitudemode',
    'speed(m/s)',
    'poi_latitude',
    'poi_longitude',
    'poi_altitude(m)',
    'poi_altitudemode',
    'photo_timeinterval',
    'photo_distinterval',
  ];

  const rows = waypoints.map((wp) => {
    const lat = wp.lat.toFixed(7);
    const lng = wp.lng.toFixed(7);
    const alt = wp.alt || settings.flightAltitude;
    const heading = wp.heading || 0;
    const curvesize = '0';
    const rotationdir = '0'; // 0 = clockwise, 1 = counter-clockwise
    const gimbalmode = '0'; // 0 = disabled, 1 = focus poi, 2 = interpolate
    const gimbalpitch = wp.gimbalPitch ?? settings.gimbalPitch;
    const actiontype1 = wp.action === 'takePhoto' ? '1' : (wp.action === 'hover' ? '0' : '-1');
    const actionparam1 = wp.action === 'hover' ? `${(wp.hoverSeconds || 2) * 1000}` : '0';
    const actiontype2 = '-1';
    const actionparam2 = '0';
    const altitudemode = '0'; // 0 = relative to takeoff
    const speed = (wp.speed || settings.flightSpeed).toFixed(1);

    return [
      lat,
      lng,
      alt,
      heading,
      curvesize,
      rotationdir,
      gimbalmode,
      gimbalpitch,
      actiontype1,
      actionparam1,
      actiontype2,
      actionparam2,
      altitudemode,
      speed,
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
