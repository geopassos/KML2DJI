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
  Search,
  Bell,
  Calendar,
  User,
  Home,
  Plus,
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
    <div className="min-h-screen bg-[#061316] text-[#e2edf0] flex flex-col md:flex-row font-sans selection:bg-[#00f59b] selection:text-black">
      {/* Floating Vertical Sidebar (Cockpit Style) */}
      <aside className="hidden md:flex flex-col items-center justify-between w-20 bg-[#092329] border border-[#143f47] rounded-3xl my-4 ml-4 py-6 px-2 shadow-2xl shrink-0 z-30">
        {/* Top Logo / Drone Glyph */}
        <div className="flex flex-col items-center gap-1 group cursor-pointer" title="FAST AIR! • KML2DJI">
          <div className="w-11 h-11 rounded-2xl bg-[#061518] border border-[#1b5059] flex items-center justify-center shadow-inner group-hover:border-[#00f59b] transition-all">
            <Plane className="w-6 h-6 text-[#00f59b] rotate-45 group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-[9px] font-black tracking-widest text-[#00f59b] uppercase">FAST AIR</span>
        </div>

        {/* Middle Navigation Icons */}
        <nav className="flex flex-col items-center gap-5 my-auto">
          {/* Dashboard / Home */}
          <button
            onClick={() => setActiveLeftTab('config')}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
              activeLeftTab === 'config'
                ? 'bg-[#00f59b]/15 text-[#00f59b] border border-[#00f59b]/40 shadow-[0_0_15px_rgba(0,245,155,0.25)]'
                : 'text-[#6f969d] hover:text-white hover:bg-[#0d3038]'
            }`}
            title="Dashboard de Voo"
          >
            <Home className="w-5 h-5" />
          </button>

          {/* Bairros / Polígonos */}
          <button
            onClick={() => setActiveLeftTab('bairros')}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all relative ${
              activeLeftTab === 'bairros'
                ? 'bg-[#00f59b]/15 text-[#00f59b] border border-[#00f59b]/40 shadow-[0_0_15px_rgba(0,245,155,0.25)]'
                : 'text-[#6f969d] hover:text-white hover:bg-[#0d3038]'
            }`}
            title="Bairros & Polígonos"
          >
            <Layers className="w-5 h-5" />
            {geometries.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#00f59b] text-black font-mono font-bold text-[9px] rounded-full flex items-center justify-center">
                {geometries.length}
              </span>
            )}
          </button>

          {/* Waypoints List */}
          <button
            onClick={() => setActiveLeftTab('waypoints')}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all relative ${
              activeLeftTab === 'waypoints'
                ? 'bg-[#00f59b]/15 text-[#00f59b] border border-[#00f59b]/40 shadow-[0_0_15px_rgba(0,245,155,0.25)]'
                : 'text-[#6f969d] hover:text-white hover:bg-[#0d3038]'
            }`}
            title="Tabela de Waypoints"
          >
            <ListOrdered className="w-5 h-5" />
            {waypoints.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 text-black font-mono font-bold text-[9px] rounded-full flex items-center justify-center">
                {waypoints.length}
              </span>
            )}
          </button>

          {/* Configurações DJI */}
          <button
            onClick={() => setActiveLeftTab('config')}
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-[#6f969d] hover:text-white hover:bg-[#0d3038] transition-all"
            title="Parâmetros DJI Pilot"
          >
            <Sliders className="w-5 h-5" />
          </button>

          {/* Relatório Google Planilhas */}
          <button
            onClick={() => setIsGoogleSheetsModalOpen(true)}
            disabled={waypoints.length === 0}
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all disabled:opacity-30"
            title="Relatório Google Planilhas"
          >
            <FileSpreadsheet className="w-5 h-5" />
          </button>
        </nav>

        {/* Bottom User / Operator Profile */}
        <div className="flex flex-col items-center gap-2 pt-2">
          <div className="relative cursor-pointer" title="Operador de Drone • Online">
            <div className="w-10 h-10 rounded-full bg-[#061518] border border-[#1b5059] flex items-center justify-center overflow-hidden">
              <User className="w-5 h-5 text-[#88b0b8]" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00f59b] border-2 border-[#092329] rounded-full animate-pulse"></span>
          </div>
        </div>
      </aside>

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Cockpit Top Header */}
        <header className="border-b border-[#143f47]/50 bg-[#061316]/90 backdrop-blur-md sticky top-0 z-[1100] px-4 sm:px-6 py-3.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
            {/* Title & Brand */}
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-1.5">
                    KML2DJI<span className="text-[#00f59b]">.PRO</span>
                  </h1>
                  <span className="bg-[#00f59b]/10 text-[#00f59b] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-[#00f59b]/30">
                    FAST AIR • WPML
                  </span>
                </div>
                <p className="text-[10px] text-[#6f969d] uppercase tracking-widest mt-0.5 hidden sm:block">
                  Cockpit de Missões para Drone • Purge KML • Relatórios Google Planilhas
                </p>
              </div>
            </div>

            {/* Top Search, Date and Actions */}
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              {/* Search Pill */}
              <div className="hidden lg:flex items-center gap-2 bg-[#092329] border border-[#143f47] rounded-full px-3.5 py-1.5 text-xs text-[#82aab2] focus-within:border-[#00f59b] transition-all">
                <Search className="w-3.5 h-3.5 text-[#6f969d]" />
                <input
                  type="text"
                  placeholder="Buscar waypoint, bairro..."
                  className="bg-transparent border-none outline-none text-xs text-white placeholder-[#6f969d] w-36 focus:w-48 transition-all font-sans"
                />
              </div>

              {/* Quick Date Pill */}
              <div className="hidden sm:flex items-center gap-1.5 bg-[#092329] border border-[#143f47] rounded-full px-3 py-1.5 text-[11px] font-mono text-[#82aab2]">
                <Calendar className="w-3.5 h-3.5 text-[#00f59b]" />
                <span>{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}</span>
              </div>

              {/* Google Sheets Export Button */}
              <button
                id="btn-open-google-sheets-header"
                onClick={() => setIsGoogleSheetsModalOpen(true)}
                disabled={waypoints.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 font-bold text-xs uppercase tracking-tight rounded-xl border border-emerald-500/35 shadow-sm transition duration-200 disabled:opacity-30 cursor-pointer"
                title="Exportar relatório completo e waypoints para o Google Planilhas"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Google Planilhas</span>
              </button>

              {/* Primary Action Button */}
              <button
                id="btn-open-export"
                onClick={() => setIsExportModalOpen(true)}
                disabled={waypoints.length === 0}
                className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-[#00f59b] hover:bg-[#00df8c] text-black font-extrabold text-xs uppercase tracking-tight rounded-xl shadow-[0_0_15px_rgba(0,245,155,0.3)] transition duration-200 disabled:opacity-30 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Exportar KMZ</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex-1 w-full space-y-4">
          {/* Notification / Status Banner if any */}
          {statusMessage && (
            <div className="bg-[#092329] border border-[#00f59b]/40 text-[#00f59b] px-4 py-2.5 rounded-2xl text-xs flex items-center justify-between gap-2 shadow-lg animate-fadeIn font-mono">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00f59b] shrink-0" />
                <span>{statusMessage}</span>
              </div>
              <button
                onClick={() => setStatusMessage(null)}
                className="text-[#6f969d] hover:text-white"
              >
                &times;
              </button>
            </div>
          )}

          {/* Cockpit Telemetry Metrics Bar (6 tiles) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Stat 1: Waypoints */}
            <div className="bg-[#091e23] border border-[#143f47] rounded-2xl p-4 shadow-sm hover:border-[#00f59b]/40 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#6f969d] uppercase tracking-widest">
                  Waypoints
                </span>
                <span className="w-2 h-2 rounded-full bg-[#00f59b] group-hover:scale-125 transition-transform" />
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-black font-mono text-white">
                  {summary.waypointCount}
                </span>
                <span className="text-[10px] font-mono text-[#6f969d]">PTS</span>
              </div>
            </div>

            {/* Stat 2: Distância Total */}
            <div className="bg-[#091e23] border border-[#143f47] rounded-2xl p-4 shadow-sm hover:border-[#00f59b]/40 transition-all group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#6f969d] uppercase tracking-widest">
                  Distância Total
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">ROTA</span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-bold font-mono text-cyan-400">
                  {formatDistance(summary.totalDistanceMeters)}
                </span>
              </div>
            </div>

            {/* Stat 3: Tempo Estimado */}
            <div className="bg-[#091e23] border border-[#143f47] rounded-2xl p-4 shadow-sm hover:border-[#00f59b]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#6f969d] uppercase tracking-widest">
                  Tempo Estimado
                </span>
                <Clock className="w-3 h-3 text-[#6f969d]" />
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-bold font-mono text-white">
                  {formatFlightTime(summary.estimatedFlightSeconds)}
                </span>
              </div>
            </div>

            {/* Stat 4: Fotos Est. */}
            <div className="bg-[#091e23] border border-[#143f47] rounded-2xl p-4 shadow-sm hover:border-[#00f59b]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#6f969d] uppercase tracking-widest">
                  Fotos Est.
                </span>
                <Camera className="w-3 h-3 text-[#6f969d]" />
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-bold font-mono text-white">
                  ~{summary.estimatedPhotos}
                </span>
                <span className="text-[10px] font-mono text-[#6f969d]">IMGS</span>
              </div>
            </div>

            {/* Stat 5: Baterias */}
            <div className="bg-[#091e23] border border-[#143f47] rounded-2xl p-4 shadow-sm hover:border-[#00f59b]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#6f969d] uppercase tracking-widest">
                  Baterias (20m)
                </span>
                <Battery className="w-3 h-3 text-[#00f59b]" />
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-bold font-mono text-[#00f59b]">
                  {summary.estimatedBatteries}
                </span>
                <span className="text-[10px] font-mono text-[#6f969d]">PACKS</span>
              </div>
            </div>

            {/* Stat 6: GSD Solo */}
            <div className="bg-[#091e23] border border-[#143f47] rounded-2xl p-4 shadow-sm hover:border-[#00f59b]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#6f969d] uppercase tracking-widest">
                  GSD Solo
                </span>
                <span className="text-[9px] bg-cyan-500/10 text-cyan-400 font-mono px-1 rounded">AGL</span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-bold font-mono text-white">
                  {gsdCmPerPx}
                </span>
                <span className="text-[10px] font-mono text-[#6f969d]">CM/PX</span>
              </div>
            </div>
          </div>

          {/* DropZone Hero Section */}
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

          {/* Core 2-Column Working Area */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Config Panel & Waypoint List (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Panel Tab Switcher */}
              <div className="flex items-center bg-[#092329] border border-[#143f47] rounded-2xl p-1 text-xs">
                <button
                  id="tab-btn-flight-config"
                  onClick={() => setActiveLeftTab('config')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold transition ${
                    activeLeftTab === 'config'
                      ? 'bg-[#00f59b] text-black shadow-md'
                      : 'text-[#7ca5ad] hover:text-white'
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
                      ? 'bg-[#00f59b] text-black shadow-md'
                      : 'text-[#7ca5ad] hover:text-white'
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

            {/* Right Column: Interactive Map & Flight Plan View (7 cols) */}
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

          {/* Mission Logs & Flight Telemetry Section */}
          <section className="bg-[#091e23] border border-[#143f47] rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[10px] font-bold text-[#6f969d] uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-[#00f59b]" />
                <span>Status da Missão & Integrações DJI</span>
              </h3>
              <span className="text-[10px] text-[#00f59b] font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00f59b] animate-pulse"></span>
                WPML AUTOSYNC READY
              </span>
            </div>

            <div className="overflow-x-auto border border-[#143f47]/50 rounded-xl bg-[#061518]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#092329] text-[#7ca5ad] border-b border-[#143f47]/50 text-[10px] uppercase">
                  <tr>
                    <th className="p-3">Missão Ativa</th>
                    <th className="p-3">Modelo Drone</th>
                    <th className="p-3">Waypoints</th>
                    <th className="p-3">Altitude AGL</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#143f47]/30 text-[#82aab2]">
                  <tr>
                    <td className="p-3 text-white font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00f59b] inline-block"></span>
                      {settings.missionName || uploadedFileName || 'Missao_DJI'}
                    </td>
                    <td className="p-3 text-[#cce2e5]">{currentPreset.name}</td>
                    <td className="p-3 text-cyan-400 font-bold">{waypoints.length} pts</td>
                    <td className="p-3 text-white">{settings.flightAltitude}m</td>
                    <td className="p-3">
                      <span className="text-[#00f59b] font-bold bg-[#00f59b]/10 px-2 py-0.5 rounded text-[10px] border border-[#00f59b]/25">
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
                        className="text-[#00f59b] hover:text-white text-xs font-bold uppercase transition cursor-pointer"
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

        {/* Cockpit Footer */}
        <footer className="border-t border-[#143f47]/50 py-4 px-6 mt-auto bg-[#061316]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center text-[10px] text-[#5e878e] font-mono gap-2">
            <div>© 2026 FAST AIR • KML2DJI.PRO — INDUSTRIAL DRONE MISSION COCKPIT</div>
            <div className="flex items-center gap-4">
              <span>GOOGLE DRIVE & SHEETS CONNECTED</span>
              <span>COORD: WGS-84 / EGM96</span>
              <span className="text-[#00f59b] font-semibold">PILOT 2 / TERRA / LITCHI</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
