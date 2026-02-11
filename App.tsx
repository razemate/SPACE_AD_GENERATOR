
import React, { useState, useRef, useEffect, useCallback } from 'react';
import AdPreview from './components/AdPreview';
import { gemini } from './services/geminiService';
import { AdData, AspectRatio } from './types';
import { toBlob } from 'html-to-image';
import { supabase } from './lib/supabaseClient';

const SANS_FONTS = [
  'Auto', 'Inter', 'Montserrat', 'Roboto', 'Open Sans', 'Lato', 
  'Poppins', 'Raleway', 'Nunito', 'Work Sans', 'Source Sans 3'
];
const HEADLINE_SIZES = ['Auto', '80px', '100px', '120px', '140px', '160px', '200px'];
const SUBHEADLINE_SIZES = ['Auto', '24px', '32px', '42px', '48px', '56px', '64px'];
const CTA_SIZES = ['Auto', '24px', '32px', '40px', '48px'];
const LINE_HEIGHTS = ['Auto', '0.9', '1.0', '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.8'];
const ASPECT_RATIOS: AspectRatio[] = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'];

const App: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");

  const [adData, setAdData] = useState<AdData>({
    headline: "Who Bought 26 Tons of Gold in 90 Days?",
    headlineFont: 'Auto',
    headlineSize: 'Auto',
    headlineLineHeight: 'Auto',
    subheadline: "Not a government. A $186 billion crypto company — stockpiling physical gold.",
    subheadlineFont: 'Auto',
    subheadlineSize: 'Auto',
    subheadlineLineHeight: 'Auto',
    cta: "See the companies next",
    ctaFont: 'Auto',
    ctaSize: 'Auto',
    imageUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200", 
    theme: 'dark',
    aspectRatio: '16:9',
    showBadge: false,
    promptStrategy: "" 
  });

  const [exportSettings, setExportSettings] = useState({ format: 'PNG', resolution: '4K' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing) {
      const newWidth = mouseMoveEvent.clientX;
      if (newWidth > 300 && newWidth < 800) setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const handleGenerateImage = async () => {
    setIsGenerating(true);
    setStatus("Analyzing hooks...");
    try {
      let finalPrompt = adData.promptStrategy;
      if (!finalPrompt || finalPrompt.trim().length < 5) {
        setStatus("Synthesizing prompt...");
        finalPrompt = await gemini.refinePrompt(adData.headline, adData.subheadline);
        setAdData(prev => ({ ...prev, promptStrategy: finalPrompt }));
      }
      setStatus("Rendering (Flash)...");
      const imageUrl = await gemini.generateAdBackground(finalPrompt, adData.aspectRatio);
      setAdData(prev => ({ ...prev, imageUrl }));
      setStatus(null);
    } catch (err) {
      console.error(err);
      setStatus("Error.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditImage = async () => {
    if (!editPrompt) return;
    setIsGenerating(true);
    setStatus("Editing...");
    try {
      const editedUrl = await gemini.editImage(adData.imageUrl, editPrompt);
      setAdData(prev => ({ ...prev, imageUrl: editedUrl }));
      setEditPrompt("");
      setStatus(null);
    } catch (err) {
      console.error(err);
      setStatus("Error.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyzeImage = async (base64: string) => {
    setIsGenerating(true);
    setStatus("Analyzing...");
    try {
      const { headline, subheadline } = await gemini.analyzeImage(base64);
      setAdData(prev => ({ ...prev, headline, subheadline, imageUrl: base64 }));
      setStatus(null);
    } catch (err) {
      console.error(err);
      setStatus("Error.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => handleAnalyzeImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setAdData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleRatioChange = (ratio: AspectRatio) => setAdData(prev => ({ ...prev, aspectRatio: ratio }));

  const initiateExport = async () => {
    if (!previewRef.current) return;
    setStatus('Generating image...');
    try {
      // Small delay to ensure styles are applied
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const blob = await toBlob(previewRef.current, { cacheBust: true });
      if (!blob) throw new Error('Failed to generate image');

      setStatus('Uploading...');
      const fileName = `exports/ad-${Date.now()}.png`;
      const { data, error } = await supabase.storage
        .from('ad-assets')
        .upload(fileName, blob, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;
      setStatus('Saved to Supabase!');
    } catch (error: any) {
      console.error('Export failed:', error.message || error);
      setStatus('Export Error');
    } finally {
      setTimeout(() => setStatus(null), 3000);
    }
  };

  return (
    <div className={`h-screen bg-black text-zinc-100 flex flex-col overflow-hidden ${isResizing ? 'select-none cursor-col-resize' : ''}`}>
      <main className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
        
        <aside className="h-full border-r border-zinc-800 bg-zinc-900/50 flex flex-col overflow-hidden" style={{ width: `${sidebarWidth}px` }}>
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-500 rounded-sm flex items-center justify-center shrink-0">
                <span className="text-black font-black text-sm font-display">A</span>
              </div>
              <h1 className="text-sm font-black tracking-tighter uppercase italic font-display">AdForge <span className="text-yellow-500">Editor</span></h1>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg space-y-3">
              <h3 className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest font-display flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-yellow-500"></div>Visual Studio
              </h3>
              <div className="space-y-2">
                <textarea name="promptStrategy" rows={2} value={adData.promptStrategy} onChange={handleInputChange} placeholder="Prompt Strategy..." className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1.5 text-[11px] focus:ring-1 focus:ring-yellow-500/50 transition-all resize-none placeholder:text-zinc-600" />
                <button onClick={handleGenerateImage} disabled={isGenerating} className={`w-full py-2 rounded-md font-black uppercase tracking-widest text-[10px] transition-all ${isGenerating ? 'bg-zinc-800 text-zinc-500' : 'bg-yellow-500 hover:bg-yellow-400 text-black'}`}>
                  {isGenerating ? 'Processing...' : 'Generate (Flash/Nano)'}
                </button>
              </div>
              <div className="pt-2 border-t border-yellow-500/10 flex gap-1.5">
                <input type="text" value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} placeholder="Edit Background..." className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1 text-[10px]" />
                <button onClick={handleEditImage} disabled={isGenerating || !editPrompt} className="bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded-md text-[10px] font-bold">Apply</button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Copy Settings</h3>
                <button onClick={() => fileInputRef.current?.click()} className="text-[9px] font-bold text-yellow-500 uppercase">Analyze Photo</button>
              </div>
              
              <div className="space-y-3 bg-zinc-800/20 p-3 rounded-lg border border-zinc-800/50">
                <textarea name="headline" rows={2} value={adData.headline} onChange={handleInputChange} className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[9px] text-zinc-500 font-bold uppercase">Size</label>
                    <select name="headlineSize" value={adData.headlineSize} onChange={handleInputChange} className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-1 py-1 text-[10px]">
                      {HEADLINE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] text-zinc-500 font-bold uppercase">Height</label>
                    <select name="headlineLineHeight" value={adData.headlineLineHeight} onChange={handleInputChange} className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-1 py-1 text-[10px]">
                      {LINE_HEIGHTS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-zinc-800/20 p-3 rounded-lg border border-zinc-800/50">
                <textarea name="subheadline" rows={2} value={adData.subheadline} onChange={handleInputChange} className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs resize-none" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[9px] text-zinc-500 font-bold uppercase">Size</label>
                    <select name="subheadlineSize" value={adData.subheadlineSize} onChange={handleInputChange} className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-1 py-1 text-[10px]">
                      {SUBHEADLINE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] text-zinc-500 font-bold uppercase">Height</label>
                    <select name="subheadlineLineHeight" value={adData.subheadlineLineHeight} onChange={handleInputChange} className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-1 py-1 text-[10px]">
                      {LINE_HEIGHTS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Canvas</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[9px] text-zinc-500 font-bold uppercase">Aspect Ratio</label>
                  <select value={adData.aspectRatio} onChange={(e) => handleRatioChange(e.target.value as AspectRatio)} className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-1 py-1 text-[10px]">
                    {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] text-zinc-500 font-bold uppercase">Format</label>
                  <select value={exportSettings.resolution} onChange={(e) => setExportSettings(prev => ({ ...prev, resolution: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-1 py-1 text-[10px]">
                    <option value="1K">1K HD</option>
                    <option value="2K">2K QHD</option>
                    <option value="4K">4K UHD</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
          <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-950/50 shrink-0 text-[9px] text-zinc-600 font-bold uppercase flex justify-between">
            <span>v3.5 (NANO)</span>
            {status && <span className="text-yellow-500 animate-pulse">{status}</span>}
          </div>
        </aside>

        <div onMouseDown={startResizing} className={`w-[2px] cursor-col-resize shrink-0 relative transition-colors ${isResizing ? 'bg-yellow-500' : 'bg-zinc-800 hover:bg-zinc-700'}`}>
          <div className="absolute inset-y-0 -left-1 -right-1 z-50"></div>
        </div>

        <section className="flex-1 h-full bg-[#050505] flex flex-col overflow-hidden">
          <div className="px-6 py-3 border-b border-zinc-900 bg-black/40 backdrop-blur-sm flex items-center justify-between shrink-0">
            <div className="space-y-0.5">
              <h2 className="text-[11px] font-black italic tracking-widest uppercase font-display text-zinc-400">Studio <span className="text-yellow-500">Output</span></h2>
              <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-wide">High Fidelity Coordinates</p>
            </div>
            <button onClick={initiateExport} className="bg-zinc-100 hover:bg-white text-black px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all shadow-lg font-display">Export Asset</button>
          </div>

          <div className="flex-1 overflow-auto bg-[radial-gradient(circle_at_center,_#111_0%,_transparent_100%)] p-8">
             <div className="w-full h-full min-h-[500px] flex items-start justify-start" ref={previewRef}>
                <AdPreview data={adData} isGenerating={isGenerating} />
             </div>
          </div>
        </section>
      </main>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #222; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #333; }
      `}</style>
    </div>
  );
};

export default App;
