import Auth from './Auth';
import { useState, useRef, useEffect } from 'react'
import { supabase } from './supabaseClient'
import ForceGraph2D from 'react-force-graph-2d';
import { BASE_STANDARDS } from './isoData';

function App() {
  
  // --- AUTHENTICATION GATEKEEPER ---
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- MOTIVATIONAL QUOTES LOGIC ---
  const quotes = [
    "Compliance is not the ceiling; it is the foundation.",
    "We do not fear the unknown; we map it.",
    "Vigilance is the ultimate firewall.",
    "Security is a state of mind, not just a state of system.",
    "In a world of variables, be the constant."
  ];
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // --- STANDARD APP STATE ---
  const [activeTab, setActiveTab] = useState('graph');
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null); 
  const [isUploading, setIsUploading] = useState(false);
  const [graphData, setGraphData] = useState({ nodes: BASE_STANDARDS, links: [] });
  const [isLoaded, setIsLoaded] = useState(false);
  
  // THEME ENGINE
  const [theme, setTheme] = useState('dark'); 
  const isDark = theme === 'dark';

  const fileInputRef = useRef(null);

  const normalizeControlId = (str) => {
    if (!str) return '';
    const matches = str.match(/\d+/g);
    return matches ? `ISO_${matches.join('_')}` : str;
  };

  const fetchGraphData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/graph-data');
      if (!response.ok) throw new Error("Backend not responding");
      const data = await response.json();
      
      const sanitizedLinks = data.links.map(l => ({
        source: l.source,
        target: normalizeControlId(typeof l.target === 'object' ? l.target.id : l.target)
      }));

      const hydratedDbNodes = data.nodes.map(dbNode => {
        if (dbNode.group === 1) { 
          const normDbId = normalizeControlId(dbNode.id);
          const matchedStandard = BASE_STANDARDS.find(s => normalizeControlId(s.id) === normDbId);
          if (matchedStandard) {
            return { ...dbNode, id: matchedStandard.id, name: matchedStandard.name };
          }
        }
        return dbNode; 
      });

      const existingIds = new Set(hydratedDbNodes.map(n => n.id));
      const mergedNodes = [
        ...hydratedDbNodes,
        ...BASE_STANDARDS.filter(baseNode => !existingIds.has(baseNode.id))
      ];

      setGraphData({ nodes: mergedNodes, links: sanitizedLinks });
    } catch (error) {
      console.error("Failed to fetch graph data", error);
    }
  };

  useEffect(() => {
    if (session) {
      fetchGraphData();
      setTimeout(() => setIsLoaded(true), 100);
    }
  }, [session]);

  const isoStandards = graphData.nodes.filter(node => node.group === 1);
  const coveredTargetIds = new Set(
    graphData.links.map(link => {
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return normalizeControlId(targetId);
    })
  );
  const missedControls = isoStandards.filter(node => !coveredTargetIds.has(normalizeControlId(node.id)));

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setFileUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file first!");
    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error } = await supabase.storage.from('policies').upload(fileName, file);
      if (error) throw new Error("Supabase Upload Failed: " + error.message);
      
      const response = await fetch('http://localhost:5000/api/process-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: fileName })
      });

      if (!response.ok) throw new Error("Backend AI processing failed");

      await fetchGraphData(); 
      setActiveTab('graph'); 
      
    } catch (error) {
      alert("❌ Error: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePurge = async () => {
    if (!window.confirm("WARNING: This will wipe the entire Neo4j database. Proceed?")) return;
    try {
      const response = await fetch('http://localhost:5000/api/purge', { method: 'DELETE' });
      if (!response.ok) throw new Error("Backend failed to purge.");

      setGraphData({ nodes: BASE_STANDARDS, links: [] });
      setFile(null);
      setFileUrl(null); 
    } catch (error) {
      alert("❌ Purge Failed: " + error.message);
    }
  };

  if (!session) {
    return <Auth />;
  }

  // --- ULTRA-FLAT ENTERPRISE THEME CLASSES ---
  const bgMain = isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800';
  const panelClass = isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200 shadow-sm';
  const headerClass = isDark ? 'bg-slate-950 border-b border-slate-800/60' : 'bg-white border-b border-slate-200';
  const primaryText = isDark ? 'text-blue-500' : 'text-blue-600'; 
  
  return (
    <div className={`min-h-screen flex flex-col font-sans overflow-y-auto selection:bg-blue-500/30 custom-scrollbar transition-colors duration-300 ${bgMain}`}>
      
      <header className={`px-6 py-4 sticky top-0 z-20 transition-all duration-500 transform ${headerClass} ${isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Flat Enterprise Logo & Title */}
          <div className="flex items-center gap-3">
            <svg className={`w-8 h-8 ${primaryText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
            </svg>
            <div>
              <h1 className={`text-xl font-semibold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Echo Valley</h1>
              <p className="text-[10px] tracking-widest uppercase font-semibold text-slate-500">ISO 27001 Auditor</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Clean Status Indicator */}
            <p className="hidden md:block text-slate-500 italic text-sm font-medium">
              "{quotes[quoteIndex]}"
            </p>

            <button 
              onClick={() => supabase.auth.signOut()}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
            >
              Sign Out
            </button>

            <button 
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`p-2 rounded-md transition-all ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'}`}
              title="Toggle Theme"
            >
              {isDark ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"></path></svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow p-6 max-w-7xl mx-auto w-full flex flex-col gap-6 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Upload Panel */}
          <div className={`col-span-1 flex flex-col gap-6 transition-all duration-700 transform ${isLoaded ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
            <div className={`p-6 rounded-xl ${panelClass}`}>
              <div className="flex items-center gap-3 mb-6">
                <h2 className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Policy Ingestion</h2>
              </div>
              
              <div 
                className={`border border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${isDark ? 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}`}
                onClick={() => fileInputRef.current.click()}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.txt" className="hidden" />
                {file ? (
                  <div className="flex flex-col items-center">
                    <svg className={`w-10 h-10 mb-3 ${primaryText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <p className={`font-medium text-sm truncate w-full px-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{file.name}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-slate-500">
                    <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                    <p className="font-medium text-sm">Click to select document</p>
                    <p className="text-xs mt-1">Supports .TXT or .PDF</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex flex-col gap-3">
                <button 
                  onClick={handleUpload} disabled={!file || isUploading}
                  className={`w-full py-2.5 rounded-md font-medium text-sm transition-all duration-200 ${!file || isUploading ? (isDark ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed') : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >
                  {isUploading ? "Processing Document..." : "Initialize Analysis"}
                </button>
                <button 
                  onClick={handlePurge}
                  className={`w-full py-2.5 rounded-md font-medium text-sm transition-all duration-200 border ${isDark ? 'bg-transparent border-red-900/30 text-red-500 hover:bg-red-900/20' : 'bg-transparent border-red-200 text-red-600 hover:bg-red-50'}`}
                >
                  Clear Database
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Visualizations */}
          <div className={`lg:col-span-2 p-6 rounded-xl flex flex-col h-[600px] transition-all duration-700 transform ${panelClass} ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            
            <div className={`flex border-b mb-4 pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button 
                className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'graph' ? primaryText : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`} 
                onClick={() => setActiveTab('graph')}
              >
                Neural Topology
              </button>
              <button 
                className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'report' ? primaryText : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`} 
                onClick={() => setActiveTab('report')}
              >
                Gap Analysis Report
                {missedControls?.length > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${activeTab === 'report' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                    {missedControls.length}
                  </span>
                )}
              </button>
            </div>

            {/* Seamless Graph Container without borders */}
            <div className="flex-grow relative overflow-hidden">
              {activeTab === 'graph' && (
                <div className="absolute inset-0">
                  <ForceGraph2D
                    graphData={graphData} 
                    width={800} height={480} 
                    nodeAutoColorBy="group" 
                    nodeRelSize={6} 
                    linkDirectionalArrowLength={5} 
                    linkDirectionalArrowRelPos={1} 
                    linkColor={() => isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 
                    backgroundColor="#00000000"
                    nodeCanvasObject={(node, ctx, globalScale) => {
                      const label = node.name || node.id; 
                      const fontSize = 12/globalScale; 
                      ctx.font = `500 ${fontSize}px Inter, sans-serif`; 
                      const textWidth = ctx.measureText(label).width; 
                      const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 1.2);
                      
                      const isISO = node.group === 1; 
                      const isMissed = isISO && !coveredTargetIds.has(normalizeControlId(node.id)); 

                      const mainColor = isISO ? (isMissed ? '#ef4444' : '#10b981') : '#3b82f6'; 
                      const bgColorDark = isISO ? (isMissed ? '#450a0a' : '#022c22') : '#1e3a8a';
                      const bgColorLight = isISO ? (isMissed ? '#fef2f2' : '#f0fdf4') : '#eff6ff';
                      
                      ctx.fillStyle = isDark ? bgColorDark : bgColorLight; 
                      ctx.beginPath(); 
                      ctx.roundRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1], 4/globalScale); 
                      ctx.fill();
                      ctx.strokeStyle = mainColor; 
                      ctx.lineWidth = 1.5/globalScale; 
                      ctx.stroke();
                      ctx.textAlign = 'center'; 
                      ctx.textBaseline = 'middle'; 
                      
                      ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a'; 
                      ctx.fillText(label, node.x, node.y);
                    }}
                  />
                </div>
              )}

              {activeTab === 'report' && (
                <div className="w-full h-full p-2 overflow-y-auto custom-scrollbar">
                  {missedControls.length > 0 ? (
                    <div className="space-y-4">
                      {missedControls.map((control) => (
                        <div key={control.id} className={`p-5 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                              {control.id.replace('_', ' ')}: {control.name.split(' ').slice(1).join(' ')}
                            </h4>
                            <span className={`px-2 py-1 border text-[10px] font-semibold uppercase tracking-wider rounded ${isDark ? 'bg-red-900/20 text-red-400 border-red-800/50' : 'bg-red-50 text-red-600 border-red-200'}`}>Flagged Gap</span>
                          </div>
                          <div className={`mt-3 p-4 rounded-md ${isDark ? 'bg-slate-950/50' : 'bg-slate-50'}`}>
                            <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Remediation Note</p>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{control.remediation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <h3 className={`text-xl font-semibold ${primaryText}`}>Compliance Verified</h3>
                      <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No structural gaps identified in the current policy scope.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: Document Viewer */}
        {fileUrl && (
          <div className={`w-full p-6 rounded-xl transition-all duration-700 ${panelClass}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-8 h-8 rounded flex items-center justify-center ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-slate-100'}`}>
                <svg className={`w-4 h-4 ${primaryText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </div>
              <h2 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Source Document: <span className="font-normal text-slate-500 ml-1">{file?.name}</span></h2>
            </div>
            
            <div className={`rounded-lg border overflow-hidden h-[800px] ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <iframe src={fileUrl} className="w-full h-full" title="Document Viewer" />
            </div>
          </div>
        )}

      </main>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  )
}

export default App