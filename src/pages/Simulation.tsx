import React, { useState, useEffect } from 'react';
import { useAppContext } from '../store/AppContext';
import { calculateSafetyStatus } from '../services/SafetyEngine';
import { DEMO_INCIDENTS, DEMO_RISK_ZONES } from '../data/demoData';
import { Sliders, Shield, AlertTriangle, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export const Simulation = () => {
  const { currentLocation, user } = useAppContext();
  
  const [params, setParams] = useState({
    crime: 90,
    weather: 85,
    traffic: 80,
    crowd: 75,
  });

  const [history, setHistory] = useState<any[]>([]);

  const simulatedStatus = calculateSafetyStatus(currentLocation, DEMO_INCIDENTS, DEMO_RISK_ZONES, params);

  useEffect(() => {
    setHistory(prev => {
      const newHistory = [...prev, { time: new Date().toLocaleTimeString(), score: simulatedStatus.score }].slice(-20);
      return newHistory;
    });
  }, [params, simulatedStatus.score]);

  if (user?.role !== 'admin') {
    return (
      <div className="p-8 text-center text-slate-500">
        <Shield className="w-16 h-16 mx-auto mb-4 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
        <p>This module is restricted to researchers and administrators.</p>
      </div>
    );
  }

  const handleParamChange = (key: keyof typeof params, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Research Simulation</h1>
        <p className="text-slate-500">Test the Adaptive Geofencing Engine and DSI by manipulating environmental variables.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Controls */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Sliders className="w-5 h-5 text-slate-600" />
            <h3 className="font-bold text-slate-900">Environment Variables</h3>
          </div>

          <SimulationSlider label="Crime Safety Level" value={params.crime} onChange={(v) => handleParamChange('crime', v)} />
          <SimulationSlider label="Weather Conditions" value={params.weather} onChange={(v) => handleParamChange('weather', v)} />
          <SimulationSlider label="Traffic Fluidity" value={params.traffic} onChange={(v) => handleParamChange('traffic', v)} />
          <SimulationSlider label="Crowd Comfort" value={params.crowd} onChange={(v) => handleParamChange('crowd', v)} />
          
          <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <h4 className="text-sm font-bold text-blue-900 mb-2">Simulated Impact</h4>
            <p className="text-xs text-blue-700 leading-relaxed">
              Adjusting these variables simulates real-time data ingestion from city sensors and APIs. Lower values indicate higher risk/worse conditions.
            </p>
          </div>
        </div>

        {/* Results & Analytics */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Live Metrics */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Resulting Safety Score</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black text-slate-900">{simulatedStatus.score}</span>
                  <span className="text-sm font-bold text-slate-500 mb-1">/100</span>
                </div>
              </div>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${simulatedStatus.score > 80 ? 'bg-emerald-100 text-emerald-600' : simulatedStatus.score > 60 ? 'bg-blue-100 text-blue-600' : simulatedStatus.score > 40 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                <Activity className="w-8 h-8" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Adaptive Geofence Radius</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black text-slate-900">{simulatedStatus.geofenceRadius}</span>
                  <span className="text-sm font-bold text-slate-500 mb-1">meters</span>
                </div>
              </div>
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center border-4 border-blue-400 border-dashed">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6">DSI Response Curve</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="time" hide />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    dot={false}
                    activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparative Analysis */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Static vs Adaptive Comparison</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Static System (Legacy)</h4>
                <p className="font-medium text-slate-900">Fixed 100m geofence.</p>
                <p className="text-sm text-slate-600 mt-2">Does not respond to the {100 - params.crime}% increase in crime risk. Tourist remains unaware until physical incident occurs.</p>
              </div>
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50">
                <h4 className="text-xs font-bold text-blue-600 uppercase mb-2">GeoSafeAI (Proposed)</h4>
                <p className="font-medium text-blue-900">Adaptive {simulatedStatus.geofenceRadius}m warning zone.</p>
                <p className="text-sm text-blue-800 mt-2">System proactively expands warning perimeter and recommends immediate route recalculation.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const SimulationSlider = ({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{value}/100</span>
    </div>
    <input 
      type="range" 
      min="0" 
      max="100" 
      value={value} 
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
    />
  </div>
);
