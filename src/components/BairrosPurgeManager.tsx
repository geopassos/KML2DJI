import React, { useState } from 'react';
import { ParsedGeometry, MissionSettings } from '../types';
import {
  generateMinimalPurgedKml,
  generateAllPurgedKmlZip,
  generateBatchWpmlKmzZip,
} from '../utils/kmlPurge';
import { computePolygonAreaHectares } from '../utils/geoUtils';
import {
  Sparkles,
  Layers,
  Download,
  CheckCircle2,
  FileCode,
  Search,
  FolderArchive,
  ArrowRight,
  Eye,
  Check,
  Copy,
  Scissors,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';

interface BairrosPurgeManagerProps {
  geometries: ParsedGeometry[];
  activeGeometryId: string | null;
  onSelectGeometry: (geom: ParsedGeometry) => void;
  onSelectAllGeometries: () => void;
  onOpenGoogleSheets?: () => void;
  settings: MissionSettings;
  fileName?: string;
}

export const BairrosPurgeManager: React.FC<BairrosPurgeManagerProps> = ({
  geometries,
  activeGeometryId,
  onSelectGeometry,
  onSelectAllGeometries,
  onOpenGoogleSheets,
  settings,
  fileName,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectGeom, setInspectGeom] = useState<ParsedGeometry | null>(null);
  const [copied, setCopied] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);

  if (geometries.length === 0) return null;

  // Filter geometries by search input
  const filteredGeometries = geometries.filter((g) =>
    (g.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Trigger individual cleaned KML download
  const handleDownloadSinglePurgedKml = (geom: ParsedGeometry) => {
    const kmlContent = generateMinimalPurgedKml(geom);
    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const safeName = (geom.name || 'ELEMENTO_DJI').replace(/[^\w\s-]/g, '_').trim();
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}_DJI.kml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download all cleaned KMLs in a single ZIP
  const handleDownloadAllPurgedZip = async () => {
    try {
      setIsExportingZip(true);
      const zipBlob = await generateAllPurgedKmlZip(geometries, fileName || 'BAIRROS_PURGED');
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(fileName || 'BAIRROS_SEDE').replace(/\.[^/.]+$/, '')}_KML_PURGADOS_DJI.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar pacote ZIP.');
    } finally {
      setIsExportingZip(false);
    }
  };

  // Download all ready-to-fly WPML KMZs in a single ZIP
  const handleDownloadAllKmzZip = async () => {
    try {
      setIsExportingZip(true);
      const zipBlob = await generateBatchWpmlKmzZip(geometries, settings);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(fileName || 'MISSOES_BAIRROS').replace(/\.[^/.]+$/, '')}_DJI_PILOT2_KMZ_LOTE.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar missões KMZ em lote.');
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleCopyInspectedCode = () => {
    if (!inspectGeom) return;
    const code = generateMinimalPurgedKml(inspectGeom);
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#111115] border border-[#ffffff10] rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header with Purge Explanation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ffffff08] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs uppercase tracking-widest text-white">
                Extrator & Purificador de Polígonos (Purge DJI)
              </h3>
              <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-cyan-500/40">
                {geometries.length} {geometries.length === 1 ? 'ELEMENTO' : 'BAIRROS/POLÍGONOS'}
              </span>
            </div>
            <p className="text-[11px] text-[#888899] mt-0.5">
              Elimina <code>Style</code>, <code>Schema</code>, <code>ExtendedData</code> e <code>MultiGeometry</code>, gerando o KML mínimo limpo aceito pelo drone.
            </p>
          </div>
        </div>

        {/* Global Batch Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {geometries.length > 1 && (
            <button
              id="btn-select-all-geoms"
              onClick={onSelectAllGeometries}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                activeGeometryId === null
                  ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                  : 'bg-[#181820] text-[#aaa] border-[#ffffff10] hover:text-white'
              }`}
              title="Mapear todo o arquivo completo junto"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Arquivo Completo</span>
            </button>
          )}

          {onOpenGoogleSheets && (
            <button
              id="btn-open-google-sheets-purge"
              onClick={onOpenGoogleSheets}
              className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 rounded-xl text-xs font-semibold border border-emerald-500/30 transition flex items-center gap-1.5"
              title="Exportar dados técnicos para Google Planilhas"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Google Planilhas</span>
            </button>
          )}

          <button
            id="btn-download-all-purged-zip"
            onClick={handleDownloadAllPurgedZip}
            disabled={isExportingZip}
            className="px-3 py-1.5 bg-[#181820] hover:bg-[#22222c] text-white rounded-xl text-xs font-semibold border border-[#ffffff10] transition flex items-center gap-1.5 disabled:opacity-50"
            title="Baixar ZIP com KML limpo de cada bairro separado"
          >
            <FolderArchive className="w-3.5 h-3.5 text-cyan-400" />
            <span>Todos KML (.ZIP)</span>
          </button>

          <button
            id="btn-download-all-kmz-zip"
            onClick={handleDownloadAllKmzZip}
            disabled={isExportingZip}
            className="px-3 py-1.5 bg-white hover:bg-cyan-400 text-black rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
            title="Baixar ZIP com KMZ Pilot 2 pronto de cada bairro"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Todos KMZ DJI (.ZIP)</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#666] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar bairro ou polígono específico (ex: MURIÇI, CENTRO, CANEQUINHO, LADEIRA)..."
          className="w-full bg-[#0a0a0c] border border-[#ffffff10] focus:border-cyan-500 text-xs text-white pl-10 pr-4 py-2.5 rounded-xl placeholder-[#555] focus:outline-none font-mono"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#666] hover:text-white"
          >
            &times;
          </button>
        )}
      </div>

      {/* Polygons / Bairros List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
        {filteredGeometries.map((geom, idx) => {
          const isActive = activeGeometryId === geom.id;
          const areaHa = geom.type === 'Polygon' ? computePolygonAreaHectares(geom.coordinates) : null;
          const isClosed =
            geom.type === 'Polygon' &&
            geom.coordinates.length >= 3 &&
            Math.abs(geom.coordinates[0].lat - geom.coordinates[geom.coordinates.length - 1].lat) < 0.00001;

          return (
            <div
              key={geom.id || idx}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-cyan-950/30 border-cyan-400 shadow-md ring-1 ring-cyan-500/50'
                  : 'bg-[#0a0a0c] border-[#ffffff0a] hover:border-[#ffffff20]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isActive ? 'bg-cyan-400 animate-pulse' : 'bg-[#444]'
                      }`}
                    />
                    <h4 className="font-bold text-sm text-white tracking-tight truncate max-w-[200px]">
                      {geom.name || `Bairro ${idx + 1}`}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-[#181820] text-[#aaa] px-2 py-0.5 rounded-md border border-[#ffffff08]">
                    {geom.type}
                  </span>
                </div>

                {/* Micro Stats */}
                <div className="flex items-center gap-3 text-[11px] font-mono text-[#888899] mb-3">
                  <span>{geom.coordinates.length} pts</span>
                  {areaHa !== null && (
                    <span className="text-cyan-400 font-semibold">{areaHa.toFixed(2)} ha</span>
                  )}
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Fechado</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons for this Specific Bairro */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#ffffff08]">
                <button
                  onClick={() => onSelectGeometry(geom)}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    isActive
                      ? 'bg-cyan-500 text-black font-bold'
                      : 'bg-[#181820] hover:bg-[#22222a] text-white'
                  }`}
                  title="Focar este bairro e gerar plano de voo"
                >
                  <span>{isActive ? 'Missão Ativa' : 'Focar & Mapear'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>

                <button
                  onClick={() => handleDownloadSinglePurgedKml(geom)}
                  className="p-1.5 bg-[#181820] hover:bg-[#22222a] text-cyan-400 hover:text-cyan-300 rounded-lg border border-[#ffffff08] transition"
                  title="Baixar KML mínimo purificado (sem Style/Schema)"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setInspectGeom(geom)}
                  className="p-1.5 bg-[#181820] hover:bg-[#22222a] text-[#888] hover:text-white rounded-lg border border-[#ffffff08] transition"
                  title="Inspecionar código XML limpo"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Code Inspector Modal for a Single Purged Bairro */}
      {inspectGeom && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#111115] border border-[#ffffff15] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#ffffff10] bg-[#0a0a0c]">
              <div className="flex items-center gap-2 font-mono text-xs text-white">
                <FileCode className="w-4 h-4 text-cyan-400" />
                <span>KML MÍNIMO PURGADO — {inspectGeom.name}</span>
              </div>
              <button
                onClick={() => setInspectGeom(null)}
                className="text-[#666] hover:text-white text-base"
              >
                &times;
              </button>
            </div>

            <div className="p-4 bg-[#0a0a0c] max-h-[320px] overflow-auto font-mono text-[11px] text-cyan-300">
              <pre className="whitespace-pre">{generateMinimalPurgedKml(inspectGeom)}</pre>
            </div>

            <div className="p-3.5 border-t border-[#ffffff10] bg-[#111115] flex justify-between items-center">
              <span className="text-[10px] text-[#666] font-mono">ESTRUTURA 100% LIMPA DJI</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyInspectedCode}
                  className="px-3 py-1.5 bg-[#181820] hover:bg-[#22222c] text-white text-xs font-semibold rounded-lg border border-[#ffffff10] flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3 h-3 text-cyan-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>
                <button
                  onClick={() => {
                    handleDownloadSinglePurgedKml(inspectGeom);
                    setInspectGeom(null);
                  }}
                  className="px-4 py-1.5 bg-white hover:bg-cyan-400 text-black text-xs font-bold rounded-lg flex items-center gap-1.5"
                >
                  <Download className="w-3 h-3" />
                  <span>Baixar .KML</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
