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
    <div className="bg-[#091e23] border border-[#143f47] rounded-3xl p-5 shadow-sm space-y-4 text-[#e2edf0]">
      {/* Header with Purge Explanation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#143f47]/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#00f59b]/10 border border-[#00f59b]/30 flex items-center justify-center text-[#00f59b]">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs uppercase tracking-widest text-white">
                Extrator & Purificador de Polígonos (Purge DJI)
              </h3>
              <span className="bg-[#00f59b]/15 text-[#00f59b] text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-[#00f59b]/40">
                {geometries.length} {geometries.length === 1 ? 'ELEMENTO' : 'BAIRROS/POLÍGONOS'}
              </span>
            </div>
            <p className="text-[11px] text-[#7ca5ad] mt-0.5">
              Elimina <code className="text-[#00f59b]">Style</code>, <code className="text-[#00f59b]">Schema</code>, <code className="text-[#00f59b]">ExtendedData</code> e <code className="text-[#00f59b]">MultiGeometry</code>, gerando o KML mínimo limpo aceito pelo drone.
            </p>
          </div>
        </div>

        {/* Global Batch Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {geometries.length > 1 && (
            <button
              id="btn-select-all-geoms"
              onClick={onSelectAllGeometries}
              className={`px-3.5 py-2 rounded-2xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
                activeGeometryId === null
                  ? 'bg-[#00f59b] text-black border-[#00f59b] font-bold shadow-[0_0_12px_rgba(0,245,155,0.3)]'
                  : 'bg-[#061518] text-[#82aab2] border-[#143f47] hover:text-white hover:bg-[#0c262d]'
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
              className="px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 rounded-2xl text-xs font-semibold border border-emerald-500/35 transition flex items-center gap-1.5 cursor-pointer"
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
            className="px-3.5 py-2 bg-[#061518] hover:bg-[#0c262d] text-white rounded-2xl text-xs font-semibold border border-[#143f47] transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            title="Baixar ZIP com KML limpo de cada bairro separado"
          >
            <FolderArchive className="w-3.5 h-3.5 text-[#00f59b]" />
            <span>Todos KML (.ZIP)</span>
          </button>

          <button
            id="btn-download-all-kmz-zip"
            onClick={handleDownloadAllKmzZip}
            disabled={isExportingZip}
            className="px-4 py-2 bg-[#00f59b] hover:bg-[#00df8c] text-black rounded-2xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(0,245,155,0.25)]"
            title="Baixar ZIP com KMZ Pilot 2 pronto de cada bairro"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Todos KMZ DJI (.ZIP)</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#6f969d] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar bairro ou polígono específico (ex: MURIÇI, CENTRO, CANEQUINHO, LADEIRA)..."
          className="w-full bg-[#061518] border border-[#143f47] focus:border-[#00f59b] text-xs text-white pl-10 pr-4 py-2.5 rounded-2xl placeholder-[#5e878e] focus:outline-none font-mono transition"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6f969d] hover:text-white"
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
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-[#00f59b]/10 border-[#00f59b] shadow-md ring-1 ring-[#00f59b]/50'
                  : 'bg-[#061518] border-[#143f47]/50 hover:border-[#143f47]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isActive ? 'bg-[#00f59b] animate-pulse' : 'bg-[#1b4d57]'
                      }`}
                    />
                    <h4 className="font-bold text-sm text-white tracking-tight truncate max-w-[200px]">
                      {geom.name || `Bairro ${idx + 1}`}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-[#092329] text-[#82aab2] px-2 py-0.5 rounded-md border border-[#143f47]">
                    {geom.type}
                  </span>
                </div>

                {/* Micro Stats */}
                <div className="flex items-center gap-3 text-[11px] font-mono text-[#7ca5ad] mb-3">
                  <span>{geom.coordinates.length} pts</span>
                  {areaHa !== null && (
                    <span className="text-[#00f59b] font-semibold">{areaHa.toFixed(2)} ha</span>
                  )}
                  <span className="text-[#00f59b] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Fechado</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons for this Specific Bairro */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#143f47]/40">
                <button
                  onClick={() => onSelectGeometry(geom)}
                  className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    isActive
                      ? 'bg-[#00f59b] text-black font-bold'
                      : 'bg-[#092329] hover:bg-[#0c2e35] text-white'
                  }`}
                  title="Focar este bairro e gerar plano de voo"
                >
                  <span>{isActive ? 'Missão Ativa' : 'Focar & Mapear'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>

                <button
                  onClick={() => handleDownloadSinglePurgedKml(geom)}
                  className="p-1.5 bg-[#092329] hover:bg-[#0c2e35] text-[#00f59b] hover:text-white rounded-xl border border-[#143f47] transition cursor-pointer"
                  title="Baixar KML mínimo purificado (sem Style/Schema)"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setInspectGeom(geom)}
                  className="p-1.5 bg-[#092329] hover:bg-[#0c2e35] text-[#82aab2] hover:text-white rounded-xl border border-[#143f47] transition cursor-pointer"
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
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#091e23] border border-[#143f47] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#143f47] bg-[#061518]">
              <div className="flex items-center gap-2 font-mono text-xs text-white">
                <FileCode className="w-4 h-4 text-[#00f59b]" />
                <span>KML MÍNIMO PURGADO — {inspectGeom.name}</span>
              </div>
              <button
                onClick={() => setInspectGeom(null)}
                className="text-[#6f969d] hover:text-white text-base cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-4 bg-[#061518] max-h-[320px] overflow-auto font-mono text-[11px] text-[#00f59b]">
              <pre className="whitespace-pre">{generateMinimalPurgedKml(inspectGeom)}</pre>
            </div>

            <div className="p-3.5 border-t border-[#143f47] bg-[#091e23] flex justify-between items-center">
              <span className="text-[10px] text-[#6f969d] font-mono">ESTRUTURA 100% LIMPA DJI</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyInspectedCode}
                  className="px-3 py-1.5 bg-[#061518] hover:bg-[#0c262d] text-white text-xs font-semibold rounded-xl border border-[#143f47] flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-[#00f59b]" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>
                <button
                  onClick={() => {
                    handleDownloadSinglePurgedKml(inspectGeom);
                    setInspectGeom(null);
                  }}
                  className="px-4 py-1.5 bg-[#00f59b] hover:bg-[#00df8c] text-black text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
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
