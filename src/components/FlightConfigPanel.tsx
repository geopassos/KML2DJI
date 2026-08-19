import React from 'react';
import { MissionSettings, DroneModelKey } from '../types';
import { DRONE_PRESETS } from '../utils/presets';
import {
  Plane,
  Compass,
  Camera,
  ShieldAlert,
  Sliders,
  Grid,
  RotateCw,
  Gauge,
  ArrowUpRight,
  Info,
} from 'lucide-react';

interface FlightConfigPanelProps {
  settings: MissionSettings;
  onChangeSettings: (newSettings: Partial<MissionSettings>) => void;
  hasPolygons: boolean;
  onGenerateGrid?: () => void;
  onResetWaypoints?: () => void;
  isGridActive?: boolean;
}

export const FlightConfigPanel: React.FC<FlightConfigPanelProps> = ({
  settings,
  onChangeSettings,
  hasPolygons,
  onGenerateGrid,
  onResetWaypoints,
  isGridActive,
}) => {
  const currentPreset = DRONE_PRESETS[settings.dronePresetKey] || DRONE_PRESETS.mavic3e;

  // Calculate GSD (Ground Sampling Distance in cm/pixel)
  const gsdCmPerPx =
    currentPreset.sensorWidthMm && currentPreset.focalLengthMm && currentPreset.imageWidthPx
      ? (
          ((settings.flightAltitude * currentPreset.sensorWidthMm) /
            (currentPreset.focalLengthMm * currentPreset.imageWidthPx)) *
          100
        ).toFixed(2)
      : 'N/A';

  return (
    <div className="space-y-4 text-[#e2edf0]">
      {/* 1. Drone Preset & Mission Identification */}
      <div className="bg-[#091e23] border border-[#143f47] rounded-3xl p-5 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-bold text-[#6f969d] uppercase tracking-widest flex items-center gap-1.5">
            <Plane className="w-3.5 h-3.5 text-[#00f59b]" />
            <span>Modelo de Drone & Identificação</span>
          </h3>
          <span className="text-[10px] font-mono text-[#00f59b] font-bold">DJI WPML</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] text-[#7ca5ad] mb-1 font-mono uppercase tracking-wider">
              Drone Alvo (Presets Oficiais DJI)
            </label>
            <select
              id="select-drone-model"
              value={settings.dronePresetKey}
              onChange={(e) => {
                const key = e.target.value as DroneModelKey;
                const preset = DRONE_PRESETS[key];
                onChangeSettings({
                  dronePresetKey: key,
                  flightSpeed: preset ? preset.defaultSpeed : settings.flightSpeed,
                  maxFlightSpeed: preset ? preset.maxSpeed : settings.maxFlightSpeed,
                });
              }}
              className="w-full bg-[#061518] border border-[#143f47] rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00f59b] transition"
            >
              <optgroup label="Série Enterprise (DJI Pilot 2 / WPML)" className="bg-[#091e23]">
                <option value="mavic3e">DJI Mavic 3 Enterprise (M3E)</option>
                <option value="mavic3t">DJI Mavic 3 Thermal (M3T)</option>
                <option value="mavic3m">DJI Mavic 3 Multispectral (M3M)</option>
                <option value="matrice30">DJI Matrice 30 / 30T</option>
                <option value="matrice350">DJI Matrice 350 RTK (P1/L1/L2)</option>
                <option value="matrice300">DJI Matrice 300 RTK</option>
                <option value="p4rtk">DJI Phantom 4 RTK</option>
              </optgroup>
              <optgroup label="Série Consumer / Pro (Litchi / DJI Fly Waypoints)" className="bg-[#091e23]">
                <option value="mini4pro">DJI Mini 4 Pro</option>
                <option value="mini3pro">DJI Mini 3 Pro</option>
                <option value="air3">DJI Air 3</option>
              </optgroup>
              <optgroup label="Outro" className="bg-[#091e23]">
                <option value="custom">Drone DJI Personalizado</option>
              </optgroup>
            </select>
            <p className="text-[11px] text-[#638c94] mt-1.5 italic leading-relaxed">
              {currentPreset.description}
            </p>
          </div>

          <div>
            <label className="block text-[11px] text-[#7ca5ad] mb-1 font-mono uppercase tracking-wider">
              Nome da Missão (DJI Task Name)
            </label>
            <input
              id="input-mission-name"
              type="text"
              value={settings.missionName}
              onChange={(e) => onChangeSettings({ missionName: e.target.value })}
              placeholder="Ex: Mapeamento_Gleba_Norte"
              className="w-full bg-[#061518] border border-[#143f47] rounded-2xl px-3.5 py-2 text-xs text-[#00f59b] focus:outline-none focus:border-[#00f59b] font-mono transition"
            />
          </div>
        </div>
      </div>

      {/* 2. Grid & Lawnmower Photogrammetry Mode (if polygon uploaded) */}
      {hasPolygons && (
        <div className="bg-[#091e23] border border-[#00f59b]/30 rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold text-[#00f59b] uppercase tracking-widest flex items-center gap-1.5">
              <Grid className="w-3.5 h-3.5" />
              <span>Gerador de Grade de Mapeamento</span>
            </h3>
            {isGridActive && (
              <span className="bg-[#00f59b]/15 text-[#00f59b] text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-[#00f59b]/40">
                GRADE ATIVA
              </span>
            )}
          </div>

          <p className="text-xs text-[#7ca5ad] mb-3 leading-relaxed">
            Polígono detectado. Geração automática de faixas paralelas em zigue-zague para ortomosaico:
          </p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[10px] text-[#7ca5ad] mb-1 font-mono uppercase">
                Espaçamento de Faixas
              </label>
              <div className="relative">
                <input
                  id="input-grid-spacing"
                  type="number"
                  min="5"
                  max="300"
                  value={settings.gridSpacing}
                  onChange={(e) => onChangeSettings({ gridSpacing: Number(e.target.value) })}
                  className="w-full bg-[#061518] border border-[#143f47] rounded-2xl px-3 py-1.5 text-xs text-white font-mono focus:border-[#00f59b] focus:outline-none"
                />
                <span className="absolute right-2.5 top-1.5 text-[11px] text-[#6f969d]">m</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-[#7ca5ad] mb-1 font-mono uppercase">
                Ângulo das Linhas
              </label>
              <div className="relative">
                <input
                  id="input-grid-angle"
                  type="number"
                  min="0"
                  max="360"
                  value={settings.gridAngle}
                  onChange={(e) => onChangeSettings({ gridAngle: Number(e.target.value) })}
                  className="w-full bg-[#061518] border border-[#143f47] rounded-2xl px-3 py-1.5 text-xs text-white font-mono focus:border-[#00f59b] focus:outline-none"
                />
                <span className="absolute right-2.5 top-1.5 text-[11px] text-[#6f969d]">°</span>
              </div>
            </div>
          </div>

          {/* Quick angle adjustment slider */}
          <div className="mb-4">
            <div className="flex justify-between text-[10px] text-[#6f969d] font-mono mb-1.5">
              <span>ORIENTAÇÃO DE VOO</span>
              <span className="text-[#00f59b] font-bold">{settings.gridAngle}°</span>
            </div>
            <input
              id="slider-grid-angle"
              type="range"
              min="0"
              max="360"
              step="5"
              value={settings.gridAngle}
              onChange={(e) => onChangeSettings({ gridAngle: Number(e.target.value) })}
              className="w-full accent-[#00f59b] cursor-pointer h-1.5 bg-[#061518] rounded-lg"
            />
          </div>

          <div className="flex gap-2">
            <button
              id="btn-apply-grid"
              onClick={onGenerateGrid}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#00f59b] hover:bg-[#00df8c] text-black font-bold text-xs rounded-2xl uppercase tracking-tight transition shadow-md cursor-pointer"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Gerar / Atualizar Grade</span>
            </button>
            {isGridActive && onResetWaypoints && (
              <button
                id="btn-reset-to-perimeter"
                onClick={onResetWaypoints}
                className="py-2.5 px-3 bg-[#061518] hover:bg-[#0c262d] text-[#7ca5ad] hover:text-white text-xs rounded-2xl border border-[#143f47] transition cursor-pointer"
                title="Voltar para pontos do perímetro original"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Flight Altitude & Dynamics Box */}
      <div className="bg-[#091e23] border border-[#143f47] rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-bold text-[#6f969d] uppercase tracking-widest flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-[#00f59b]" />
            <span>Parâmetros de Voo & Altitude</span>
          </h3>
          <span className="text-[10px] font-mono text-[#7ca5ad]">DINÂMICA</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-[#061518] p-3 rounded-2xl border border-[#143f47]/50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-mono text-[#6f969d] uppercase">Altitude AGL</span>
              <span className="text-xs font-mono text-[#00f59b] font-bold">{settings.flightAltitude}m</span>
            </div>
            <div className="relative mt-1">
              <input
                id="input-flight-altitude"
                type="number"
                min="10"
                max="500"
                value={settings.flightAltitude}
                onChange={(e) => onChangeSettings({ flightAltitude: Number(e.target.value) })}
                className="w-full bg-[#091e23] border border-[#143f47] rounded-xl px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:border-[#00f59b] focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-[#061518] p-3 rounded-2xl border border-[#143f47]/50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-mono text-[#6f969d] uppercase">Velocidade</span>
              <span className="text-xs font-mono text-[#00f59b] font-bold">{settings.flightSpeed} m/s</span>
            </div>
            <div className="relative mt-1">
              <input
                id="input-flight-speed"
                type="number"
                min="1"
                max={currentPreset.maxSpeed}
                step="0.5"
                value={settings.flightSpeed}
                onChange={(e) => onChangeSettings({ flightSpeed: Number(e.target.value) })}
                className="w-full bg-[#091e23] border border-[#143f47] rounded-xl px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:border-[#00f59b] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Speed Indicator Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-[#6f969d] font-mono mb-1">
            <span>VELOCIDADE PROGRAMADA</span>
            <span className="text-white font-bold">{((settings.flightSpeed || 8) * 3.6).toFixed(0)} km/h</span>
          </div>
          <div className="w-full h-1.5 bg-[#061518] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00f59b] transition-all duration-300 shadow-[0_0_8px_rgba(0,245,155,0.5)]"
              style={{
                width: `${Math.min(100, ((settings.flightSpeed || 8) / (currentPreset.maxSpeed || 15)) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* GSD Estimation Pill */}
        <div className="flex items-center justify-between bg-[#061518] border border-[#143f47]/60 rounded-2xl px-3.5 py-2.5 text-xs text-[#82aab2]">
          <div className="flex items-center gap-1.5 text-[#6f969d]">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-mono">GSD Estimado (Solo):</span>
          </div>
          <span className="font-mono font-bold text-cyan-400">{gsdCmPerPx} cm/px</span>
        </div>

        <div className="mt-3">
          <label className="block text-[10px] text-[#7ca5ad] mb-1 font-mono uppercase tracking-wider">
            Referência de Altitude
          </label>
          <select
            id="select-altitude-mode"
            value={settings.altitudeMode}
            onChange={(e) =>
              onChangeSettings({
                altitudeMode: e.target.value as 'relativeToStartPoint' | 'WGS84',
              })
            }
            className="w-full bg-[#061518] border border-[#143f47] rounded-2xl px-3 py-2 text-xs text-white focus:border-[#00f59b] focus:outline-none"
          >
            <option value="relativeToStartPoint" className="bg-[#091e23]">
              Relativa ao Ponto de Decolagem (AGL - Padrão DJI)
            </option>
            <option value="WGS84" className="bg-[#091e23]">Altitude Elipsoidal Absoluta (WGS84 / EGM96)</option>
          </select>
        </div>
      </div>

      {/* 4. Gimbal, Heading & Camera Actions */}
      <div className="bg-[#091e23] border border-[#143f47] rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-bold text-[#6f969d] uppercase tracking-widest flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-[#00f59b]" />
            <span>Câmera, Gimbal & Disparos</span>
          </h3>
          <span className="text-[10px] font-mono text-[#7ca5ad]">PAYLOAD</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[10px] text-[#7ca5ad] mb-1 font-mono uppercase">
              Inclinação Gimbal (Pitch)
            </label>
            <select
              id="select-gimbal-pitch"
              value={settings.gimbalPitch}
              onChange={(e) => onChangeSettings({ gimbalPitch: Number(e.target.value) })}
              className="w-full bg-[#061518] border border-[#143f47] rounded-2xl px-3 py-2 text-xs text-white focus:border-[#00f59b] focus:outline-none"
            >
              <option value="-90" className="bg-[#091e23]">-90° Nadir (Mapeamento)</option>
              <option value="-45" className="bg-[#091e23]">-45° Oblíqua (Modelo 3D)</option>
              <option value="-60" className="bg-[#091e23]">-60° Oblíqua Média</option>
              <option value="0" className="bg-[#091e23]">0° Frontal (Inspeção)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-[#7ca5ad] mb-1 font-mono uppercase">
              Ação nos Waypoints
            </label>
            <select
              id="select-waypoint-action"
              value={settings.actionOnWaypoint}
              onChange={(e) =>
                onChangeSettings({
                  actionOnWaypoint: e.target.value as 'takePhoto' | 'hover' | 'none',
                })
              }
              className="w-full bg-[#061518] border border-[#143f47] rounded-2xl px-3 py-2 text-xs text-white focus:border-[#00f59b] focus:outline-none"
            >
              <option value="takePhoto" className="bg-[#091e23]">Disparar Foto (takePhoto)</option>
              <option value="hover" className="bg-[#091e23]">Pairar / Hover por X seg</option>
              <option value="none" className="bg-[#091e23]">Apenas Navegar (Sem parada)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] text-[#7ca5ad] mb-1 font-mono uppercase">
            Orientação do Drone (Heading)
          </label>
          <select
            id="select-heading-mode"
            value={settings.headingMode}
            onChange={(e) =>
              onChangeSettings({
                headingMode: e.target.value as 'followWayline' | 'manually' | 'fixed',
              })
            }
            className="w-full bg-[#061518] border border-[#143f47] rounded-2xl px-3 py-2 text-xs text-white focus:border-[#00f59b] focus:outline-none"
          >
            <option value="followWayline" className="bg-[#091e23]">Acompanhar Trajetória (Follow Wayline - Padrão)</option>
            <option value="manually" className="bg-[#091e23]">Controle Manual pelo Piloto</option>
            <option value="fixed" className="bg-[#091e23]">Ângulo Fixo Personalizado</option>
          </select>
        </div>
      </div>

      {/* 5. Safety & Finish Actions */}
      <div className="bg-[#091e23] border border-[#143f47] rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-bold text-[#6f969d] uppercase tracking-widest flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-[#00f59b]" />
            <span>Segurança & Finalização</span>
          </h3>
          <span className="text-[10px] font-mono text-[#00f59b] font-bold">FAILSAFE</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-[#7ca5ad] mb-1 font-mono uppercase">
              Ao Concluir Missão
            </label>
            <select
              id="select-finish-action"
              value={settings.finishAction}
              onChange={(e) =>
                onChangeSettings({
                  finishAction: e.target.value as 'goHome' | 'noAction' | 'autoLand' | 'gotoFirstWaypoint',
                })
              }
              className="w-full bg-[#061518] border border-[#143f47] rounded-2xl px-3 py-2 text-xs text-white focus:border-[#00f59b] focus:outline-none"
            >
              <option value="goHome" className="bg-[#091e23]">Retornar ao Home (RTH Automático)</option>
              <option value="gotoFirstWaypoint" className="bg-[#091e23]">Ir para o 1º Waypoint</option>
              <option value="noAction" className="bg-[#091e23]">Pairar no Último Ponto (Hover)</option>
              <option value="autoLand" className="bg-[#091e23]">Pouso Automático</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-[#7ca5ad] mb-1 font-mono uppercase">
              Altura Decolagem (m)
            </label>
            <div className="relative">
              <input
                id="input-security-height"
                type="number"
                min="5"
                max="100"
                value={settings.takeoffSecurityHeight}
                onChange={(e) => onChangeSettings({ takeoffSecurityHeight: Number(e.target.value) })}
                className="w-full bg-[#061518] border border-[#143f47] rounded-2xl px-3 py-2 text-xs text-white font-mono focus:border-[#00f59b] focus:outline-none"
              />
              <span className="absolute right-3 top-2 text-xs text-[#6f969d]">m</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
