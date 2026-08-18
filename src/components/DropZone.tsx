import React, { useRef, useState } from 'react';
import { UploadCloud, FileType, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { SAMPLE_DATASETS, SampleDataset } from '../utils/sampleData';

interface DropZoneProps {
  onFileLoaded: (file: File | Blob, fileName: string) => void;
  onLoadSample: (sample: SampleDataset) => void;
  isLoading?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFileLoaded,
  onLoadSample,
  isLoading,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndProcessFile(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndProcessFile(file);
    }
  };

  const validateAndProcessFile = (file: File) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.kml') && !name.endsWith('.kmz')) {
      alert('Por favor, selecione um arquivo com extensão .kml ou .kmz');
      return;
    }
    onFileLoaded(file, file.name);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Drag & Drop Hero Box (8 cols) */}
      <div
        id="dropzone-kml-kmz"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`lg:col-span-8 bg-[#111115] border rounded-2xl p-6 sm:p-8 relative overflow-hidden flex flex-col items-center justify-center cursor-pointer group transition-all duration-300 ${
          isDragOver
            ? 'border-cyan-500 bg-cyan-950/20 shadow-lg shadow-cyan-950/50 scale-[1.005]'
            : 'border-[#ffffff10] hover:border-cyan-500/50 hover:bg-[#15151b]'
        }`}
      >
        {/* Dot Matrix Blueprint Background */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#06b6d4 0.75px, transparent 0.75px)',
            backgroundSize: '20px 20px',
          }}
        />

        <input
          ref={fileInputRef}
          id="file-input-kml-kmz"
          type="file"
          accept=".kml,.kmz"
          className="hidden"
          onChange={handleFileInputChange}
        />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-4 border border-cyan-500/25 group-hover:border-cyan-500/50 group-hover:scale-105 transition-all">
            {isLoading ? (
              <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8 text-cyan-400" />
            )}
          </div>

          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
            Importar Arquivo <span className="text-cyan-400 font-mono">.KML</span> ou{' '}
            <span className="text-cyan-400 font-mono">.KMZ</span>
          </h2>
          <p className="text-xs text-[#888899] mt-1.5 max-w-md">
            Arraste seu arquivo ou clique para carregar. Conversão instantânea para formato nativo DJI WPML (Pilot 2) e DJI Terra.
          </p>

          <div className="mt-5 flex flex-wrap justify-center items-center gap-2">
            <span className="px-3 py-1 bg-[#ffffff05] border border-[#ffffff10] rounded-lg text-[10px] font-mono text-[#aaaaaa] uppercase tracking-wider">
              Google Earth KML
            </span>
            <span className="px-3 py-1 bg-[#ffffff05] border border-[#ffffff10] rounded-lg text-[10px] font-mono text-cyan-400/90 border-cyan-500/20 uppercase tracking-wider">
              KMZ Comprimido
            </span>
            <span className="px-3 py-1 bg-[#ffffff05] border border-[#ffffff10] rounded-lg text-[10px] font-mono text-[#aaaaaa] uppercase tracking-wider">
              QGIS / AutoCAD
            </span>
            <span className="px-3 py-1 bg-[#ffffff05] border border-[#ffffff10] rounded-lg text-[10px] font-mono text-[#aaaaaa] uppercase tracking-wider">
              Polígonos & Waypoints
            </span>
          </div>
        </div>
      </div>

      {/* Quick Test Samples Bento Card (4 cols) */}
      <div className="lg:col-span-4 bg-[#111115] border border-[#ffffff10] rounded-2xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold text-[#666677] uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Amostras Pré-Carregadas</span>
            </h3>
            <span className="text-[10px] font-mono text-cyan-500">1-CLICK TEST</span>
          </div>

          <div className="space-y-2">
            {SAMPLE_DATASETS.map((sample) => (
              <button
                key={sample.id}
                id={`btn-sample-${sample.id}`}
                onClick={() => onLoadSample(sample)}
                className="w-full text-left p-3 rounded-xl bg-[#ffffff03] hover:bg-[#ffffff08] border border-[#ffffff08] hover:border-cyan-500/40 transition group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-white group-hover:text-cyan-400 transition truncate">
                    {sample.name}
                  </div>
                  <ArrowRight className="w-3 h-3 text-[#555] group-hover:text-cyan-400 transition transform group-hover:translate-x-0.5" />
                </div>
                <div className="text-[11px] text-[#777788] mt-0.5 line-clamp-1">
                  {sample.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#ffffff08] flex items-center justify-between text-[10px] text-[#666677] font-mono">
          <span>PARSER CLIENT-SIDE</span>
          <span className="text-green-400">100% LOCAL & SEGURO</span>
        </div>
      </div>
    </div>
  );
};

