import React, { useEffect, useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { calculateSafetyStatus } from '../services/SafetyEngine';
import { DEMO_INCIDENTS, DEMO_RISK_ZONES } from '../data/demoData';
import { Shield, ShieldAlert, Thermometer, Users, Navigation, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router';
import { cn } from '../components/Layout';

export const Dashboard = () => {
  const { user, currentLocation, safetyStatus, setSafetyStatus } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    // Calculate initial safety score based on current location
    const status = calculateSafetyStatus(currentLocation, DEMO_INCIDENTS, DEMO_RISK_ZONES);
    setSafetyStatus(status);
  }, [currentLocation, setSafetyStatus]);

  if (!safetyStatus) return <div className="p-8 text-center">Loading Safety Data...</div>;

  const scoreColor = 
    safetyStatus.category === 'SAFE' ? 'text-emerald-500' :
    safetyStatus.category === 'MODERATE' ? 'text-blue-500' :
    safetyStatus.category === 'CAUTION' ? 'text-amber-500' : 'text-red-500';

  const bgScoreColor = 
    safetyStatus.category === 'SAFE' ? 'bg-emerald-500' :
    safetyStatus.category === 'MODERATE' ? 'bg-blue-500' :
    safetyStatus.category === 'CAUTION' ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome, {user?.name?.split(' ')[0]}</h1>
          <p className="text-slate-500">Your personalized intelligent safety overview.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/route')} className="px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2">
            <Navigation className="w-4 h-4" />
            Find Route
          </button>
        </div>
      </div>

      {/* Main Safety Score Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-8">
          <div className="relative flex flex-col items-center justify-center shrink-0">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle cx="80" cy="80" r="70" className="stroke-slate-100" strokeWidth="12" fill="none" />
              <circle 
                cx="80" cy="80" r="70" 
                className={cn("stroke-current transition-all duration-1000 ease-out", scoreColor)} 
                strokeWidth="12" fill="none" 
                strokeDasharray="439.8" 
                strokeDashoffset={439.8 - (439.8 * safetyStatus.score) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-extrabold text-slate-900">{safetyStatus.score}</span>
              <span className="text-sm font-medium text-slate-500 uppercase">/ 100</span>
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-sm font-bold tracking-wide mb-3">
              <div className={cn("w-2 h-2 rounded-full", bgScoreColor)}></div>
              {safetyStatus.category}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Dynamic Safety Index</h2>
            <p className="text-slate-600 mb-6 max-w-lg">
              Calculated in real-time based on environmental context, live crime reports, weather conditions, and crowd density.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ScoreDetail label="Crime" score={safetyStatus.details.crime} icon={Shield} />
              <ScoreDetail label="Weather" score={safetyStatus.details.weather} icon={Thermometer} />
              <ScoreDetail label="Crowd" score={safetyStatus.details.crowd} icon={Users} />
              <ScoreDetail label="Traffic" score={safetyStatus.details.traffic} icon={Navigation} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:col-span-2">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <QuickActionButton icon={Navigation} label="Safe Route" onClick={() => navigate('/route')} color="blue" />
            <QuickActionButton icon={ShieldCheck} label="Safety Map" onClick={() => navigate('/map')} color="emerald" />
            <QuickActionButton icon={AlertTriangle} label="Report Issue" onClick={() => {}} color="amber" />
            <QuickActionButton icon={ShieldAlert} label="SOS" onClick={() => navigate('/sos')} color="red" />
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center justify-between">
            Live Alerts
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          </h3>
          <div className="space-y-4">
            {DEMO_INCIDENTS.map(inc => (
              <div key={inc.id} className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <AlertTriangle className={cn("w-5 h-5 shrink-0 mt-0.5", 
                  inc.severity === 'high' ? 'text-red-500' : 'text-amber-500'
                )} />
                <div>
                  <p className="text-sm font-semibold text-slate-900 capitalize">{inc.type} Alert</p>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{inc.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ScoreDetail = ({ label, score, icon: Icon }: { label: string, score: number, icon: any }) => (
  <div className="flex flex-col items-center md:items-start p-3 bg-slate-50 rounded-xl border border-slate-100">
    <div className="flex items-center gap-2 mb-2 text-slate-600">
      <Icon className="w-4 h-4" />
      <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-xl font-bold text-slate-900">{score}</span>
      <span className="text-xs text-slate-500">/100</span>
    </div>
    <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
      <div 
        className={cn("h-full rounded-full", score > 80 ? 'bg-emerald-500' : score > 60 ? 'bg-blue-500' : score > 40 ? 'bg-amber-500' : 'bg-red-500')}
        style={{ width: `${score}%` }}
      />
    </div>
  </div>
);

const QuickActionButton = ({ icon: Icon, label, onClick, color }: { icon: any, label: string, onClick: () => void, color: string }) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-100',
    red: 'bg-red-50 text-red-600 hover:bg-red-100 border-red-100',
  };
  
  return (
    <button 
      onClick={onClick}
      className={cn("flex flex-col items-center justify-center p-4 rounded-xl border transition-colors aspect-square gap-3", colorMap[color])}
    >
      <Icon className="w-8 h-8" />
      <span className="text-sm font-semibold text-slate-900">{label}</span>
    </button>
  );
};
