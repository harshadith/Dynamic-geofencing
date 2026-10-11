import React, { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, Marker as MapLibreMarker, NavigationControl as MapLibreNav } from 'maplibre-gl';
import L from 'leaflet';
import { GeofenceArea, Traveller } from '../../types';
import { OPENFREEMAP_STYLES, OpenFreeMapStyleId, createGeoJsonCircle } from '../../utils/mapUtils';
import { isWebGLSupported } from '../../utils/webglCheck';
import { Shield, User, Battery, Navigation, Trash2, Layers, RefreshCw, Radio } from 'lucide-react';

interface OpenFreeMapAdminProps {
  center: { lat: number; lng: number };
  zoom?: number;
  styleId: OpenFreeMapStyleId;
  geofences: GeofenceArea[];
  travellers: Traveller[];
  selectedTravellerId: string | null;
  onSelectTraveller: (id: string | null) => void;
  onRemoveGeofence: (id: string) => void;
  onMapClickCoordinates?: (coords: { lat: number; lng: number }) => void;
  isPlacingGeofence?: boolean;
}

export const OpenFreeMapAdmin: React.FC<OpenFreeMapAdminProps> = ({
  center,
  zoom = 13.5,
  styleId,
  geofences,
  travellers,
  selectedTravellerId,
  onSelectTraveller,
  onRemoveGeofence,
  onMapClickCoordinates,
  isPlacingGeofence = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Choose initial engine: Vector (if WebGL available) or Leaflet
  const [engine, setEngine] = useState<'vector' | 'leaflet'>(() => {
    return isWebGLSupported() ? 'vector' : 'leaflet';
  });

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // References for MapLibre
  const maplibreInstance = useRef<MapLibreMap | null>(null);
  const maplibreMarkers = useRef<globalThis.Map<string, MapLibreMarker>>(new globalThis.Map());

  // References for Leaflet
  const leafletInstance = useRef<L.Map | null>(null);
  const leafletMarkers = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map());
  const leafletCircles = useRef<globalThis.Map<string, L.Circle>>(new globalThis.Map());

  // Active popup
  const [activePopupInfo, setActivePopupInfo] = useState<{
    type: 'geofence' | 'traveller';
    data: any;
    coords: [number, number];
  } | null>(null);

  // Colors helper
  const getRiskColors = (riskLevel: string) => {
    if (riskLevel === 'safe') return { fill: '#10b981', stroke: '#059669', opacity: 0.2 };
    if (riskLevel === 'moderate') return { fill: '#f59e0b', stroke: '#d97706', opacity: 0.25 };
    if (riskLevel === 'high') return { fill: '#f97316', stroke: '#ea580c', opacity: 0.3 };
    return { fill: '#ef4444', stroke: '#dc2626', opacity: 0.35 };
  };

  // Helper for Traveller Marker HTML
  const createTravellerMarkerHtml = (trv: Traveller, isSelected: boolean) => {
    const isCritical = trv.status === 'critical' || trv.status === 'sos';
    const isWarning = trv.status === 'warning';
    const ringColor = isCritical
      ? 'border-red-500 bg-red-50 ring-4 ring-red-400/30'
      : isWarning
      ? 'border-amber-500 bg-amber-50 ring-4 ring-amber-400/30'
      : 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-400/30';
    const batteryColor =
      trv.batteryLevel > 50 ? 'text-emerald-600' : trv.batteryLevel > 20 ? 'text-amber-600' : 'text-red-600';

    return `
      <div class="group cursor-pointer flex flex-col items-center select-none transition-transform ${
        isSelected ? 'scale-125 z-40' : 'hover:scale-110 z-10'
      }">
        <div class="relative flex items-center justify-center w-8 h-8 rounded-full border-2 ${ringColor} shadow-md bg-white">
          <span class="text-xs font-bold text-slate-800">${trv.name.charAt(0)}</span>
          ${
            isCritical
              ? '<span class="absolute -top-1 -right-1 flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>'
              : ''
          }
        </div>
        <div class="mt-0.5 px-1.5 py-0.5 bg-slate-900/85 backdrop-blur-xs text-white text-[9px] font-medium rounded shadow-xs whitespace-nowrap">
          ${trv.name.split(' ')[0]} • <span class="${batteryColor}">${trv.batteryLevel}%</span>
        </div>
      </div>
    `;
  };

  // ==========================================
  // 1. LEAFLET ENGINE (Bulletproof Fallback)
  // ==========================================
  const initLeaflet = () => {
    if (!containerRef.current) return;

    // Clean previous instances
    if (leafletInstance.current) {
      leafletInstance.current.remove();
      leafletInstance.current = null;
    }

    try {
      const map = L.map(containerRef.current, {
        center: [center.lat, center.lng],
        zoom,
        zoomControl: true,
        attributionControl: true,
      });

      // CartoDB Voyager Raster Tiles (super crisp, instant load, zero WebGL requirement)
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
          subdomains: 'abcd',
        }
      ).addTo(map);

      map.on('click', (e) => {
        if (isPlacingGeofence && onMapClickCoordinates) {
          onMapClickCoordinates({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
      });

      leafletInstance.current = map;
      setMapLoaded(true);
      setLoadError(null);

      // Staged invalidateSize to guarantee layout rendering
      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 400);
      setTimeout(() => map.invalidateSize(), 1000);
    } catch (err: any) {
      console.error('Leaflet initialization failed:', err);
      setLoadError('Failed to initialize map display.');
    }
  };

  // Update Leaflet Geofences
  useEffect(() => {
    if (engine !== 'leaflet' || !leafletInstance.current) return;
    const map = leafletInstance.current;

    // Remove old circles
    leafletCircles.current.forEach((circle) => circle.remove());
    leafletCircles.current.clear();

    geofences.forEach((gf) => {
      if (!gf.isActive) return;
      const colors = getRiskColors(gf.riskLevel);

      const circle = L.circle([gf.center.lat, gf.center.lng], {
        radius: gf.radius,
        color: colors.stroke,
        weight: gf.riskLevel === 'critical' ? 3 : 2,
        fillColor: colors.fill,
        fillOpacity: colors.opacity,
        dashArray: gf.riskLevel === 'safe' ? '4, 4' : undefined,
      }).addTo(map);

      circle.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setActivePopupInfo({
          type: 'geofence',
          data: gf,
          coords: [gf.center.lng, gf.center.lat],
        });
      });

      leafletCircles.current.set(gf.id, circle);
    });
  }, [engine, geofences, mapLoaded]);

  // Update Leaflet Travellers
  useEffect(() => {
    if (engine !== 'leaflet' || !leafletInstance.current) return;
    const map = leafletInstance.current;

    leafletMarkers.current.forEach((marker) => marker.remove());
    leafletMarkers.current.clear();

    travellers.forEach((trv) => {
      const isSelected = selectedTravellerId === trv.id;
      const html = createTravellerMarkerHtml(trv, isSelected);

      const icon = L.divIcon({
        className: 'custom-leaflet-marker',
        html,
        iconSize: [40, 50],
        iconAnchor: [20, 25],
      });

      const marker = L.marker([trv.location.lat, trv.location.lng], { icon }).addTo(map);

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectTraveller(trv.id);
        setActivePopupInfo({
          type: 'traveller',
          data: trv,
          coords: [trv.location.lng, trv.location.lat],
        });
      });

      leafletMarkers.current.set(trv.id, marker);
    });
  }, [engine, travellers, selectedTravellerId, mapLoaded]);

  // Fly to selected traveller on Leaflet
  useEffect(() => {
    if (engine !== 'leaflet' || !leafletInstance.current || !selectedTravellerId) return;
    const trv = travellers.find((t) => t.id === selectedTravellerId);
    if (trv) {
      leafletInstance.current.flyTo([trv.location.lat, trv.location.lng], 15.5, {
        duration: 1.2,
      });
    }
  }, [engine, selectedTravellerId]);

  // ==========================================
  // 2. MAPLIBRE VECTOR ENGINE
  // ==========================================
  const initMapLibre = () => {
    if (!containerRef.current) return;

    if (maplibreInstance.current) {
      maplibreInstance.current.remove();
      maplibreInstance.current = null;
    }

    try {
      const styleUrl = OPENFREEMAP_STYLES[styleId] || OPENFREEMAP_STYLES.liberty;

      const map = new MapLibreMap({
        container: containerRef.current,
        style: styleUrl,
        center: [center.lng, center.lat],
        zoom,
        attributionControl: false,
      });

      map.addControl(new MapLibreNav({ showCompass: true }), 'top-right');

      let timeoutFallback = setTimeout(() => {
        if (!map.isStyleLoaded()) {
          console.warn('MapLibre style timeout. Switching to Leaflet standard renderer...');
          setEngine('leaflet');
        }
      }, 4000);

      map.on('load', () => {
        clearTimeout(timeoutFallback);
        maplibreInstance.current = map;
        setMapLoaded(true);
        setLoadError(null);
        map.resize();
        renderMapLibreGeofences();
      });

      map.on('error', (e) => {
        console.warn('MapLibre error encountered:', e);
        // If critical WebGL or style fail, fallback to Leaflet
        if (!maplibreInstance.current) {
          clearTimeout(timeoutFallback);
          setEngine('leaflet');
        }
      });

      map.on('click', (e) => {
        if (isPlacingGeofence && onMapClickCoordinates) {
          onMapClickCoordinates({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        }
      });

      // Multiple resize passes
      setTimeout(() => map.resize(), 100);
      setTimeout(() => map.resize(), 400);
      setTimeout(() => map.resize(), 1000);
    } catch (err: any) {
      console.warn('MapLibre GL threw exception (WebGL issue?):', err);
      setEngine('leaflet');
    }
  };

  const renderMapLibreGeofences = () => {
    const map = maplibreInstance.current;
    if (!map || !map.isStyleLoaded()) return;

    geofences.forEach((gf) => {
      const sourceId = `gf-src-${gf.id}`;
      const fillId = `gf-fill-${gf.id}`;
      const lineId = `gf-line-${gf.id}`;

      try {
        if (map.getLayer(fillId)) map.removeLayer(fillId);
        if (map.getLayer(lineId)) map.removeLayer(lineId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {}

      if (!gf.isActive) return;

      const colors = getRiskColors(gf.riskLevel);
      const circleGeoJson = createGeoJsonCircle(gf.center, gf.radius);

      map.addSource(sourceId, {
        type: 'geojson',
        data: circleGeoJson,
      });

      map.addLayer({
        id: fillId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': colors.fill,
          'fill-opacity': colors.opacity,
        },
      });

      map.addLayer({
        id: lineId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': colors.stroke,
          'line-width': gf.riskLevel === 'critical' ? 3 : 2,
        },
      });

      map.on('click', fillId, (e) => {
        e.originalEvent.stopPropagation();
        setActivePopupInfo({
          type: 'geofence',
          data: gf,
          coords: [gf.center.lng, gf.center.lat],
        });
      });
    });
  };

  useEffect(() => {
    if (engine === 'vector') {
      renderMapLibreGeofences();
    }
  }, [engine, geofences, mapLoaded]);

  // Update MapLibre Travellers
  useEffect(() => {
    if (engine !== 'vector' || !maplibreInstance.current || !mapLoaded) return;
    const map = maplibreInstance.current;

    const currentMarkers = maplibreMarkers.current;
    const activeIds = new Set(travellers.map((t) => t.id));

    currentMarkers.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        marker.remove();
        currentMarkers.delete(id);
      }
    });

    travellers.forEach((trv) => {
      const isSelected = selectedTravellerId === trv.id;
      let marker = currentMarkers.get(trv.id);

      if (!marker) {
        const el = document.createElement('div');
        el.innerHTML = createTravellerMarkerHtml(trv, isSelected);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectTraveller(trv.id);
          setActivePopupInfo({
            type: 'traveller',
            data: trv,
            coords: [trv.location.lng, trv.location.lat],
          });
        });

        marker = new MapLibreMarker({ element: el })
          .setLngLat([trv.location.lng, trv.location.lat])
          .addTo(map);

        currentMarkers.set(trv.id, marker);
      } else {
        marker.setLngLat([trv.location.lng, trv.location.lat]);
        marker.getElement().innerHTML = createTravellerMarkerHtml(trv, isSelected);
      }
    });
  }, [engine, travellers, selectedTravellerId, mapLoaded]);

  // Fly to selected on MapLibre
  useEffect(() => {
    if (engine !== 'vector' || !maplibreInstance.current || !selectedTravellerId) return;
    const trv = travellers.find((t) => t.id === selectedTravellerId);
    if (trv) {
      maplibreInstance.current.flyTo({
        center: [trv.location.lng, trv.location.lat],
        zoom: 15.5,
        speed: 1.2,
      });
    }
  }, [engine, selectedTravellerId]);

  // ==========================================
  // 3. ENGINE MOUNTING & RESIZE OBSERVER
  // ==========================================
  useEffect(() => {
    setMapLoaded(false);

    if (engine === 'leaflet') {
      initLeaflet();
    } else {
      initMapLibre();
    }

    const observer = new ResizeObserver(() => {
      if (engine === 'vector' && maplibreInstance.current) {
        maplibreInstance.current.resize();
      } else if (engine === 'leaflet' && leafletInstance.current) {
        leafletInstance.current.invalidateSize();
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      if (maplibreInstance.current) {
        maplibreInstance.current.remove();
        maplibreInstance.current = null;
      }
      if (leafletInstance.current) {
        leafletInstance.current.remove();
        leafletInstance.current = null;
      }
    };
  }, [engine]);

  // Toggle cursor when placing geofence
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.cursor = isPlacingGeofence ? 'crosshair' : '';
    }
  }, [isPlacingGeofence]);

  const fitAllTravellers = () => {
    if (travellers.length === 0) return;

    if (engine === 'vector' && maplibreInstance.current) {
      if (travellers.length === 1) {
        maplibreInstance.current.flyTo({
          center: [travellers[0].location.lng, travellers[0].location.lat],
          zoom: 14.5,
          speed: 1.2,
        });
      } else {
        const bounds = travellers.reduce(
          (acc, trv) => [
            Math.min(acc[0], trv.location.lng),
            Math.min(acc[1], trv.location.lat),
            Math.max(acc[2], trv.location.lng),
            Math.max(acc[3], trv.location.lat),
          ],
          [
            travellers[0].location.lng,
            travellers[0].location.lat,
            travellers[0].location.lng,
            travellers[0].location.lat,
          ]
        );
        maplibreInstance.current.fitBounds(
          [
            [bounds[0] - 0.008, bounds[1] - 0.008],
            [bounds[2] + 0.008, bounds[3] + 0.008],
          ],
          { padding: 50, maxZoom: 15 }
        );
      }
    } else if (engine === 'leaflet' && leafletInstance.current) {
      if (travellers.length === 1) {
        leafletInstance.current.flyTo(
          [travellers[0].location.lat, travellers[0].location.lng],
          14.5,
          { duration: 1.2 }
        );
      } else {
        const group = L.featureGroup(
          travellers.map((t) => L.marker([t.location.lat, t.location.lng]))
        );
        leafletInstance.current.fitBounds(group.getBounds().pad(0.2));
      }
    }
  };

  return (
    <div className="relative w-full h-full min-h-[420px] bg-slate-100 overflow-hidden select-none">
      {/* Absolute Inset Map Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Manual Engine Selector & Status Indicator */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-md text-xs font-semibold">
        <Layers className="w-3.5 h-3.5 text-blue-600" />
        <span className="text-[11px] text-slate-500 mr-1 hidden sm:inline">Map Engine:</span>
        <button
          onClick={() => setEngine('vector')}
          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
            engine === 'vector'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Vector
        </button>
        <button
          onClick={() => setEngine('leaflet')}
          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
            engine === 'leaflet'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Standard (OSM)
        </button>

        <div className="h-3 w-px bg-slate-200 mx-0.5" />

        <button
          onClick={fitAllTravellers}
          title="Fit view to all active GPS travellers"
          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center gap-1 transition-all"
        >
          <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
          <span>Locate Live ({travellers.length})</span>
        </button>
      </div>

      {/* Loading Overlay */}
      {!mapLoaded && !loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-xs z-10 pointer-events-none">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
          <span className="text-xs font-semibold text-slate-700">Loading Map View...</span>
        </div>
      )}

      {/* Map Placement Banner Mode */}
      {isPlacingGeofence && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-blue-600 text-white rounded-full shadow-lg flex items-center gap-2 text-xs font-semibold animate-bounce">
          <Navigation className="w-4 h-4 animate-spin" />
          Click on the map to set Geofence Center
        </div>
      )}

      {/* Popup Drawer for Selected Geofence / Traveller */}
      {activePopupInfo && (
        <div className="absolute bottom-4 left-4 z-30 max-w-xs w-full bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200 shadow-xl animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {activePopupInfo.type === 'geofence' ? (
                <Shield
                  className={`w-4 h-4 ${
                    activePopupInfo.data.riskLevel === 'safe'
                      ? 'text-emerald-600'
                      : activePopupInfo.data.riskLevel === 'critical'
                      ? 'text-red-600'
                      : 'text-amber-600'
                  }`}
                />
              ) : (
                <User className="w-4 h-4 text-blue-600" />
              )}
              <h4 className="font-bold text-slate-900 text-xs truncate">
                {activePopupInfo.data.name}
              </h4>
            </div>
            <button
              onClick={() => setActivePopupInfo(null)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>

          {activePopupInfo.type === 'geofence' ? (
            <div className="space-y-1.5 text-xs text-slate-600">
              <p className="text-[11px] leading-snug">{activePopupInfo.data.description}</p>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                <span>Radius: <strong>{activePopupInfo.data.radius}m</strong></span>
                <span className="capitalize px-1.5 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700">
                  {activePopupInfo.data.riskLevel}
                </span>
              </div>
              <div className="pt-1.5 flex justify-end">
                <button
                  onClick={() => {
                    onRemoveGeofence(activePopupInfo.data.id);
                    setActivePopupInfo(null);
                  }}
                  className="flex items-center gap-1 text-[11px] text-red-600 hover:text-red-700 font-semibold hover:bg-red-50 px-2 py-1 rounded"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove Geofence
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Status</span>
                  <span className="font-bold text-slate-800 capitalize">{activePopupInfo.data.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Battery</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <Battery className="w-3 h-3 text-slate-500" />
                    {activePopupInfo.data.batteryLevel}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Safety Score</span>
                  <span className="font-bold text-blue-600">{activePopupInfo.data.safetyScore}/100</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Geofence</span>
                  <span className="font-semibold text-slate-700 capitalize">
                    {activePopupInfo.data.geofenceStatus.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
