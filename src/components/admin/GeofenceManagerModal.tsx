import React, { useState } from 'react';
import { Shield, X, MapPin, AlertTriangle, CheckCircle2, Sliders } from 'lucide-react';
import { GeofenceArea, GeofenceRiskLevel, GeofenceType } from '../../types';
import { DEMO_DESTINATIONS } from '../../data/demoData';

interface GeofenceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGeofence: (gf: Omit<GeofenceArea, 'id' | 'createdAt'>) => void;
  initialCoords?: { lat: number; lng: number } | null;
}

export const GeofenceManagerModal: React.FC<GeofenceManagerModalProps> = ({
  isOpen,
  onClose,
  onAddGeofence,
  initialCoords,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [radius, setRadius] = useState(350);
  const [type, setType] = useState<GeofenceType>('restricted');
  const [riskLevel, setRiskLevel] = useState<GeofenceRiskLevel>('moderate');
  const [lat, setLat] = useState(initialCoords?.lat ?? 48.8566);
  const [lng, setLng] = useState(initialCoords?.lng ?? 2.3522);

  React.useEffect(() => {
    if (initialCoords) {
      setLat(Number(initialCoords.lat.toFixed(5)));
      setLng(Number(initialCoords.lng.toFixed(5)));
    }
  }, [initialCoords]);

  if (!isOpen) return null;

  const handleSelectLandmark = (destId: string) => {
    const dest = DEMO_DESTINATIONS.find(d => d.id === destId);
    if (dest) {
      setLat(dest.location.lat);
      setLng(dest.location.lng);
      if (!name) setName(`${dest.name} Safety Zone`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddGeofence({
      name: name.trim(),
      description: description.trim() || `Geofence perimeter for safety monitoring (${radius}m)`,
      center: { lat: Number(lat), lng: Number(lng) },
      radius,
      type,
      riskLevel,
      isActive: true,
      createdBy: 'admin',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Create Geofence Zone</h3>
              <p className="text-xs text-slate-500">Define dynamic perimeter for traveller monitoring</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Quick Landmark Preset */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Landmark Preset (Optional)</label>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_DESTINATIONS.map(d => (
                <button
                  type="button"
                  key={d.id}
                  onClick={() => handleSelectLandmark(d.id)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg border border-slate-200 transition-colors"
                >
                  📍 {d.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Geofence Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Old Town Protest Alert Zone"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type / Category</label>
              <select
                value={type}
                onChange={e => {
                  const t = e.target.value as GeofenceType;
                  setType(t);
                  if (t === 'safe_haven' || t === 'tourist_perimeter') setRiskLevel('safe');
                  else if (t === 'hazard') setRiskLevel('high');
                  else setRiskLevel('moderate');
                }}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="safe_haven">Safe Haven (Green)</option>
                <option value="tourist_perimeter">Tourist Corridor (Green)</option>
                <option value="restricted">Restricted Zone (Orange)</option>
                <option value="hazard">Critical Hazard (Red)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Risk Severity</label>
              <select
                value={riskLevel}
                onChange={e => setRiskLevel(e.target.value as GeofenceRiskLevel)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white capitalize"
              >
                <option value="safe">Safe Area</option>
                <option value="moderate">Moderate Caution</option>
                <option value="high">High Risk</option>
                <option value="critical">Critical Emergency</option>
              </select>
            </div>
          </div>

          {/* Radius Slider */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                Coverage Radius
              </span>
              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {radius} meters
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="1500"
              step="50"
              value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>100m (Local)</span>
              <span>750m</span>
              <span>1,500m (City District)</span>
            </div>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Center Latitude</label>
              <input
                type="number"
                step="0.0001"
                required
                value={lat}
                onChange={e => setLat(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Center Longitude</label>
              <input
                type="number"
                step="0.0001"
                required
                value={lng}
                onChange={e => setLng(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Operational Description / Notes</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g., Police perimeter established due to construction or public assembly..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
            >
              Add Geofence
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
