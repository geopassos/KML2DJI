import React, { useState, useEffect } from 'react';
import { Waypoint, MissionSettings, MissionSummary, ParsedGeometry } from '../types';
import { initAuth, googleSignIn, getAccessToken, logout } from '../services/auth';
import { exportMissionToGoogleSheets, exportAllBairrosToGoogleSheets, CreateSpreadsheetResult } from '../services/googleSheets';
import { User } from 'firebase/auth';
import {
  FileSpreadsheet,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Sparkles,
  Layers,
  Copy,
  Check,
  X,
  Loader2,
  Database,
  Table,
} from 'lucide-react';

interface GoogleSheetsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  waypoints: Waypoint[];
  settings: MissionSettings;
  summary: MissionSummary;
  geometries: ParsedGeometry[];
  fileName?: string;
}

export const GoogleSheetsExportModal: React.FC<GoogleSheetsExportModalProps> = ({
  isOpen,
  onClose,
  waypoints,
  settings,
  summary,
  geometries,
  fileName,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<CreateSpreadsheetResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Initialize Auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setErrorMessage(null);
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setAccessToken(res.accessToken);
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setErrorMessage(err.message || 'Falha ao autenticar com o Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setAccessToken(null);
    setExportResult(null);
  };

  const handleExportActiveMission = async () => {
    try {
      setIsExporting(true);
      setErrorMessage(null);

      let token = accessToken;
      if (!token) {
        const signinRes = await googleSignIn();
        if (!signinRes) throw new Error('Autenticação necessária.');
        token = signinRes.accessToken;
        setCurrentUser(signinRes.user);
        setAccessToken(token);
      }

      const result = await exportMissionToGoogleSheets(
        token,
        settings.missionName || fileName || 'Missão DJI',
        settings,
        summary,
        waypoints,
        geometries
      );

      setExportResult(result);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro ao exportar para o Google Planilhas.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAllBairros = async () => {
    try {
      setIsExporting(true);
      setErrorMessage(null);

      let token = accessToken;
      if (!token) {
        const signinRes = await googleSignIn();
        if (!signinRes) throw new Error('Autenticação necessária.');
        token = signinRes.accessToken;
        setCurrentUser(signinRes.user);
        setAccessToken(token);
      }

      const result = await exportAllBairrosToGoogleSheets(
        token,
        fileName || settings.missionName || 'Bairros Sede',
        settings,
        geometries
      );

      setExportResult(result);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro ao exportar bairros consolidados.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyLink = () => {
    if (!exportResult) return;
    navigator.clipboard.writeText(exportResult.spreadsheetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-sans">
      <div className="bg-[#111115] border border-[#ffffff15] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[#e0e0e0]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ffffff10] bg-[#0a0a0c]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/25 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Exportar para Google Planilhas
                </h3>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                  GOOGLE SHEETS API
                </span>
              </div>
              <p className="text-xs text-[#888899]">
                Gere relatórios técnicos estruturados de voo diretamente na sua conta Google Drive
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#666] hover:text-white rounded-lg hover:bg-[#1f1f26] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* User Auth Status Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0a0a0c] border border-[#ffffff08]">
            <div className="flex items-center gap-2.5">
              {currentUser ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center">
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt="Avatar"
                        className="w-full h-full rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      currentUser.displayName?.[0] || 'U'
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <span>{currentUser.displayName || currentUser.email}</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-mono">
                        Conectado
                      </span>
                    </div>
                    <span className="text-[11px] text-[#777] font-mono">{currentUser.email}</span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-[#aaa]">
                  <span className="text-white font-medium">Conta Google: </span>
                  Conecte sua conta para salvar as planilhas no seu Google Drive.
                </div>
              )}
            </div>

            <div>
              {currentUser ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#888] hover:text-rose-400 rounded-xl hover:bg-[#181820] transition border border-transparent hover:border-[#ffffff10]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Desconectar</span>
                </button>
              ) : (
                <button
                  id="btn-google-sign-in"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="gsi-material-button text-xs"
                >
                  <div className="gsi-material-button-state"></div>
                  <div className="gsi-material-button-content-wrapper">
                    <div className="gsi-material-button-icon">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents">
                      {isLoggingIn ? 'Conectando...' : 'Conectar com Google'}
                    </span>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner when Exported */}
          {exportResult && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Planilha Criada com Sucesso!</h4>
                    <p className="text-xs text-emerald-300 font-mono">{exportResult.title}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={exportResult.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-lg"
                >
                  <span>Abrir no Google Planilhas</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={handleCopyLink}
                  className="py-2.5 px-4 bg-[#181820] hover:bg-[#22222c] text-white text-xs font-semibold rounded-xl border border-[#ffffff10] flex items-center gap-1.5 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Link Copiado!' : 'Copiar Link'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Preview of what will be exported */}
          <div className="bg-[#0a0a0c] border border-[#ffffff08] rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#888899] flex items-center gap-2">
              <Table className="w-3.5 h-3.5 text-cyan-400" />
              <span>O que será gerado na planilha para os operadores de drone:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#111115] rounded-xl border border-[#ffffff08] space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <Database className="w-3.5 h-3.5" />
                  <span>Aba 1: Resumo da Missão</span>
                </div>
                <p className="text-[11px] text-[#888] leading-relaxed">
                  Nome da missão, modelo do drone ({settings.dronePresetKey.toUpperCase()}), altitude ({settings.flightAltitude}m AGL), velocidade, pitch do gimbal ({settings.gimbalPitch}°), estimativa de fotos (~{summary.estimatedPhotos}) e cálculo de baterias ({summary.estimatedBatteries} packs).
                </p>
              </div>

              <div className="p-3 bg-[#111115] rounded-xl border border-[#ffffff08] space-y-1.5">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Aba 2: Waypoints & Coordenadas</span>
                </div>
                <p className="text-[11px] text-[#888] leading-relaxed">
                  Tabela completa de {waypoints.length} waypoints com latitude e longitude decimais de alta precisão (WGS-84), velocidades individuais, elevação e comandos de disparo.
                </p>
              </div>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              id="btn-export-active-sheet"
              onClick={handleExportActiveMission}
              disabled={isExporting || waypoints.length === 0}
              className="w-full py-3.5 px-5 bg-white hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-tight rounded-2xl shadow-xl flex items-center justify-center gap-2 transition disabled:opacity-40"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Gerando Planilha no Google Drive...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Exportar Missão Ativa para Google Planilhas</span>
                </>
              )}
            </button>

            {geometries.length > 1 && (
              <button
                id="btn-export-all-bairros-sheet"
                onClick={handleExportAllBairros}
                disabled={isExporting}
                className="w-full py-3 px-5 bg-[#181820] hover:bg-[#22222c] text-white font-semibold text-xs rounded-2xl border border-[#ffffff10] flex items-center justify-center gap-2 transition disabled:opacity-40"
              >
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Exportar Todos os {geometries.length} Bairros Consolidados (Multi-Abas)</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#ffffff10] bg-[#0a0a0c]/80 flex justify-between items-center text-xs text-[#666] font-mono">
          <span>GOOGLE SPREADSHEETS V4 API</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1f1f26] hover:bg-[#2b2b35] text-white text-xs font-semibold rounded-xl border border-[#ffffff10] transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
