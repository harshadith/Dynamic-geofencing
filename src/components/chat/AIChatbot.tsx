'use client';

import React, { useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { Bot, Send, X, ShieldAlert, Sparkles, PhoneCall, MapPin, AlertTriangle } from 'lucide-react';

interface AIChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  tourCode?: string;
}

export default function AIChatbot({ isOpen, onClose, tourCode = 'TOUR-7749' }: AIChatbotProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    api: '/api/chat',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const quickPrompts = [
    { label: '🚑 Nearby Hospitals & Police', text: 'Where are the nearest emergency hospitals and police stations?' },
    { label: '⚠️ Active Hazard Report', text: 'What active dynamic geofences and hazards are currently in our tour perimeter?' },
    { label: '🌊 Explain River Flood Risk', text: 'Explain the Quai de la Tournelle flood surge anomaly.' },
    { label: '🚶 Route Safety Briefing', text: 'Which navigation route is currently verified safest for tourists?' },
  ];

  const handleQuickPrompt = (text: string) => {
    append({
      role: 'user',
      content: text,
    });
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-slate-950/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl flex flex-col">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">GeoSafe AI Co-Pilot</h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Groq LPU
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Tour: {tourCode} • Live Safety Telemetry</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-950/50 border border-indigo-800/50 flex items-center justify-center text-indigo-400 mb-3">
              <Sparkles className="w-7 h-7" />
            </div>
            <h4 className="font-semibold text-sm text-slate-200">How can I assist your tour safety?</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
              Ask me to locate hospitals, explain geofences, re-evaluate navigation routes, or check tourist status.
            </p>

            {/* Quick Chips */}
            <div className="mt-5 w-full flex flex-col gap-2">
              {quickPrompts.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickPrompt(chip.text)}
                  className="w-full text-left px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-all flex items-center justify-between group"
                >
                  <span>{chip.label}</span>
                  <span className="text-slate-500 group-hover:text-slate-300 font-mono text-xs">→</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>

                {/* Render Tool Invocations if any */}
                {m.toolInvocations && m.toolInvocations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800 space-y-1.5">
                    {m.toolInvocations.map((toolCall: any) => (
                      <div
                        key={toolCall.toolCallId}
                        className="p-2 rounded bg-slate-950/80 border border-slate-800 text-[11px]"
                      >
                        <div className="flex items-center gap-1.5 text-indigo-400 font-semibold mb-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Tool: {toolCall.toolName}</span>
                        </div>
                        {toolCall.result && (
                          <div className="text-slate-300 font-mono text-[10px] overflow-x-auto max-h-32">
                            {typeof toolCall.result === 'string'
                              ? toolCall.result
                              : JSON.stringify(toolCall.result, null, 2)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 px-1">
                {m.role === 'user' ? 'You' : 'GeoSafe AI'}
              </span>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-indigo-400 p-2 bg-indigo-950/30 rounded-xl border border-indigo-900/40 w-fit">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
            <span>Querying Groq LPU & PostGIS data...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about safety alerts, hospitals, routes..."
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-md shadow-indigo-600/30 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
