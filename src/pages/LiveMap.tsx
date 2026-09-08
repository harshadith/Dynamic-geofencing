import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { DEMO_INCIDENTS, DEMO_RISK_ZONES, DEMO_DESTINATIONS, DEMO_EMERGENCY_SERVICES } from '../data/demoData';
import { TouristDestination, Incident, EmergencyService, RiskZone } from '../types';
import { Layers, AlertTriangle, LocateFixed, ShieldAlert, Phone, Map as MapIcon, X } from 'lucide-react';
import { OpenFreeMapLive } from '../components/maps/OpenFreeMapLive';
import { OpenFreeMapStyleId } from '../utils/mapUtils';

export const LiveMap = () => {
  const { currentLocation, safetyStatus, isDemoLocation } = useAppContext();
  
  const [layers, setLayers] = useState({
    destinations: true,
    incidents: true,
    riskZones: true,
    emergency: false,
    geofence: true
  });

  const [styleId, setStyleId] = useState<OpenFreeMapStyleId>('liberty');
  const [selectedDestination, setSelectedDestination] = useState<TouristDestination | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyService | null>(null);
  const [selectedZone, setSelectedZone] = useState<RiskZone | null>(null);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  const toggleLayer = (layer: keyof typeof layers) => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  const handleRecenter = () => {
    setRecenterTrigger(c => c + 1);
  };

  return (
    <div className="flex-1 h-full min-h-[500px] flex flex-col relative w-full overflow-hidden">
      {/* Map Controls Overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-200/80 w-56">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Safety Layers
            </h3>
            <button
              onClick={handleRecenter}
              title="Recenter to My Location"
              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <LocateFixed className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <LayerToggle label="Destinations" active={layers.destinations} onClick={() => toggleLayer('destinations')} color="bg-emerald-500" />
            <LayerToggle label="Risk Zones" active={layers.riskZones} onClick={() => toggleLayer('riskZones')} color="bg-amber-500" />
            <LayerToggle label="Live Incidents" active={layers.incidents} onClick={() => toggleLayer('incidents')} color="bg-rose-500" />
            <LayerToggle label="Emergency Svcs" active={layers.emergency} onClick={() => toggleLayer('emergency')} color="bg-purple-500" />
            <LayerToggle label="Adaptive Geofence" active={layers.geofence} onClick={() => toggleLayer('geofence')} color="bg-blue-500" />
          </div>

          {/* OpenFreeMap Vector Style Switcher */}
          <div className="mt-3 pt-2.5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <MapIcon className="w-3 h-3 text-blue-600" />
                OpenFreeMap Style
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px] font-bold">
              {(['liberty', 'positron', 'bright', 'dark', '3d'] as OpenFreeMapStyleId[]).map((style) => (
                <button
                  key={style}
                  onClick={() => setStyleId(style)}
                  className={`px-2 py-1 rounded-md capitalize transition-all ${
                    styleId === style
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Demo Location Badge */}
      {isDemoLocation && (
        <div className="absolute top-4 right-14 z-10 bg-amber-100/90 backdrop-blur-sm text-amber-900 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border border-amber-300 shadow-md flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          Demo Location Mode
        </div>
      )}

      {/* Safety Indicator Overlay */}
      {safetyStatus && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-full shadow-2xl border border-slate-200 flex items-center gap-4 pointer-events-auto">
          <div className="flex flex-col">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Dynamic Safety Index</span>
            <span className="text-base font-black text-slate-900">{safetyStatus.score}/100</span>
          </div>
          <div className={`w-3.5 h-3.5 rounded-full ${safetyStatus.score > 80 ? 'bg-emerald-500 ring-4 ring-emerald-100' : safetyStatus.score > 60 ? 'bg-blue-500 ring-4 ring-blue-100' : safetyStatus.score > 40 ? 'bg-amber-500 ring-4 ring-amber-100' : 'bg-rose-500 ring-4 ring-rose-100'}`}></div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-800 tracking-wide">{safetyStatus.category}</span>
            <span className="text-[10px] text-slate-500 font-medium">Radius: {safetyStatus.geofenceRadius}m</span>
          </div>
        </div>
      )}

      {/* Detail Overlay Card (Destination / Incident / Emergency / Zone) */}
      {selectedDestination && (
        <div className="absolute bottom-24 sm:bottom-6 right-4 z-20 bg-white rounded-2xl p-4 shadow-2xl border border-slate-200 w-72 max-w-[calc(100vw-2rem)]">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-bold text-sm text-slate-900">{selectedDestination.name}</h3>
            <button
              onClick={() => setSelectedDestination(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-600 mb-2">{selectedDestination.description}</p>
          <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl border border-slate-100">
            <span className="text-slate-500 font-medium capitalize">{selectedDestination.category}</span>
            <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
              Safety: {selectedDestination.safetyScore}/100
            </span>
          </div>
        </div>
      )}

      {selectedIncident && (
        <div className="absolute bottom-24 sm:bottom-6 right-4 z-20 bg-white rounded-2xl p-4 shadow-2xl border border-rose-200 w-72 max-w-[calc(100vw-2rem)]">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 text-rose-600 font-bold text-xs uppercase">
              <ShieldAlert className="w-4 h-4" />
              <span>{selectedIncident.type} Incident</span>
            </div>
            <button
              onClick={() => setSelectedIncident(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-700 mb-2">{selectedIncident.description}</p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-1.5">
            <span>Severity: <strong className="uppercase text-rose-700">{selectedIncident.severity}</strong></span>
            <span>{new Date(selectedIncident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      )}

      {selectedZone && (
        <div className="absolute bottom-24 sm:bottom-6 right-4 z-20 bg-white rounded-2xl p-4 shadow-2xl border border-amber-200 w-72 max-w-[calc(100vw-2rem)]">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs uppercase">
              <AlertTriangle className="w-4 h-4" />
              <span>{selectedZone.riskLevel} Risk Zone</span>
            </div>
            <button
              onClick={() => setSelectedZone(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-700 mb-1.5">{selectedZone.description}</p>
          <p className="text-[11px] text-slate-500 font-mono">Radius: {selectedZone.radius}m</p>
        </div>
      )}

      {selectedEmergency && (
        <div className="absolute bottom-24 sm:bottom-6 right-4 z-20 bg-white rounded-2xl p-4 shadow-2xl border border-purple-200 w-72 max-w-[calc(100vw-2rem)]">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-bold text-sm text-slate-900">{selectedEmergency.name}</h3>
            <button
              onClick={() => setSelectedEmergency(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-purple-700 font-medium capitalize mb-2">{selectedEmergency.type} Service</p>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-800 bg-purple-50 p-2 rounded-xl">
            <Phone className="w-3.5 h-3.5 text-purple-600" />
            <span>{selectedEmergency.phone}</span>
          </div>
        </div>
      )}

      {/* Main OpenFreeMap Container */}
      <div className="flex-1 w-full h-full min-h-[500px] relative">
        <OpenFreeMapLive
          center={{ lat: currentLocation.lat, lng: currentLocation.lng }}
          zoom={14}
          styleId={styleId}
          safetyStatus={safetyStatus}
          destinations={DEMO_DESTINATIONS}
          riskZones={DEMO_RISK_ZONES}
          incidents={DEMO_INCIDENTS}
          emergencyServices={DEMO_EMERGENCY_SERVICES}
          layers={layers}
          recenterTrigger={recenterTrigger}
          onSelectDestination={(dest) => {
            setSelectedDestination(dest);
            setSelectedIncident(null);
            setSelectedEmergency(null);
            setSelectedZone(null);
          }}
          onSelectIncident={(inc) => {
            setSelectedIncident(inc);
            setSelectedDestination(null);
            setSelectedEmergency(null);
            setSelectedZone(null);
          }}
          onSelectEmergency={(svc) => {
            setSelectedEmergency(svc);
            setSelectedDestination(null);
            setSelectedIncident(null);
            setSelectedZone(null);
          }}
          onSelectZone={(zone) => {
            setSelectedZone(zone);
            setSelectedDestination(null);
            setSelectedIncident(null);
            setSelectedEmergency(null);
          }}
        />
      </div>
    </div>
  );
};

const LayerToggle = ({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color: string }) => (
  <label className="flex items-center justify-between gap-2 cursor-pointer group hover:bg-slate-50 p-1 rounded-lg transition-colors">
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${color} ${active ? 'opacity-100 ring-2 ring-slate-200' : 'opacity-25'}`}></div>
      <span className={`text-xs font-medium transition-colors ${active ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>{label}</span>
    </div>
    <input type="checkbox" className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300" checked={active} onChange={onClick} />
  </label>
);
