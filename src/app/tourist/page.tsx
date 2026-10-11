'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import SafeMap from '@/components/map/SafeMap';
import AIChatbot from '@/components/chat/AIChatbot';
import AlertModal from '@/components/ui/AlertModal';
import {
  Tour,
  DynamicGeofence,
  TouristTelemetry,
  GeoPoint,
  NavigationRouteOption,
  TourAlert,
} from '@/types';
import {
  INITIAL_TOURS,
  INITIAL_GEOFENCES,
  DEMO_TOURIST,
} from '@/data/initial-data';
import {
  DEFAULT_MAP_CENTER,
  evaluateTouristGeofenceCollisions,
} from '@/lib/safety/geofence-engine';
import { generateSafetyAwareRoutes } from '@/lib/safety/routing-engine';
import { realtimeHub } from '@/lib/supabase/realtime-hub';
import {
  Shield,
  Navigation,
  Compass,
  AlertTriangle,
  Radio,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Bell,
  Play,
  Pause,
  Zap,
} from 'lucide-react';

export default function TouristPage() {
  const [activeTour, setActiveTour] = useState<Tour>(INITIAL_TOURS[0]);
  const [tourCodeInput, setTourCodeInput] = useState('');
  const [isJoined, setIsJoined] = useState(true);
  const [joinSuccessNotice, setJoinSuccessNotice] = useState<string | null>(null);

  // Tourist live telemetry state
  const [touristLocation, setTouristLocation] = useState<GeoPoint>({
    lat: 48.8570,
    lng: 2.3485,
  });
  const [batteryLevel, setBatteryLevel] = useState<number>(88);
  const [isWalkingSimulation, setIsWalkingSimulation] = useState<boolean>(false);

  // Geofences & Realtime Alerts
  const [geofences, setGeofences] = useState<DynamicGeofence[]>(INITIAL_GEOFENCES);
  const [activeIntrusionZone, setActiveIntrusionZone] = useState<DynamicGeofence | null>(null);
  const [warningType, setWarningType] = useState<'in_hazard' | 'warning_perimeter'>('in_hazard');
  const [incomingBroadcastAlert, setIncomingBroadcastAlert] = useState<TourAlert | null>(null);

  // Navigation State
  const [destination, setDestination] = useState<{ name: string; point: GeoPoint }>({
    name: 'Louvre Courtyard Protected Perimeter',
    point: { lat: 48.8606, lng: 2.3376 },
  });
  const [routeOptions, setRouteOptions] = useState<NavigationRouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route_safest');
  const [reRankingBanner, setReRankingBanner] = useState<string | null>(null);

  // AI Chat Drawer
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  // 1. Subscribe to Realtime Hub for Tour Broadcasts
  useEffect(() => {
    const unsubscribe = realtimeHub.subscribeToTour(activeTour.id, (data) => {
      if (data.type === 'GEOFENCE_UPDATE') {
        setGeofences(data.payload);
      } else if (data.type === 'ALERT_BROADCAST') {
        setIncomingBroadcastAlert(data.payload);
      }
    });

    return () => unsubscribe();
  }, [activeTour.id]);

  // 2. Broadcast Live GPS Location to Guide
  const publishLocation = (newLoc: GeoPoint) => {
    const evalResult = evaluateTouristGeofenceCollisions(newLoc, geofences);

    const telemetry: TouristTelemetry = {
      touristId: DEMO_TOURIST.id,
      tourId: activeTour.id,
      name: DEMO_TOURIST.name,
      avatarUrl: DEMO_TOURIST.avatarUrl,
      location: newLoc,
      batteryLevel,
      isSos: false,
      lastPing: 'Just now',
      geofenceStatus: evalResult.status,
      activeAlertZoneName: evalResult.activeZone?.name,
      activeThreatLevel: evalResult.activeZone?.threatLevel,
    };

    realtimeHub.broadcastLocation(activeTour.id, telemetry);

    // Collision warning for tourist UI
    if (evalResult.status === 'in_hazard_zone' && evalResult.activeZone) {
      setActiveIntrusionZone(evalResult.activeZone);
      setWarningType('in_hazard');
    } else if (evalResult.status === 'in_warning_zone' && evalResult.activeZone) {
      setActiveIntrusionZone(evalResult.activeZone);
      setWarningType('warning_perimeter');
    } else {
      setActiveIntrusionZone(null);
    }
  };

  // 3. Re-evaluate routes when location, destination, or geofences change
  useEffect(() => {
    const calculated = generateSafetyAwareRoutes(touristLocation, destination.point, geofences);
    setRouteOptions(calculated);
  }, [touristLocation, destination, geofences]);

  // 4. Initial presence broadcast & battery sync
  useEffect(() => {
    if (isJoined) {
      publishLocation(touristLocation);
    }
  }, [isJoined]);

  // 5. Walking Simulation Loop
  useEffect(() => {
    if (!isWalkingSimulation) return;

    const interval = setInterval(() => {
      setTouristLocation((prev) => {
        // Walk slightly towards the destination
        const stepLat = (destination.point.lat - prev.lat) * 0.08;
        const stepLng = (destination.point.lng - prev.lng) * 0.08;
        const nextLoc = {
          lat: prev.lat + stepLat + (Math.random() - 0.5) * 0.0003,
          lng: prev.lng + stepLng + (Math.random() - 0.5) * 0.0003,
        };
        publishLocation(nextLoc);
        return nextLoc;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [isWalkingSimulation, destination]);

  // Handle Join Tour Code Submission
  const handleJoinTour = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tourCodeInput.trim()) return;

    const matched = INITIAL_TOURS.find((t) => t.code.toLowerCase() === tourCodeInput.trim().toLowerCase());
    if (matched) {
      setActiveTour(matched);
      setIsJoined(true);
      setJoinSuccessNotice(`Joined tour "${matched.title}" successfully!`);
      realtimeHub.broadcastMemberJoin(matched.id, {
        tourId: matched.id,
        touristId: DEMO_TOURIST.id,
        touristName: DEMO_TOURIST.name,
        touristEmail: DEMO_TOURIST.email,
        joinedAt: new Date().toISOString(),
        status: 'active',
      });
      setTimeout(() => setJoinSuccessNotice(null), 3000);
    } else {
      alert(`Tour with code "${tourCodeInput}" was not found. Please try "TOUR-7749".`);
    }
  };

  // Trigger Anomaly on Current Route for Dynamic Route Re-Ranking Demo
  const handleTriggerAnomalyOnRoute = () => {
    // Inject a sudden hazard on the direct path
    const anomalyZone: DynamicGeofence = {
      id: `gf-incident-${Date.now()}`,
      tourId: activeTour.id,
      name: 'Sudden Transit Strike & Vehicle Blockade',
      reason: 'traffic_congestion',
      threatLevel: 'high',
      center: {
        lat: (touristLocation.lat + destination.point.lat) / 2,
        lng: (touristLocation.lng + destination.point.lng) / 2,
      },
      baseRadiusMeters: 250,
      adaptiveRadiusMeters: 380,
      isActive: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      description: 'Emergency blockade detected. Direct shortest route is severely compromised.',
    };

    const updated = [anomalyZone, ...geofences];
    setGeofences(updated);
    realtimeHub.broadcastGeofences(activeTour.id, updated);

    // Dynamic Route Re-ranking notice
    setReRankingBanner('⚠️ Dynamic Re-Ranking Engaged: Shortest path compromised. Auto-switching to Verified Safe Corridor!');
    setSelectedRouteId('route_safest');
    setTimeout(() => setReRankingBanner(null), 6000);
  };

  const selectedRoute = routeOptions.find((r) => r.id === selectedRouteId) || routeOptions[0];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar onToggleChat={() => setIsAIChatOpen(true)} />

      {/* Dynamic Route Re-Ranking Alert Banner */}
      {reRankingBanner && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 animate-pulse shadow-lg">
          <Zap className="w-4 h-4 fill-current" />
          <span>{reRankingBanner}</span>
        </div>
      )}

      {/* Guide Emergency Broadcast Toast */}
      {incomingBroadcastAlert && (
        <div className="bg-rose-900 border-b border-rose-600 px-4 py-2.5 text-xs text-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-rose-700 text-white font-bold text-[10px] uppercase">
              GUIDE BROADCAST
            </span>
            <span className="font-semibold">{incomingBroadcastAlert.title}:</span>
            <span>{incomingBroadcastAlert.message}</span>
          </div>
          <button
            onClick={() => setIncomingBroadcastAlert(null)}
            className="text-xs text-rose-300 hover:text-white underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Tourist Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Safety & Navigation Panel */}
        <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/40 p-4 flex flex-col gap-4 overflow-y-auto max-h-[500px] lg:max-h-[calc(100vh-64px)]">
          {/* Active Tour & Join Bar */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-blue-950/40 border border-cyan-800/40 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" /> Tourist Navigation Portal
              </span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" /> Live GPS
              </span>
            </div>

            <h2 className="text-sm font-bold text-white mt-1 leading-snug">{activeTour.title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Guide: {activeTour.guideName} • Code: {activeTour.code}</p>

            {/* Join Different Tour Form */}
            <form onSubmit={handleJoinTour} className="mt-3 flex items-center gap-2">
              <input
                value={tourCodeInput}
                onChange={(e) => setTourCodeInput(e.target.value)}
                placeholder="Enter Tour Code (e.g. TOUR-7749)"
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-white uppercase font-mono tracking-wider focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/30 transition-all"
              >
                Join
              </button>
            </form>

            {joinSuccessNotice && (
              <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {joinSuccessNotice}
              </p>
            )}
          </div>

          {/* Simulation Controls: Simulate Tourist Movement */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">GPS Telemetry Stream</span>
              <span className="text-[10px] text-slate-400">Broadcasting live coordinates to Tour Guide</span>
            </div>
            <button
              onClick={() => setIsWalkingSimulation(!isWalkingSimulation)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isWalkingSimulation
                  ? 'bg-amber-600 text-white animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {isWalkingSimulation ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isWalkingSimulation ? 'Stop Walk' : 'Simulate Walk'}</span>
            </button>
          </div>

          {/* Destination Selector */}
          <div>
            <label className="text-xs text-slate-300 font-bold uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400" /> Navigation Destination
            </label>
            <select
              value={destination.name}
              onChange={(e) => {
                const targets: Record<string, GeoPoint> = {
                  'Louvre Courtyard Protected Perimeter': { lat: 48.8606, lng: 2.3376 },
                  'Notre-Dame Safe Haven Sanctuary': { lat: 48.8530, lng: 2.3499 },
                  'Place de la Concorde Safety Hub': { lat: 48.8656, lng: 2.3212 },
                  'Hôtel de Ville Plaza': { lat: 48.8566, lng: 2.3522 },
                };
                const sel = e.target.value;
                setDestination({ name: sel, point: targets[sel] });
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="Louvre Courtyard Protected Perimeter">Louvre Courtyard Protected Perimeter</option>
              <option value="Notre-Dame Safe Haven Sanctuary">Notre-Dame Safe Haven Sanctuary</option>
              <option value="Place de la Concorde Safety Hub">Place de la Concorde Safety Hub</option>
              <option value="Hôtel de Ville Plaza">Hôtel de Ville Plaza</option>
            </select>
          </div>

          {/* Responsive Multi-Criteria Route Options */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-emerald-400" /> Evaluated Safety Routes
              </h3>
              <button
                onClick={handleTriggerAnomalyOnRoute}
                title="Test how the system dynamically reroutes when hazards emerge"
                className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 underline"
              >
                <Zap className="w-3 h-3" /> Trigger Route Hazard
              </button>
            </div>

            {routeOptions.map((opt) => {
              const isSelected = selectedRouteId === opt.id;
              const isSafest = opt.type === 'safest';
              const isShortest = opt.type === 'shortest';

              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedRouteId(opt.id)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          isSafest
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isShortest
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}
                      >
                        {opt.type.toUpperCase()}
                      </span>
                      <h4 className="text-xs font-bold text-white">{opt.title}</h4>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-xs font-extrabold ${
                          opt.safetyScore >= 85
                            ? 'text-emerald-400'
                            : opt.safetyScore >= 65
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {opt.safetyScore}/100
                      </span>
                      <span className="text-[10px] text-slate-400 block">Safety Score</span>
                    </div>
                  </div>

                  {/* Route Specs Grid */}
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 py-1.5 border-y border-slate-800/80 my-1.5">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Distance</span>
                      <span className="font-semibold text-slate-200">{opt.distanceKm} km</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Est. Time</span>
                      <span className="font-semibold text-slate-200">{opt.durationMinutes} mins</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Traffic & Crowd</span>
                      <span className="font-semibold text-slate-200 capitalize">{opt.trafficLevel}</span>
                    </div>
                  </div>

                  {/* Cautions or Highlights */}
                  {opt.cautions.length > 0 ? (
                    <div className="text-[10px] text-amber-300 mt-1 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                      <span>{opt.cautions[0]}</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-emerald-300 mt-1 flex items-start gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{opt.highlights[0]}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Radar Map */}
        <div className="flex-1 relative h-[500px] lg:h-[calc(100vh-64px)]">
          <SafeMap
            center={touristLocation}
            geofences={geofences}
            currentTouristLocation={touristLocation}
            guideLocation={activeTour.meetingPoint}
            activeRouteWaypoints={selectedRoute?.waypoints}
            routeType={selectedRoute?.type}
            showEmergencyServices={true}
          />

          {/* Real-time Status Card overlay on top-left of Map */}
          <div className="absolute top-4 left-4 z-[999] bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3 rounded-2xl shadow-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Dynamic Geofence Radar</span>
                <span className="text-[10px] text-emerald-400 font-mono">LIVE ACTIVE</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {geofences.filter((g) => g.threatLevel !== 'safe').length} active hazard zones monitored in real-time
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Geofence Intrusion Warning Modal */}
      {activeIntrusionZone && (
        <AlertModal
          zone={activeIntrusionZone}
          warningType={warningType}
          onDismiss={() => setActiveIntrusionZone(null)}
          onReroute={() => {
            setSelectedRouteId('route_safest');
            setActiveIntrusionZone(null);
          }}
        />
      )}

      {/* AI Chat Drawer */}
      <AIChatbot
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        tourCode={activeTour.code}
      />
    </div>
  );
}
