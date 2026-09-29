import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Layers,
  Globe,
  Building2,
  Navigation,
  Crosshair,
} from 'lucide-react';
import type { Complaint, HeatmapPoint, HotspotInfo } from '../types/complaint';
import { useTheme } from '../context/ThemeContext';

export type MapMode = 'markers' | 'clusters' | 'heatmap';
export type TileLayerMode = 'normal' | 'satellite' | '3d';

export const DEFAULT_MAP_CENTER: [number, number] = [23.2599, 77.4126];
export const DEFAULT_MAP_ZOOM = 12;

interface LeafletMapProps {
  complaints: Complaint[];
  heatmapPoints?: HeatmapPoint[];
  mapMode: MapMode;
  onMapModeChange: (mode: MapMode) => void;
  onSelectComplaint: (complaint: Complaint) => void;
  focusedHotspot?: HotspotInfo | null;
  heightClass?: string;
  id?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  complaints,
  heatmapPoints = [],
  mapMode,
  onMapModeChange,
  onSelectComplaint,
  focusedHotspot,
  heightClass = 'h-[460px]',
  id = 'city-map',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const tempMarkerRef = useRef<L.CircleMarker | null>(null);
  const { theme } = useTheme();

  // Active tile layer mode state (normal / satellite / 3d)
  const [tileMode, setTileMode] = useState<TileLayerMode>('normal');

  // Geolocation & coordinate state
  const [coordinates, setCoordinates] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  // Helper to build Glowing DivIcon for high-severity civic complaints
  const createGlowingDivIcon = (color: string) => {
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<i class='fas fa-exclamation-circle' style='color:${color}; font-size: 24px; filter: drop-shadow(0 0 8px ${color}cc);'></i>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
    });
  };

  // Tile Layer factory for the three supported modes
  const getTileLayer = (mode: TileLayerMode): L.TileLayer => {
    if (mode === 'satellite') {
      return L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri',
          maxZoom: 18,
        }
      );
    }
    if (mode === '3d') {
      return L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 19,
        }
      );
    }
    // Normal / OpenStreetMap default
    return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    });
  };

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Default Municipal Center (Bhopal, Madhya Pradesh)
    const map = L.map(containerRef.current, {
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      zoomControl: true,
    });

    // Default Layer: Normal OpenStreetMap
    const defaultLayer = getTileLayer('normal');
    defaultLayer.addTo(map);
    tileLayerRef.current = defaultLayer;

    // Layer group for civic data
    const civicLayerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = civicLayerGroup;

    // Handle map click to sync clicked coordinates into location input
    map.on('click', (e: L.LeafletMouseEvent) => {
      const formatted = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
      setCoordinates(formatted);
      setGpsStatus(null);

      const locationInput = document.getElementById(
        'incident-location'
      ) as HTMLInputElement | null;
      if (locationInput) {
        locationInput.value = formatted;
      }

      // Visual indicator on clicked spot
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
      }
      tempMarkerRef.current = L.circleMarker([e.latlng.lat, e.latlng.lng], {
        radius: 6,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.6,
        weight: 2,
      }).addTo(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Switch Tile Layer mode (Normal / Satellite / 3D)
  const handleSwitchTileLayer = (mode: TileLayerMode) => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Remove active tile layer
    map.eachLayer((layer: any) => {
      if (layer._url) {
        map.removeLayer(layer);
      }
    });

    const newLayer = getTileLayer(mode);
    newLayer.addTo(map);
    tileLayerRef.current = newLayer;
    setTileMode(mode);
  };

  // Geolocation trigger (#btn-locate)
  const handleLocateGPS = () => {
    const locationInput = document.getElementById(
      'incident-location'
    ) as HTMLInputElement | null;

    setGpsStatus('Acquiring GPS...');
    setIsLocating(true);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coordsStr = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
          setCoordinates(coordsStr);
          if (locationInput) locationInput.value = coordsStr;
          setGpsStatus('GPS Locked');
          setIsLocating(false);

          if (mapRef.current) {
            mapRef.current.flyTo(
              [pos.coords.latitude, pos.coords.longitude],
              15,
              { duration: 1.2 }
            );

            if (tempMarkerRef.current) tempMarkerRef.current.remove();
            tempMarkerRef.current = L.circleMarker(
              [pos.coords.latitude, pos.coords.longitude],
              {
                radius: 8,
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.7,
                weight: 2,
              }
            ).addTo(mapRef.current);
          }
        },
        () => {
          setGpsStatus('GPS Denied');
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setGpsStatus('GPS Unavailable');
      setIsLocating(false);
    }
  };

  // Render Civic Complaints from website data (markers / clusters / heatmap)
  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current) return;
    const map = mapRef.current;
    const group = layerGroupRef.current;
    group.clearLayers();

    const getSeverityColor = (sev: string): string => {
      switch (sev?.toUpperCase()) {
        case 'CRITICAL':
          return '#e11d48';
        case 'HIGH':
          return '#d97706';
        case 'MEDIUM':
          return '#0284c7';
        case 'LOW':
        default:
          return '#64748b';
      }
    };

    if (mapMode === 'markers') {
      complaints.forEach((c) => {
        if (!c.latitude || !c.longitude) return;

        const isCritical = c.severity?.toUpperCase() === 'CRITICAL';
        const isHigh = c.severity?.toUpperCase() === 'HIGH';
        const color = getSeverityColor(c.severity);

        let marker: L.Marker | L.CircleMarker;

        // Use Custom Glowing DivIcon for Critical and High severity municipal hazards
        if (isCritical || isHigh) {
          const glowingIcon = createGlowingDivIcon(color);
          marker = L.marker([c.latitude, c.longitude], { icon: glowingIcon });
        } else {
          marker = L.circleMarker([c.latitude, c.longitude], {
            radius: 6,
            fillColor: color,
            color: theme === 'dark' ? '#0f172a' : '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
          });
        }

        // Informative popup
        const popupContent = document.createElement('div');
        popupContent.className = 'p-3 text-xs space-y-1.5 font-sans min-w-[210px]';
        popupContent.innerHTML = `
          <div style="font-weight: 700; font-family: monospace; font-size: 12px; color: ${color};">${c.report_id}</div>
          <div style="font-size: 11px; opacity: 0.85; line-height: 1.3; font-weight: 500;">${c.location_name}</div>
          ${c.description ? `<div style="font-size: 11px; opacity: 0.7; margin-top: 2px;">${c.description.slice(0, 80)}${c.description.length > 80 ? '...' : ''}</div>` : ''}
          <div style="display: flex; gap: 6px; margin-top: 6px; align-items: center;">
            <span style="background: ${color}18; color: ${color}; border: 1px solid ${color}35; padding: 1px 6px; border-radius: 4px; font-weight: 600; font-size: 10px;">${c.severity}</span>
            <span style="background: ${theme === 'dark' ? '#1e293b' : '#f1f5f9'}; opacity: 0.85; padding: 1px 6px; border-radius: 4px; font-size: 10px; text-transform: capitalize;">${c.problem_type}</span>
            <span style="font-size: 10px; opacity: 0.6; margin-left: auto;">${c.status}</span>
          </div>
        `;

        const inspectBtn = document.createElement('button');
        inspectBtn.innerText = 'Inspect Complaint →';
        inspectBtn.style.marginTop = '8px';
        inspectBtn.style.display = 'block';
        inspectBtn.style.fontSize = '11px';
        inspectBtn.style.fontWeight = '600';
        inspectBtn.style.color = '#3b82f6';
        inspectBtn.style.cursor = 'pointer';
        inspectBtn.style.background = 'none';
        inspectBtn.style.border = 'none';
        inspectBtn.style.padding = '0';

        inspectBtn.onclick = () => {
          onSelectComplaint(c);
          map.closePopup();
        };

        popupContent.appendChild(inspectBtn);
        marker.bindPopup(popupContent);
        marker.addTo(group);
      });
    } else if (mapMode === 'clusters') {
      const clusters: Record<
        string,
        {
          lat: number;
          lng: number;
          count: number;
          criticalCount: number;
          items: Complaint[];
        }
      > = {};

      const roundCoord = (coord: number) => Math.round(coord * 65) / 65;

      complaints.forEach((c) => {
        if (!c.latitude || !c.longitude) return;
        const key = `${roundCoord(c.latitude)}_${roundCoord(c.longitude)}`;
        if (!clusters[key]) {
          clusters[key] = {
            lat: c.latitude,
            lng: c.longitude,
            count: 0,
            criticalCount: 0,
            items: [],
          };
        }
        clusters[key].count += 1;
        if (c.severity === 'CRITICAL' || c.severity === 'HIGH') {
          clusters[key].criticalCount += 1;
        }
        clusters[key].items.push(c);
      });

      Object.values(clusters).forEach((cl) => {
        const radius = Math.min(28, Math.max(15, cl.count * 5));
        const hasCritical = cl.criticalCount > 0;
        const color = hasCritical ? '#e11d48' : '#3b82f6';

        const clusterMarker = L.circleMarker([cl.lat, cl.lng], {
          radius: radius,
          fillColor: color,
          color: theme === 'dark' ? '#0f172a' : '#ffffff',
          weight: 2,
          opacity: 0.95,
          fillOpacity: 0.75,
        });

        const icon = L.divIcon({
          className: 'cluster-label',
          html: `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-weight:700;font-size:11px;color:#ffffff;font-family:sans-serif;">${cl.count}</div>`,
          iconSize: [radius * 2, radius * 2],
          iconAnchor: [radius, radius],
        });
        const textMarker = L.marker([cl.lat, cl.lng], { icon });

        clusterMarker.bindPopup(`
          <div style="padding: 10px; font-family: sans-serif; font-size: 12px;">
            <div style="font-weight: 700; margin-bottom: 4px;">Zone Cluster Area</div>
            <div>Total reports in zone: <b>${cl.count}</b></div>
            <div style="color: ${hasCritical ? '#e11d48' : '#10b981'}; font-size: 11px; margin-top: 2px;">
              High/Critical priority: ${cl.criticalCount}
            </div>
          </div>
        `);

        clusterMarker.addTo(group);
        textMarker.addTo(group);
      });
    } else if (mapMode === 'heatmap') {
      const points =
        heatmapPoints.length > 0
          ? heatmapPoints
          : complaints.map((c) => ({
              latitude: c.latitude,
              longitude: c.longitude,
              weight:
                c.severity === 'CRITICAL' ? 1.0 : c.severity === 'HIGH' ? 0.75 : 0.4,
              problem_type: c.problem_type,
              severity: c.severity,
              report_id: c.report_id,
            }));

      points.forEach((p) => {
        if (!p.latitude || !p.longitude) return;
        const lat = p.latitude;
        const lng = p.longitude;
        const weight = p.weight || 0.5;

        L.circle([lat, lng], {
          radius: 350 * weight,
          fillColor:
            weight > 0.7 ? '#e11d48' : weight > 0.5 ? '#f59e0b' : '#38bdf8',
          color: 'transparent',
          fillOpacity: 0.28,
        }).addTo(group);

        L.circleMarker([lat, lng], {
          radius: 4,
          fillColor: weight > 0.7 ? '#be123c' : '#d97706',
          color: '#ffffff',
          weight: 1,
          opacity: 0.9,
          fillOpacity: 0.9,
        }).addTo(group);
      });
    }

    // Corridor Hotspot focus highlight
    if (focusedHotspot && focusedHotspot.latitude && focusedHotspot.longitude) {
      const pulseCircle = L.circle(
        [focusedHotspot.latitude, focusedHotspot.longitude],
        {
          radius: (focusedHotspot.radius_km || 1) * 1000,
          fillColor: '#d97706',
          color: '#f59e0b',
          weight: 2,
          dashArray: '6, 6',
          fillOpacity: 0.12,
        }
      ).addTo(group);

      pulseCircle.bindTooltip(`Hotspot: ${focusedHotspot.title}`, {
        permanent: true,
        direction: 'top',
        className: 'font-semibold text-xs',
      });

      map.flyTo([focusedHotspot.latitude, focusedHotspot.longitude], 14, {
        duration: 1.2,
      });
    }
  }, [complaints, heatmapPoints, mapMode, focusedHotspot, theme]);

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs ${heightClass} flex flex-col`}
    >
      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Layer Switcher (Normal / Satellite / 3D) matching .map-btn & data-mode */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 rounded-lg p-1 flex items-center gap-1 shadow-xs pointer-events-auto">
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 px-2 select-none tracking-wider">
            Layer
          </span>
          <button
            type="button"
            data-mode="normal"
            onClick={() => handleSwitchTileLayer('normal')}
            className={`map-btn ${tileMode === 'normal' ? 'active' : ''}`}
            title="OpenStreetMap Standard Vector"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Normal</span>
          </button>
          <button
            type="button"
            data-mode="satellite"
            onClick={() => handleSwitchTileLayer('satellite')}
            className={`map-btn ${tileMode === 'satellite' ? 'active' : ''}`}
            title="Esri World Satellite Imagery"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Satellite</span>
          </button>
          <button
            type="button"
            data-mode="3d"
            onClick={() => handleSwitchTileLayer('3d')}
            className={`map-btn ${tileMode === '3d' ? 'active' : ''}`}
            title="Carto Dark 3D Layer"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>3D Dark</span>
          </button>
        </div>

        {/* Right side: Map visualization mode selector (Markers / Clusters / Heatmap) */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 rounded-lg p-1 flex items-center gap-1 shadow-xs pointer-events-auto">
          {(['markers', 'clusters', 'heatmap'] as MapMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onMapModeChange(mode)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                mapMode === mode
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Main Map Viewport (Matches id="city-map") */}
      <div id={id} ref={containerRef} className="w-full h-full flex-1" />

      {/* Bottom Floating Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Severity Legend */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 rounded-lg px-3 py-1.5 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-3 shadow-xs pointer-events-auto">
          <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">
            Severity
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-600" />
            Critical
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            High
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-600" />
            Medium
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Low
          </span>
        </div>

        {/* GPS Geolocation & Coordinate Tool (#btn-locate, #incident-location) */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 rounded-lg p-1.5 flex items-center gap-1.5 shadow-xs pointer-events-auto">
          <Crosshair className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          <input
            id="incident-location"
            type="text"
            readOnly
            placeholder="Click map for GPS coords"
            value={coordinates}
            className="w-36 sm:w-44 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-0.5 text-[11px] font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
            title="Target coordinates from map click or GPS locate"
          />
          <button
            type="button"
            id="btn-locate"
            onClick={handleLocateGPS}
            disabled={isLocating}
            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded text-xs font-medium flex items-center gap-1 shadow-xs transition-colors shrink-0 disabled:opacity-50"
            title="Center map on device GPS location"
          >
            <Navigation
              className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`}
            />
            <span>{isLocating ? 'Locating...' : 'Locate Me'}</span>
          </button>
          {gpsStatus && (
            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 px-1">
              {gpsStatus}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
