import { useState, useRef, useEffect } from 'react'
import { supabase } from './supabaseClient'
import ForceGraph2D from 'react-force-graph-2d';

const BASE_STANDARDS = [
  { id: 'ISO_5_1', name: '5.1 Policies for info security', group: 1 },
  { id: 'ISO_5_2', name: '5.2 Info security roles', group: 1 },
  { id: 'ISO_8_1', name: '8.1 User endpoint devices', group: 1 },
  { id: 'ISO_8_2', name: '8.2 Privileged access rights', group: 1 },
  { id: 'ISO_8_3', name: '8.3 Info access restriction', group: 1 }
];

function App() {
  const [activeTab, setActiveTab] = useState('graph');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [graphData, setGraphData] = useState({ nodes: BASE_STANDARDS, links: [] });
  const [isLoaded, setIsLoaded] = useState(false);
  const fileInputRef = useRef(null);

  const fetchGraphData = async () => {
    try {
      // POINTING TO LOCALHOST
      const response = await fetch('http://localhost:5000/api/graph-data');
      if (!response.ok) throw new Error("Backend not responding");
      const data = await response.json();
      
      const existingIds = new Set(data.nodes.map(n => n.id));
      const mergedNodes = [
        ...data.nodes,
        ...BASE_STANDARDS.filter(baseNode => !existingIds.has(baseNode.id))
      ];

      setGraphData({ nodes: mergedNodes, links: data.links });
    } catch (error) {
      console.error("Failed to fetch graph data", error);
    }
  };

  useEffect(() => {
    fetchGraphData();
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  const isoStandards = graphData.nodes.filter(node => node.group === 1);
  const coveredTargetIds = new Set(
    graphData.links.map(link => typeof link.target === 'object' ? link.target.id : link.target)
  );
  const missedControls = isoStandards.filter(node => !coveredTargetIds.has(node.id));

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file first!");

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      // 1. Upload to Supabase
      const { error } = await supabase.storage.from('policies').upload(fileName, file);
      if (error) throw new Error("Supabase Upload Failed: " + error.message);
      
      // 2. Trigger Local AI Backend
      const response = await fetch('http://localhost:5000/api/process-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: fileName })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Backend AI processing failed");
      }

      setFile(null); 
      await fetchGraphData(); 
      setActiveTab('graph'); 
      
    } catch (error) {
      alert("❌ Error: " + error.message);
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePurge = async () => {
    if (!window.confirm("WARNING: This will wipe the entire Neo4j database. Proceed?")) return;
    
    try {
      // POINTING TO LOCALHOST
      const response = await fetch('http://localhost:5000/api/purge', {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error("Backend failed to purge.");
      }

      setGraphData({ nodes: BASE_STANDARDS, links: [] });
      alert("✅ System Successfully Purged!");

    } catch (error) {
      console.error("Purge failed:", error);
      alert("❌ Purge Failed: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a16] text-white flex flex-col font-sans overflow-hidden selection:bg-cyan-500/30">
      
      {/* Glowing Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-cyan-900/20 blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-fuchsia-900/20 blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <header className={`bg-black/40 backdrop-blur-xl border-b border-white/10 p-5 sticky top-0 z-20 transition-all duration-1000 transform ${isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.4)]">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">
                NEXUS
              </h1>
              <p className="text-[10px] tracking-[0.3em] text-cyan-500/70 uppercase font-bold">ISO 27001 Command Center</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow p-6 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Left Column */}
        <div className={`col-span-1 flex flex-col gap-6 transition-all duration-1000 delay-300 transform ${isLoaded ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0'}`}>
          <div className="bg-white/5 backdrop-blur-lg p-7 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="bg-cyan-500/20 text-cyan-400 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]">1</div>
              <h2 className="text-lg font-bold text-slate-200 tracking-wide">Data Ingestion</h2>
            </div>
            
            <div 
              className="relative z-10 border-2 border-dashed border-cyan-500/30 rounded-xl p-8 text-center bg-black/40 hover:bg-cyan-950/30 hover:border-cyan-400 transition-all cursor-pointer duration-300 hover:shadow-[0_0_30px_rgba(34,211,238,0.15)] group/dropzone"
              onClick={() => fileInputRef.current.click()}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.docx,.txt" className="hidden" />
              
              {file ? (
                <div className="flex flex-col items-center transform transition-transform group-hover/dropzone:scale-105">
                  <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mb-4 border border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                    <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  <p className="text-cyan-300 font-semibold truncate w-full px-4">{file.name}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-400 group-hover/dropzone:text-cyan-300 transition-colors transform transition-transform group-hover/dropzone:-translate-y-1">
                  <svg className="w-14 h-14 mb-4 text-slate-500 group-hover/dropzone:text-cyan-400 transition-colors drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                  <p className="font-medium tracking-wide">Drop payload here</p>
                  <p className="text-xs mt-2 text-slate-500 uppercase tracking-widest">TXT / PDF / DOCX</p>
                </div>
              )}
            </div>
            
            <div className="mt-8 relative z-10">
              <button 
                onClick={handleUpload}
                disabled={!file || isUploading}
                className={`w-full px-4 py-4 rounded-xl font-bold tracking-widest uppercase text-sm transition-all duration-300 flex justify-center items-center gap-3 border ${!file || isUploading ? 'bg-white/5 text-slate-500 border-white/5 cursor-not-allowed' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/50 hover:bg-cyan-500 hover:text-black hover:shadow-[0_0_25px_rgba(34,211,238,0.6)] hover:-translate-y-1'}`}
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Executing Analysis...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    Initialize AI
                  </>
                )}
              </button>

              <button 
                onClick={handlePurge}
                className="mt-4 w-full px-4 py-3 rounded-xl font-bold tracking-widest uppercase text-xs transition-all duration-300 border bg-red-500/5 text-red-500 border-red-500/30 hover:bg-red-500 hover:text-black hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] flex justify-center items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                Purge Database
              </button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className={`lg:col-span-2 bg-white/5 backdrop-blur-lg p-7 rounded-2xl border border-white/10 shadow-2xl flex flex-col h-[700px] transition-all duration-1000 delay-500 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
          
          <div className="flex bg-black/40 p-1.5 rounded-xl mb-6 w-max border border-white/5 relative">
            <div className={`absolute top-1.5 bottom-1.5 w-[160px] bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg transition-transform duration-500 ease-out shadow-[0_0_15px_rgba(34,211,238,0.4)] ${activeTab === 'graph' ? 'translate-x-0' : 'translate-x-full'}`}></div>
            
            <button 
              className={`relative z-10 w-[160px] py-2.5 text-sm font-bold tracking-wide rounded-lg transition-colors duration-300 ${activeTab === 'graph' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`} 
              onClick={() => setActiveTab('graph')}
            >
              Neural Topology
            </button>
            <button 
              className={`relative z-10 w-[160px] py-2.5 text-sm font-bold tracking-wide rounded-lg transition-colors duration-300 flex items-center justify-center gap-2 ${activeTab === 'report' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`} 
              onClick={() => setActiveTab('report')}
            >
              Security Scan
              {missedControls.length > 0 && (
                <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black transition-colors duration-300 ${activeTab === 'report' ? 'bg-white/20 text-white' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                  {missedControls.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex-grow bg-black/60 rounded-xl border border-white/5 overflow-hidden relative shadow-inner">
            {activeTab === 'graph' && (
              <div className="absolute inset-0 animate-[fadeIn_0.5s_ease-out]">
                <ForceGraph2D
                  graphData={graphData}
                  width={800} height={560}
                  nodeAutoColorBy="group" nodeRelSize={8}
                  linkDirectionalArrowLength={6} linkDirectionalArrowRelPos={1}
                  linkColor={() => 'rgba(255,255,255,0.2)'}
                  backgroundColor="#00000000"
                  nodeCanvasObject={(node, ctx, globalScale) => {
                    const label = node.name || node.id;
                    const fontSize = 13/globalScale;
                    ctx.font = `600 ${fontSize}px Inter, Sans-Serif`;
                    const textWidth = ctx.measureText(label).width;
                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.8);
                    
                    const isISO = node.group === 1;
                    const mainColor = isISO ? '#22d3ee' : '#e879f9'; 
                    const bgColor = isISO ? 'rgba(8, 51, 68, 0.9)' : 'rgba(74, 4, 78, 0.9)';

                    ctx.fillStyle = bgColor;
                    ctx.beginPath();
                    ctx.roundRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1], 4/globalScale);
                    ctx.fill();
                    
                    ctx.strokeStyle = mainColor;
                    ctx.lineWidth = 1/globalScale;
                    ctx.stroke();

                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#ffffff'; 
                    ctx.fillText(label, node.x, node.y);
                  }}
                />
              </div>
            )}

            {activeTab === 'report' && (
              <div className="w-full h-full p-8 overflow-y-auto custom-scrollbar animate-[fadeIn_0.5s_ease-out]">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-wide">Vulnerability Report</h3>
                    <p className="text-slate-400 mt-1 text-sm tracking-wide">Scanning network for unmapped ISO 27001 parameters.</p>
                  </div>
                </div>
                
                {missedControls.length > 0 ? (
                  <div className="space-y-4">
                    {missedControls.map((control, index) => (
                      <div 
                        key={control.id} 
                        className="group flex items-start p-5 bg-red-950/10 border border-red-500/20 rounded-xl hover:bg-red-950/30 hover:border-red-500/50 transition-all duration-300 transform hover:translate-x-2 relative overflow-hidden"
                        style={{ animation: `fadeIn 0.5s ease-out ${index * 0.1}s both` }}
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-orange-500 group-hover:w-1.5 transition-all shadow-[0_0_10px_rgba(239,68,68,1)]"></div>
                        <div className="flex-shrink-0 mt-1 mr-4">
                          <svg className="h-6 w-6 text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-200 tracking-wide">{control.id.replace('_', ' ')}</h4>
                          <p className="text-slate-400 mt-1">{control.name}</p>
                          <div className="mt-3 flex items-center gap-2 text-xs text-red-300 font-bold uppercase tracking-widest bg-red-500/10 border border-red-500/20 py-1.5 px-3 rounded-md w-max">
                            Action Required: Draft Policy
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-center animate-[scaleIn_0.5s_ease-out]">
                    <div className="relative">
                      <div className="absolute inset-0 bg-emerald-500 rounded-full blur-[30px] opacity-20"></div>
                      <div className="relative w-24 h-24 bg-emerald-950/50 border border-emerald-500/30 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                        <svg className="w-12 h-12 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      </div>
                    </div>
                    <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 tracking-wide drop-shadow-lg">Network Secured</h3>
                    <p className="text-slate-400 mt-3 max-w-sm tracking-wide leading-relaxed">All active ISO 27001 parameters are currently shielded by internal policy protocols.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34, 211, 238, 0.4); }
      `}</style>
    </div>
  )
}

export default App