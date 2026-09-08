import React, { ReactNode } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { KeyRound, ExternalLink, Info } from 'lucide-react';

interface GoogleMapWrapperProps {
  children: ReactNode;
}

export const GOOGLE_MAPS_API_KEY = ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string) || '';

export const GoogleMapWrapper = ({ children }: GoogleMapWrapperProps) => {
  const hasKey = Boolean(GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY.trim().length > 0);

  return (
    <APIProvider
      apiKey={GOOGLE_MAPS_API_KEY}
      libraries={['places', 'routes', 'geometry', 'marker']}
    >
      <div className="w-full h-full relative flex flex-col">
        {!hasKey && (
          <div className="bg-amber-500/95 text-slate-900 px-4 py-2 text-xs md:text-sm font-medium border-b border-amber-600 flex flex-wrap items-center justify-between gap-2 z-[50] shadow-md">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-slate-950 shrink-0" />
              <span>
                <strong>Google Maps API Key required:</strong> Configure <code className="bg-amber-600/30 px-1.5 py-0.5 rounded font-mono text-xs">VITE_GOOGLE_MAPS_API_KEY</code> in Settings or your environment.
              </span>
            </div>
            <a
              href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 bg-slate-900 text-amber-300 hover:bg-slate-800 px-2.5 py-1 rounded text-xs font-bold transition-colors shrink-0"
            >
              Get Free Maps Demo Key
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
        <div className="flex-1 w-full h-full relative">
          {children}
        </div>
      </div>
    </APIProvider>
  );
};
