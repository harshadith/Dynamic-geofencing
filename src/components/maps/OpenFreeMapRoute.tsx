import React, { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, Marker as MapLibreMarker, NavigationControl, AttributionControl, LngLatBounds } from 'maplibre-gl';
import L from 'leaflet';
import { SafeRoute, RiskZone } from '../../types';
import { OPENFREEMAP_STYLES, createGeoJsonCircle } from '../../utils/mapUtils';
import { isWebGLSupported } from '../../utils/webglCheck';
import { Layers } from 'lucide-react';

interface OpenFreeMapRouteProps {
  origin: { lat: number; lng: number };
  destination?: { name: string; location: { lat: number; lng: number } } | null;
  routes: SafeRoute[];
  selectedRouteId: string;
  onSelectRoute: (routeId: string) => void;
  isNavigating?: boolean;
  navStep?: number;
  riskZones?: RiskZone[];
}

export const OpenFreeMapRoute: React.FC<OpenFreeMapRouteProps> = ({
  origin,
  destination,
  routes,
  selectedRouteId,
  onSelectRoute,
  isNavigating = false,
  navStep = 0,
  riskZones = [],
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [engine, setEngine] = useState<'vector' | 'leaflet'>(() => {
    return isWebGLSupported() ? 'vector' : 'leaflet';
  });

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // MapLibre refs
  const mapRef = useRef<MapLibreMap | null>(null);
  const originMarkerRef = useRef<MapLibreMarker | null>(null);
  const destMarkerRef = useRef<MapLibreMarker | null>(null);
  const travelerMarkerRef = useRef<MapLibreMarker | null>(null);

  // Leaflet refs
  const lfMapRef = useRef<L.Map | null>(null);
  const lfOriginMarker = useRef<L.Marker | null>(null);
  const lfDestMarker = useRef<L.Marker | null>(null);
  const lfTravelerMarker = useRef<L.Marker | null>(null);
  const lfPolylines = useRef<L.Polyline[]>([]);
  const lfRiskCircles = useRef<L.Circle[]>([]);

  // ------------------------------------------
  // LEAFLET ENGINE
  // ------------------------------------------
  const initLeaflet = () => {
    if (!containerRef.current) return;

    if (lfMapRef.current) {
      lfMapRef.current.remove();
      lfMapRef.current = null;
    }

    try {
      const map = L.map(containerRef.current, {
        center: [origin.lat, origin.lng],
        zoom: 13,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB &copy; OpenStreetMap',
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      lfMapRef.current = map;
      setMapLoaded(true);
      setMapError(null);

      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 400);
      setTimeout(() => map.invalidateSize(), 1000);
    } catch (err: any) {
      console.error('Leaflet route map failed:', err);
      setMapError('Failed to display route map.');
    }
  };

  // Leaflet Routes & Markers
  useEffect(() => {
    if (engine !== 'leaflet' || !lfMapRef.current) return;
    const map = lfMapRef.current;

    // Remove existing
    lfPolylines.current.forEach(p => p.remove());
    lfPolylines.current = [];
    lfRiskCircles.current.forEach(c => c.remove());
    lfRiskCircles.current = [];

    // 1. Risk zones
    riskZones.forEach(z => {
      const isHigh = z.riskLevel === 'HIGH';
      const circle = L.circle([z.center.lat, z.center.lng], {
        radius: z.radius,
        color: isHigh ? '#ef4444' : '#f59e0b',
        fillColor: isHigh ? '#ef4444' : '#f59e0b',
        fillOpacity: 0.2,
        weight: 2,
      }).addTo(map);
      lfRiskCircles.current.push(circle);
    });

    // 2. Route Polylines
    routes.forEach(r => {
      const isSelected = r.id === selectedRouteId;
      const latlngs = r.coordinates.map(c => [c.lat, c.lng] as [number, number]);
      let color = '#2563eb'; // blue
      if (r.type === 'safest') color = '#059669'; // emerald
      else if (r.type === 'fastest') color = '#f59e0b'; // amber

      const polyline = L.polyline(latlngs, {
        color,
        weight: isSelected ? 5 : 3,
        opacity: isSelected ? 1 : 0.6,
        dashArray: r.type === 'safest' ? undefined : '5, 5',
      }).addTo(map);

      polyline.on('click', () => onSelectRoute(r.id));
      lfPolylines.current.push(polyline);
    });

    // 3. Origin Marker
    if (lfOriginMarker.current) lfOriginMarker.current.remove();
    const originIcon = L.divIcon({
      className: 'route-origin-marker',
      html: '<div class="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    lfOriginMarker.current = L.marker([origin.lat, origin.lng], { icon: originIcon }).addTo(map);

    // 4. Destination Marker
    if (lfDestMarker.current) {
      lfDestMarker.current.remove();
      lfDestMarker.current = null;
    }
    if (destination) {
      const destIcon = L.divIcon({
        className: 'route-dest-marker',
        html: '<div class="cursor-pointer flex items-center justify-center w-7 h-7 rounded-full bg-rose-600 text-white shadow-md border-2 border-white text-xs">🏁</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      lfDestMarker.current = L.marker([destination.location.lat, destination.location.lng], { icon: destIcon }).addTo(map);
    }
  }, [engine, origin, destination, routes, selectedRouteId, riskZones, mapLoaded]);

  // Leaflet Nav Step Follow
  useEffect(() => {
    if (engine !== 'leaflet' || !lfMapRef.current) return;
    const map = lfMapRef.current;
    const selectedRoute = routes.find(r => r.id === selectedRouteId);

    if (isNavigating && selectedRoute && selectedRoute.coordinates[navStep]) {
      const currentPoint = selectedRoute.coordinates[navStep];
      if (!lfTravelerMarker.current) {
        const travelerIcon = L.divIcon({
          className: 'route-traveler-marker',
          html: '<div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg border-2 border-white animate-pulse">🧭</div>',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        lfTravelerMarker.current = L.marker([currentPoint.lat, currentPoint.lng], { icon: travelerIcon }).addTo(map);
      } else {
        lfTravelerMarker.current.setLatLng([currentPoint.lat, currentPoint.lng]);
      }
      map.panTo([currentPoint.lat, currentPoint.lng]);
    } else if (lfTravelerMarker.current) {
      lfTravelerMarker.current.remove();
      lfTravelerMarker.current = null;
    }
  }, [engine, isNavigating, navStep, routes, selectedRouteId]);

  // ------------------------------------------
  // MAPLIBRE VECTOR ENGINE
  // ------------------------------------------
  const initMapLibre = () => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    try {
      const map = new MapLibreMap({
        container: containerRef.current,
        style: OPENFREEMAP_STYLES.liberty,
        center: [origin.lng, origin.lat],
        zoom: 13,
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
          console.warn('MapLibre route timeout. Switching to Leaflet standard...');
          setEngine('leaflet');
        }
      }, 4000);

      map.on('load', () => {
        clearTimeout(timeoutFallback);
        mapRef.current = map;
        setMapLoaded(true);
        setMapError(null);
        map.resize();
        renderMapLibreLayers();
      });

      map.on('error', (e) => {
        console.warn('MapLibre route error:', e);
        if (!mapRef.current) {
          clearTimeout(timeoutFallback);
          setEngine('leaflet');
        }
      });

      setTimeout(() => map.resize(), 100);
      setTimeout(() => map.resize(), 400);
      setTimeout(() => map.resize(), 1000);
    } catch (err) {
      console.warn('MapLibre failed:', err);
      setEngine('leaflet');
    }
  };

  const renderMapLibreLayers = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Origin Marker
    if (originMarkerRef.current) originMarkerRef.current.remove();
    const originEl = document.createElement('div');
    originEl.className = 'w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md';
    originMarkerRef.current = new MapLibreMarker({ element: originEl })
      .setLngLat([origin.lng, origin.lat])
      .addTo(map);

    // Destination Marker
    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }
    if (destination) {
      const destEl = document.createElement('div');
      destEl.className = 'cursor-pointer flex items-center justify-center w-7 h-7 rounded-full bg-rose-600 text-white shadow-md border-2 border-white text-xs';
      destEl.innerHTML = '🏁';
      destMarkerRef.current = new MapLibreMarker({ element: destEl })
        .setLngLat([destination.location.lng, destination.location.lat])
        .addTo(map);
    }
  };

  useEffect(() => {
    if (engine === 'vector') {
      renderMapLibreLayers();
    }
  }, [engine, origin, destination, mapLoaded]);

  // Mount effect
  useEffect(() => {
    setMapLoaded(false);

    if (engine === 'leaflet') {
      initLeaflet();
    } else {
      initMapLibre();
    }

    const observer = new ResizeObserver(() => {
      if (engine === 'vector' && mapRef.current) {
        mapRef.current.resize();
      } else if (engine === 'leaflet' && lfMapRef.current) {
        lfMapRef.current.invalidateSize();
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (lfMapRef.current) {
        lfMapRef.current.remove();
        lfMapRef.current = null;
      }
    };
  }, [engine]);

  return (
    <div className="w-full h-full min-h-[420px] relative bg-slate-100 overflow-hidden select-none">
      {/* Absolute Inset Map Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Engine Switcher */}
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
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-xs font-bold text-slate-700">Loading Route Map...</p>
        </div>
      )}
    </div>
  );
};
