import JSZip from 'jszip';
import { ParsedGeometry, MissionSettings } from '../types';
import { generatePhotogrammetryGrid } from './gridGenerator';
import { generateDjiWpmlKmzBlob } from './djiWpmlGenerator';

/**
 * Ensures coordinate coordinates list for a polygon is strictly closed (first point equals last point)
 */
export function ensureClosedCoordinates(coords: { lat: number; lng: number; alt?: number }[]) {
  if (coords.length < 3) return coords;
  const first = coords[0];
  const last = coords[coords.length - 1];

  const isClosed =
    Math.abs(first.lat - last.lat) < 0.0000001 &&
    Math.abs(first.lng - last.lng) < 0.0000001;

  if (!isClosed) {
    return [...coords, { lat: first.lat, lng: first.lng, alt: first.alt }];
  }
  return coords;
}

/**
 * Formats coordinates for standard clean KML (lng,lat,alt)
 */
export function formatCoordinatesForKml(
  coords: { lat: number; lng: number; alt?: number }[],
  defaultAlt: number = 0
): string {
  return coords
    .map((c) => `${c.lng.toFixed(7)},${c.lat.toFixed(7)},${(c.alt ?? defaultAlt).toFixed(1)}`)
    .join(' ');
}

/**
 * Sanitizes and purges an individual geometry, generating a MINIMAL, clean KML without
 * any Style, StyleMap, ExtendedData, Schema, or MultiGeometry bloat.
 * 
 * Target structure for DJI and Google Earth:
 * <Document>
 *   <Placemark>
 *     <name>MURIÇI</name>
 *     <Polygon>
 *       <outerBoundaryIs>
 *         <LinearRing>
 *           <coordinates>...</coordinates>
 *         </LinearRing>
 *       </outerBoundaryIs>
 *     </Polygon>
 *   </Placemark>
 * </Document>
 */
export function generateMinimalPurgedKml(geom: ParsedGeometry, customDocName?: string): string {
  const safeName = (geom.name || 'ELEMENTO_DJI').replace(/[<>&"']/g, '').trim();
  const docName = (customDocName || `${safeName}_DJI`).replace(/[<>&"']/g, '').trim();

  let geometryXml = '';

  if (geom.type === 'Polygon') {
    const closedCoords = ensureClosedCoordinates(geom.coordinates);
    const coordsStr = formatCoordinatesForKml(closedCoords, 0);

    geometryXml = `      <Polygon>
        <extrude>0</extrude>
        <altitudeMode>clampToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              ${coordsStr}
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>`;
  } else if (geom.type === 'LineString') {
    const coordsStr = formatCoordinatesForKml(geom.coordinates, 0);
    geometryXml = `      <LineString>
        <extrude>0</extrude>
        <altitudeMode>clampToGround</altitudeMode>
        <coordinates>
          ${coordsStr}
        </coordinates>
      </LineString>`;
  } else {
    const pt = geom.coordinates[0] || { lat: 0, lng: 0, alt: 0 };
    geometryXml = `      <Point>
        <coordinates>${pt.lng.toFixed(7)},${pt.lat.toFixed(7)},${(pt.alt ?? 0).toFixed(1)}</coordinates>
      </Point>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${docName}</name>
    <Placemark>
      <name>${safeName}</name>
${geometryXml}
    </Placemark>
  </Document>
</kml>`.trim();
}

/**
 * Creates a ZIP file containing minimal purged .kml files for all geometries in the list.
 */
export async function generateAllPurgedKmlZip(
  geometries: ParsedGeometry[],
  basePrefix: string = 'BAIRROS_PURGED'
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder('KML_PURGADOS_DJI') || zip;

  geometries.forEach((geom, idx) => {
    const safeName = (geom.name || `Elemento_${idx + 1}`)
      .replace(/[^\w\s-]/g, '_')
      .trim();
    const kmlContent = generateMinimalPurgedKml(geom);
    folder.file(`${safeName}_DJI.kml`, kmlContent);
  });

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Creates a ZIP file containing ready-to-fly DJI WPML .kmz missions for every individual polygon/neighborhood.
 */
export async function generateBatchWpmlKmzZip(
  geometries: ParsedGeometry[],
  baseSettings: MissionSettings
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder('MISSOES_DJI_PILOT2_KMZ') || zip;

  for (const [idx, geom] of geometries.entries()) {
    const safeName = (geom.name || `Missao_${idx + 1}`)
      .replace(/[^\w\s-]/g, '_')
      .trim();

    const neighborhoodSettings: MissionSettings = {
      ...baseSettings,
      missionName: safeName,
    };

    let missionWaypoints = [];
    if (geom.type === 'Polygon') {
      missionWaypoints = generatePhotogrammetryGrid(geom.coordinates, neighborhoodSettings);
    } else {
      missionWaypoints = geom.coordinates.map((c, i) => ({
        id: i,
        index: i,
        lat: c.lat,
        lng: c.lng,
        alt: neighborhoodSettings.flightAltitude,
        speed: neighborhoodSettings.flightSpeed,
        heading: 0,
        gimbalPitch: neighborhoodSettings.gimbalPitch,
        action: 'takePhoto' as const,
        name: `${safeName}_WP${i + 1}`,
      }));
    }

    if (missionWaypoints.length > 0) {
      const kmzBlob = await generateDjiWpmlKmzBlob(missionWaypoints, neighborhoodSettings);
      folder.file(`${safeName}_WPML.kmz`, kmzBlob);
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}
