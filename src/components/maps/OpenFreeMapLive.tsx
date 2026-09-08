import React, { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, Marker as MapLibreMarker, NavigationControl, AttributionControl, GeoJSONSource } from 'maplibre-gl';
import L from 'leaflet';
import { TouristDestination, Incident, EmergencyService, RiskZone } from '../../types';
import { OPENFREEMAP_STYLES, OpenFreeMapStyleId, createGeoJsonCircle } from '../../utils/mapUtils';
import { isWebGLSupported } from '../../utils/webglCheck';
import { Layers, MapPin, AlertTriangle, ShieldAlert, Phone, Shield } from 'lucide-react';

interface OpenFreeMapLiveProps {
  center: { lat: number; lng: number };
  zoom?: number;
  styleId: OpenFreeMapStyleId;
  safetyStatus?: {
    score: number;
    category: string;
    geofenceRadius: number;
  };
  destinations: TouristDestination[];
  riskZones: RiskZone[];
  incidents: Incident[];
  emergencyServices: EmergencyService[];
  layers: {
    destinations: boolean;
    riskZones: boolean;
    incidents: boolean;
    emergency: boolean;
    geofence: boolean;
  };
  recenterTrigger: number;
  onSelectDestination: (dest: TouristDestination) => void;
  onSelectIncident: (inc: Incident) => void;
  onSelectEmergency: (svc: EmergencyService) => void;
  onSelectZone: (zone: RiskZone) => void;
}

export const OpenFreeMapLive: React.FC<OpenFreeMapLiveProps> = ({
  center,
  zoom = 14,
  styleId,
  safetyStatus,
  destinations,
  riskZones,
  incidents,
  emergencyServices,
  layers,
  recenterTrigger,
  onSelectDestination,
  onSelectIncident,
  onSelectEmergency,
  onSelectZone,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Engine: Vector (MapLibre) or Leaflet (Standard OSM)
  const [engine, setEngine] = useState<'vector' | 'leaflet'>(() => {
    return isWebGLSupported() ? 'vector' : 'leaflet';
  });

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // MapLibre references
  const maplibreRef = useRef<MapLibreMap | null>(null);
  const mlUserMarker = useRef<MapLibreMarker | null>(null);
  const mlDestMarkers = useRef<MapLibreMarker[]>([]);
  const mlIncidentMarkers = useRef<MapLibreMarker[]>([]);
  const mlEmergencyMarkers = useRef<MapLibreMarker[]>([]);

  // Leaflet references
  const leafletRef = useRef<L.Map | null>(null);
  const lfUserMarker = useRef<L.Marker | null>(null);
  const lfDestMarkers = useRef<L.Marker[]>([]);
  const lfIncidentMarkers = useRef<L.Marker[]>([]);
  const lfEmergencyMarkers = useRef<L.Marker[]>([]);
  const lfRiskCircles = useRef<L.Circle[]>([]);
  const lfGeofenceCircle = useRef<L.Circle | null>(null);

  // ----------------------------------------------------
  // 1. LEAFLET IMPLEMENTATION
  // ----------------------------------------------------
  const initLeaflet = () => {
    if (!containerRef.current) return;

    if (leafletRef.current) {
      leafletRef.current.remove();
      leafletRef.current = null;
    }

    try {
      const map = L.map(containerRef.current, {
        center: [center.lat, center.lng],
        zoom,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB &copy; OpenStreetMap contributors',
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      leafletRef.current = map;
      setMapLoaded(true);
      setMapError(null);

      // Staged resizes
      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 400);
      setTimeout(() => map.invalidateSize(), 1000);
    } catch (err: any) {
      console.error('Leaflet init failed:', err);
      setMapError('Failed to display map.');
    }
  };

  // Sync Leaflet Layers
  useEffect(() => {
    if (engine !== 'leaflet' || !leafletRef.current) return;
    const map = leafletRef.current;

    // 1. User Location Marker
    if (lfUserMarker.current) lfUserMarker.current.remove();
    const userEl = `
      <div class="relative flex items-center justify-center w-8 h-8">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60"></span>
        <div class="relative w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md"></div>
      </div>
    `;
    const userIcon = L.divIcon({ className: 'custom-user-marker', html: userEl, iconSize: [32, 32], iconAnchor: [16, 16] });
    lfUserMarker.current = L.marker([center.lat, center.lng], { icon: userIcon }).addTo(map);

    // 2. Geofence Circle
    if (lfGeofenceCircle.current) {
      lfGeofenceCircle.current.remove();
      lfGeofenceCircle.current = null;
    }
    if (layers.geofence && safetyStatus) {
      const isSafe = safetyStatus.category === 'SAFE';
      lfGeofenceCircle.current = L.circle([center.lat, center.lng], {
        radius: safetyStatus.geofenceRadius,
        color: isSafe ? '#10b981' : '#f59e0b',
        fillColor: isSafe ? '#10b981' : '#f59e0b',
        fillOpacity: 0.12,
        weight: 2,
        dashArray: '4, 4',
      }).addTo(map);
    }

    // 3. Risk Zones
    lfRiskCircles.current.forEach(c => c.remove());
    lfRiskCircles.current = [];
    if (layers.riskZones) {
      riskZones.forEach(zone => {
        const isHigh = zone.riskLevel === 'HIGH';
        const circle = L.circle([zone.center.lat, zone.center.lng], {
          radius: zone.radius,
          color: isHigh ? '#ef4444' : '#f59e0b',
          fillColor: isHigh ? '#ef4444' : '#f59e0b',
          fillOpacity: 0.22,
          weight: 2,
        }).addTo(map);
        circle.on('click', () => onSelectZone(zone));
        lfRiskCircles.current.push(circle);
      });
    }

    // 4. Destinations
    lfDestMarkers.current.forEach(m => m.remove());
    lfDestMarkers.current = [];
    if (layers.destinations) {
      destinations.forEach(dest => {
        const el = `
          <div class="cursor-pointer flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white shadow-md border-2 border-white hover:scale-125 transition-transform">
            <span class="text-[11px] font-bold">📍</span>
          </div>
        `;
        const icon = L.divIcon({ className: 'custom-dest-marker', html: el, iconSize: [28, 28], iconAnchor: [14, 14] });
        const marker = L.marker([dest.location.lat, dest.location.lng], { icon }).addTo(map);
        marker.on('click', () => onSelectDestination(dest));
        lfDestMarkers.current.push(marker);
      });
    }

    // 5. Incidents
    lfIncidentMarkers.current.forEach(m => m.remove());
    lfIncidentMarkers.current = [];
    if (layers.incidents) {
      incidents.forEach(inc => {
        const el = `
          <div class="cursor-pointer flex items-center justify-center w-7 h-7 rounded-full bg-rose-600 text-white shadow-md border-2 border-white animate-pulse">
            <span class="text-[11px] font-bold">⚠️</span>
          </div>
        `;
        const icon = L.divIcon({ className: 'custom-inc-marker', html: el, iconSize: [28, 28], iconAnchor: [14, 14] });
        const marker = L.marker([inc.location.lat, inc.location.lng], { icon }).addTo(map);
        marker.on('click', () => onSelectIncident(inc));
        lfIncidentMarkers.current.push(marker);
      });
    }

    // 6. Emergency Services
    lfEmergencyMarkers.current.forEach(m => m.remove());
    lfEmergencyMarkers.current = [];
    if (layers.emergency) {
      emergencyServices.forEach(svc => {
        const el = `
          <div class="cursor-pointer flex items-center justify-center w-7 h-7 rounded-full bg-purple-600 text-white shadow-md border-2 border-white hover:scale-125 transition-transform">
            <span class="text-[11px] font-bold">🏥</span>
          </div>
        `;
        const icon = L.divIcon({ className: 'custom-svc-marker', html: el, iconSize: [28, 28], iconAnchor: [14, 14] });
        const marker = L.marker([svc.location.lat, svc.location.lng], { icon }).addTo(map);
        marker.on('click', () => onSelectEmergency(svc));
        lfEmergencyMarkers.current.push(marker);
      });
    }
  }, [engine, center, safetyStatus, destinations, riskZones, incidents, emergencyServices, layers, mapLoaded]);

  // Handle Recenter
  useEffect(() => {
    if (recenterTrigger === 0) return;
    if (engine === 'leaflet' && leafletRef.current) {
      leafletRef.current.flyTo([center.lat, center.lng], 15);
    } else if (engine === 'vector' && maplibreRef.current) {
      maplibreRef.current.flyTo({ center: [center.lng, center.lat], zoom: 15 });
    }
  }, [recenterTrigger]);

  // ----------------------------------------------------
  // 2. MAPLIBRE VECTOR IMPLEMENTATION
  // ----------------------------------------------------
  const initMapLibre = () => {
    if (!containerRef.current) return;

    if (maplibreRef.current) {
      maplibreRef.current.remove();
      maplibreRef.current = null;
    }

    try {
      const initialStyle = OPENFREEMAP_STYLES[styleId] || OPENFREEMAP_STYLES.liberty;

      const map = new MapLibreMap({
        container: containerRef.current,
        style: initialStyle,
        center: [center.lng, center.lat],
        zoom,
        attributionControl: false,
      });

      map.addControl(new NavigationControl({ showCompass: true, showZoom: true }), 'top-right');
      map.addControl(
        new AttributionControl({
          customAttribution: '© OpenFreeMap © OpenStreetMap',
          compact: true,
        }),
        'bottom-right'
      );

      let timeoutFallback = setTimeout(() => {
        if (!map.isStyleLoaded()) {
          console.warn('MapLibre vector tile loading timeout. Falling back to Leaflet standard...');
          setEngine('leaflet');
        }
      }, 4000);

      map.on('load', () => {
        clearTimeout(timeoutFallback);
        maplibreRef.current = map;
        setMapLoaded(true);
        setMapError(null);
        map.resize();
        updateMapLibreLayers();
      });

      map.on('error', (e) => {
        console.warn('MapLibre vector error:', e);
        if (!maplibreRef.current) {
          clearTimeout(timeoutFallback);
          setEngine('leaflet');
        }
      });

      setTimeout(() => map.resize(), 100);
      setTimeout(() => map.resize(), 400);
      setTimeout(() => map.resize(), 1000);
    } catch (err) {
      console.warn('MapLibre failed to initialize (WebGL unavailable?):', err);
      setEngine('leaflet');
    }
  };

  const updateMapLibreLayers = () => {
    const map = maplibreRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Geofence Circle
    const geofenceSourceId = 'user-geofence-source';
    const geofenceFillId = 'user-geofence-fill';
    const geofenceLineId = 'user-geofence-line';

    try {
      if (map.getLayer(geofenceFillId)) map.removeLayer(geofenceFillId);
      if (map.getLayer(geofenceLineId)) map.removeLayer(geofenceLineId);
      if (map.getSource(geofenceSourceId)) map.removeSource(geofenceSourceId);
    } catch {}

    if (layers.geofence && safetyStatus) {
      const circleGeoJson = createGeoJsonCircle(center, safetyStatus.geofenceRadius);
      map.addSource(geofenceSourceId, { type: 'geojson', data: circleGeoJson });
      map.addLayer({
        id: geofenceFillId,
        type: 'fill',
        source: geofenceSourceId,
        paint: { 'fill-color': '#10b981', 'fill-opacity': 0.12 },
      });
      map.addLayer({
        id: geofenceLineId,
        type: 'line',
        source: geofenceSourceId,
        paint: { 'line-color': '#059669', 'line-width': 2, 'line-dasharray': [3, 2] },
      });
    }

    // User Marker
    if (mlUserMarker.current) mlUserMarker.current.remove();
    const userEl = document.createElement('div');
    userEl.innerHTML = `
      <div class="relative flex items-center justify-center w-8 h-8">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60"></span>
        <div class="relative w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md"></div>
      </div>
    `;
    mlUserMarker.current = new MapLibreMarker({ element: userEl }).setLngLat([center.lng, center.lat]).addTo(map);

    // Destination Markers
    mlDestMarkers.current.forEach(m => m.remove());
    mlDestMarkers.current = [];
    if (layers.destinations) {
      destinations.forEach(dest => {
        const el = document.createElement('div');
        el.className = 'cursor-pointer flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white shadow-md border-2 border-white hover:scale-125 transition-transform';
        el.innerHTML = '📍';
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectDestination(dest);
        });
        const marker = new MapLibreMarker({ element: el }).setLngLat([dest.location.lng, dest.location.lat]).addTo(map);
        mlDestMarkers.current.push(marker);
      });
    }
  };

  useEffect(() => {
    if (engine === 'vector') {
      updateMapLibreLayers();
    }
  }, [engine, center, safetyStatus, destinations, layers, mapLoaded]);

  // ----------------------------------------------------
  // 3. ENGINE MOUNTING & RESIZE OBSERVER
  // ----------------------------------------------------
  useEffect(() => {
    setMapLoaded(false);

    if (engine === 'leaflet') {
      initLeaflet();
    } else {
      initMapLibre();
    }

    const observer = new ResizeObserver(() => {
      if (engine === 'vector' && maplibreRef.current) {
        maplibreRef.current.resize();
      } else if (engine === 'leaflet' && leafletRef.current) {
        leafletRef.current.invalidateSize();
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      if (maplibreRef.current) {
        maplibreRef.current.remove();
        maplibreRef.current = null;
      }
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, [engine]);

  return (
    <div className="w-full h-full min-h-[450px] relative bg-slate-100 overflow-hidden select-none">
      {/* Absolute Inset Map Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Manual Engine Switcher Pill */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-md text-xs font-semibold">
        <Layers className="w-3.5 h-3.5 text-blue-600" />
        <span className="text-[11px] text-slate-500 mr-1 hidden sm:inline">Engine:</span>
        <button
          onClick={() => setEngine('vector')}
          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
            engine === 'vector' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Vector
        </button>
        <button
          onClick={() => setEngine('leaflet')}
          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
            engine === 'leaflet' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Standard (OSM)
        </button>
      </div>

      {/* Loading Overlay */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-xs z-10 pointer-events-none">
          <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-bold text-slate-700">Loading Map View...</p>
        </div>
      )}
    </div>
  );
};
