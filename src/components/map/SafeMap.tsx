'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GeoPoint, DynamicGeofence, TouristTelemetry, ThreatLevel } from '@/types';
import { PREDEFINED_EMERGENCY_SERVICES } from '@/lib/safety/geofence-engine';
import { Layers, Shield, Check } from 'lucide-react';

// 100% Free Open-Source Map Tile Providers (Zero API keys required)
export const FREE_MAP_TILES = {
  osm_standard: {
    id: 'osm_standard',
    name: 'OpenStreetMap (Standard Free)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
  },
  osm_humanitarian: {
    id: 'osm_humanitarian',
    name: 'OpenStreetMap (Humanitarian HOT)',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, Humanitarian OpenStreetMap Team',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
  },
  osm_dark: {
    id: 'osm_dark',
    name: 'OpenStreetMap (Dark Free)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 19,
    subdomains: 'abcd',
  },
  osm_topo: {
    id: 'osm_topo',
    name: 'OpenTopoMap (Topographic Free)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap & OpenTopoMap',
    maxZoom: 17,
    subdomains: ['a', 'b', 'c'],
  },
} as const;

export type FreeMapTileId = keyof typeof FREE_MAP_TILES;

interface SafeMapProps {
  center: GeoPoint;
  zoom?: number;
  geofences?: DynamicGeofence[];
  tourists?: TouristTelemetry[];
  guideLocation?: GeoPoint;
  currentTouristLocation?: GeoPoint;
  activeRouteWaypoints?: GeoPoint[];
  routeType?: 'safest' | 'balanced' | 'shortest';
  showEmergencyServices?: boolean;
  onMapClick?: (point: GeoPoint) => void;
  isPlacingGeofence?: boolean;
  selectedGeofenceId?: string | null;
  onSelectGeofence?: (gf: DynamicGeofence) => void;
  className?: string;
  defaultTileStyle?: FreeMapTileId;
}

export default function SafeMap({
  center,
  zoom = 14,
  geofences = [],
  tourists = [],
  guideLocation,
  currentTouristLocation,
  activeRouteWaypoints,
  routeType = 'safest',
  showEmergencyServices = true,
  onMapClick,
  isPlacingGeofence = false,
  selectedGeofenceId,
  onSelectGeofence,
  className = 'h-full w-full',
  defaultTileStyle = 'osm_standard',
}: SafeMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const currentTileLayerRef = useRef<any>(null);
  const [activeTileStyle, setActiveTileStyle] = useState<FreeMapTileId>(defaultTileStyle);
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);

  const layersRef = useRef<{
    geofences: any[];
    tourists: any[];
    guide: any | null;
    currentTourist: any | null;
    route: any | null;
    emergency: any[];
  }>({
    geofences: [],
    tourists: [],
    guide: null,
    currentTourist: null,
    route: null,
    emergency: [],
  });

  // 1. Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = (await import('leaflet')).default;

      if (!isMounted || !mapContainerRef.current) return;

      // Fix missing Leaflet default icon URLs
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapContainerRef.current, {
        center: [center.lat, center.lng],
        zoom,
        zoomControl: false,
      });

      // Mount 100% Free OpenStreetMap tile layer (No API key needed)
      const tileConfig = FREE_MAP_TILES[activeTileStyle];
      const tileLayer = L.tileLayer(tileConfig.url, {
        attribution: tileConfig.attribution,
        maxZoom: tileConfig.maxZoom,
        subdomains: tileConfig.subdomains as any,
      }).addTo(map);

      currentTileLayerRef.current = tileLayer;

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Handle Map Click
      map.on('click', (e: any) => {
        if (onMapClick) {
          onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
      });

      mapInstanceRef.current = map;
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer when user switches Free Map style
  useEffect(() => {
    async function switchTileLayer() {
      if (!mapInstanceRef.current) return;
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;

      if (currentTileLayerRef.current) {
        currentTileLayerRef.current.remove();
      }

      const tileConfig = FREE_MAP_TILES[activeTileStyle];
      const newLayer = L.tileLayer(tileConfig.url, {
        attribution: tileConfig.attribution,
        maxZoom: tileConfig.maxZoom,
        subdomains: tileConfig.subdomains as any,
      }).addTo(map);

      currentTileLayerRef.current = newLayer;
    }

    switchTileLayer();
  }, [activeTileStyle]);

  // 2. Render Dynamic Geofences
  useEffect(() => {
    async function updateGeofences() {
      if (!mapInstanceRef.current) return;
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;

      // Clean existing geofence layers
      layersRef.current.geofences.forEach((layer) => layer.remove());
      layersRef.current.geofences = [];

      geofences.forEach((gf) => {
        if (!gf.isActive) return;

        const colorConfig = getThreatColor(gf.threatLevel, gf.reason);
        const isSelected = selectedGeofenceId === gf.id;

        // Base circle
        const circle = L.circle([gf.center.lat, gf.center.lng], {
          radius: gf.adaptiveRadiusMeters,
          color: colorConfig.stroke,
          weight: isSelected ? 3 : 2,
          dashArray: gf.reason === 'safe_haven' ? '6, 6' : undefined,
          fillColor: colorConfig.fill,
          fillOpacity: isSelected ? 0.45 : 0.25,
        }).addTo(map);

        // Center Marker Icon with Threat Badge
        const iconHtml = `
          <div class="relative flex items-center justify-center">
            <span class="absolute inline-flex h-8 w-8 rounded-full ${colorConfig.pulseClass} opacity-75"></span>
            <div class="relative inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold text-white shadow-lg ${colorConfig.badgeBg} border-2 border-slate-900">
              ${gf.threatLevel === 'safe' ? '🛡️' : gf.threatLevel === 'critical' ? '⚡' : '⚠️'}
            </div>
          </div>
        `;

        const centerIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-geofence-icon',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const centerMarker = L.marker([gf.center.lat, gf.center.lng], { icon: centerIcon }).addTo(map);

        // Popup Content
        const popupContent = `
          <div class="p-1 min-w-[220px]">
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${colorConfig.badgeBg} text-white uppercase tracking-wider">
                ${gf.threatLevel.toUpperCase()}
              </span>
              <span class="text-[11px] text-slate-400 font-mono">Radius: ${gf.adaptiveRadiusMeters}m</span>
            </div>
            <h4 class="text-sm font-bold text-slate-100">${gf.name}</h4>
            <p class="text-xs text-slate-300 mt-1 leading-relaxed">${gf.description}</p>
            ${
              gf.anomalyDetails?.delayMinutes
                ? `<div class="mt-2 text-[11px] text-amber-300 bg-amber-950/60 p-1.5 rounded border border-amber-800/40">
                    Est. Delay: +${gf.anomalyDetails.delayMinutes} mins | Anomaly Active
                   </div>`
                : ''
            }
          </div>
        `;

        circle.bindPopup(popupContent);
        centerMarker.bindPopup(popupContent);

        circle.on('click', () => onSelectGeofence && onSelectGeofence(gf));
        centerMarker.on('click', () => onSelectGeofence && onSelectGeofence(gf));

        layersRef.current.geofences.push(circle, centerMarker);
      });
    }

    updateGeofences();
  }, [geofences, selectedGeofenceId]);

  // 3. Render Tourists Telemetry
  useEffect(() => {
    async function updateTourists() {
      if (!mapInstanceRef.current) return;
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;

      layersRef.current.tourists.forEach((layer) => layer.remove());
      layersRef.current.tourists = [];

      tourists.forEach((trv) => {
        const isHazard = trv.geofenceStatus === 'in_hazard_zone';
        const isSafeHaven = trv.geofenceStatus === 'in_safe_haven';

        const touristIcon = L.divIcon({
          html: `
            <div class="group relative flex items-center justify-center cursor-pointer">
              ${isHazard ? '<span class="absolute inline-flex h-9 w-9 rounded-full bg-rose-500 animate-ping opacity-75"></span>' : ''}
              <div class="relative flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                isHazard ? 'border-rose-400 bg-rose-900' : isSafeHaven ? 'border-emerald-400 bg-emerald-900' : 'border-blue-400 bg-blue-900'
              } shadow-md overflow-hidden">
                <span class="text-xs font-bold text-white">${trv.name.slice(0, 2).toUpperCase()}</span>
              </div>
              <div class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                trv.batteryLevel > 30 ? 'bg-emerald-400' : 'bg-red-500'
              }"></div>
            </div>
          `,
          className: 'custom-tourist-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([trv.location.lat, trv.location.lng], { icon: touristIcon }).addTo(map);

        marker.bindPopup(`
          <div class="p-1">
            <h4 class="text-xs font-bold text-slate-100">${trv.name}</h4>
            <div class="text-[11px] text-slate-300 mt-1 flex flex-col gap-0.5">
              <span>Status: <strong class="${isHazard ? 'text-rose-400 font-bold' : isSafeHaven ? 'text-emerald-400' : 'text-blue-400'}">${trv.geofenceStatus.replace('_', ' ').toUpperCase()}</strong></span>
              <span>Battery: <strong>${trv.batteryLevel}%</strong></span>
              <span>Last update: ${trv.lastPing}</span>
            </div>
          </div>
        `);

        layersRef.current.tourists.push(marker);
      });
    }

    updateTourists();
  }, [tourists]);

  // 4. Render Current Tourist (User) Marker
  useEffect(() => {
    async function updateCurrentTourist() {
      if (!mapInstanceRef.current) return;
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;

      if (layersRef.current.currentTourist) {
        layersRef.current.currentTourist.remove();
        layersRef.current.currentTourist = null;
      }

      if (currentTouristLocation) {
        const userIcon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center">
              <span class="absolute inline-flex h-11 w-11 rounded-full bg-cyan-400/40 animate-ping"></span>
              <div class="relative flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 border-2 border-white shadow-xl text-white font-bold text-sm">
                📍
              </div>
            </div>
          `,
          className: 'custom-user-marker',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([currentTouristLocation.lat, currentTouristLocation.lng], {
          icon: userIcon,
          zIndexOffset: 1000,
        }).addTo(map);

        marker.bindPopup(`
          <div class="p-1">
            <strong class="text-xs text-cyan-300">You Are Here</strong>
            <p class="text-[11px] text-slate-400">Live GPS Broadcasting Active</p>
          </div>
        `);

        layersRef.current.currentTourist = marker;
      }
    }

    updateCurrentTourist();
  }, [currentTouristLocation]);

  // 5. Render Tour Guide Beacon
  useEffect(() => {
    async function updateGuide() {
      if (!mapInstanceRef.current) return;
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;

      if (layersRef.current.guide) {
        layersRef.current.guide.remove();
        layersRef.current.guide = null;
      }

      if (guideLocation) {
        const guideIcon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center">
              <span class="absolute inline-flex h-10 w-10 rounded-full bg-amber-400/30 animate-pulse"></span>
              <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 border-2 border-slate-900 shadow-xl text-white font-bold text-xs">
                ⭐
              </div>
            </div>
          `,
          className: 'custom-guide-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([guideLocation.lat, guideLocation.lng], {
          icon: guideIcon,
          zIndexOffset: 900,
        }).addTo(map);

        marker.bindPopup(`
          <div class="p-1">
            <strong class="text-xs text-amber-400">Tour Guide Beacon</strong>
            <p class="text-[11px] text-slate-400">Master Guide Laurent Mercier</p>
          </div>
        `);

        layersRef.current.guide = marker;
      }
    }

    updateGuide();
  }, [guideLocation]);

  // 6. Render Active Route Polyline
  useEffect(() => {
    async function updateRoute() {
      if (!mapInstanceRef.current) return;
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;

      if (layersRef.current.route) {
        layersRef.current.route.remove();
        layersRef.current.route = null;
      }

      if (activeRouteWaypoints && activeRouteWaypoints.length >= 2) {
        const latLngs = activeRouteWaypoints.map((p) => [p.lat, p.lng]);

        let routeColor = '#10b981'; // Safest (Emerald)
        if (routeType === 'balanced') routeColor = '#8b5cf6'; // Balanced (Purple)
        if (routeType === 'shortest') routeColor = '#64748b'; // Shortest (Slate)

        const polyline = L.polyline(latLngs, {
          color: routeColor,
          weight: 5,
          opacity: 0.85,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        layersRef.current.route = polyline;
      }
    }

    updateRoute();
  }, [activeRouteWaypoints, routeType]);

  // 7. Render Emergency Services
  useEffect(() => {
    async function updateEmergency() {
      if (!mapInstanceRef.current) return;
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;

      layersRef.current.emergency.forEach((layer) => layer.remove());
      layersRef.current.emergency = [];

      if (!showEmergencyServices) return;

      PREDEFINED_EMERGENCY_SERVICES.forEach((srv) => {
        const isPolice = srv.type === 'police';
        const emIcon = L.divIcon({
          html: `
            <div class="flex items-center justify-center w-6 h-6 rounded-md ${
              isPolice ? 'bg-indigo-600' : 'bg-red-600'
            } text-white text-[11px] shadow border border-white/50">
              ${isPolice ? '👮' : '🏥'}
            </div>
          `,
          className: 'custom-emergency-icon',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([srv.location.lat, srv.location.lng], { icon: emIcon }).addTo(map);
        marker.bindPopup(`
          <div class="p-1">
            <strong class="text-xs text-slate-100">${srv.name}</strong>
            <p class="text-[11px] text-slate-400">${srv.address}</p>
            <p class="text-[11px] text-emerald-400 font-semibold mt-1">📞 ${srv.phone}</p>
          </div>
        `);

        layersRef.current.emergency.push(marker);
      });
    }

    updateEmergency();
  }, [showEmergencyServices]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainerRef} className="h-full w-full" />

      {/* Free Map Tile Selector Control (Top Right) */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end">
        <button
          onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 backdrop-blur-md border border-slate-700/80 text-xs font-semibold text-slate-200 shadow-xl transition-all"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>{FREE_MAP_TILES[activeTileStyle].name}</span>
          <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-700/40">
            Free
          </span>
        </button>

        {isStyleMenuOpen && (
          <div className="mt-2 w-64 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700 p-2 shadow-2xl space-y-1">
            <div className="px-2 py-1 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Free Map Tile Providers (No API Keys)
            </div>

            {Object.entries(FREE_MAP_TILES).map(([key, tile]) => {
              const isSelected = activeTileStyle === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setActiveTileStyle(key as FreeMapTileId);
                    setIsStyleMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-left transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow'
                      : 'text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <span className="truncate">{tile.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                </button>
              );
            })}

            <div className="px-2 pt-1.5 border-t border-slate-800 text-[10px] text-slate-500">
              Powered by OpenStreetMap community data. 100% free forever.
            </div>
          </div>
        )}
      </div>

      {isPlacingGeofence && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 backdrop-blur-md border border-cyan-500/50 text-cyan-200 px-4 py-2 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2 animate-bounce">
          <span>🎯</span> Click on the map to set geofence center point
        </div>
      )}
    </div>
  );
}

function getThreatColor(threat: ThreatLevel, reason: string) {
  if (reason === 'safe_haven' || threat === 'safe') {
    return {
      stroke: '#10b981',
      fill: '#10b981',
      badgeBg: 'bg-emerald-600',
      pulseClass: 'bg-emerald-400',
    };
  }
  switch (threat) {
    case 'low':
      return {
        stroke: '#eab308',
        fill: '#eab308',
        badgeBg: 'bg-yellow-600',
        pulseClass: 'bg-yellow-400',
      };
    case 'medium':
      return {
        stroke: '#f97316',
        fill: '#f97316',
        badgeBg: 'bg-orange-600',
        pulseClass: 'bg-orange-400',
      };
    case 'high':
      return {
        stroke: '#ef4444',
        fill: '#ef4444',
        badgeBg: 'bg-red-600',
        pulseClass: 'bg-red-400',
      };
    case 'critical':
      return {
        stroke: '#991b1b',
        fill: '#7f1d1d',
        badgeBg: 'bg-red-900',
        pulseClass: 'bg-red-600 animate-ping',
      };
  }
}
