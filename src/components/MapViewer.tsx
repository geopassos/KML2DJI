import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Waypoint, ParsedGeometry } from '../types';
import { Layers, Maximize2, Navigation, Eye, EyeOff, MapPin } from 'lucide-react';

interface MapViewerProps {
  waypoints: Waypoint[];
  geometries: ParsedGeometry[];
  selectedWaypointId?: number | null;
  onSelectWaypoint?: (id: number | null) => void;
  flightAltitude: number;
}

export const MapViewer: React.FC<MapViewerProps> = ({
  waypoints,
  geometries,
  selectedWaypointId,
  onSelectWaypoint,
  flightAltitude,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const baseLayersRef = useRef<{ [key: string]: L.TileLayer }>({});
  
  const [activeBaseLayer, setActiveBaseLayer] = useState<'satellite' | 'street' | 'topo' | 'dark'>('satellite');
  const [showOriginalGeom, setShowOriginalGeom] = useState(true);
  const [showFlightPath, setShowFlightPath] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Basemaps
    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri &mdash; World Imagery',
        maxZoom: 19,
      }
    );

    const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    });

    const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenTopoMap',
      maxZoom: 17,
    });

    const dark = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; CartoDB',
        maxZoom: 19,
      }
    );

    baseLayersRef.current = { satellite, street, topo, dark };

    const map = L.map(mapContainerRef.current, {
      center: [-15.794, -47.882],
      zoom: 14,
      layers: [satellite],
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

    const layersGroup = L.layerGroup().addTo(map);
    layersGroupRef.current = layersGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch Base Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.values(baseLayersRef.current).forEach((layer) => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });

    const selectedLayer = baseLayersRef.current[activeBaseLayer];
    if (selectedLayer) {
      selectedLayer.addTo(map);
    }
  }, [activeBaseLayer]);

  // Render Overlays (Geometries & Waypoints)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const bounds = L.latLngBounds([]);

    // 1. Render Original Geometries
    if (showOriginalGeom && geometries.length > 0) {
      geometries.forEach((geom) => {
        if (geom.type === 'Polygon' && geom.coordinates.length >= 3) {
          const latLngs = geom.coordinates.map((c) => [c.lat, c.lng] as [number, number]);
          latLngs.forEach((ll) => bounds.extend(ll));

          const polygon = L.polygon(latLngs, {
            color: '#f59e0b', // Amber
            weight: 2,
            dashArray: '5, 5',
            fillColor: '#f59e0b',
            fillOpacity: 0.12,
          });

          polygon.bindTooltip(`<b>${geom.name}</b><br/>Área original KML`, {
            sticky: true,
            className: 'bg-[#111115] text-amber-300 px-2 py-1 rounded text-xs border border-amber-500/30 font-sans',
          });

          group.addLayer(polygon);
        } else if (geom.type === 'LineString' && geom.coordinates.length >= 2) {
          const latLngs = geom.coordinates.map((c) => [c.lat, c.lng] as [number, number]);
          latLngs.forEach((ll) => bounds.extend(ll));

          const line = L.polyline(latLngs, {
            color: '#06b6d4', // Cyan
            weight: 2.5,
            dashArray: '6, 6',
          });

          line.bindTooltip(`<b>${geom.name}</b><br/>Linha original KML`, {
            sticky: true,
            className: 'bg-[#111115] text-cyan-300 px-2 py-1 rounded text-xs border border-cyan-500/30 font-sans',
          });

          group.addLayer(line);
        }
      });
    }

    // 2. Render Flight Path & Waypoints
    if (showFlightPath && waypoints.length > 0) {
      const flightLatLngs = waypoints.map((w) => [w.lat, w.lng] as [number, number]);
      flightLatLngs.forEach((ll) => bounds.extend(ll));

      // Flight Polyline
      const flightLine = L.polyline(flightLatLngs, {
        color: '#06b6d4', // Electric Cyan
        weight: 3,
        opacity: 0.95,
      });
      group.addLayer(flightLine);

      // Waypoint Markers
      waypoints.forEach((wp, idx) => {
        const isSelected = selectedWaypointId === wp.id;
        const isFirst = idx === 0;
        const isLast = idx === waypoints.length - 1;

        // Custom HTML Marker
        const markerHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transform transition-transform hover:scale-125">
            <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-lg border-2 ${
              isFirst
                ? 'bg-amber-500 border-white text-slate-950 ring-4 ring-amber-500/40'
                : isLast
                ? 'bg-rose-500 border-white text-white'
                : isSelected
                ? 'bg-white border-cyan-400 text-slate-950 ring-4 ring-cyan-400/50'
                : 'bg-cyan-500 border-black text-black'
            }">
              ${isFirst ? 'H' : idx + 1}
            </div>
            ${
              isFirst
                ? '<span class="absolute -top-5 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded shadow">HOME</span>'
                : ''
            }
          </div>
        `;

        const customIcon = L.divIcon({
          html: markerHtml,
          className: 'custom-wp-marker',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([wp.lat, wp.lng], { icon: customIcon });

        const popupContent = `
          <div class="p-1 font-sans text-slate-900 text-xs min-w-[170px]">
            <div class="flex items-center justify-between font-bold text-sm text-cyan-900 border-b pb-1 mb-1">
              <span>${isFirst ? 'Home / Decolagem' : `Waypoint #${idx + 1}`}</span>
              <span class="text-[11px] font-normal text-slate-500">${wp.name || ''}</span>
            </div>
            <div class="space-y-0.5 text-slate-700 font-mono">
              <div class="flex justify-between font-sans">
                <span>Altitude:</span>
                <b class="text-slate-900 font-mono">${wp.alt || flightAltitude} m</b>
              </div>
              <div class="flex justify-between font-sans">
                <span>Velocidade:</span>
                <b class="text-slate-900 font-mono">${wp.speed || 8} m/s</b>
              </div>
              <div class="flex justify-between font-sans">
                <span>Gimbal Pitch:</span>
                <b class="text-slate-900 font-mono">${wp.gimbalPitch ?? -90}°</b>
              </div>
              <div class="flex justify-between font-sans">
                <span>Ação:</span>
                <b class="text-slate-900 font-sans">${wp.action === 'takePhoto' ? '📸 Foto' : wp.action || 'Voo'}</b>
              </div>
              <div class="text-[10px] text-slate-400 pt-1 font-mono">
                ${wp.lat.toFixed(6)}, ${wp.lng.toFixed(6)}
              </div>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, { maxWidth: 260 });

        marker.on('click', () => {
          if (onSelectWaypoint) {
            onSelectWaypoint(wp.id);
          }
        });

        group.addLayer(marker);
      });
    }

    // Auto Fit Bounds if valid
    if (bounds.isValid() && (waypoints.length > 0 || geometries.length > 0)) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
    }
  }, [waypoints, geometries, showOriginalGeom, showFlightPath, selectedWaypointId, flightAltitude, onSelectWaypoint]);

  const handleFitBounds = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const bounds = L.latLngBounds([]);
    waypoints.forEach((w) => bounds.extend([w.lat, w.lng]));
    geometries.forEach((g) => g.coordinates.forEach((c) => bounds.extend([c.lat, c.lng])));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
    }
  };

  return (
    <div className="relative w-full h-full min-h-[440px] rounded-2xl overflow-hidden border border-[#ffffff10] bg-[#111115] shadow-lg flex-1">
      {/* Leaflet Map Div */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      {/* Flight Path Polyline & Marker Style Config */}
      {/* Top Left: Basemap Layer Switcher */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2">
        {/* Basemaps */}
        <div className="flex items-center bg-[#092329]/95 backdrop-blur-md border border-[#143f47] rounded-2xl p-1 shadow-lg text-xs">
          <button
            id="btn-basemap-satellite"
            onClick={() => setActiveBaseLayer('satellite')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeBaseLayer === 'satellite'
                ? 'bg-[#00f59b] text-black font-bold shadow'
                : 'text-[#82aab2] hover:text-white hover:bg-[#0c262d]'
            }`}
          >
            Satélite
          </button>
          <button
            id="btn-basemap-dark"
            onClick={() => setActiveBaseLayer('dark')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeBaseLayer === 'dark'
                ? 'bg-[#00f59b] text-black font-bold shadow'
                : 'text-[#82aab2] hover:text-white hover:bg-[#0c262d]'
            }`}
          >
            Cockpit Dark
          </button>
          <button
            id="btn-basemap-street"
            onClick={() => setActiveBaseLayer('street')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeBaseLayer === 'street'
                ? 'bg-[#00f59b] text-black font-bold shadow'
                : 'text-[#82aab2] hover:text-white hover:bg-[#0c262d]'
            }`}
          >
            Mapa
          </button>
          <button
            id="btn-basemap-topo"
            onClick={() => setActiveBaseLayer('topo')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeBaseLayer === 'topo'
                ? 'bg-[#00f59b] text-black font-bold shadow'
                : 'text-[#82aab2] hover:text-white hover:bg-[#0c262d]'
            }`}
          >
            Relevo
          </button>
        </div>

        {/* Toggle Overlays */}
        <div className="flex items-center bg-[#092329]/95 backdrop-blur-md border border-[#143f47] rounded-2xl p-1 shadow-lg text-xs">
          <button
            id="btn-toggle-flight-path"
            onClick={() => setShowFlightPath(!showFlightPath)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all font-medium cursor-pointer ${
              showFlightPath ? 'text-[#00f59b] bg-[#00f59b]/15 border border-[#00f59b]/30' : 'text-[#6f969d] hover:text-white'
            }`}
            title="Exibir/Ocultar Rota de Voo DJI"
          >
            {showFlightPath ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Rota DJI</span>
          </button>

          {geometries.length > 0 && (
            <button
              id="btn-toggle-original-geom"
              onClick={() => setShowOriginalGeom(!showOriginalGeom)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all font-medium cursor-pointer ${
                showOriginalGeom ? 'text-amber-400 bg-amber-950/40 border border-amber-500/30' : 'text-[#6f969d] hover:text-white'
              }`}
              title="Exibir/Ocultar Perímetro Original KML"
            >
              {showOriginalGeom ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>KML Original</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Right: Re-center & Mission Map Actions */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
        <button
          id="btn-recenter-map"
          onClick={handleFitBounds}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#092329]/95 hover:bg-[#0c262d] backdrop-blur-md border border-[#143f47] text-xs font-semibold text-[#82aab2] hover:text-white rounded-2xl shadow-lg transition cursor-pointer"
          title="Centralizar e ajustar zoom na rota"
        >
          <Maximize2 className="w-3.5 h-3.5 text-[#00f59b]" />
          <span>Enquadrar</span>
        </button>
      </div>

      {/* Bottom Map Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] hidden sm:flex items-center gap-3 bg-[#092329]/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-[#143f47] text-[11px] text-[#82aab2] shadow-md font-mono">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-[0_0_6px_rgba(245,158,11,0.5)]"></span>
          <span>Home</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00f59b] inline-block shadow-[0_0_6px_rgba(0,245,155,0.5)]"></span>
          <span>Waypoint</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#00f59b] inline-block"></span>
          <span>Trajetória</span>
        </div>
        {geometries.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-b border-dashed border-amber-400 inline-block"></span>
            <span>Perímetro</span>
          </div>
        )}
      </div>
    </div>
  );
};
