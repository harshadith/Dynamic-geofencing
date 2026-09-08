import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { DEMO_DESTINATIONS } from '../data/demoData';
import { Search, MapPin, Users, ShieldCheck, Sparkles, Send, Navigation, Map, Bot } from 'lucide-react';
import { cn } from '../components/Layout';

export const Destinations = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  
  // Assistant State
  const [query, setQuery] = useState('');
  const [activeModel, setActiveModel] = useState<string>('Groq Active');
  const [chat, setChat] = useState<{role: 'user' | 'ai', text: string}[]>([
    {
      role: 'ai',
      text: 'Hi! Ask for quick safety scores, hazard alerts, or safe route recommendations.'
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const formatModelLabel = (model: string) => {
    if (!model) return 'Groq LPU';
    return model.replace(/^(openai\/|groq\/)/, '').replace(/-/g, ' ').toUpperCase();
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, isTyping]);

  const categories = ['All', ...Array.from(new Set(DEMO_DESTINATIONS.map(d => d.category)))];

  const filteredDestinations = DEMO_DESTINATIONS.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'All' || d.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const sendQuery = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    setChat(prev => [...prev, { role: 'user', text: textToSend }]);
    setQuery('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToSend, history: chat })
      });
      
      const data = await response.json();
      
      if (response.ok && data.text) {
        setChat(prev => [...prev, { role: 'ai', text: data.text }]);
        if (data.model) {
          setActiveModel(data.model);
        } else if (data.provider === 'gemini-fallback') {
          setActiveModel('Gemini Fallback');
        }
      } else {
        const errorMsg = data.error || "I'm sorry, I encountered an error communicating with the Groq API.";
        setChat(prev => [...prev, { role: 'ai', text: errorMsg }]);
      }
    } catch (err) {
      setChat(prev => [...prev, { role: 'ai', text: "Network error connecting to Groq chat service. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAskAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendQuery(query);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col md:flex-row gap-6">
      
      {/* Left: Explorer */}
      <div className="w-full md:w-2/3 flex flex-col h-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Explore Safely</h1>
          <p className="text-slate-500">Discover destinations with real-time safety context.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search destinations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
                  activeCategory === c 
                    ? "bg-slate-800 text-white" 
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-8">
          {filteredDestinations.map(dest => (
            <div key={dest.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">{dest.name}</h3>
                  <span className="text-xs font-medium text-slate-500 px-2 py-0.5 bg-slate-100 rounded-md">{dest.category}</span>
                </div>
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold",
                  dest.safetyScore > 80 ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                )}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {dest.safetyScore}
                </div>
              </div>
              
              <p className="text-sm text-slate-600 mb-4 line-clamp-2">{dest.description}</p>
              
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mt-auto pt-4 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{dest.location.lat.toFixed(2)}, {dest.location.lng.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1 capitalize">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{dest.currentCrowd}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => navigate('/map')}
                    title="View on Google Map"
                    className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 font-semibold text-[11px]"
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>Map</span>
                  </button>
                  <button
                    onClick={() => navigate('/route')}
                    title="Find Safe Route"
                    className="px-2.5 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>Route</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: AI Assistant */}
      <div className="w-full md:w-1/3 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[580px] md:h-auto">
        {/* Header */}
        <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">GeoSafe Assistant</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[11px] text-slate-500 font-medium">Groq LPU Engine Active</p>
              </div>
            </div>
          </div>
          <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full shrink-0 font-medium">
            {formatModelLabel(activeModel)}
          </span>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-slate-50/60">
          {chat.map((msg, idx) => (
            <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[88%] px-3.5 py-2 text-xs leading-relaxed shadow-xs whitespace-pre-line break-words",
                msg.role === 'user' 
                  ? "bg-blue-600 text-white rounded-2xl rounded-br-sm" 
                  : "bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-sm"
              )}>
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-3.5 py-2 shadow-xs flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick prompt suggestions */}
        <div className="px-3.5 py-2.5 bg-white border-t border-slate-100 flex flex-wrap gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => sendQuery("What are the safest tourist destinations right now?")}
            className="text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200/80 hover:border-blue-200 rounded-lg px-2.5 py-1 transition-colors"
          >
            Safest destinations?
          </button>
          <button
            type="button"
            onClick={() => sendQuery("Where are the active high risk zones?")}
            className="text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 border border-slate-200/80 hover:border-amber-200 rounded-lg px-2.5 py-1 transition-colors"
          >
            Active risk zones?
          </button>
          <button
            type="button"
            onClick={() => sendQuery("What should I do if my geofence safety score drops?")}
            className="text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200/80 hover:border-blue-200 rounded-lg px-2.5 py-1 transition-colors"
          >
            Safety score drops?
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-3.5 bg-white border-t border-slate-100 shrink-0">
          <form onSubmit={handleAskAssistant} className="flex gap-2">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about destinations, safety..."
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500 rounded-xl text-xs md:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 font-normal"
            />
            <button 
              type="submit"
              disabled={!query.trim() || isTyping}
              className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

    </div>
  );
};
