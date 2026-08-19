import React, { useState } from 'react';
import { Waypoint } from '../types';
import {
  ListOrdered,
  ArrowUpDown,
  Trash2,
  TrendingUp,
  MapPin,
  Camera,
  Compass,
  Gauge,
  Check,
} from 'lucide-react';

interface WaypointListProps {
  waypoints: Waypoint[];
  onUpdateWaypoints: (waypoints: Waypoint[]) => void;
  selectedWaypointId?: number | null;
  onSelectWaypoint?: (id: number | null) => void;
  defaultAltitude: number;
}

export const WaypointList: React.FC<WaypointListProps> = ({
  waypoints,
  onUpdateWaypoints,
  selectedWaypointId,
  onSelectWaypoint,
  defaultAltitude,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [bulkAltitude, setBulkAltitude] = useState<number>(defaultAltitude);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Invert Flight Direction (Point 1 becomes Point N)
  const handleInvertDirection = () => {
    const reversed = [...waypoints].reverse().map((wp, idx) => ({
      ...wp,
      id: idx,
      index: idx,
      name: `WP_${idx + 1}`,
    }));
    onUpdateWaypoints(reversed);
  };

  // Delete a waypoint
  const handleDelete = (index: number) => {
    const updated = waypoints
      .filter((_, idx) => idx !== index)
      .map((wp, idx) => ({
        ...wp,
        id: idx,
        index: idx,
        name: `WP_${idx + 1}`,
      }));
    onUpdateWaypoints(updated);
  };

  // Update a single waypoint property
  const handleUpdateField = (index: number, field: keyof Waypoint, value: any) => {
    const updated = waypoints.map((wp, idx) => {
      if (idx === index) {
        return { ...wp, [field]: value };
      }
      return wp;
    });
    onUpdateWaypoints(updated);
  };

  // Bulk set all altitudes
  const handleApplyBulkAltitude = () => {
    const updated = waypoints.map((wp) => ({
      ...wp,
      alt: Number(bulkAltitude),
    }));
    onUpdateWaypoints(updated);
    setShowBulkModal(false);
  };

  // Calculate Altitude min and max for chart
  const altitudes = waypoints.map((w) => w.alt || defaultAltitude);
  const minAlt = altitudes.length > 0 ? Math.min(...altitudes, 0) : 0;
  const maxAlt = altitudes.length > 0 ? Math.max(...altitudes, 100) : 100;

  return (
    <div className="bg-[#091e23] border border-[#143f47] rounded-3xl p-5 shadow-sm space-y-4 text-[#e2edf0]">
      {/* Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#143f47]/60 pb-3">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-[#00f59b]" />
          <span className="font-bold text-xs uppercase tracking-widest text-white">
            Waypoints da Rota ({waypoints.length} pts)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-invert-route"
            onClick={handleInvertDirection}
            disabled={waypoints.length < 2}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#061518] hover:bg-[#0c262d] disabled:opacity-40 text-[#7ca5ad] hover:text-white rounded-2xl border border-[#143f47] transition cursor-pointer"
            title="Inverter ordem dos pontos (início vira fim)"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[#00f59b]" />
            <span className="text-[11px] font-mono">Inverter</span>
          </button>

          <button
            id="btn-bulk-alt"
            onClick={() => setShowBulkModal(!showBulkModal)}
            disabled={waypoints.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#061518] hover:bg-[#0c262d] disabled:opacity-40 text-[#7ca5ad] hover:text-white rounded-2xl border border-[#143f47] transition cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#00f59b]" />
            <span className="text-[11px] font-mono">Altitudes</span>
          </button>
        </div>
      </div>

      {/* Bulk Altitude Bar */}
      {showBulkModal && (
        <div className="flex items-center gap-2 bg-[#061518] p-3 rounded-2xl border border-[#00f59b]/40 animate-fadeIn">
          <span className="text-xs text-[#7ca5ad]">Definir todas altitudes:</span>
          <input
            id="input-bulk-altitude"
            type="number"
            value={bulkAltitude}
            onChange={(e) => setBulkAltitude(Number(e.target.value))}
            className="w-20 bg-[#091e23] border border-[#143f47] rounded-xl px-2.5 py-1 text-xs text-[#00f59b] font-mono font-bold focus:border-[#00f59b] focus:outline-none"
          />
          <span className="text-xs text-[#6f969d]">m</span>
          <button
            id="btn-apply-bulk-alt"
            onClick={handleApplyBulkAltitude}
            className="px-3 py-1 bg-[#00f59b] hover:bg-[#00df8c] text-black font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Aplicar</span>
          </button>
        </div>
      )}

      {/* Altitude Profile SVG Graph */}
      {waypoints.length > 1 && (
        <div className="bg-[#061518] border border-[#143f47]/60 rounded-2xl p-3.5">
          <div className="flex justify-between items-center text-[10px] font-mono text-[#6f969d] mb-2">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5 text-[#00f59b]" />
              <span>Perfil de Altitude (AGL)</span>
            </span>
            <span className="text-[#00f59b] font-bold">
              MIN: {Math.min(...altitudes)}m | MAX: {Math.max(...altitudes)}m
            </span>
          </div>

          <div className="h-16 w-full relative flex items-end">
            <svg className="w-full h-full overflow-visible">
              {/* Background grid lines */}
              <line x1="0" y1="20%" x2="100%" y2="20%" stroke="#0d262d" strokeDasharray="2,2" />
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#0d262d" strokeDasharray="2,2" />
              <line x1="0" y1="80%" x2="100%" y2="80%" stroke="#0d262d" strokeDasharray="2,2" />

              {/* Polyline of altitudes */}
              <polyline
                fill="none"
                stroke="#00f59b"
                strokeWidth="2"
                points={waypoints
                  .map((wp, idx) => {
                    const x = (idx / (waypoints.length - 1)) * 100;
                    const alt = wp.alt || defaultAltitude;
                    const normalized = maxAlt === minAlt ? 0.5 : (alt - minAlt) / (maxAlt - minAlt || 1);
                    const y = 85 - normalized * 70;
                    return `${x}%,${y}%`;
                  })
                  .join(' ')}
              />

              {/* Waypoint dots on graph */}
              {waypoints.map((wp, idx) => {
                const x = (idx / (waypoints.length - 1)) * 100;
                const alt = wp.alt || defaultAltitude;
                const normalized = maxAlt === minAlt ? 0.5 : (alt - minAlt) / (maxAlt - minAlt || 1);
                const y = 85 - normalized * 70;
                const isSelected = selectedWaypointId === wp.id;

                return (
                  <circle
                    key={idx}
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r={isSelected ? '5' : '3'}
                    fill={isSelected ? '#ffffff' : '#00f59b'}
                    stroke="#061518"
                    strokeWidth="1.5"
                    className="cursor-pointer transition-all hover:r-5"
                    onClick={() => onSelectWaypoint && onSelectWaypoint(wp.id)}
                  >
                    <title>{`WP #${idx + 1}: ${alt}m`}</title>
                  </circle>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Waypoints Scrollable Table */}
      <div className="overflow-x-auto max-h-[360px] overflow-y-auto rounded-2xl border border-[#143f47]/60 bg-[#061518]">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#092329] sticky top-0 z-10 text-[#7ca5ad] font-bold uppercase tracking-wider border-b border-[#143f47]/60 text-[10px]">
            <tr>
              <th className="py-2.5 px-3">#</th>
              <th className="py-2.5 px-3">Coordenadas</th>
              <th className="py-2.5 px-3">Alt (m)</th>
              <th className="py-2.5 px-3">Vel (m/s)</th>
              <th className="py-2.5 px-3">Gimbal</th>
              <th className="py-2.5 px-3">Ação</th>
              <th className="py-2.5 px-2 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#143f47]/30">
            {waypoints.map((wp, idx) => {
              const isSelected = selectedWaypointId === wp.id;
              const isFirst = idx === 0;

              return (
                <tr
                  key={wp.id || idx}
                  onClick={() => onSelectWaypoint && onSelectWaypoint(wp.id)}
                  className={`hover:bg-[#0c262d] cursor-pointer transition ${
                    isSelected ? 'bg-[#00f59b]/10 border-l-2 border-[#00f59b]' : ''
                  }`}
                >
                  <td className="py-2 px-3">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                        isFirst
                          ? 'bg-[#00f59b] text-black font-mono shadow-[0_0_8px_rgba(0,245,155,0.4)]'
                          : 'bg-[#092329] text-[#82aab2] border border-[#143f47]'
                      }`}
                    >
                      {isFirst ? 'H' : idx + 1}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-[#82aab2]">
                    <span className="text-[#5e878e]">Lat:</span> {wp.lat.toFixed(6)}
                    <br />
                    <span className="text-[#5e878e]">Lng:</span> {wp.lng.toFixed(6)}
                  </td>
                  <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      value={wp.alt || defaultAltitude}
                      onChange={(e) => handleUpdateField(idx, 'alt', Number(e.target.value))}
                      className="w-16 bg-[#091e23] border border-[#143f47] rounded-lg px-1.5 py-1 text-xs text-[#00f59b] font-bold focus:border-[#00f59b] text-center focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      step="0.5"
                      value={wp.speed || 8}
                      onChange={(e) => handleUpdateField(idx, 'speed', Number(e.target.value))}
                      className="w-14 bg-[#091e23] border border-[#143f47] rounded-lg px-1.5 py-1 text-xs text-white focus:border-[#00f59b] text-center focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={wp.gimbalPitch ?? -90}
                      onChange={(e) => handleUpdateField(idx, 'gimbalPitch', Number(e.target.value))}
                      className="bg-[#091e23] border border-[#143f47] rounded-lg px-1 py-1 text-[11px] text-white focus:outline-none"
                    >
                      <option value="-90">-90°</option>
                      <option value="-60">-60°</option>
                      <option value="-45">-45°</option>
                      <option value="0">0°</option>
                    </select>
                  </td>
                  <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={wp.action || 'takePhoto'}
                      onChange={(e) => handleUpdateField(idx, 'action', e.target.value)}
                      className="bg-[#091e23] border border-[#143f47] rounded-lg px-1 py-1 text-[11px] text-white focus:outline-none font-sans"
                    >
                      <option value="takePhoto">📸 Foto</option>
                      <option value="hover">⏱️ Hover</option>
                      <option value="none">➡️ Voo</option>
                    </select>
                  </td>
                  <td className="py-2 px-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleDelete(idx)}
                      disabled={waypoints.length <= 1}
                      className="p-1 hover:text-rose-400 text-[#5e878e] disabled:opacity-20 transition cursor-pointer"
                      title="Excluir Waypoint"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
