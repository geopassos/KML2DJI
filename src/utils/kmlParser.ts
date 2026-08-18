import JSZip from 'jszip';
import { ParsedGeometry, Waypoint, GeometryType } from '../types';

export interface ParseResult {
  fileName: string;
  missionName: string;
  geometries: ParsedGeometry[];
  waypoints: Waypoint[];
  rawKmlText: string;
  detectedType: 'points' | 'linestring' | 'polygon' | 'mixed';
}

/**
 * Parses coordinate string in KML standard format (lon,lat,alt lon,lat,alt ...)
 */
export function parseKmlCoordinates(coordString: string): { lat: number; lng: number; alt?: number }[] {
  if (!coordString) return [];
  
  const points: { lat: number; lng: number; alt?: number }[] = [];
  // Split by whitespace (spaces, tabs, newlines)
  const tokens = coordString.trim().split(/\s+/);

  for (const token of tokens) {
    if (!token.trim()) continue;
    const parts = token.split(',');
    if (parts.length >= 2) {
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      const alt = parts.length >= 3 && !isNaN(parseFloat(parts[2])) ? parseFloat(parts[2]) : undefined;

      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        points.push({ lat, lng, alt });
      }
    }
  }

  return points;
}

/**
 * Extracts raw KML string from either a .kml text or .kmz zip buffer
 */
export async function extractKmlText(file: File | Blob, fileName: string): Promise<string> {
  const isKmz = fileName.toLowerCase().endsWith('.kmz');

  if (isKmz) {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);
    
    // Look for doc.kml or any .kml file
    let kmlFile = zipContent.file('doc.kml') || zipContent.file('template.kml') || zipContent.file('wpmz/template.kml');
    
    if (!kmlFile) {
      // Find the first .kml file in the zip
      const kmlEntry = Object.keys(zipContent.files).find(name => name.toLowerCase().endsWith('.kml'));
      if (kmlEntry) {
        kmlFile = zipContent.file(kmlEntry);
      }
    }

    if (!kmlFile) {
      throw new Error('Não foi possível encontrar nenhum arquivo .kml dentro do arquivo KMZ.');
    }

    return await kmlFile.async('string');
  } else {
    return await file.text();
  }
}

/**
 * Parses XML/KML string into structured geometries and waypoints
 */
export function parseKmlContent(kmlText: string, defaultName: string = 'Missao_Drone'): ParseResult {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlText, 'text/xml');

  // Check for parser errors
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Erro ao processar o arquivo KML/XML: ' + parseError.textContent?.slice(0, 100));
  }

  // Extract Document/Folder name if available
  const docNameElement = xmlDoc.querySelector('Document > name, kml > Document > name, Folder > name');
  const missionName = docNameElement?.textContent?.trim() || defaultName.replace(/\.[^/.]+$/, '');

  const geometries: ParsedGeometry[] = [];
  const placemarks = xmlDoc.querySelectorAll('Placemark');

  let idCounter = 1;

  placemarks.forEach((placemark) => {
    const name = placemark.querySelector('name')?.textContent?.trim() || `Elemento ${idCounter}`;
    const description = placemark.querySelector('description')?.textContent?.trim() || '';

    // 1. Check for Polygons
    const polygons = placemark.querySelectorAll('Polygon');
    polygons.forEach((poly) => {
      const outerCoordNode = poly.querySelector('outerBoundaryIs coordinates, coordinates');
      if (outerCoordNode && outerCoordNode.textContent) {
        const coords = parseKmlCoordinates(outerCoordNode.textContent);
        if (coords.length >= 3) {
          geometries.push({
            id: `poly-${idCounter++}`,
            name,
            type: 'Polygon',
            description,
            coordinates: coords,
          });
        }
      }
    });

    // 2. Check for LineStrings
    const lineStrings = placemark.querySelectorAll('LineString');
    lineStrings.forEach((line) => {
      const coordNode = line.querySelector('coordinates');
      if (coordNode && coordNode.textContent) {
        const coords = parseKmlCoordinates(coordNode.textContent);
        if (coords.length >= 2) {
          geometries.push({
            id: `line-${idCounter++}`,
            name,
            type: 'LineString',
            description,
            coordinates: coords,
          });
        }
      }
    });

    // 3. Check for Points
    const points = placemark.querySelectorAll('Point');
    points.forEach((point) => {
      const coordNode = point.querySelector('coordinates');
      if (coordNode && coordNode.textContent) {
        const coords = parseKmlCoordinates(coordNode.textContent);
        if (coords.length >= 1) {
          geometries.push({
            id: `point-${idCounter++}`,
            name,
            type: 'Point',
            description,
            coordinates: coords,
          });
        }
      }
    });

    // 4. Check for MultiGeometry if not caught above
    if (polygons.length === 0 && lineStrings.length === 0 && points.length === 0) {
      const allCoords = placemark.querySelectorAll('coordinates');
      allCoords.forEach((coordNode) => {
        if (coordNode.textContent) {
          const coords = parseKmlCoordinates(coordNode.textContent);
          if (coords.length > 0) {
            let type: GeometryType = 'Point';
            if (coords.length >= 3) type = 'Polygon';
            else if (coords.length >= 2) type = 'LineString';

            geometries.push({
              id: `geom-${idCounter++}`,
              name,
              type,
              description,
              coordinates: coords,
            });
          }
        }
      });
    }
  });

  // Fallback: If no placemarks found, search all coordinates directly in Document
  if (geometries.length === 0) {
    const allCoords = xmlDoc.querySelectorAll('coordinates');
    allCoords.forEach((coordNode) => {
      if (coordNode.textContent) {
        const coords = parseKmlCoordinates(coordNode.textContent);
        if (coords.length > 0) {
          let type: GeometryType = 'Point';
          if (coords.length >= 3) type = 'Polygon';
          else if (coords.length >= 2) type = 'LineString';

          geometries.push({
            id: `fallback-${idCounter++}`,
            name: `Geometria ${idCounter}`,
            type,
            coordinates: coords,
          });
        }
      }
    });
  }

  // Determine detected type
  const polyCount = geometries.filter(g => g.type === 'Polygon').length;
  const lineCount = geometries.filter(g => g.type === 'LineString').length;
  const pointCount = geometries.filter(g => g.type === 'Point').length;

  let detectedType: 'points' | 'linestring' | 'polygon' | 'mixed' = 'points';
  if (polyCount > 0 && lineCount === 0 && pointCount === 0) detectedType = 'polygon';
  else if (lineCount > 0 && polyCount === 0 && pointCount === 0) detectedType = 'linestring';
  else if (pointCount > 0 && polyCount === 0 && lineCount === 0) detectedType = 'points';
  else if (geometries.length > 0) detectedType = 'mixed';

  // Build default waypoints list from geometries
  const waypoints: Waypoint[] = [];
  let wpIndex = 0;

  for (const geom of geometries) {
    // If it's a polygon, we take vertices or later user can click "Gerar Grade de Mapeamento"
    for (const coord of geom.coordinates) {
      waypoints.push({
        id: wpIndex,
        index: wpIndex,
        lat: coord.lat,
        lng: coord.lng,
        alt: coord.alt ?? 60, // default 60m if not specified in KML
        speed: 8,
        heading: 0,
        gimbalPitch: -90,
        action: 'takePhoto',
        name: geom.name ? `${geom.name} - Ponto ${wpIndex + 1}` : `WP_${wpIndex + 1}`,
      });
      wpIndex++;
    }
  }

  return {
    fileName: defaultName,
    missionName: missionName.replace(/[^\w\s-]/g, '_').trim() || 'Missao_DJI',
    geometries,
    waypoints,
    rawKmlText: kmlText,
    detectedType,
  };
}
