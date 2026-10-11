'use client';

import React from 'react';
import { DynamicGeofence, ThreatLevel } from '@/types';
import { AlertTriangle, ShieldCheck, Navigation, X } from 'lucide-react';

interface AlertModalProps {
  zone: DynamicGeofence;
  warningType: 'in_hazard' | 'warning_perimeter';
  onDismiss: () => void;
  onReroute?: () => void;
}

export default function AlertModal({
  zone,
  warningType,
  onDismiss,
  onReroute,
}: AlertModalProps) {
  const isCritical = zone.threatLevel === 'critical';
  const isHigh = zone.threatLevel === 'high';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[2000] w-[92%] sm:w-[500px] animate-in fade-in slide-in-from-bottom duration-300">
      <div
        className={`relative rounded-2xl p-4 shadow-2xl border backdrop-blur-xl ${
          isCritical
            ? 'bg-rose-950/90 border-rose-600 text-rose-100 shadow-rose-900/50'
            : isHigh
            ? 'bg-red-950/90 border-red-500 text-red-100 shadow-red-900/40'
            : 'bg-amber-950/90 border-amber-500 text-amber-100 shadow-amber-900/40'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              isCritical ? 'bg-rose-600 text-white animate-ping-slow' : 'bg-red-600 text-white'
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isCritical ? 'bg-rose-700 text-white' : 'bg-amber-600 text-white'
                }`}
              >
                {warningType === 'in_hazard' ? 'ZONE BREACH ALERT' : 'PROXIMITY WARNING'}
              </span>
              <span className="text-xs font-semibold opacity-90">
                Threat: {zone.threatLevel.toUpperCase()}
              </span>
            </div>

            <h3 className="font-bold text-sm text-white mt-1">{zone.name}</h3>
            <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">{zone.description}</p>

            <div className="mt-3 flex items-center gap-2">
              {onReroute && (
                <button
                  onClick={onReroute}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-200 shadow transition-all"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Reroute via Safe Corridor</span>
                </button>
              )}
              <button
                onClick={onDismiss}
                className="px-3 py-1.5 rounded-xl bg-black/30 hover:bg-black/50 text-xs text-white/90 border border-white/20 transition-colors"
              >
                Acknowledge
              </button>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="text-white/60 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
