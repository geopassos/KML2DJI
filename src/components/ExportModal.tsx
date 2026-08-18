import React, { useState } from 'react';
import { Waypoint, MissionSettings } from '../types';
import {
  generateWpmlTemplateKml,
  generateWpmlWaylines,
  generateDjiWpmlKmzBlob,
  generateDjiStandardKml,
  generateLitchiCsv,
} from '../utils/djiWpmlGenerator';
import {
  Download,
  FileCode,
  Copy,
  Check,
  Smartphone,
  HardDrive,
  FolderOpen,
  CheckCircle2,
  ExternalLink,
  Layers,
  FileSpreadsheet,
  X,
} from 'lucide-react';

interface ExportModalProps {
  waypoints: Waypoint[];
  settings: MissionSettings;
  isOpen: boolean;
  onClose: () => void;
  onOpenGoogleSheets?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  waypoints,
  settings,
  isOpen,
  onClose,
  onOpenGoogleSheets,
}) => {
  const [activeTab, setActiveTab] = useState<'download' | 'code' | 'tutorial'>('download');
  const [codeType, setCodeType] = useState<'template' | 'waylines' | 'standard' | 'csv'>('template');
  const [copied, setCopied] = useState(false);
  const [isGeneratingKmz, setIsGeneratingKmz] = useState(false);

  if (!isOpen) return null;

  const missionSafeName = settings.missionName.replace(/[^\w\s-]/g, '_') || 'Missao_DJI';

  // Trigger file download helper
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 1. Download DJI Pilot 2 WPML .kmz (Official format)
  const handleDownloadKmz = async () => {
    try {
      setIsGeneratingKmz(true);
      const kmzBlob = await generateDjiWpmlKmzBlob(waypoints, settings);
      triggerDownload(kmzBlob, `${missionSafeName}_DJI_WPML.kmz`);
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar arquivo KMZ.');
    } finally {
      setIsGeneratingKmz(false);
    }
  };

  // 2. Download DJI Pilot 2 Template .kml
  const handleDownloadWpmlKml = () => {
    const kmlText = generateWpmlTemplateKml(waypoints, settings);
    const blob = new Blob([kmlText], { type: 'application/vnd.google-earth.kml+xml' });
    triggerDownload(blob, `${missionSafeName}_template.kml`);
  };

  // 3. Download Standard DJI KML (DJI Pilot 1 / DJI Terra / Google Earth)
  const handleDownloadStandardKml = () => {
    const kmlText = generateDjiStandardKml(waypoints, settings);
    const blob = new Blob([kmlText], { type: 'application/vnd.google-earth.kml+xml' });
    triggerDownload(blob, `${missionSafeName}_DJI_Standard.kml`);
  };

  // 4. Download Litchi CSV
  const handleDownloadLitchiCsv = () => {
    const csvText = generateLitchiCsv(waypoints, settings);
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, `${missionSafeName}_Litchi.csv`);
  };

  // Get active code string
  const getCodeString = () => {
    if (codeType === 'template') return generateWpmlTemplateKml(waypoints, settings);
    if (codeType === 'waylines') return generateWpmlWaylines(waypoints, settings);
    if (codeType === 'standard') return generateDjiStandardKml(waypoints, settings);
    return generateLitchiCsv(waypoints, settings);
  };

  const handleCopyCode = () => {
    const code = getCodeString();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#111115] border border-[#ffffff15] rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[#e0e0e0]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ffffff10] bg-[#0a0a0c]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/25 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Exportar Plano de Voo DJI
                </h3>
                <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
                  WPML READY
                </span>
              </div>
              <p className="text-xs text-[#888899] font-mono">
                {waypoints.length} WAYPOINTS • MOTOR DJI WPML V1.0.3
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Navigation */}
            <div className="flex items-center bg-[#0a0a0c] border border-[#ffffff10] rounded-xl p-1 text-xs">
              <button
                id="tab-btn-download"
                onClick={() => setActiveTab('download')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === 'download'
                    ? 'bg-white text-black font-bold'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                Downloads
              </button>
              <button
                id="tab-btn-code"
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === 'code'
                    ? 'bg-white text-black font-bold'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                Inspecionar Código
              </button>
              <button
                id="tab-btn-tutorial"
                onClick={() => setActiveTab('tutorial')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === 'tutorial'
                    ? 'bg-white text-black font-bold'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                Como Usar no Controle
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-[#666] hover:text-white rounded-lg hover:bg-[#1f1f26] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: DOWNLOADS */}
          {activeTab === 'download' && (
            <div className="space-y-4">
              {/* Google Sheets Spotlight Card */}
              {onOpenGoogleSheets && (
                <div className="bg-gradient-to-r from-emerald-950/40 via-[#0a0a0c] to-emerald-950/20 border border-emerald-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Exportar Relatório para Google Planilhas</span>
                        <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold px-2 py-0.2 rounded border border-emerald-500/30">
                          NOVO
                        </span>
                      </h4>
                      <p className="text-xs text-[#888899]">
                        Gere uma planilha no Google Sheets com resumo operacional, especificações do drone e tabela de waypoints formatada.
                      </p>
                    </div>
                  </div>

                  <button
                    id="btn-trigger-sheets-from-export"
                    onClick={() => {
                      onClose();
                      onOpenGoogleSheets();
                    }}
                    className="py-2 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-md cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Abrir Google Planilhas</span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Official DJI WPML KMZ */}
                <div className="bg-[#0a0a0c] border-2 border-cyan-500/40 hover:border-cyan-400 rounded-2xl p-5 flex flex-col justify-between transition group shadow-lg relative overflow-hidden">
                  <div
                    className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none"
                    style={{
                      backgroundImage: 'radial-gradient(#06b6d4 1px, transparent 1px)',
                      backgroundSize: '12px 12px',
                    }}
                  />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full border border-cyan-500/40">
                        ⭐ PILOT 2 OFICIAL
                      </span>
                      <span className="text-xs font-mono text-cyan-400">.KMZ (WPML)</span>
                    </div>
                    <h4 className="text-base font-bold text-white group-hover:text-cyan-400 transition">
                      DJI Pilot 2 WPML (.kmz)
                    </h4>
                    <p className="text-xs text-[#888899] mt-1.5 leading-relaxed">
                      Pacote zipado contendo <code>template.kml</code> e <code>waylines.wpml</code>. Pronto para DJI Mavic 3 Enterprise, M30, M300/M350 RTK e DJI RC Pro.
                    </p>
                  </div>
                  <button
                    id="btn-download-kmz-primary"
                    onClick={handleDownloadKmz}
                    disabled={isGeneratingKmz}
                    className="mt-5 w-full py-3 px-4 bg-white hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-tight rounded-xl flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isGeneratingKmz ? 'Gerando KMZ...' : 'Baixar KMZ DJI Pilot 2'}</span>
                  </button>
                </div>

                {/* 2. Standalone WPML KML */}
                <div className="bg-[#0a0a0c] border border-[#ffffff10] hover:border-[#ffffff20] rounded-2xl p-5 flex flex-col justify-between transition shadow-md">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="bg-[#ffffff05] text-[#aaa] text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-[#ffffff10]">
                        DIRETO
                      </span>
                      <span className="text-xs font-mono text-[#888]">.KML</span>
                    </div>
                    <h4 className="text-base font-bold text-white">
                      DJI WPML Template (.kml)
                    </h4>
                    <p className="text-xs text-[#888899] mt-1.5 leading-relaxed">
                      Arquivo KML com namespace oficial WPML (<code>xmlns:wpml</code>) para importação direta de plano no DJI Pilot 2.
                    </p>
                  </div>
                  <button
                    id="btn-download-wpml-kml"
                    onClick={handleDownloadWpmlKml}
                    className="mt-5 w-full py-3 px-4 bg-[#181820] hover:bg-[#22222c] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 border border-[#ffffff10] transition"
                  >
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    <span>Baixar WPML .KML</span>
                  </button>
                </div>

                {/* 3. Standard DJI KML */}
                <div className="bg-[#0a0a0c] border border-[#ffffff10] hover:border-[#ffffff20] rounded-2xl p-5 flex flex-col justify-between transition shadow-md">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="bg-[#ffffff05] text-[#aaa] text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-[#ffffff10]">
                        TERRA & EARTH
                      </span>
                      <span className="text-xs font-mono text-[#888]">.KML</span>
                    </div>
                    <h4 className="text-base font-bold text-white">
                      DJI Terra / Standard KML (.kml)
                    </h4>
                    <p className="text-xs text-[#888899] mt-1.5 leading-relaxed">
                      Compatível com DJI Terra, DJI GS Pro, DJI Pilot 1 e visualização no Google Earth Pro com placemarks e coordenadas.
                    </p>
                  </div>
                  <button
                    id="btn-download-standard-kml"
                    onClick={handleDownloadStandardKml}
                    className="mt-5 w-full py-3 px-4 bg-[#181820] hover:bg-[#22222c] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 border border-[#ffffff10] transition"
                  >
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>Baixar Standard KML</span>
                  </button>
                </div>

                {/* 4. Litchi / DJI Fly CSV */}
                <div className="bg-[#0a0a0c] border border-[#ffffff10] hover:border-[#ffffff20] rounded-2xl p-5 flex flex-col justify-between transition shadow-md">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="bg-[#ffffff05] text-[#aaa] text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-[#ffffff10]">
                        MINI & AIR
                      </span>
                      <span className="text-xs font-mono text-[#888]">.CSV</span>
                    </div>
                    <h4 className="text-base font-bold text-white">
                      Litchi / Universal Drone (.csv)
                    </h4>
                    <p className="text-xs text-[#888899] mt-1.5 leading-relaxed">
                      Compatível com Litchi Mission Hub, DJI Mini 4 Pro, Mini 3, Air 3 e controladores com importação CSV.
                    </p>
                  </div>
                  <button
                    id="btn-download-litchi-csv"
                    onClick={handleDownloadLitchiCsv}
                    className="mt-5 w-full py-3 px-4 bg-[#181820] hover:bg-[#22222c] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 border border-[#ffffff10] transition"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-purple-400" />
                    <span>Baixar CSV Litchi</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CODE INSPECTOR */}
          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <button
                    onClick={() => setCodeType('template')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      codeType === 'template'
                        ? 'bg-white text-black font-bold'
                        : 'bg-[#181820] text-[#888] hover:text-white'
                    }`}
                  >
                    template.kml
                  </button>
                  <button
                    onClick={() => setCodeType('waylines')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      codeType === 'waylines'
                        ? 'bg-white text-black font-bold'
                        : 'bg-[#181820] text-[#888] hover:text-white'
                    }`}
                  >
                    waylines.wpml
                  </button>
                  <button
                    onClick={() => setCodeType('standard')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      codeType === 'standard'
                        ? 'bg-white text-black font-bold'
                        : 'bg-[#181820] text-[#888] hover:text-white'
                    }`}
                  >
                    Standard KML
                  </button>
                  <button
                    onClick={() => setCodeType('csv')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      codeType === 'csv'
                        ? 'bg-white text-black font-bold'
                        : 'bg-[#181820] text-[#888] hover:text-white'
                    }`}
                  >
                    Litchi CSV
                  </button>
                </div>

                <button
                  id="btn-copy-code"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181820] hover:bg-[#22222c] text-xs font-semibold text-white rounded-xl border border-[#ffffff10] transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-cyan-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Copiar Código</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative bg-[#0a0a0c] rounded-2xl border border-[#ffffff10] p-4 max-h-[380px] overflow-auto font-mono text-xs text-cyan-300/90">
                <pre className="whitespace-pre">{getCodeString()}</pre>
              </div>
            </div>
          )}

          {/* TAB 3: TUTORIAL */}
          {activeTab === 'tutorial' && (
            <div className="space-y-4 text-xs text-[#aaa]">
              <div className="bg-[#0a0a0c] border border-cyan-500/30 rounded-2xl p-5">
                <h4 className="font-bold text-sm text-cyan-400 mb-3 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  <span>Como Carregar no DJI Pilot 2 (DJI RC Plus / Smart Controller)</span>
                </h4>
                <ol className="space-y-3 list-decimal list-inside leading-relaxed text-[#ccc]">
                  <li>
                    Baixe o arquivo <b>.KMZ (WPML)</b> gerado nesta ferramenta.
                  </li>
                  <li>
                    Conecte o rádio controle (DJI RC Pro / RC Plus) ao computador via cabo USB-C ou use um cartão MicroSD / Pen Drive.
                  </li>
                  <li>
                    Copie o arquivo <code>.kmz</code> para o armazenamento do controle na pasta:
                    <div className="mt-1.5 bg-[#14141c] p-2.5 rounded-xl border border-[#ffffff15] font-mono text-cyan-400 text-[11px]">
                      Armazenamento Interno &gt; DJI &gt; com.dji.industry.pilot &gt; FlightRecord
                    </div>
                  </li>
                  <li>
                    No controle DJI, abra o aplicativo <b>DJI Pilot 2</b>.
                  </li>
                  <li>
                    Acesse o menu <b>Rota de Voo (Flight Route) &gt; Importar KMZ / KML</b>.
                  </li>
                  <li>
                    Selecione o arquivo e toque em <b>Importar</b>. O plano de voo será carregado instantaneamente com todos os waypoints, altitude e fotos.
                  </li>
                </ol>
              </div>

              <div className="bg-[#0a0a0c] border border-[#ffffff10] rounded-2xl p-5">
                <h4 className="font-bold text-sm text-white mb-2 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-purple-400" />
                  <span>Dica para Drones DJI Mini / Air / Mavic (Litchi / DJI Fly)</span>
                </h4>
                <p className="leading-relaxed text-[#888899]">
                  Para drones que utilizam o <b>Litchi Mission Hub</b>, baixe o arquivo <b>.CSV</b>, acesse <code>flylitchi.com/hub</code>, clique em <b>Missions &gt; Import CSV</b> e sincronize diretamente com o aplicativo no celular/tablet.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#ffffff10] bg-[#0a0a0c]/80 flex justify-between items-center text-xs text-[#666] font-mono">
          <span>ENCRYPTED AES-256 PARSER</span>
          <button
            id="btn-close-export-modal"
            onClick={onClose}
            className="px-5 py-2 bg-[#1f1f26] hover:bg-[#2b2b35] text-white text-xs font-semibold rounded-xl border border-[#ffffff10] transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
