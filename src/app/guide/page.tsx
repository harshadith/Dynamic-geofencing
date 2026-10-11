'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import SafeMap from '@/components/map/SafeMap';
import AIChatbot from '@/components/chat/AIChatbot';
import {
  Tour,
  DynamicGeofence,
  TouristTelemetry,
  GeoPoint,
  ThreatLevel,
  GeofenceReason,
  TourAlert,
} from '@/types';
import {
  INITIAL_TOURS,
  INITIAL_GEOFENCES,
  INITIAL_TELEMETRY,
  DEMO_GUIDE,
} from '@/data/initial-data';
import {
  DEFAULT_MAP_CENTER,
  computeAdaptiveRadius,
  evaluateTouristGeofenceCollisions,
} from '@/lib/safety/geofence-engine';
import { realtimeHub } from '@/lib/supabase/realtime-hub';
import {
  Shield,
  Users,
  Compass,
  AlertTriangle,
  Plus,
  Radio,
  Share2,
  Copy,
  Check,
  Send,
  Zap,
  BatteryCharging,
  Maximize2,
  MapPin,
  Clock,
  CheckCircle,
} from 'lucide-react';

export default function GuidePage() {
  const [activeTour, setActiveTour] = useState<Tour>(INITIAL_TOURS[0]);
  const [geofences, setGeofences] = useState<DynamicGeofence[]>(INITIAL_GEOFENCES);
  const [tourists, setTourists] = useState<TouristTelemetry[]>(INITIAL_TELEMETRY);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Geofence Creation Modal State
  const [isCreatingGeofence, setIsCreatingGeofence] = useState(false);
  const [isMapPicking, setIsMapPicking] = useState(false);
  const [newGfCenter, setNewGfCenter] = useState<GeoPoint>({ lat: 48.8550, lng: 2.3480 });
  const [newGfName, setNewGfName] = useState('');
  const [newGfReason, setNewGfReason] = useState<GeofenceReason>('traffic_congestion');
  const [newGfThreat, setNewGfThreat] = useState<ThreatLevel>('medium');
  const [newGfRadius, setNewGfRadius] = useState<number>(250);
  const [newGfDesc, setNewGfDesc] = useState('');

  // Tour Creation Modal State
  const [isCreatingTour, setIsCreatingTour] = useState(false);
  const [newTourTitle, setNewTourTitle] = useState('');
  const [newTourCity, setNewTourCity] = useState('Paris');
  const [newTourAddress, setNewTourAddress] = useState('Louvre Museum North Gate');

  // Broadcast Alert Modal
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSeverity, setBroadcastSeverity] = useState<ThreatLevel>('high');

  // Selected Geofence for Details
  const [selectedGeofence, setSelectedGeofence] = useState<DynamicGeofence | null>(null);

  // 1. Subscribe to Realtime Hub for Tour Events
  useEffect(() => {
    const unsubscribe = realtimeHub.subscribeToTour(activeTour.id, (data) => {
      if (data.type === 'LOCATION_UPDATE') {
        setTourists((prev) => {
          const exists = prev.find((t) => t.touristId === data.payload.touristId);
          if (exists) {
            return prev.map((t) => (t.touristId === data.payload.touristId ? data.payload : t));
          }
          return [...prev, data.payload];
        });
      } else if (data.type === 'GEOFENCE_UPDATE') {
        setGeofences(data.payload);
      } else if (data.type === 'MEMBER_JOINED') {
        // Add member as active tourist
        setTourists((prev) => [
          ...prev,
          {
            touristId: data.payload.touristId,
            tourId: data.payload.tourId,
            name: data.payload.touristName,
            location: activeTour.meetingPoint,
            batteryLevel: 98,
            isSos: false,
            lastPing: 'Just joined',
            geofenceStatus: 'safe',
          },
        ]);
      }
    });

    return () => unsubscribe();
  }, [activeTour.id]);

  // Re-evaluate tourists when geofences change
  useEffect(() => {
    setTourists((prev) =>
      prev.map((t) => {
        const evalResult = evaluateTouristGeofenceCollisions(t.location, geofences);
        return {
          ...t,
          geofenceStatus: evalResult.status,
          activeAlertZoneName: evalResult.activeZone?.name,
          activeThreatLevel: evalResult.activeZone?.threatLevel,
        };
      })
    );
  }, [geofences]);

  // Copy Tour Code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeTour.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Create Custom Geofence
  const handleSaveGeofence = () => {
    if (!newGfName.trim()) return;

    const adaptiveRadius = computeAdaptiveRadius(newGfRadius, newGfThreat, newGfReason);

    const created: DynamicGeofence = {
      id: `gf-custom-${Date.now()}`,
      tourId: activeTour.id,
      name: newGfName,
      reason: newGfReason,
      threatLevel: newGfThreat,
      center: newGfCenter,
      baseRadiusMeters: newGfRadius,
      adaptiveRadiusMeters: adaptiveRadius,
      isActive: true,
      createdBy: DEMO_GUIDE.id,
      createdAt: new Date().toISOString(),
      description: newGfDesc || `Custom ${newGfReason.replace('_', ' ')} zone established by Tour Guide.`,
    };

    const updated = [created, ...geofences];
    setGeofences(updated);
    realtimeHub.broadcastGeofences(activeTour.id, updated);

    // Reset Form
    setIsCreatingGeofence(false);
    setIsMapPicking(false);
    setNewGfName('');
    setNewGfDesc('');
  };

  // Simulate Anomaly Escalation (e.g. Critical Flash Flood Expansion)
  const handleSimulateAnomaly = () => {
    const updated = geofences.map((gf) => {
      if (gf.id === 'gf-hazard-quai') {
        const expandedRadius = gf.adaptiveRadiusMeters + 160;
        return {
          ...gf,
          adaptiveRadiusMeters: expandedRadius,
          threatLevel: 'critical' as ThreatLevel,
          description: 'CRITICAL ESCALATION: Flood swell rapid surge (+160m boundary expansion). Immediate evacuation enforced.',
          anomalyDetails: {
            ...gf.anomalyDetails,
            spreadRateMetersPerMin: 12,
            evacuationRecommended: true,
          },
        };
      }
      return gf;
    });

    setGeofences(updated);
    realtimeHub.broadcastGeofences(activeTour.id, updated);

    // Also broadcast urgent alert to all tourists
    const urgentAlert: TourAlert = {
      id: `alert-${Date.now()}`,
      tourId: activeTour.id,
      title: '🚨 CRITICAL ANOMALY: Seine River Flood Expansion',
      message: 'Quai de la Tournelle boundary has expanded by 160m due to surge. All members avoid riverbank!',
      severity: 'critical',
      createdAt: new Date().toISOString(),
    };
    realtimeHub.broadcastAlert(activeTour.id, urgentAlert);
  };

  // Broadcast Alert to Tour
  const handleSendBroadcast = () => {
    if (!broadcastMessage.trim()) return;

    const alert: TourAlert = {
      id: `alert-${Date.now()}`,
      tourId: activeTour.id,
      title: 'Tour Guide Safety Announcement',
      message: broadcastMessage,
      severity: broadcastSeverity,
      createdAt: new Date().toISOString(),
    };

    realtimeHub.broadcastAlert(activeTour.id, alert);
    setBroadcastMessage('');
    setIsBroadcasting(false);
  };

  // Save New Tour
  const handleSaveTour = () => {
    if (!newTourTitle.trim()) return;
    const code = `TOUR-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTour: Tour = {
      id: `tour-${Date.now()}`,
      code,
      title: newTourTitle,
      description: `Guided tour in ${newTourCity} covering key landmarks with adaptive spatial safety.`,
      guideId: DEMO_GUIDE.id,
      guideName: DEMO_GUIDE.name,
      city: newTourCity,
      status: 'active',
      meetingPoint: DEFAULT_MAP_CENTER,
      meetingAddress: newTourAddress,
      createdAt: new Date().toISOString(),
    };

    setActiveTour(newTour);
    setIsCreatingTour(false);
  };

  const touristsInHazard = tourists.filter((t) => t.geofenceStatus === 'in_hazard_zone');
  const touristsInSafeHaven = tourists.filter((t) => t.geofenceStatus === 'in_safe_haven');

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar onToggleChat={() => setIsAIChatOpen(true)} activeAlertCount={touristsInHazard.length} />

      {/* Main Command Dashboard */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Control Sidebar */}
        <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/40 p-4 flex flex-col gap-4 overflow-y-auto max-h-[480px] lg:max-h-[calc(100vh-64px)]">
          {/* Active Tour Header Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/40 via-slate-900 to-indigo-950/40 border border-blue-800/40 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" /> Active Tour Expedition
              </span>
              <button
                onClick={() => setIsCreatingTour(true)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 underline"
              >
                + New Tour
              </button>
            </div>

            <h2 className="text-base font-bold text-white mt-1 leading-snug">{activeTour.title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{activeTour.city} • Guide: {activeTour.guideName}</p>

            {/* Shareable PIN Code */}
            <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block font-mono uppercase">Tour Join Code</span>
                <span className="text-sm font-extrabold text-cyan-400 font-mono tracking-wider">
                  {activeTour.code}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-colors"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-xl font-extrabold text-white">{tourists.length}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Tourists</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-xl font-extrabold text-emerald-400">{touristsInSafeHaven.length}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">In Safe Haven</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-xl font-extrabold text-rose-400">{touristsInHazard.length}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">In Hazard</span>
            </div>
          </div>

          {/* Primary Operations Actions */}
          <div className="space-y-2">
            <button
              onClick={() => {
                setIsCreatingGeofence(true);
                setIsMapPicking(true);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Custom Geofence</span>
            </button>

            <button
              onClick={handleSimulateAnomaly}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>Simulate Anomaly (Expand Geofences)</span>
            </button>

            <button
              onClick={() => setIsBroadcasting(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Broadcast Safety Alert</span>
            </button>
          </div>

          {/* Connected Tourists Manifest */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Connected Tourists ({tourists.length})
              </h3>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" /> Live Telemetry
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {tourists.map((trv) => {
                const isHazard = trv.geofenceStatus === 'in_hazard_zone';
                const isSafeHaven = trv.geofenceStatus === 'in_safe_haven';

                return (
                  <div
                    key={trv.touristId}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isHazard
                        ? 'bg-rose-950/40 border-rose-800/80 text-rose-100'
                        : isSafeHaven
                        ? 'bg-emerald-950/30 border-emerald-800/60 text-slate-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                            isHazard ? 'bg-rose-600' : isSafeHaven ? 'bg-emerald-600' : 'bg-blue-600'
                          }`}
                        >
                          {trv.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-white">{trv.name}</h4>
                          <span className="text-[10px] text-slate-400">{trv.lastPing}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isHazard
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : isSafeHaven
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {trv.geofenceStatus.replace('_', ' ')}
                        </span>
                        <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                          <BatteryCharging className="w-3 h-3 text-emerald-400" />
                          <span>{trv.batteryLevel}%</span>
                        </div>
                      </div>
                    </div>

                    {isHazard && trv.activeAlertZoneName && (
                      <div className="mt-2 text-[10px] bg-rose-900/50 p-1.5 rounded border border-rose-700/50 text-rose-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                        <span>Inside hazard perimeter: <strong>{trv.activeAlertZoneName}</strong></span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Interactive Radar Map Container */}
        <div className="flex-1 relative h-[500px] lg:h-[calc(100vh-64px)]">
          <SafeMap
            center={activeTour.meetingPoint}
            geofences={geofences}
            tourists={tourists}
            guideLocation={activeTour.meetingPoint}
            isPlacingGeofence={isMapPicking}
            selectedGeofenceId={selectedGeofence?.id}
            onSelectGeofence={(gf) => setSelectedGeofence(gf)}
            onMapClick={(pt) => {
              if (isMapPicking) {
                setNewGfCenter(pt);
                setIsMapPicking(false);
              }
            }}
          />

          {/* Map Floating Legend */}
          <div className="absolute bottom-4 left-4 z-[999] bg-slate-900/90 backdrop-blur-md border border-slate-800 p-2.5 rounded-xl shadow-xl text-[11px] text-slate-300 space-y-1 hidden sm:block">
            <span className="font-bold text-white block text-[10px] uppercase tracking-wider mb-1">
              Spatial Threat Indicators
            </span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
              <span>Safe Haven Sanctuary (Medical / Escort)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
              <span>Low Risk Caution</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500/80"></span>
              <span>Medium Risk (Traffic Gridlock / Protest)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-600/80"></span>
              <span>High Risk (Crime / Pickpocket Hotspot)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-950 border border-rose-500"></span>
              <span>Critical Anomaly (Disaster / Rapid Surge)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Geofence Creator Modal */}
      {isCreatingGeofence && (
        <div className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <span>Create Dynamic Adaptive Geofence</span>
              </h3>
              <button
                onClick={() => setIsCreatingGeofence(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 mt-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Geofence Name</label>
                <input
                  value={newGfName}
                  onChange={(e) => setNewGfName(e.target.value)}
                  placeholder="e.g. Châtelet Protest Corridor"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Reason / Anomaly</label>
                  <select
                    value={newGfReason}
                    onChange={(e) => setNewGfReason(e.target.value as GeofenceReason)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="safe_haven">Safe Haven Sanctuary</option>
                    <option value="traffic_congestion">Traffic Congestion</option>
                    <option value="security_threat">Security Threat</option>
                    <option value="street_crime">Street Crime Advisory</option>
                    <option value="natural_disaster">Natural Disaster / Flood</option>
                    <option value="crowd_surge">Crowd Surge</option>
                    <option value="custom_perimeter">Custom Perimeter</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Threat Level</label>
                  <select
                    value={newGfThreat}
                    onChange={(e) => setNewGfThreat(e.target.value as ThreatLevel)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="safe">Safe (Safe Haven)</option>
                    <option value="low">Low Warning</option>
                    <option value="medium">Medium Hazard</option>
                    <option value="high">High Risk</option>
                    <option value="critical">Critical Exclusion</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                  <span>Base Radius: {newGfRadius}m</span>
                  <span className="text-cyan-400 font-semibold">
                    Adaptive Buffer: {computeAdaptiveRadius(newGfRadius, newGfThreat, newGfReason)}m
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="800"
                  step="25"
                  value={newGfRadius}
                  onChange={(e) => setNewGfRadius(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Center Coordinates</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={`${newGfCenter.lat.toFixed(4)}, ${newGfCenter.lng.toFixed(4)}`}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono"
                  />
                  <button
                    onClick={() => {
                      setIsMapPicking(true);
                      setIsCreatingGeofence(false);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-medium"
                  >
                    Pick on Map
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Description / Advisory</label>
                <textarea
                  value={newGfDesc}
                  onChange={(e) => setNewGfDesc(e.target.value)}
                  placeholder="Official advisory to tourists entering or bypassing this perimeter..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 h-16"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsCreatingGeofence(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGeofence}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30"
              >
                Deploy Geofence
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Alert Modal */}
      {isBroadcasting && (
        <div className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-rose-400" />
              <span>Broadcast Immediate Safety Alert to Tour</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Dispatches an instant push notification directly onto all connected tourists' radar maps.
            </p>

            <div className="space-y-3 mt-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Urgency Level</label>
                <select
                  value={broadcastSeverity}
                  onChange={(e) => setBroadcastSeverity(e.target.value as ThreatLevel)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="low">Notice / Advisory</option>
                  <option value="medium">Medium Warning</option>
                  <option value="high">High Security Urgency</option>
                  <option value="critical">Critical Immediate Action</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Alert Directive</label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="e.g. All tourists please regroup at the Notre-Dame Safe Haven fountain immediately..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 h-20"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsBroadcasting(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSendBroadcast}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30"
              >
                Send Broadcast
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Tour Modal */}
      {isCreatingTour && (
        <div className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
            <h3 className="font-bold text-sm text-white">Create New Guided Tour</h3>
            <div className="space-y-3 mt-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Tour Title</label>
                <input
                  value={newTourTitle}
                  onChange={(e) => setNewTourTitle(e.target.value)}
                  placeholder="e.g. Montmartre Sunset Art Corridor"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">City / Region</label>
                  <input
                    value={newTourCity}
                    onChange={(e) => setNewTourCity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Meeting Address</label>
                  <input
                    value={newTourAddress}
                    onChange={(e) => setNewTourAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsCreatingTour(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTour}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
              >
                Launch Tour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Co-Pilot Drawer */}
      <AIChatbot
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        tourCode={activeTour.code}
      />
    </div>
  );
}
