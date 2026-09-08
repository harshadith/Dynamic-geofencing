import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { ShieldAlert, PhoneCall, MapPin, CheckCircle2, X } from 'lucide-react';
import { DEMO_EMERGENCY_SERVICES } from '../data/demoData';
import { useNavigate } from 'react-router';

export const SOS = () => {
  const { currentLocation, emergencyActive, setEmergencyActive, user } = useAppContext();
  const [countdown, setCountdown] = useState(3);
  const [status, setStatus] = useState<'confirming' | 'active' | 'resolved'>(emergencyActive ? 'active' : 'confirming');
  const navigate = useNavigate();

  React.useEffect(() => {
    let timer: any;
    if (status === 'confirming' && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (status === 'confirming' && countdown === 0) {
      setStatus('active');
      setEmergencyActive(true);
    }
    return () => clearTimeout(timer);
  }, [countdown, status, setEmergencyActive]);

  const cancelEmergency = () => {
    setStatus('resolved');
    setEmergencyActive(false);
  };

  const nearestHospital = DEMO_EMERGENCY_SERVICES.find(s => s.type === 'hospital');
  const nearestPolice = DEMO_EMERGENCY_SERVICES.find(s => s.type === 'police');

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4">
      {status === 'confirming' && (
        <div className="bg-red-50 p-8 rounded-3xl max-w-md w-full text-center border-2 border-red-200 shadow-xl animate-pulse">
          <ShieldAlert className="w-20 h-20 text-red-600 mx-auto mb-6" />
          <h2 className="text-3xl font-extrabold text-red-900 mb-2">Activating SOS in</h2>
          <div className="text-7xl font-black text-red-600 mb-8 font-mono">{countdown}</div>
          <p className="text-red-700 mb-8 font-medium">This will share your live location with local authorities and emergency contacts.</p>
          <button 
            onClick={() => {
              setEmergencyActive(false);
              navigate(-1);
            }}
            className="w-full py-4 bg-white text-slate-700 font-bold rounded-xl border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {status === 'active' && (
        <div className="w-full max-w-3xl flex flex-col gap-6">
          <div className="bg-red-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                  <ShieldAlert className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-black mb-1">SOS ACTIVE</h2>
                  <p className="text-red-100 font-medium">Assistance requested. Do not close this app.</p>
                </div>
              </div>
              
              <button onClick={cancelEmergency} className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors backdrop-blur-md">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mt-8 relative z-10">
              <div className="bg-red-700/50 p-5 rounded-2xl backdrop-blur-md border border-red-500/50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-red-100 text-sm uppercase tracking-wider">Live Location Shared</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-bold text-emerald-400">TRANSMITTING</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-red-900/40 p-3 rounded-xl font-mono text-sm">
                  <MapPin className="w-4 h-4 text-red-300" />
                  {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                </div>
              </div>

              <div className="bg-red-700/50 p-5 rounded-2xl backdrop-blur-md border border-red-500/50">
                <h3 className="font-bold text-red-100 text-sm uppercase tracking-wider mb-4">Notified Contacts</h3>
                <div className="flex items-center gap-3 bg-red-900/40 p-3 rounded-xl">
                  <PhoneCall className="w-4 h-4 text-red-300" />
                  <div>
                    <p className="font-bold text-sm">{user?.emergencyContact?.name || 'Local Authorities'}</p>
                    <p className="text-xs text-red-200">{user?.emergencyContact?.phone || '911'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">Nearest Hospital</h3>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-lg">{nearestHospital?.name}</p>
                  <p className="text-slate-500 text-sm mt-1">Estimated distance: 1.2 km</p>
                </div>
                <a href={`tel:${nearestHospital?.phone}`} className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors">
                  <PhoneCall className="w-5 h-5" />
                </a>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">Tourist Police</h3>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-lg">{nearestPolice?.name}</p>
                  <p className="text-slate-500 text-sm mt-1">Estimated distance: 0.8 km</p>
                </div>
                <a href={`tel:${nearestPolice?.phone}`} className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors">
                  <PhoneCall className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {status === 'resolved' && (
        <div className="bg-white p-8 rounded-3xl max-w-md w-full text-center border border-slate-200 shadow-sm">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Emergency Resolved</h2>
          <p className="text-slate-500 mb-8">Location sharing has been stopped and contacts have been notified that you are safe.</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-sm hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      )}
    </div>
  );
};
