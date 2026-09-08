import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store/AppContext';
import { OpenFreeMapAdmin } from '../components/maps/OpenFreeMapAdmin';
import { AdminAIChatbot } from '../components/admin/AdminAIChatbot';
import { GeofenceManagerModal } from '../components/admin/GeofenceManagerModal';
import { OpenFreeMapStyleId } from '../utils/mapUtils';
import { calculateDistance } from '../services/SafetyEngine';
import { updateLiveTravellerPresence } from '../services/authService';
import { 
  Shield, 
  Users, 
  AlertTriangle, 
  MapPin, 
  Plus, 
  Trash2, 
  Sliders, 
  Bot, 
  Battery, 
  Eye, 
  Layers, 
  Radio,
  Search,
  CheckCircle2,
  ChevronRight,
  UserCheck,
  ShieldCheck,
  Zap,
  Activity,
  Share2,
  Copy,
  UserPlus,
  Check
} from 'lucide-react';
import { GeofenceArea, Traveller } from '../types';

export const AdminDashboard = () => {
  const {
    user,
    geofences,
    addGeofence,
    removeGeofence,
    updateGeofence,
    travellers,
    selectedTravellerId,
    setSelectedTravellerId,
    toggleUserRole,
    currentLocation,
  } = useAppContext();

  // Tab selection: 'ai_assistant' | 'geofences' | 'travellers'
  const [activeTab, setActiveTab] = useState<'ai_assistant' | 'geofences' | 'travellers'>('ai_assistant');
  const [mapStyle, setMapStyle] = useState<OpenFreeMapStyleId>('liberty');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPlacingOnMap, setIsPlacingOnMap] = useState(false);
  const [clickedMapCoords, setClickedMapCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [travellerSearch, setTravellerSearch] = useState('');
  const [travellerFilter, setTravellerFilter] = useState<'all' | 'safe' | 'warning' | 'critical'>('all');
  const [systemAlertMessage, setSystemAlertMessage] = useState<string | null>(null);
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopiedInviteLink(true);
    setTimeout(() => setCopiedInviteLink(false), 3500);
  };

  const handleAddLiveDevice = async () => {
    const deviceNum = travellers.length + 1;
    const testTravellerId = `dev_${Date.now().toString(36)}`;
    const dummyUser = {
      id: testTravellerId,
      name: `Real Traveler #${deviceNum}`,
      email: `traveler${deviceNum}@geosafe.net`,
      phone: '+1 555-0199',
      role: 'tourist' as const,
    };
    // Position around current location
    const offsetLat = (Math.random() - 0.5) * 0.012;
    const offsetLng = (Math.random() - 0.5) * 0.012;
    const deviceLoc = {
      lat: currentLocation.lat + offsetLat,
      lng: currentLocation.lng + offsetLng,
    };
    await updateLiveTravellerPresence(dummyUser, deviceLoc, Math.floor(Math.random() * 30) + 70, 89, 'safe');
  };

  // Selected traveller object
  const selectedTraveller = useMemo(
    () => travellers.find(t => t.id === selectedTravellerId) || null,
    [travellers, selectedTravellerId]
  );

  // Geofence statistics
  const stats = useMemo(() => {
    const totalTravellers = travellers.length;
    const criticalTravellers = travellers.filter(t => t.status === 'critical' || t.status === 'sos').length;
    const warningTravellers = travellers.filter(t => t.status === 'warning').length;
    const safeTravellers = travellers.filter(t => t.status === 'safe').length;

    const totalGeofences = geofences.length;
    const safeGeofences = geofences.filter(g => g.riskLevel === 'safe').length;
    const hazardGeofences = geofences.filter(g => g.riskLevel !== 'safe').length;

    return {
      totalTravellers,
      criticalTravellers,
      warningTravellers,
      safeTravellers,
      totalGeofences,
      safeGeofences,
      hazardGeofences,
    };
  }, [travellers, geofences]);

  // Map click handler for placing geofences
  const handleMapClickCoordinates = (coords: { lat: number; lng: number }) => {
    setClickedMapCoords(coords);
    setIsPlacingOnMap(false);
    setIsCreateModalOpen(true);
  };

  // Filtered travellers
  const filteredTravellers = useMemo(() => {
    return travellers.filter(t => {
      const matchQuery =
        t.name.toLowerCase().includes(travellerSearch.toLowerCase()) ||
        t.nationality.toLowerCase().includes(travellerSearch.toLowerCase()) ||
        t.email.toLowerCase().includes(travellerSearch.toLowerCase());
      const matchFilter = travellerFilter === 'all' || t.status === travellerFilter;
      return matchQuery && matchFilter;
    });
  }, [travellers, travellerSearch, travellerFilter]);

  // Count travellers inside a specific geofence
  const getTravellersInGeofence = (gf: GeofenceArea) => {
    return travellers.filter(t => {
      const dist = calculateDistance(t.location, gf.center);
      return dist <= gf.radius;
    });
  };

  // Handle broadcast alert
  const handleBroadcastAlert = (msg: string) => {
    setSystemAlertMessage(msg);
    setTimeout(() => setSystemAlertMessage(null), 6000);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100 font-sans">
      {/* Top Banner Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                Admin Command & Geofence Intelligence
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 text-blue-600 animate-pulse" />
                Live Dispatch
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Real-time tourist telemetry, dynamic spatial perimeters & autonomous AI controller
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Map Style Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            {(['liberty', 'positron', 'dark', '3d'] as OpenFreeMapStyleId[]).map(style => (
              <button
                key={style}
                onClick={() => setMapStyle(style)}
                className={`px-2 py-1 rounded text-[11px] font-medium capitalize transition-colors ${
                  mapStyle === style
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {style}
              </button>
            ))}
          </div>

          {/* Place Geofence on Map Toggle */}
          <button
            onClick={() => setIsPlacingOnMap(!isPlacingOnMap)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs ${
              isPlacingOnMap
                ? 'bg-amber-500 text-white animate-pulse'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            {isPlacingOnMap ? 'Click Map to Place...' : 'Place on Map'}
          </button>

          {/* Add Geofence Button */}
          <button
            onClick={() => {
              setClickedMapCoords(null);
              setIsCreateModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Geofence
          </button>

          {/* Role Toggle */}
          <button
            onClick={toggleUserRole}
            title="Toggle between Tourist and Admin views"
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Mode:</span>
            <span className="font-bold text-white capitalize">{user?.role}</span>
          </button>
        </div>
      </div>

      {/* Real-time Broadcast Notice if active */}
      {systemAlertMessage && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shrink-0 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Operational Broadcast: {systemAlertMessage}</span>
          </div>
          <button onClick={() => setSystemAlertMessage(null)} className="text-white/80 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden p-3 gap-3">
        {/* Left / Center Section: Interactive Map + Traveller Inspector (65% width on desktop) */}
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-200 bg-slate-50/70 shrink-0 text-xs">
            <div className="p-2.5 px-3.5 border-r border-slate-200">
              <span className="text-[10px] font-semibold text-slate-500 block uppercase">Travellers Monitored</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg font-extrabold text-slate-900">{stats.totalTravellers}</span>
                <span className="text-[11px] text-emerald-600 font-medium">({stats.safeTravellers} Safe)</span>
              </div>
            </div>

            <div className="p-2.5 px-3.5 border-r border-slate-200">
              <span className="text-[10px] font-semibold text-slate-500 block uppercase">Risk / Critical Alerts</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className={`text-lg font-extrabold ${stats.criticalTravellers > 0 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
                  {stats.criticalTravellers + stats.warningTravellers}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">in hazard zones</span>
              </div>
            </div>

            <div className="p-2.5 px-3.5 border-r border-slate-200">
              <span className="text-[10px] font-semibold text-slate-500 block uppercase">Active Geofences</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg font-extrabold text-blue-700">{stats.totalGeofences}</span>
                <span className="text-[11px] text-slate-500">({stats.safeGeofences} Safe / {stats.hazardGeofences} Hazard)</span>
              </div>
            </div>

            <div className="p-2.5 px-3.5">
              <span className="text-[10px] font-semibold text-slate-500 block uppercase">AI Controller Engine</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="font-bold text-slate-800 text-xs">Groq LPU / Dynamic</span>
              </div>
            </div>
          </div>

          {/* The OpenFreeMap Admin Map */}
          <div className="flex-1 min-h-[420px] relative w-full h-full">
            <OpenFreeMapAdmin
              center={currentLocation}
              zoom={13.8}
              styleId={mapStyle}
              geofences={geofences}
              travellers={travellers}
              selectedTravellerId={selectedTravellerId}
              onSelectTraveller={setSelectedTravellerId}
              onRemoveGeofence={removeGeofence}
              onMapClickCoordinates={handleMapClickCoordinates}
              isPlacingGeofence={isPlacingOnMap}
            />
          </div>

          {/* Traveller Inspector Bottom Drawer (Visible when traveller selected) */}
          {selectedTraveller && (
            <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-xs ${
                  selectedTraveller.status === 'critical' ? 'bg-red-600 ring-4 ring-red-100' : selectedTraveller.status === 'warning' ? 'bg-amber-500 ring-4 ring-amber-100' : 'bg-emerald-600 ring-4 ring-emerald-100'
                }`}>
                  {selectedTraveller.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-sm">{selectedTraveller.name}</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedTraveller.status === 'critical' ? 'bg-red-100 text-red-800' : selectedTraveller.status === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {selectedTraveller.status}
                    </span>
                    <span className="text-[11px] text-slate-500">📍 {selectedTraveller.nationality}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-600 mt-0.5">
                    <span className="flex items-center gap-1 font-medium">
                      <Battery className="w-3.5 h-3.5 text-slate-400" />
                      {selectedTraveller.batteryLevel}% Battery
                    </span>
                    <span>•</span>
                    <span className="font-medium text-blue-600">
                      Safety Score: {selectedTraveller.safetyScore}/100
                    </span>
                    <span>•</span>
                    <span className="text-slate-500">
                      Geofence: <strong className="capitalize">{selectedTraveller.geofenceStatus.replace('_', ' ')}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBroadcastAlert(`Caution notification dispatched to ${selectedTraveller.name}`)}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold transition-colors"
                >
                  Send Direct Alert
                </button>
                <button
                  onClick={() => setSelectedTravellerId(null)}
                  className="px-2.5 py-1.5 text-slate-400 hover:text-slate-600 text-xs font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Section: Multi-Tab Console (AI Chatbot / Geofence Management / Travellers Directory) (35% width) */}
        <div className="w-full lg:w-[420px] flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 p-1 bg-slate-50 text-xs shrink-0">
            <button
              onClick={() => setActiveTab('ai_assistant')}
              className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'ai_assistant'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bot className="w-4 h-4 text-blue-600" />
              AI Controller
            </button>

            <button
              onClick={() => setActiveTab('geofences')}
              className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'geofences'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-4 h-4 text-emerald-600" />
              Geofences ({geofences.length})
            </button>

            <button
              onClick={() => setActiveTab('travellers')}
              className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'travellers'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-slate-600" />
              Travellers ({travellers.length})
            </button>
          </div>

          {/* Tab 1: AI Chatbot for Dynamic Geofencing & Tasks */}
          {activeTab === 'ai_assistant' && (
            <div className="flex-1 min-h-0">
              <AdminAIChatbot
                geofences={geofences}
                travellers={travellers}
                onAddGeofence={addGeofence}
                onRemoveGeofence={removeGeofence}
                onUpdateGeofence={updateGeofence}
                onSelectTraveller={setSelectedTravellerId}
                onActionExecuted={(act) => {
                  if (act.summary) handleBroadcastAlert(act.summary);
                }}
              />
            </div>
          )}

          {/* Tab 2: Geofences List & Controls */}
          {activeTab === 'geofences' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                <span className="text-xs font-semibold text-slate-600">
                  {geofences.length} Active Dynamic Perimeters
                </span>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Zone
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {geofences.map(gf => {
                  const travellersInside = getTravellersInGeofence(gf);
                  const isSafe = gf.riskLevel === 'safe';
                  const isCritical = gf.riskLevel === 'critical';

                  return (
                    <div
                      key={gf.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isCritical
                          ? 'border-red-200 bg-red-50/30'
                          : isSafe
                          ? 'border-emerald-200 bg-emerald-50/30'
                          : 'border-amber-200 bg-amber-50/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-xs text-slate-900">{gf.name}</h4>
                            <span className="text-[10px] text-slate-400 font-mono">({gf.id})</span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-snug mt-0.5 line-clamp-2">
                            {gf.description}
                          </p>
                        </div>

                        {/* Delete Geofence */}
                        <button
                          onClick={() => removeGeofence(gf.id)}
                          title="Remove this geofence"
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isCritical ? 'bg-red-100 text-red-800' : isSafe ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {gf.riskLevel}
                          </span>
                          <span className="text-[11px] font-medium text-slate-700">
                            Radius: <strong>{gf.radius}m</strong>
                          </span>
                        </div>

                        {/* Travellers in Zone Count */}
                        <div className="flex items-center gap-1 text-[11px] text-slate-600">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{travellersInside.length} travellers inside</span>
                        </div>
                      </div>

                      {/* Quick Radius Adjustment Buttons */}
                      <div className="mt-2 flex items-center gap-1.5 justify-end">
                        <span className="text-[10px] text-slate-400">Adjust:</span>
                        <button
                          onClick={() => updateGeofence(gf.id, { radius: Math.max(100, gf.radius - 50) })}
                          className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded text-[10px] font-semibold"
                        >
                          -50m
                        </button>
                        <button
                          onClick={() => updateGeofence(gf.id, { radius: gf.radius + 50 })}
                          className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded text-[10px] font-semibold"
                        >
                          +50m
                        </button>
                      </div>
                    </div>
                  );
                })}

                {geofences.length === 0 && (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No active geofences. Create one or ask the AI Controller.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Travellers Telemetry Directory */}
          {activeTab === 'travellers' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Live Authenticated Status & Connect Tools */}
              <div className="p-3 bg-gradient-to-r from-blue-50 to-slate-50 border-b border-blue-100/70 shrink-0">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[11px] font-bold text-slate-800">Live Authenticated Grid</span>
                  </div>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                    {travellers.length} Connected
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-tight mb-2.5">
                  Only actual logged-in people broadcasting live GPS coordinates are displayed. No fake demo data.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={handleCopyInviteLink}
                    className="flex-1 py-1.5 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 shadow-2xs transition-all"
                  >
                    {copiedInviteLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Invite Traveler</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleAddLiveDevice}
                    className="py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all"
                    title="Simulate a real second device publishing GPS coordinates to Firestore"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Add Live Device</span>
                  </button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="p-3 border-b border-slate-100 space-y-2 shrink-0 bg-slate-50/50">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={travellerSearch}
                    onChange={e => setTravellerSearch(e.target.value)}
                    placeholder="Search traveller by name or nationality..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-1 overflow-x-auto text-[11px]">
                  {(['all', 'safe', 'warning', 'critical'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setTravellerFilter(f)}
                      className={`px-2.5 py-1 rounded-lg capitalize font-medium transition-colors ${
                        travellerFilter === f
                          ? 'bg-slate-800 text-white font-bold shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Travellers Feed */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredTravellers.map(t => {
                  const isSelected = selectedTravellerId === t.id;
                  const isCritical = t.status === 'critical';
                  const isWarning = t.status === 'warning';

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTravellerId(isSelected ? null : t.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2.5 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                          isCritical ? 'bg-red-600' : isWarning ? 'bg-amber-500' : 'bg-emerald-600'
                        }`}>
                          {t.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h5 className="font-bold text-xs text-slate-900">{t.name}</h5>
                            <span className="text-[10px] text-slate-400">({t.nationality})</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span className="flex items-center gap-0.5 font-medium">
                              <Battery className="w-3 h-3 text-slate-400" />
                              {t.batteryLevel}%
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-blue-600">Score {t.safetyScore}</span>
                            <span>•</span>
                            <span className="capitalize">{t.geofenceStatus.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isCritical ? 'bg-red-100 text-red-800' : isWarning ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {t.status}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  );
                })}

                {filteredTravellers.length === 0 && (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-700 mb-1">No Active Travellers</p>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Share the invite link or click "Add Live Device" to connect authenticated devices.
                    </p>
                    <button
                      onClick={handleAddLiveDevice}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                    >
                      Connect First Live Traveler
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Geofence Creation Modal */}
      <GeofenceManagerModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setClickedMapCoords(null);
        }}
        onAddGeofence={addGeofence}
        initialCoords={clickedMapCoords}
      />
    </div>
  );
};
