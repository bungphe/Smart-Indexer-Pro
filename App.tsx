import React, { useState } from 'react';
import { Globe, Zap, Send, Activity, Settings, LayoutDashboard, Database } from 'lucide-react';
import ServiceAccountUpload from './components/ServiceAccountUpload';
import UrlList from './components/UrlList';
import { UrlItem, ServiceAccountKey, IndexingStatus } from './types';
import { analyzeUrls } from './services/geminiService';

const App: React.FC = () => {
  const [serviceAccount, setServiceAccount] = useState<ServiceAccountKey | null>(null);
  const [items, setItems] = useState<UrlItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');

  const addUrls = (urls: string[]) => {
    const newItems: UrlItem[] = urls.map(url => ({
      id: Math.random().toString(36).substring(7),
      url,
      status: IndexingStatus.PENDING,
      requestType: 'URL_UPDATED'
    }));
    setItems(prev => [...prev, ...newItems]);
  };

  const deleteUrl = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const deleteBatch = (ids: string[]) => {
    setItems(prev => prev.filter(i => !ids.includes(i.id)));
  };

  const clearFailedUrls = () => {
    setItems(prev => prev.filter(i => i.status !== IndexingStatus.FAILED));
  };

  const runGeminiAnalysis = async (targetIds?: string[]) => {
    // If targetIds is provided (batch), use those. Otherwise default to PENDING.
    const isBatch = Array.isArray(targetIds);
    const itemsToProcess = isBatch 
        ? items.filter(i => targetIds.includes(i.id))
        : items.filter(i => i.status === IndexingStatus.PENDING);

    if (itemsToProcess.length === 0) return;

    setIsProcessing(true);
    
    const processingIds = new Set(itemsToProcess.map(i => i.id));

    // Set status to analyzing
    setItems(prev => prev.map(item => 
      processingIds.has(item.id) ? { ...item, status: IndexingStatus.ANALYZING } : item
    ));

    try {
      const urlsToAnalyze = itemsToProcess.map(i => i.url);
      const analysisResult = await analyzeUrls(urlsToAnalyze);

      // Update items with analysis
      setItems(prev => prev.map(item => {
        if (!processingIds.has(item.id)) return item; // Skip non-targeted items

        const result = analysisResult.items.find(r => r.url === item.url);
        if (result) {
          return {
            ...item,
            status: IndexingStatus.READY,
            qualityLabel: result.qualityLabel,
            qualityScore: result.qualityScore,
            analysis: result.reasoning
          };
        }
        return item;
      }));
    } catch (err) {
      console.error(err);
      alert("Failed to analyze URLs with Gemini. Check your API Key.");
      // Revert status for affected items
      setItems(prev => prev.map(item => 
        processingIds.has(item.id) && item.status === IndexingStatus.ANALYZING 
            ? { ...item, status: IndexingStatus.PENDING } 
            : item
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const submitToGoogle = async (targetIds?: string[]) => {
    if (!serviceAccount) {
      alert("Please upload a Service Account Key first.");
      return;
    }

    const isBatch = Array.isArray(targetIds);
    
    // For batch: Allow selected items. For global: Only READY items.
    const itemsToProcess = isBatch
        ? items.filter(i => targetIds.includes(i.id))
        : items.filter(i => i.status === IndexingStatus.READY);

    if (itemsToProcess.length === 0) return;

    setIsProcessing(true);
    
    const processingIds = new Set(itemsToProcess.map(i => i.id));

    setItems(prev => prev.map(i => processingIds.has(i.id) ? { ...i, status: IndexingStatus.SUBMITTING } : i));

    // Simulation of API Call (Client-side CORS prevents actual Google Indexing API calls without a proxy)
    // In a real production app, this would hit a backend endpoint that holds the credentials or uses the uploaded JSON.
    const simulateDelay = (ms: number) => new Promise(res => setTimeout(res, ms));

    for (const item of itemsToProcess) {
      await simulateDelay(800); // Simulate network latency
      
      // Random success/fail for demo purposes if not strictly defined, 
      // but let's assume success for high quality, random for others.
      const isSuccess = Math.random() > 0.1; // 90% success rate simulation

      setItems(prev => prev.map(i => {
        if (i.id === item.id) {
          return {
            ...i,
            status: isSuccess ? IndexingStatus.SUCCESS : IndexingStatus.FAILED,
            analysis: isSuccess ? i.analysis : "API Error: Failed to connect to indexing.googleapis.com (Simulated)"
          };
        }
        return i;
      }));
    }

    setIsProcessing(false);
    
    // Only show alert for bulk global action, purely optional for batch to avoid spam
    if (!isBatch) {
        alert(`Submission complete! Processed ${itemsToProcess.length} URLs.`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-100 font-sans selection:bg-google-blue selection:text-white">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-[#0f172a]/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-google-blue to-purple-600 p-2 rounded-lg">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">Smart Indexer <span className="text-google-blue">Pro</span></h1>
                <p className="text-xs text-gray-400">Google Search Console Indexing API Manager</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-3 py-1 bg-gray-800 rounded-full border border-gray-700 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${process.env.API_KEY ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs font-mono text-gray-400">Gemini 2.5 Flash</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Sidebar / Tabs (Simplified for this view) */}
        <div className="flex gap-8">
          <aside className="w-64 hidden lg:block shrink-0 space-y-2">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-google-blue text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </button>
             <button 
              disabled
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 cursor-not-allowed"
            >
              <Database className="w-5 h-5" />
              History (Pro)
            </button>
            <button 
              disabled
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 cursor-not-allowed"
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
            
            <div className="mt-8 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Did you know?</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                    The Indexing API is intended for Job Posting and Broadcast Event structured data. However, many SEOs use it to expedite crawling for normal pages. Google may ignore requests for non-time-sensitive content.
                </p>
            </div>
          </aside>

          <div className="flex-1 space-y-8">
            {/* Step 1: Auth */}
            <section>
              <ServiceAccountUpload onUpload={setServiceAccount} />
            </section>

            {/* Step 2: URL Management */}
            <section>
              <UrlList 
                items={items} 
                onAdd={addUrls} 
                onDelete={deleteUrl} 
                onClearFailed={clearFailedUrls}
                onDeleteBatch={deleteBatch}
                onAnalyzeBatch={runGeminiAnalysis}
                onSubmitBatch={submitToGoogle}
              />
            </section>

            {/* Step 3: Action Bar */}
            <section className="sticky bottom-6 z-40">
                <div className="bg-gray-800/90 backdrop-blur-lg border border-gray-700 p-4 rounded-xl shadow-2xl flex items-center justify-between gap-4 max-w-4xl mx-auto">
                    <div className="flex items-center gap-4">
                        <div className="text-sm">
                            <span className="text-gray-400">Ready to submit:</span>
                            <span className="ml-2 font-bold text-white text-lg">
                                {items.filter(i => i.status === IndexingStatus.READY).length}
                            </span>
                        </div>
                        <div className="h-8 w-px bg-gray-700"></div>
                        <div className="text-sm">
                            <span className="text-gray-400">Total URLs:</span>
                            <span className="ml-2 font-medium text-gray-300">
                                {items.length}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => runGeminiAnalysis()}
                            disabled={isProcessing || items.filter(i => i.status === IndexingStatus.PENDING).length === 0}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium transition-all shadow-lg shadow-purple-900/20"
                        >
                            <Zap className="w-4 h-4" />
                            {isProcessing ? 'Analyzing...' : 'AI Analyze All Pending'}
                        </button>
                        
                        <button
                            onClick={() => submitToGoogle()}
                            disabled={isProcessing || !serviceAccount || items.filter(i => i.status === IndexingStatus.READY).length === 0}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-google-blue hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium transition-all shadow-lg shadow-blue-900/20"
                        >
                            <Send className="w-4 h-4" />
                            Submit Ready
                        </button>
                    </div>
                </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;