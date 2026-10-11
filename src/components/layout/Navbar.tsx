'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Compass, Users, Bot, Radio, AlertTriangle } from 'lucide-react';

interface NavbarProps {
  onToggleChat?: () => void;
  activeAlertCount?: number;
}

export default function Navbar({ onToggleChat, activeAlertCount = 0 }: NavbarProps) {
  const pathname = usePathname();

  const isGuide = pathname.startsWith('/guide');
  const isTourist = pathname.startsWith('/tourist');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">GeoSafe</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                PostGIS AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Dynamic Geofencing & Tour Safety</p>
          </div>
        </Link>

        {/* Role Navigation Switcher */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <Link
            href="/guide"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isGuide
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Tour Guide</span>
          </Link>
          <Link
            href="/tourist"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isTourist
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Tourist Portal</span>
          </Link>
        </div>

        {/* Right Status & AI Co-Pilot trigger */}
        <div className="flex items-center gap-3">
          {/* Realtime Live Pulse */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-xs">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span className="font-medium text-[11px]">Realtime Synced</span>
          </div>

          {/* AI Assistant Button */}
          {onToggleChat && (
            <button
              onClick={onToggleChat}
              className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all hover:scale-105 active:scale-95"
            >
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">AI Safety Co-Pilot</span>
              {activeAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white animate-pulse">
                  {activeAlertCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
