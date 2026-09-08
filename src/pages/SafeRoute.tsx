import React, { useState, useEffect } from 'react';
import { useAppContext } from '../store/AppContext';
import { DEMO_DESTINATIONS, DEMO_RISK_ZONES } from '../data/demoData';
import { RouteOption } from '../types';
import { generateRoutes } from '../services/RoutingEngine';
import { Navigation, MapPin, ShieldCheck, Clock, CheckCircle2, AlertTriangle, Play, Square, Sparkles } from 'lucide-react';
import { cn } from '../components/Layout';
import { OpenFreeMapRoute } from '../components/maps/OpenFreeMapRoute';

export const SafeRoute = () => {
  const { currentLocation } = useAppContext();
  const [selectedDestId, setSelectedDestId] = useState<string>('d1'); // Default to Grand Museum
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [navStep, setNavStep] = useState(0);

  const selectedDest = DEMO_DESTINATIONS.find(d => d.id === selectedDestId);

  useEffect(() => {
    if (selectedDest) {
      const generated = generateRoutes(currentLocation, selectedDest);
      setRoutes(generated);
      setSelectedRouteId(generated[0].id); // default to safest
      setIsNavigating(false);
      setNavStep(0);
    } else {
      setRoutes([]);
      setSelectedRouteId('');
      setIsNavigating(false);
    }
  }, [selectedDest, currentLocation]);

  const selectedRoute = routes.find(r => r.id === selectedRouteId);

  // Simulation timer for navigation
  useEffect(() => {
    let timer: any;
    if (isNavigating && selectedRoute) {
      timer = setInterval(() => {
        setNavStep(prev => {
          if (prev >= selectedRoute.path.length - 1) {
            setIsNavigating(false);
            return 0;
          }
          return prev + 1;
        });
      }, 2000);
    }
    return () => clearInterval(timer);
  }, [isNavigating, selectedRoute]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Navigation className="w-6 h-6 text-blue-600" />
            AI Safe Route Navigation
          </h1>
          <p className="text-slate-500">Intelligent risk-aware pathfinding powered by OpenFreeMap vector navigation.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* Left Column: Controls */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2 pb-8">
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Route Endpoints</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-blue-50/80 border border-blue-100 rounded-xl text-slate-700">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-200"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-blue-600">Origin</span>
                  <span className="font-semibold text-xs text-slate-900">Current GPS Position</span>
                </div>
              </div>
              
              <div className="flex justify-center">
                <div className="w-0.5 h-4 bg-slate-200"></div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Destination</label>
                <select 
                  value={selectedDestId}
                  onChange={(e) => setSelectedDestId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DEMO_DESTINATIONS.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.category})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Route Options List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Generated Paths</h3>
            {routes.map((route) => {
              const isSelected = route.id === selectedRouteId;
              return (
                <div
                  key={route.id}
                  onClick={() => {
                    setSelectedRouteId(route.id);
                    setIsNavigating(false);
                    setNavStep(0);
                  }}
                  className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden",
                    isSelected 
                      ? "bg-white border-blue-600 shadow-md ring-2 ring-blue-600/10" 
                      : "bg-white border-slate-200 hover:border-slate-300 opacity-80"
                  )}
                >
                  {route.type === 'safest' && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      Recommended
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-900 capitalize">
                      {route.name}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {route.estimatedTimeMinutes} min
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs mb-3">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className={cn(
                        "w-4 h-4",
                        route.safetyScore >= 90 ? "text-emerald-500" :
                        route.safetyScore >= 75 ? "text-blue-500" : "text-amber-500"
                      )} />
                      <span className="font-bold text-slate-800">{route.safetyScore}/100</span>
                      <span className="text-[10px] text-slate-400">Safety Index</span>
                    </div>
                    <div className="text-slate-400">•</div>
                    <div className="text-slate-600 font-medium">
                      {(route.distanceMeters / 1000).toFixed(1)} km
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="space-y-1">
                    {route.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right Column: OpenFreeMap Vector Visualizer */}
        <div className="w-full lg:w-2/3 flex flex-col gap-4">
          {selectedDest && selectedRoute ? (
            <>
              {/* Route Summary Bar */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg",
                    selectedRoute.safetyScore >= 90 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                    selectedRoute.safetyScore >= 75 ? "bg-blue-50 text-blue-600 border border-blue-100" :
                    "bg-amber-50 text-amber-600 border border-amber-100"
                  )}>
                    {selectedRoute.safetyScore}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      {selectedRoute.name}
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full capitalize">
                        {selectedRoute.type}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      ETA {selectedRoute.estimatedTimeMinutes} mins • {(selectedRoute.distanceMeters / 1000).toFixed(1)} km
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {!isNavigating ? (
                    <button
                      onClick={() => setIsNavigating(true)}
                      className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Start Navigation
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsNavigating(false);
                        setNavStep(0);
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      Stop Navigation
                    </button>
                  )}
                </div>
              </div>

              {/* Turn-by-Turn Guidance Banner during Navigation */}
              {isNavigating && (
                <div className="bg-blue-600 text-white p-3.5 rounded-2xl shadow-lg flex items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Navigation className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">
                        Active Step {navStep + 1} of {selectedRoute.path.length}
                      </span>
                      <p className="text-sm font-bold">
                        Proceeding along {selectedRoute.name} • Safe Corridor Active
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-lg">
                      {Math.max(1, Math.round(selectedRoute.estimatedTimeMinutes * (1 - navStep / selectedRoute.path.length)))} min left
                    </span>
                  </div>
                </div>
              )}

              {/* Warnings / Drawbacks if any */}
              {selectedRoute.drawbacks && selectedRoute.drawbacks.length > 0 && (
                <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                  <h4 className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Identified Route Hazards
                  </h4>
                  <ul className="space-y-1">
                    {selectedRoute.drawbacks.map((drw, i) => (
                      <li key={i} className="text-xs text-slate-700">
                        • {drw}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* OpenFreeMap Vector Map for Route */}
              <div className="flex-1 min-h-[420px] bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden shadow-sm relative">
                <OpenFreeMapRoute
                  origin={currentLocation}
                  destination={selectedDest}
                  routes={routes}
                  selectedRouteId={selectedRouteId}
                  onSelectRoute={(id) => {
                    setSelectedRouteId(id);
                    setIsNavigating(false);
                    setNavStep(0);
                  }}
                  isNavigating={isNavigating}
                  navStep={navStep}
                  riskZones={DEMO_RISK_ZONES}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 border-dashed flex flex-col items-center justify-center text-slate-400 p-8 text-center min-h-[400px]">
              <MapPin className="w-12 h-12 mb-3 text-slate-300" />
              <p className="text-base font-semibold text-slate-700">Select a destination</p>
              <p className="text-xs text-slate-500">Pick where you want to travel to inspect OpenFreeMap risk-aware safe routing.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
