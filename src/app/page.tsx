'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import AIChatbot from '@/components/chat/AIChatbot';
import {
  Shield,
  Compass,
  Users,
  Radio,
  MapPin,
  Bot,
  Zap,
  ArrowRight,
  Database,
  Navigation,
  CheckCircle2,
} from 'lucide-react';

export default function LandingPage() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      <Navbar onToggleChat={() => setIsAIChatOpen(true)} />

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/60 text-blue-400 text-xs font-semibold mb-6 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
          <span>PostgreSQL + PostGIS & Vercel AI SDK on Groq</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.15]">
          Dynamic Geofencing & Real-Time Safety Navigation for{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-300">
            Tourists & Tour Guides
          </span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          Empower tour guides to orchestrate expeditions with live GPS telemetry, deploy adaptive geofences that react to anomalies, and guide tourists through multi-criteria safety-evaluated routes.
        </p>

        {/* Primary Role Launch Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          {/* Guide Portal Card */}
          <Link
            href="/guide"
            className="group relative p-6 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 hover:border-blue-500/60 shadow-2xl transition-all duration-300 text-left hover:-translate-y-1 hover:shadow-blue-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                <Compass className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                  Tour Guide Command Center
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                  DISPATCHER
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Create tours, track real-time tourist GPS coordinates on the interactive radar map, deploy custom geofences with adaptive expansion, and broadcast safety alerts.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-blue-400 group-hover:translate-x-1 transition-transform">
              <span>Launch Guide Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Tourist Portal Card */}
          <Link
            href="/tourist"
            className="group relative p-6 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 hover:border-cyan-500/60 shadow-2xl transition-all duration-300 text-left hover:-translate-y-1 hover:shadow-cyan-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                  Tourist Safety Navigator
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                  TRAVELLER
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Join active tours with a 6-digit code, broadcast GPS telemetry to your guide, receive instant geofence threat alerts, and navigate using dynamic safety-aware routing.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition-transform">
              <span>Enter Tourist Portal</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        {/* Feature Matrix */}
        <div className="mt-20 w-full max-w-5xl">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-8">
            Engineered Capabilities & Real-Time Specifications
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Adaptive Geofencing</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Boundaries dynamically scale from 1.0x to 2.5x based on risk estimate, disaster spread, and traffic congestion.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
                <Navigation className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Dynamic Route Re-Ranking</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Multi-criteria routing evaluated on safety score, distance, travel time, and crowd density with automatic rerouting.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
                <Radio className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Supabase Realtime</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Sub-50ms WebSocket telemetry streaming GPS positions, hazard alerts, and member presence across connected clients.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                <Bot className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Groq AI Safety Assistant</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Vercel AI SDK tool-calling fetching nearby emergency contacts, explaining geofence alerts, and advising tourists.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-4 text-center text-xs text-slate-500">
        <p>GeoSafe AI • Dynamic Geofencing & Tourist Safety Platform • Next.js App Router & PostGIS</p>
      </footer>

      {/* AI Assistant Drawer */}
      <AIChatbot isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
