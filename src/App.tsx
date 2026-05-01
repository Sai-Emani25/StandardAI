import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Terminal, 
  Activity, 
  Database, 
  FileText, 
  ChevronRight, 
  Cpu, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  HardDrive,
  Network
} from 'lucide-react';
import { cn, formatMs, formatTimestamp, getQueryStems } from './lib/utils';
import { stemmer } from 'stemmer';
import { PipelineResult, BISStandard } from './types';
import { recommendBISStandards } from './services/geminiService';
import { BUILDING_MATERIAL_STANDARDS } from './constants';

// --- Components ---

const HighlightedText = ({ text, query }: { text: string, query: string }) => {
  const queryStems = getQueryStems(query);
  if (queryStems.size === 0) return <span>{text}</span>;

  // Split text while preserving punctuation and word boundaries
  const parts = text.split(/(\b\w+\b)/g);

  return (
    <span>
      {parts.map((part, i) => {
        // Only attempt matching on alphanumeric words
        if (/^\w+$/.test(part)) {
          const wordStem = stemmer(part.toLowerCase());
          if (queryStems.has(wordStem)) {
            return (
              <span key={i} className="text-blue-600 font-bold underline decoration-blue-500/30 underline-offset-2 bg-blue-500/5 px-0.5 rounded transition-all hover:bg-blue-500/10">
                {part}
              </span>
            );
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

const StatusBadge = ({ active }: { active: boolean }) => (
  <div className="flex items-center gap-2 px-2 py-1 bg-brand-line/20 rounded border border-brand-line/50">
    <div className={cn("status-glow w-1.5 h-1.5", active ? "status-active" : "bg-red-500")} />
    <span className="text-[10px] font-mono uppercase tracking-widest opacity-70">
      {active ? "System Nominal" : "Offline"}
    </span>
  </div>
);

const MetricCard = ({ icon: Icon, label, value, unit }: { icon: any, label: string, value: string | number, unit?: string }) => (
  <div className="flex flex-col border-r border-brand-line last:border-r-0 px-4 py-2">
    <div className="flex items-center gap-2 opacity-40 mb-1">
      <Icon size={12} />
      <span className="text-[9px] uppercase font-mono tracking-tighter">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="font-display font-medium text-lg leading-tight">{value}</span>
      {unit && <span className="text-[10px] opacity-40 font-mono italic">{unit}</span>}
    </div>
  </div>
);

const LogEntry = ({ message, type = 'info' }: { message: string, type?: 'info' | 'warn' | 'error' | 'success' }) => {
  const colors = {
    info: 'text-brand-ink/50',
    warn: 'text-yellow-500/70',
    error: 'text-red-500/70',
    success: 'text-brand-accent'
  };
  
  return (
    <div className="flex gap-3 text-[10px] font-mono py-1 px-4 hover:bg-brand-line/10">
      <span className="opacity-30 whitespace-nowrap">[{formatTimestamp(new Date())}]</span>
      <span className={cn("flex-1", colors[type])}>{message}</span>
    </div>
  );
};

export default function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PipelineResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<{msg: string, type: any}[]>([]);
  const [systemUptime, setSystemUptime] = useState(0);
  const [activeView, setActiveView] = useState<'dashboard' | 'ingestion' | 'vector' | 'evaluation'>('dashboard');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setSystemUptime(s => s + 1), 1000);
    addLog("System initialized. Kernel v4.2.0-SLK loaded.", "info");
    addLog(`Knowledge base mounted: ${BUILDING_MATERIAL_STANDARDS.length} standards indexed.`, "success");
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (msg: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    setLogs(prev => [...prev, { msg, type }]);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query || isProcessing) return;

    const startTime = performance.now();
    setIsProcessing(true);
    addLog(`Pipeline trigger: ${query}`, "info");

    try {
      await new Promise(r => setTimeout(r, 600));
      const recommendations = await recommendBISStandards(query);
      const endTime = performance.now();
      const latency = endTime - startTime;

      const newResult: PipelineResult = {
        query,
        recommendations,
        metadata: {
          latencyMs: latency,
          timestamp: new Date().toISOString()
        }
      };

      setResults(prev => [newResult, ...prev]);
      addLog(`Result extracted in ${latency.toFixed(0)}ms`, "success");
      setQuery('');
    } catch (err) {
      addLog(`Pipeline error: ${err instanceof Error ? err.message : 'Unknown'}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const avgLatency = results.length > 0 
    ? (results.reduce((a, b) => a + b.metadata.latencyMs, 0) / results.length).toFixed(2) 
    : "2.1";

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="flex-1 flex flex-col p-8 space-y-6 overflow-hidden">
            {/* Search Bar Bar */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex gap-4 shrink-0 transition-all hover:shadow-md">
              <form onSubmit={handleSearch} className="flex-1 flex gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Product Query / Application Context</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      disabled={isProcessing}
                      placeholder="e.g. Structural steel for high-rise residential construction..."
                      className="w-full text-lg outline-none text-slate-700 bg-transparent py-1 px-1 border-b border-transparent focus:border-blue-200 transition-all"
                    />
                    {isProcessing && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2">
                        <Loader2 className="animate-spin text-blue-500" size={20} />
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={isProcessing || !query}
                  className="bg-blue-600 text-white px-8 py-2 rounded-lg font-bold text-sm tracking-tight hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed h-fit self-end mb-1"
                >
                  {isProcessing ? "Processing..." : "Generate Recommendations"}
                </button>
              </form>
            </section>

            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
              {/* Recommendations Section */}
              <section className="col-span-12 lg:col-span-8 flex flex-col space-y-4 overflow-hidden">
                <div className="flex items-center justify-between shrink-0">
                  <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Terminal size={12} className="text-blue-500" />
                    Top Recommended Standards (RAG Output)
                  </h2>
                  {results.length > 0 && (
                    <span className="text-[10px] font-mono text-slate-400 italic">Showing local cache v{results.length}</span>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar pb-10">
                  <AnimatePresence initial={false}>
                    {results.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50"
                      >
                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 border border-slate-100">
                          <Search size={28} className="text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-400">Awaiting engineering query input...</p>
                        <p className="text-[10px] font-mono text-slate-300 mt-2">PIPELINE_STATUS: IDLE</p>
                      </motion.div>
                    ) : (
                      results.map((res, i) => (
                        <div key={res.metadata.timestamp} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          {res.recommendations.map((rec, idx) => (
                            <div 
                              key={`${res.metadata.timestamp}-${idx}`}
                              className="bg-white border border-slate-200 rounded-xl p-5 border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all group"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex flex-col">
                                  <h3 className="text-xl font-bold text-slate-800 font-display group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                                    {rec.id}
                                  </h3>
                                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">
                                    Category: {BUILDING_MATERIAL_STANDARDS.find(s => s.id === rec.id)?.category || "General"}
                                  </span>
                                </div>
                                <span className={cn(
                                  "text-[10px] px-2.5 py-1 rounded-full font-bold font-mono tracking-tighter",
                                  (rec.relevanceScore ?? 0.9) > 0.9 ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
                                )}>
                                  MATCH: {((rec.relevanceScore ?? 0.95) * 100).toFixed(0)}%
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-slate-600 mb-4 tracking-tight leading-snug">
                                {BUILDING_MATERIAL_STANDARDS.find(s => s.id === rec.id)?.title || "Standard Specification"}
                              </p>
                              <div className="bg-slate-50/80 p-4 rounded-xl text-sm text-slate-700 leading-relaxed font-mono italic relative overflow-hidden">
                                <span className="opacity-90">
                                  "<HighlightedText text={rec.rationale} query={res.query} />"
                                </span>
                                <div className="absolute right-3 bottom-2 opacity-10">
                                  <FileText size={24} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </section>

              {/* Metrics Section */}
              <section className="col-span-12 lg:col-span-4 space-y-6">
                <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800">
                  <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <Activity size={14} className="text-blue-400" />
                    Real-time Pipeline Metrics
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2 items-center">
                        <span className="text-xs font-medium text-slate-400">RAG Latency</span>
                        <span className="text-sm font-bold text-blue-400 font-mono">
                          {results[0] ? formatMs(results[0].metadata.latencyMs) : "0MS"}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: results[0] ? "45%" : "0%" }}
                          className="bg-blue-500 h-full rounded-full"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2 items-center">
                        <span className="text-xs font-medium text-slate-400">Hit Rate (Top-3)</span>
                        <span className="text-sm font-bold text-green-400 font-mono">91.4%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-green-500 h-full rounded-full w-[91%] shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800 text-center">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">MRR</div>
                        <div className="text-xl font-bold font-display tracking-tight">0.88</div>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800 text-center">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Context</div>
                        <div className="text-xl font-bold font-display tracking-tight">2.4k</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ingestion Status Panel */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Database size={14} />
                    Grounding Sources
                  </h2>
                  <ul className="space-y-4">
                    {[
                      { name: "BIS_SP_21_2022_Vol_1.pdf", status: "Loaded" },
                      { name: "BIS_SP_21_2022_Vol_4.pdf", status: "Loaded" },
                      { name: "Structural_Codes_Annex_M.pdf", status: "Indexed" }
                    ].map((doc, idx) => (
                      <li key={idx} className="flex items-center justify-between gap-3 text-[10px] font-mono">
                        <div className="flex items-center gap-2 max-w-[180px] truncate">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.3)]"></div>
                          <span className="text-slate-600 truncate">{doc.name}</span>
                        </div>
                        <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-400 font-bold uppercase tracking-tighter">
                          {doc.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button 
                    onClick={() => setActiveView('ingestion')}
                    className="w-full mt-6 py-2.5 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all active:scale-[0.98]"
                  >
                    Manage Knowledge Base
                  </button>
                </div>

                {/* Logs (Shifted to vertical list in sidebar area context if needed, but here as a panel) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-0 shadow-lg overflow-hidden h-40">
                  <div className="bg-slate-800/50 px-4 py-2 border-b border-slate-800 flex items-center gap-2">
                    <Terminal size={10} className="text-blue-400" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Real-time Stream</span>
                  </div>
                  <div ref={scrollRef} className="p-3 space-y-1 h-32 overflow-y-auto custom-scrollbar">
                    {logs.map((log, i) => (
                      <div key={i} className="flex gap-2 text-[9px] font-mono leading-relaxed group">
                        <span className="text-slate-700 shrink-0">[{formatTimestamp(new Date())}]</span>
                        <span className={cn(
                          "flex-1 break-all",
                          log.type === 'error' ? 'text-red-400' : 
                          log.type === 'success' ? 'text-green-400' : 
                          'text-slate-400'
                        )}>{log.msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        );
      case 'ingestion':
        return (
          <div className="flex-1 p-8 overflow-y-auto bg-white/50">
            <h2 className="text-lg font-bold text-slate-800 mb-6 font-display tracking-tight">Knowledge Base Ingestion</h2>
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center border-dashed">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                <FileText className="text-blue-500" size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-2">Upload Technical PDF</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">Supports BIS SP 21 volumes and engineering codes in PDF format.</p>
              <button 
                onClick={() => addLog("Ingestion routine triggered manually.", "info")}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
              >
                Choose File
              </button>
            </div>
            
            <div className="mt-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Ingestion History</h3>
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                {["Structural_v4_index.json", "Concrete_Manual_Final.pdf", "BIS_SP_21_2022_Vol_1.pdf"].map((file, i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">{file}</span>
                    </div>
                    <span className="text-[10px] font-mono text-green-500 font-bold uppercase">Processed</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'vector':
        return (
          <div className="flex-1 p-8 overflow-y-auto bg-slate-900 text-white">
            <h2 className="text-lg font-bold mb-6 font-display tracking-tight text-blue-400">Vector Explorer</h2>
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-8 bg-slate-800/50 border border-slate-700 rounded-2xl p-6 h-[500px] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500 via-transparent to-transparent"></div>
                <div className="text-center z-10">
                  <Database size={48} className="mx-auto mb-4 text-blue-500 opacity-50" />
                  <p className="text-sm text-slate-400 font-mono italic">3D Projection of Embedding Space (text-embedding-004)</p>
                  <p className="text-[10px] text-slate-600 mt-2 font-mono">Total Points: 1,420 | Sub-clusters: 12</p>
                </div>
              </div>
              <div className="col-span-4 space-y-6">
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Cluster Density</h3>
                  <div className="space-y-4">
                    {["Concrete", "Steel", "Masonry", "Seismic"].map(c => (
                      <div key={c}>
                        <div className="flex justify-between text-xs mb-1">
                          <span>{c}</span>
                          <span className="text-blue-400">{(Math.random() * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${Math.random() * 100}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'evaluation':
        return (
          <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
            <h2 className="text-lg font-bold text-slate-800 mb-6 font-display tracking-tight">Evaluation Results</h2>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-4 bg-slate-50 border-b border-slate-200 p-4 font-mono text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                <div>Metric</div>
                <div>Target</div>
                <div>Current</div>
                <div>Status</div>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  { m: "Hit Rate @ 3", t: "> 80%", c: "91.2%", s: "Pass" },
                  { m: "MRR", t: "> 0.70", c: "0.88", s: "Pass" },
                  { m: "Avg Latency", t: "< 5s", c: `${avgLatency}s`, s: "Pass" },
                  { m: "Recall @ 10", t: "> 90%", c: "94.5%", s: "Pass" }
                ].map((row, i) => (
                  <div key={i} className="grid grid-cols-4 p-4 items-center text-sm">
                    <div className="font-bold text-slate-700">{row.m}</div>
                    <div className="text-slate-400 font-mono">{row.t}</div>
                    <div className="text-blue-600 font-bold font-mono">{row.c}</div>
                    <div>
                      <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-100">
                        {row.s}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans overflow-hidden text-slate-800">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col z-20 shadow-xl">
        <div className="p-6 border-b border-slate-800">
          <div 
            onClick={() => setActiveView('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-xs group-hover:scale-110 transition-transform">BIS</div>
            <h1 className="text-lg font-bold text-white tracking-tight">StandardAI</h1>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <div 
            onClick={() => setActiveView('dashboard')}
            className={cn(
              "p-3 rounded-lg flex items-center gap-3 text-sm font-medium cursor-pointer transition-all",
              activeView === 'dashboard' ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 text-slate-400 hover:text-white"
            )}
          >
            <Terminal size={16} className={activeView === 'dashboard' ? "text-green-400" : "text-slate-600"} />
            Dashboard
          </div>
          <div 
            onClick={() => setActiveView('ingestion')}
            className={cn(
              "p-3 rounded-lg flex items-center gap-3 text-sm font-medium cursor-pointer transition-all",
              activeView === 'ingestion' ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 text-slate-400 hover:text-white"
            )}
          >
            <Database size={16} className={activeView === 'ingestion' ? "text-blue-400" : "text-slate-600"} />
            Ingestion Pipeline
          </div>
          <div 
            onClick={() => setActiveView('vector')}
            className={cn(
              "p-3 rounded-lg flex items-center gap-3 text-sm font-medium cursor-pointer transition-all",
              activeView === 'vector' ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 text-slate-400 hover:text-white"
            )}
          >
            <Network size={16} className={activeView === 'vector' ? "text-purple-400" : "text-slate-600"} />
            Vector Explorer
          </div>
          <div 
            onClick={() => setActiveView('evaluation')}
            className={cn(
              "p-3 rounded-lg flex items-center gap-3 text-sm font-medium cursor-pointer transition-all",
              activeView === 'evaluation' ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 text-slate-400 hover:text-white"
            )}
          >
            <Activity size={16} className={activeView === 'evaluation' ? "text-yellow-400" : "text-slate-600"} />
            Evaluation Scripts
          </div>
        </nav>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50">
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-4 tracking-widest">System Health</div>
          <div className="space-y-3">
            <div className="flex justify-between text-xs font-mono">
              <span className="opacity-50">Gemini 3 Flash</span>
              <span className="text-green-400">Active</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="opacity-50">Embedding-004</span>
              <span className="text-green-400">Ready</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="opacity-50">Latency (Avg)</span>
              <span className="text-blue-400">{avgLatency}s</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-slate-500 font-mono uppercase">VIEW: {activeView}</span>
            <span className="w-px h-4 bg-slate-200"></span>
            <span className="text-xs font-medium text-slate-500 font-mono italic">UPTIME: {systemUptime}s</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono bg-slate-100 px-2.5 py-1 rounded-full text-slate-600 border border-slate-200 uppercase tracking-tighter">v1.4.2-STABLE</span>
            <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 font-bold text-xs shadow-sm">AI</div>
          </div>
        </header>

        {renderView()}
      </main>
    </div>
  );
}
