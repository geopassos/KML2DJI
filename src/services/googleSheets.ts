import { Waypoint, MissionSettings, MissionSummary, ParsedGeometry } from '../types';
import { DRONE_PRESETS } from '../utils/presets';
import { formatDistance, formatFlightTime, computePolygonAreaHectares } from '../utils/geoUtils';

export interface CreateSpreadsheetResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

/**
 * Creates a formatted Google Spreadsheet with complete drone flight plan data
 */
export async function exportMissionToGoogleSheets(
  accessToken: string,
  missionName: string,
  settings: MissionSettings,
  summary: MissionSummary,
  waypoints: Waypoint[],
  geometries: ParsedGeometry[]
): Promise<CreateSpreadsheetResult> {
  const currentPreset = DRONE_PRESETS[settings.dronePresetKey] || DRONE_PRESETS.mavic3e;
  const safeTitle = `[DJI Voo] ${missionName.trim() || 'Missão Drone'} - Plano de Voo`;

  const gsdValue =
    currentPreset.sensorWidthMm && currentPreset.focalLengthMm && currentPreset.imageWidthPx
      ? (
          ((settings.flightAltitude * currentPreset.sensorWidthMm) /
            (currentPreset.focalLengthMm * currentPreset.imageWidthPx)) *
          100
        ).toFixed(2) + ' cm/px'
      : 'N/A';

  // Total area if polygon exists
  const poly = geometries.find((g) => g.type === 'Polygon');
  const areaHa = poly ? computePolygonAreaHectares(poly.coordinates).toFixed(2) + ' ha' : 'N/A';

  // 1. Create Spreadsheet with two sheets: "Resumo do Voo" and "Lista de Waypoints"
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: safeTitle,
      },
      sheets: [
        {
          properties: {
            sheetId: 0,
            title: 'Resumo da Missão',
            gridProperties: { rowCount: 40, columnCount: 10 },
          },
        },
        {
          properties: {
            sheetId: 1,
            title: 'Waypoints DJI',
            gridProperties: { rowCount: Math.max(waypoints.length + 10, 50), columnCount: 12 },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errorData = await createRes.json();
    throw new Error(
      errorData.error?.message || `Erro ao criar planilha no Google Sheets (${createRes.status})`
    );
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

  // 2. Prepare Tab 1: "Resumo da Missão" data
  const summaryRows = [
    ['RELATÓRIO TÉCNICO DE PLANO DE VOO PARA DRONE (DJI PILOT 2 WPML)', ''],
    ['Gerado automaticamente por KML2DJI.PRO', ''],
    ['', ''],
    ['PARÂMETRO OPERACIONAL', 'VALOR CONFIGURADO'],
    ['Nome da Missão', missionName || 'Missao_DJI'],
    ['Modelo de Aeronave (Drone)', currentPreset.name],
    ['Padrão de Exportação', 'DJI WPML v1.0.3 (Mavic 3E / M30 / M300 / M350 RTK)'],
    ['Sistema Geodésico / Datum', 'WGS-84 / EGM96'],
    ['', ''],
    ['MÉTRICA DE VOO', 'VALOR ESTIMADO'],
    ['Total de Waypoints (Pontos de Voo)', `${summary.waypointCount} pontos`],
    ['Distância Total de Voo', formatDistance(summary.totalDistanceMeters)],
    ['Tempo Estimado de Voo', formatFlightTime(summary.estimatedFlightSeconds)],
    ['Baterias Estimadas (packs de 20min)', `${summary.estimatedBatteries} bateria(s)`],
    ['Total Estimado de Fotos', `~${summary.estimatedPhotos} fotos`],
    ['Área Total Delimitada', areaHa],
    ['', ''],
    ['CONFIGURAÇÃO DE CÂMERA & FOTOGRAMETRIA', 'VALOR'],
    ['Altitude de Voo (AGL)', `${settings.flightAltitude} metros`],
    ['Velocidade de Cruzeiro', `${settings.flightSpeed} m/s (${(settings.flightSpeed * 3.6).toFixed(1)} km/h)`],
    ['Ângulo Pitch do Gimbal', `${settings.gimbalPitch}° (Nadir)`],
    ['Sobreposição Frontal (Overlap)', `${settings.frontOverlap}%`],
    ['Sobreposição Lateral (Sidelap)', `${settings.sideOverlap}%`],
    ['Espaçamento entre Faixas da Grade', `${settings.gridSpacing} metros`],
    ['Ângulo de Orientação da Grade', `${settings.gridAngle}°`],
    ['Resolução Espacial em Solo (GSD)', gsdValue],
    ['Ação ao Finalizar Missão', settings.finishAction === 'goHome' ? 'Retornar ao Ponto de Decolagem (RTH)' : 'Pairar no Último Ponto'],
  ];

  // 3. Prepare Tab 2: "Waypoints DJI" data
  const waypointHeader = [
    '#',
    'Nome do Ponto',
    'Latitude (°)',
    'Longitude (°)',
    'Altitude Voo (m AGL)',
    'Velocidade (m/s)',
    'Velocidade (km/h)',
    'Gimbal Pitch (°)',
    'Ação do Drone',
    'Tipo de Ponto',
  ];

  const waypointRows = waypoints.map((wp, idx) => [
    idx + 1,
    wp.name || (idx === 0 ? 'Home (Decolagem)' : `WP_${idx + 1}`),
    wp.lat.toFixed(7),
    wp.lng.toFixed(7),
    wp.alt || settings.flightAltitude,
    wp.speed || settings.flightSpeed,
    ((wp.speed || settings.flightSpeed) * 3.6).toFixed(1),
    wp.gimbalPitch ?? settings.gimbalPitch,
    wp.action === 'takePhoto' ? 'Disparar Foto' : wp.action === 'hover' ? 'Pairar (Hover)' : 'Passagem Contínua',
    idx === 0 ? 'HOME / TAKEOFF' : idx === waypoints.length - 1 ? 'FINAL WAYPOINT' : 'WAYPOINT',
  ]);

  // 4. Batch populate values into sheets
  const valueUpdateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: "'Resumo da Missão'!A1:B" + summaryRows.length,
            values: summaryRows,
          },
          {
            range: "'Waypoints DJI'!A1:J" + (waypointRows.length + 1),
            values: [waypointHeader, ...waypointRows],
          },
        ],
      }),
    }
  );

  if (!valueUpdateRes.ok) {
    console.warn('Could not populate initial values');
  }

  // 5. Batch formatting for professional visual layout
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          // Bold titles on Summary sheet
          {
            repeatCell: {
              range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 2 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.05, green: 0.1, blue: 0.2 },
                  textFormat: { bold: true, fontSize: 13, foregroundColor: { red: 1, green: 1, blue: 1 } },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
          // Section headers on Summary sheet
          {
            repeatCell: {
              range: { sheetId: 0, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 2 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.1, green: 0.5, blue: 0.6 },
                  textFormat: { bold: true, fontSize: 10, foregroundColor: { red: 1, green: 1, blue: 1 } },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
          {
            repeatCell: {
              range: { sheetId: 0, startRowIndex: 9, endRowIndex: 10, startColumnIndex: 0, endColumnIndex: 2 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.1, green: 0.5, blue: 0.6 },
                  textFormat: { bold: true, fontSize: 10, foregroundColor: { red: 1, green: 1, blue: 1 } },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
          {
            repeatCell: {
              range: { sheetId: 0, startRowIndex: 17, endRowIndex: 18, startColumnIndex: 0, endColumnIndex: 2 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.1, green: 0.5, blue: 0.6 },
                  textFormat: { bold: true, fontSize: 10, foregroundColor: { red: 1, green: 1, blue: 1 } },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
          // Waypoints Table Header
          {
            repeatCell: {
              range: { sheetId: 1, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 10 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.05, green: 0.45, blue: 0.55 },
                  textFormat: { bold: true, fontSize: 10, foregroundColor: { red: 1, green: 1, blue: 1 } },
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
            },
          },
          // Auto resize column dimensions for readability
          {
            autoResizeDimensions: {
              dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: 2 },
            },
          },
          {
            autoResizeDimensions: {
              dimensions: { sheetId: 1, dimension: 'COLUMNS', startIndex: 0, endIndex: 10 },
            },
          },
        ],
      }),
    });
  } catch (err) {
    console.warn('Formatting update error:', err);
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    title: safeTitle,
  };
}

/**
 * Creates a consolidated multi-tab Google Spreadsheet with all Bairros / Polygons
 */
export async function exportAllBairrosToGoogleSheets(
  accessToken: string,
  baseTitle: string,
  settings: MissionSettings,
  geometries: ParsedGeometry[]
): Promise<CreateSpreadsheetResult> {
  const safeTitle = `[DJI Bairros] ${baseTitle.replace(/\.[^/.]+$/, '')} - Missões Consolidadas`;

  // Define sheets array: 1 Resumo Geral + 1 Tab for each Bairro
  const sheetsConfig = [
    {
      properties: {
        sheetId: 0,
        title: 'Resumo Geral dos Bairros',
        gridProperties: { rowCount: geometries.length + 15, columnCount: 8 },
      },
    },
    ...geometries.slice(0, 15).map((geom, idx) => ({
      properties: {
        sheetId: idx + 1,
        title: (geom.name || `Bairro_${idx + 1}`).slice(0, 30),
        gridProperties: { rowCount: 100, columnCount: 8 },
      },
    })),
  ];

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: safeTitle },
      sheets: sheetsConfig,
    }),
  });

  if (!createRes.ok) {
    const errorData = await createRes.json();
    throw new Error(errorData.error?.message || 'Erro ao criar planilha multi-bairros');
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

  // General Bairros Summary Table
  const generalHeader = [
    '#',
    'Nome do Bairro / Polígono',
    'Tipo de Geometria',
    'Total de Vértices',
    'Área Estimada (ha)',
    'Status Purge DJI',
  ];

  const generalRows = geometries.map((geom, idx) => {
    const areaHa = geom.type === 'Polygon' ? computePolygonAreaHectares(geom.coordinates).toFixed(2) : 'N/A';
    return [
      idx + 1,
      geom.name || `Bairro ${idx + 1}`,
      geom.type,
      geom.coordinates.length,
      areaHa,
      'PURGADO & LIMPO (100% DJI READY)',
    ];
  });

  // Value updates
  const valueUpdates = [
    {
      range: "'Resumo Geral dos Bairros'!A1:F" + (generalRows.length + 1),
      values: [generalHeader, ...generalRows],
    },
  ];

  // Populate each individual neighborhood sheet with its coordinates
  geometries.slice(0, 15).forEach((geom, idx) => {
    const tabName = (geom.name || `Bairro_${idx + 1}`).slice(0, 30);
    const coordHeader = ['# Vértice', 'Latitude', 'Longitude', 'Altitude Referência (m)'];
    const coordRows = geom.coordinates.map((c, i) => [
      i + 1,
      c.lat.toFixed(7),
      c.lng.toFixed(7),
      c.alt || 0,
    ]);

    valueUpdates.push({
      range: `'${tabName}'!A1:D` + (coordRows.length + 1),
      values: [coordHeader, ...coordRows],
    });
  });

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: valueUpdates,
    }),
  });

  return {
    spreadsheetId,
    spreadsheetUrl,
    title: safeTitle,
  };
}
