import React from 'react';
import { useNavigate } from 'react-router';
import { Shield, Map, Zap, Bell, Navigation, Activity } from 'lucide-react';

export const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">G</div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-cyan-600">GeoSafeAI</span>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Sign In
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
            >
              Start Safe Journey
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-white py-20 sm:py-32">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-8 border border-blue-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Intelligent Tourism Safety Platform
            </div>
            <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-slate-900 mb-6">
              Travel Smarter.<br/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500">Navigate Safer.</span>
            </h1>
            <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              Adaptive geofencing and AI-powered risk-aware navigation for modern travelers. Dynamic safety index calculating real-time crime, weather, and crowd density to protect your journey.
            </p>
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="px-8 py-4 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
              >
                Start Safe Journey
              </button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900">Research Innovation in Safety</h2>
              <p className="mt-4 text-lg text-slate-600 max-w-3xl mx-auto">
                Tourist safety should be dynamically determined from the current environmental and spatial context rather than using fixed danger zones.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Shield,
                  title: 'Adaptive Geofencing',
                  desc: 'Geofences that dynamically resize based on real-time crime, weather, and incident data rather than static borders.'
                },
                {
                  icon: Activity,
                  title: 'Dynamic Safety Index',
                  desc: 'A continuously calculating 0-100 score assessing your immediate surroundings using multi-variable environmental factors.'
                },
                {
                  icon: Navigation,
                  title: 'AI Safe Route',
                  desc: 'Machine learning routing that prioritizes your safety over mere distance, with full explainability for its recommendations.'
                }
              ].map((feature, i) => (
                <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500">
          <p>© {new Date().getFullYear()} GeoSafeAI Research Project. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};
