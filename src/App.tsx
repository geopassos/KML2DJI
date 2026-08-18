import React, { useState, useEffect } from 'react';
import {
  Waypoint,
  ParsedGeometry,
  MissionSettings,
  MissionSummary,
} from './types';
import { DEFAULT_MISSION_SETTINGS, DRONE_PRESETS } from './utils/presets';
import { extractKmlText, parseKmlContent, ParseResult } from './utils/kmlParser';
import { computeMissionSummary, formatDistance, formatFlightTime } from './utils/geoUtils';
import { generatePhotogrammetryGrid } from './utils/gridGenerator';
import { SAMPLE_DATASETS, SampleDataset } from './utils/sampleData';

import { MapViewer } from './components/MapViewer';
import { FlightConfigPanel } from './components/FlightConfigPanel';
import { WaypointList } from './components/WaypointList';
import { DropZone } from './components/DropZone';
import { ExportModal } from './components/ExportModal';
import { BairrosPurgeManager } from './components/BairrosPurgeManager';
import { GoogleSheetsExportModal } from './components/GoogleSheetsExportModal';

import {
  Plane,
  Upload,
  Download,
  Clock,
  Compass,
  MapPin,
  Camera,
  Battery,
  Sliders,
  ListOrdered,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Activity,
  FileCode,
  ArrowUpRight,
  Scissors,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<MissionSettings>(DEFAULT_MISSION_SETTINGS);
  const [geometries, setGeometries] = useState<ParsedGeometry[]>([]);
  const [activeGeometryId, setActiveGeometryId] = useState<string | null>(null);
  const [originalWaypoints, setOriginalWaypoints] = useState<Waypoint[]>([]);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [selectedWaypointId, setSelectedWaypointId] = useState<number | null>(null);
  
  const [activeLeftTab, setActiveLeftTab] = useState<'config' | 'waypoints' | 'bairros'>('config');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);
  const [isGridActive, setIsGridActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Compute Mission Stats
  const summary: MissionSummary = computeMissionSummary(waypoints, settings.flightSpeed);

  // Check if geometries contain any polygon
  const hasPolygons = geometries.some((g) => g.type === 'Polygon');

  // Load default multi-bairros sample on initial startup so user immediately sees MURIÇI, CENTRO, CANEQUINHO, LADEIRA in action!
  useEffect(() => {
    handleLoadSample(SAMPLE_DATASETS[0]);
  }, []);

  // Update settings handler
  const handleUpdateSettings = (newSettings: Partial<MissionSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      
      // If grid is currently active and user changes grid spacing or angle, recalculate grid live!
      if (
        isGridActive &&
        (newSettings.gridAngle !== undefined ||
          newSettings.gridSpacing !== undefined ||
          newSettings.flightAltitude !== undefined ||
          newSettings.gimbalPitch !== undefined)
      ) {
        // Target active geometry or first polygon
        const targetPoly = activeGeometryId
          ? geometries.find((g) => g.id === activeGeometryId && g.type === 'Polygon')
          : geometries.find((g) => g.type === 'Polygon');

        if (targetPoly) {
          const newGridWaypoints = generatePhotogrammetryGrid(targetPoly.coordinates, updated);
          setWaypoints(newGridWaypoints);
        }
      } else if (newSettings.flightAltitude !== undefined || newSettings.flightSpeed !== undefined) {
        // Sync default altitude/speed to waypoints
        setWaypoints((currentWps) =>
          currentWps.map((wp) => ({
            ...wp,
            alt: newSettings.flightAltitude !== undefined ? newSettings.flightAltitude : wp.alt,
            speed: newSettings.flightSpeed !== undefined ? newSettings.flightSpeed : wp.speed,
          }))
        );
      }
      return updated;
    });
  };

  // Process imported KML / KMZ file
  const handleFileLoaded = async (file: File | Blob, fileName: string) => {
    try {
      setIsLoading(true);
      setStatusMessage('Extraindo e processando dados KML/KMZ...');
      const kmlText = await extractKmlText(file, fileName);
      const parsed: ParseResult = parseKmlContent(kmlText, fileName);

      setUploadedFileName(fileName);
      setGeometries(parsed.geometries);
      setOriginalWaypoints(parsed.waypoints);
      setSettings((prev) => ({
        ...prev,
        missionName: parsed.missionName || prev.missionName,
      }));

      // Check if file has multiple polygons/placemarks
      if (parsed.geometries.length > 1) {
        const firstPoly = parsed.geometries.find((g) => g.type === 'Polygon') || parsed.geometries[0];
        setActiveGeometryId(firstPoly.id);
        
        if (firstPoly.type === 'Polygon') {
          const gridWps = generatePhotogrammetryGrid(firstPoly.coordinates, {
            ...settings,
            missionName: firstPoly.name,
          });
          setWaypoints(gridWps);
          setIsGridActive(true);
        }
        setActiveLeftTab('bairros');
        setStatusMessage(
          `Detectados ${parsed.geometries.length} bairros/polígonos! Selecionado: "${firstPoly.name}".`
        );
      } else if (parsed.geometries.length === 1) {
        const single = parsed.geometries[0];
        setActiveGeometryId(single.id);
        if (single.type === 'Polygon') {
          const gridWps = generatePhotogrammetryGrid(single.coordinates, {
            ...settings,
            missionName: single.name || parsed.missionName,
          });
          setWaypoints(gridWps);
          setIsGridActive(true);
        } else {
          setWaypoints(parsed.waypoints);
          setIsGridActive(false);
        }
        setStatusMessage(`Polígono único carregado com sucesso!`);
      } else {
        setWaypoints(parsed.waypoints);
        setIsGridActive(false);
        setStatusMessage(
          `Arquivo processado! ${parsed.waypoints.length} waypoints prontos para exportação.`
        );
      }

      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao processar arquivo: ' + (err.message || err));
    } finally {
      setIsLoading(false);
    }
  };

  // Load a sample dataset
  const handleLoadSample = (sample: SampleDataset) => {
    try {
      setIsLoading(true);
      const parsed = parseKmlContent(sample.kmlContent, sample.name);
      setUploadedFileName(sample.name);
      setGeometries(parsed.geometries);
      setOriginalWaypoints(parsed.waypoints);
      setSettings((prev) => ({
        ...prev,
        missionName: parsed.missionName,
      }));

      if (parsed.geometries.length > 1) {
        const first = parsed.geometries[0];
        setActiveGeometryId(first.id);
        if (first.type === 'Polygon') {
          const gridWps = generatePhotogrammetryGrid(first.coordinates, {
            ...settings,
            missionName: first.name,
          });
          setWaypoints(gridWps);
          setIsGridActive(true);
        }
      } else {
        const poly = parsed.geometries.find((g) => g.type === 'Polygon');
        if (poly && sample.recommendedMode === 'grid') {
          const gridWps = generatePhotogrammetryGrid(poly.coordinates, settings);
          setWaypoints(gridWps);
          setIsGridActive(true);
        } else {
          setWaypoints(parsed.waypoints);
          setIsGridActive(false);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Focus a specific Bairro / Geometry from the multi-polygon list
  const handleSelectSpecificGeometry = (geom: ParsedGeometry) => {
    setActiveGeometryId(geom.id);
    setSettings((prev) => ({
      ...prev,
      missionName: geom.name || prev.missionName,
    }));

    if (geom.type === 'Polygon') {
      const gridWps = generatePhotogrammetryGrid(geom.coordinates, {
        ...settings,
        missionName: geom.name,
      });
      setWaypoints(gridWps);
      setIsGridActive(true);
    } else {
      const wps: Waypoint[] = geom.coordinates.map((c, i) => ({
        id: i,
        index: i,
        lat: c.lat,
        lng: c.lng,
        alt: settings.flightAltitude,
        speed: settings.flightSpeed,
        heading: 0,
        gimbalPitch: settings.gimbalPitch,
        action: 'takePhoto',
        name: `${geom.name}_WP${i + 1}`,
      }));
      setWaypoints(wps);
      setIsGridActive(false);
    }

    setStatusMessage(`Bairro "${geom.name}" selecionado e plano de voo gerado.`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Focus all geometries as a single complete mission
  const handleSelectAllGeometries = () => {
    setActiveGeometryId(null);
    setSettings((prev) => ({
      ...prev,
      missionName: uploadedFileName?.replace(/\.[^/.]+$/, '') || 'Missao_Completa_DJI',
    }));

    const firstPoly = geometries.find((g) => g.type === 'Polygon');
    if (firstPoly) {
      const gridWps = generatePhotogrammetryGrid(firstPoly.coordinates, settings);
      setWaypoints(gridWps);
      setIsGridActive(true);
    } else {
      setWaypoints(originalWaypoints);
      setIsGridActive(false);
    }
    setStatusMessage(`Modo Arquivo Completo (Todos os Elementos) ativado.`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Manual Trigger: Generate Grid
  const handleGenerateGrid = () => {
    const poly = activeGeometryId
      ? geometries.find((g) => g.id === activeGeometryId && g.type === 'Polygon')
      : geometries.find((g) => g.type === 'Polygon');

    if (!poly) {
      alert('Nenhum polígono encontrado para gerar grade.');
      return;
    }
    const gridWps = generatePhotogrammetryGrid(poly.coordinates, settings);
    setWaypoints(gridWps);
    setIsGridActive(true);
  };

  // Reset to original perimeter waypoints
  const handleResetWaypoints = () => {
    setWaypoints(originalWaypoints);
    setIsGridActive(false);
  };

  const currentPreset = DRONE_PRESETS[settings.dronePresetKey] || DRONE_PRESETS.mavic3e;
  const gsdCmPerPx =
    currentPreset.sensorWidthMm && currentPreset.focalLengthMm && currentPreset.imageWidthPx
      ? (
          ((settings.flightAltitude * currentPreset.sensorWidthMm) /
            (currentPreset.focalLengthMm * currentPreset.imageWidthPx)) *
          100
        ).toFixed(2)
      : 'N/A';

  // Visible geometries for Map
  const displayGeometries = activeGeometryId
    ? geometries.filter((g) => g.id === activeGeometryId)
    : geometries;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-[#e0e0e0] flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Bento Header */}
      <header className="border-b border-[#ffffff15] bg-[#0a0a0c]/90 backdrop-blur-md sticky top-0 z-[1100]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tighter text-white">
                KML2DJI<span className="text-cyan-500">.PRO</span>
              </h1>
              <span className="bg-cyan-500/10 text-cyan-400 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                WPML PILOT 2
              </span>
            </div>
            <p className="text-[10px] text-[#888899] uppercase tracking-widest mt-0.5">
              Conversor de Missões para Drone • Purge KML • Relatórios Google Planilhas
            </p>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* System Status Indicators */}
            <div className="hidden sm:flex gap-4 text-[10px] font-mono border-r border-[#ffffff15] pr-4">
              <div className="flex flex-col items-end">
                <span className="text-[#555566]">API STATUS</span>
                <span className="text-green-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  ONLINE
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[#555566]">WPML ENGINE</span>
                <span className="text-white font-bold">V.2.4.0</span>
              </div>
            </div>

            {/* Google Sheets Export Button */}
            <button
              id="btn-open-google-sheets-header"
              onClick={() => setIsGoogleSheetsModalOpen(true)}
              disabled={waypoints.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs uppercase tracking-tight rounded-xl border border-emerald-500/40 shadow-md transition duration-200 disabled:opacity-30 cursor-pointer"
              title="Exportar relatório completo e waypoints para o Google Planilhas"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Google Planilhas</span>
            </button>

            {/* Quick Primary Action */}
            <button
              id="btn-open-export"
              onClick={() => setIsExportModalOpen(true)}
              disabled={waypoints.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-tight rounded-xl shadow-lg transition duration-200 disabled:opacity-30 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Plano (.kmz)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-4">
        {/* Notification / Status Banner if any */}
        {statusMessage && (
          <div className="bg-[#111115] border border-cyan-500/50 text-cyan-300 px-4 py-2.5 rounded-2xl text-xs flex items-center justify-between gap-2 shadow-lg animate-fadeIn font-mono">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-[#666] hover:text-white"
            >
              &times;
            </button>
          </div>
        )}

        {/* Bento Metrics Bar (6 tiles) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Bento Stat 1 */}
          <div className="bg-[#111115] border border-[#ffffff10] rounded-2xl p-4 shadow-sm hover:border-cyan-500/30 transition-all">
            <span className="block text-[10px] font-bold text-[#666677] uppercase tracking-widest">
              Waypoints
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold font-mono text-white">
                {summary.waypointCount}
              </span>
              <span className="text-[10px] font-mono text-[#555566]">PTS</span>
            </div>
          </div>

          {/* Bento Stat 2 */}
          <div className="bg-[#111115] border border-[#ffffff10] rounded-2xl p-4 shadow-sm hover:border-cyan-500/30 transition-all">
            <span className="block text-[10px] font-bold text-[#666677] uppercase tracking-widest">
              Distância Total
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold font-mono text-cyan-400">
                {formatDistance(summary.totalDistanceMeters)}
              </span>
            </div>
          </div>

          {/* Bento Stat 3 */}
          <div className="bg-[#111115] border border-[#ffffff10] rounded-2xl p-4 shadow-sm hover:border-cyan-500/30 transition-all">
            <span className="block text-[10px] font-bold text-[#666677] uppercase tracking-widest">
              Tempo Estimado
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold font-mono text-white">
                {formatFlightTime(summary.estimatedFlightSeconds)}
              </span>
            </div>
          </div>

          {/* Bento Stat 4 */}
          <div className="bg-[#111115] border border-[#ffffff10] rounded-2xl p-4 shadow-sm hover:border-cyan-500/30 transition-all">
            <span className="block text-[10px] font-bold text-[#666677] uppercase tracking-widest">
              Fotos Est.
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold font-mono text-white">
                ~{summary.estimatedPhotos}
              </span>
              <span className="text-[10px] font-mono text-[#555566]">IMGS</span>
            </div>
          </div>

          {/* Bento Stat 5 */}
          <div className="bg-[#111115] border border-[#ffffff10] rounded-2xl p-4 shadow-sm hover:border-cyan-500/30 transition-all">
            <span className="block text-[10px] font-bold text-[#666677] uppercase tracking-widest">
              Baterias (20m)
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold font-mono text-cyan-400">
                {summary.estimatedBatteries}
              </span>
              <span className="text-[10px] font-mono text-[#555566]">PACKS</span>
            </div>
          </div>

          {/* Bento Stat 6 */}
          <div className="bg-[#111115] border border-[#ffffff10] rounded-2xl p-4 shadow-sm hover:border-cyan-500/30 transition-all">
            <span className="block text-[10px] font-bold text-[#666677] uppercase tracking-widest">
              GSD Solo
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold font-mono text-white">
                {gsdCmPerPx}
              </span>
              <span className="text-[10px] font-mono text-[#555566]">CM/PX</span>
            </div>
          </div>
        </div>

        {/* Bento Dropzone Hero Box */}
        <DropZone
          onFileLoaded={handleFileLoaded}
          onLoadSample={handleLoadSample}
          isLoading={isLoading}
        />

        {/* Bairros / Polygons Purge Manager (When file contains geometries) */}
        {geometries.length > 0 && (
          <BairrosPurgeManager
            geometries={geometries}
            activeGeometryId={activeGeometryId}
            onSelectGeometry={handleSelectSpecificGeometry}
            onSelectAllGeometries={handleSelectAllGeometries}
            onOpenGoogleSheets={() => setIsGoogleSheetsModalOpen(true)}
            settings={settings}
            fileName={uploadedFileName || undefined}
          />
        )}

        {/* Core Bento 2-Column Working Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Config Panel & Waypoint List (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Panel Tab Switcher */}
            <div className="flex items-center bg-[#111115] border border-[#ffffff10] rounded-2xl p-1 text-xs">
              <button
                id="tab-btn-flight-config"
                onClick={() => setActiveLeftTab('config')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold transition ${
                  activeLeftTab === 'config'
                    ? 'bg-white text-black shadow-md'
                    : 'text-[#888899] hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Configurações DJI</span>
              </button>
              <button
                id="tab-btn-waypoint-table"
                onClick={() => setActiveLeftTab('waypoints')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold transition ${
                  activeLeftTab === 'waypoints'
                    ? 'bg-white text-black shadow-md'
                    : 'text-[#888899] hover:text-white'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>Waypoints ({waypoints.length})</span>
              </button>
            </div>

            {/* Active Tab Panel */}
            {activeLeftTab === 'config' ? (
              <FlightConfigPanel
                settings={settings}
                onChangeSettings={handleUpdateSettings}
                hasPolygons={hasPolygons}
                onGenerateGrid={handleGenerateGrid}
                onResetWaypoints={handleResetWaypoints}
                isGridActive={isGridActive}
              />
            ) : (
              <WaypointList
                waypoints={waypoints}
                onUpdateWaypoints={setWaypoints}
                selectedWaypointId={selectedWaypointId}
                onSelectWaypoint={setSelectedWaypointId}
                defaultAltitude={settings.flightAltitude}
              />
            )}
          </div>

          {/* Right Column: Interactive Map & 2D/3D Flight Plan View (7 cols) */}
          <div className="lg:col-span-7 flex flex-col min-h-[520px]">
            <MapViewer
              waypoints={waypoints}
              geometries={displayGeometries}
              selectedWaypointId={selectedWaypointId}
              onSelectWaypoint={setSelectedWaypointId}
              flightAltitude={settings.flightAltitude}
            />
          </div>
        </div>

        {/* Bento Mission Logs & Flight Telemetry Section */}
        <section className="bg-[#111115] border border-[#ffffff10] rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[10px] font-bold text-[#666677] uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Status da Missão & Integrações</span>
            </h3>
            <span className="text-[10px] text-cyan-500 font-mono">AUTOSYNC READY</span>
          </div>

          <div className="overflow-x-auto border border-[#ffffff08] rounded-xl bg-[#0a0a0c]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#111115] text-[#666] border-b border-[#ffffff08] text-[10px] uppercase">
                <tr>
                  <th className="p-3">Missão Ativa</th>
                  <th className="p-3">Modelo Drone</th>
                  <th className="p-3">Waypoints</th>
                  <th className="p-3">Altitude AGL</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ffffff05] text-[#888]">
                <tr>
                  <td className="p-3 text-white font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
                    {settings.missionName || uploadedFileName || 'Missao_DJI'}
                  </td>
                  <td className="p-3 text-[#ccc]">{currentPreset.name}</td>
                  <td className="p-3 text-cyan-400 font-bold">{waypoints.length} pts</td>
                  <td className="p-3 text-white">{settings.flightAltitude}m</td>
                  <td className="p-3">
                    <span className="text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded text-[10px] border border-green-500/20">
                      PRONTO PARA VOO
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-3">
                    <button
                      onClick={() => setIsGoogleSheetsModalOpen(true)}
                      className="text-emerald-400 hover:text-emerald-300 text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3 h-3" />
                      <span>Google Planilhas</span>
                    </button>
                    <button
                      onClick={() => setIsExportModalOpen(true)}
                      className="text-cyan-400 hover:text-white text-xs font-bold uppercase transition"
                    >
                      Exportar KMZ &gt;
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Export Modal (DJI KMZ / KML / CSV) */}
      <ExportModal
        waypoints={waypoints}
        settings={settings}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onOpenGoogleSheets={() => setIsGoogleSheetsModalOpen(true)}
      />

      {/* Google Sheets Export Modal */}
      <GoogleSheetsExportModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
        waypoints={waypoints}
        settings={settings}
        summary={summary}
        geometries={geometries}
        fileName={uploadedFileName || undefined}
      />

      {/* Bento Footer */}
      <footer className="border-t border-[#ffffff15] py-4 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center text-[10px] text-[#555566] font-mono gap-2">
          <div>© 2024 KML2DJI.PRO — INDUSTRIAL DRONE MISSION SUITE</div>
          <div className="flex items-center gap-4">
            <span>GOOGLE DRIVE & SHEETS CONNECTED</span>
            <span>COORD: WGS-84 / EGM96</span>
            <span className="text-cyan-500 font-semibold">PILOT 2 / TERRA / LITCHI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
