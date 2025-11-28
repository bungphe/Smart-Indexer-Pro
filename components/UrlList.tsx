import React, { useState } from 'react';
import { UrlItem, IndexingStatus, UrlQuality } from '../types';
import { Trash2, ExternalLink, Activity, SearchCheck, Zap, Send, X, FileSearch, Globe, List, Code, Filter } from 'lucide-react';

interface Props {
  items: UrlItem[];
  onDelete: (id: string) => void;
  onAdd: (urls: string[]) => void;
  onClearFailed?: () => void;
  onAnalyzeBatch?: (ids: string[]) => void;
  onSubmitBatch?: (ids: string[]) => void;
  onDeleteBatch?: (ids: string[]) => void;
}

const UrlList: React.FC<Props> = ({ 
  items, 
  onDelete, 
  onAdd, 
  onClearFailed,
  onAnalyzeBatch,
  onSubmitBatch,
  onDeleteBatch
}) => {
  const [inputMode, setInputMode] = useState<'paste' | 'scan'>('paste');
  const [input, setInput] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Scanner State
  const [scanUrl, setScanUrl] = useState('');
  const [scanContent, setScanContent] = useState('');
  const [scanFilter, setScanFilter] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);

  const handleAdd = () => {
    if (!input.trim()) return;
    const urls = input.split('\n').map(u => u.trim()).filter(u => u.length > 0);
    onAdd(urls);
    setInput('');
  };

  const handleFetchSitemap = async () => {
    if (!scanUrl) return;
    setIsFetching(true);
    setScanStatus(null);
    try {
      const res = await fetch(scanUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      setScanContent(text);
      setScanStatus('Successfully loaded content. Ready to extract.');
    } catch (e) {
      setScanStatus('Could not fetch directly (CORS restriction). Please paste the Sitemap XML or Page Source below manually.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleScanExtract = () => {
    if (!scanContent.trim()) return;

    let extracted: string[] = [];

    // Strategy 1: Look for <loc> tags (Sitemap XML)
    const locMatches = scanContent.matchAll(/<loc>(.*?)<\/loc>/g);
    const locs = Array.from(locMatches).map(m => m[1]);
    
    if (locs.length > 0) {
      extracted = locs;
    } else {
      // Strategy 2: Look for href attributes (HTML)
      const hrefMatches = scanContent.matchAll(/href=["'](https?:\/\/[^"']+)["']/g);
      extracted = Array.from(hrefMatches).map(m => m[1]);
    }

    if (extracted.length === 0) {
       // Strategy 3: Fallback loose URL matching
       const looseMatches = scanContent.match(/https?:\/\/[^\s<>"']+/g);
       if (looseMatches) extracted = looseMatches;
    }

    // Filter
    if (scanFilter.trim()) {
      const keywords = scanFilter.split(',').map(k => k.trim().toLowerCase());
      extracted = extracted.filter(url => 
        keywords.some(k => url.toLowerCase().includes(k))
      );
    }

    // Clean and Dedup
    const uniqueUrls = [...new Set(extracted)]
      .map(u => u.trim())
      .filter(u => u.length > 0);

    onAdd(uniqueUrls);
    
    // Reset scanner
    setScanContent('');
    setScanStatus(`Extracted ${uniqueUrls.length} URLs.`);
    setInputMode('paste');
  };

  const getStatusColor = (status: IndexingStatus) => {
    switch (status) {
      case IndexingStatus.SUCCESS: return 'text-google-green';
      case IndexingStatus.FAILED: return 'text-google-red';
      case IndexingStatus.ANALYZING: return 'text-google-yellow animate-pulse';
      case IndexingStatus.SUBMITTING: return 'text-blue-400 animate-pulse';
      default: return 'text-gray-400';
    }
  };

  const getQualityBadge = (quality?: UrlQuality) => {
    if (!quality) return null;
    const colors = {
      [UrlQuality.HIGH]: 'bg-green-500/20 text-green-300 border-green-500/30',
      [UrlQuality.MEDIUM]: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      [UrlQuality.LOW]: 'bg-red-500/20 text-red-300 border-red-500/30',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs border ${colors[quality]}`}>
        {quality} QUALITY
      </span>
    );
  };

  // Selection Logic
  const handleSelectAll = () => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const executeBatchAction = (action: (ids: string[]) => void) => {
    action(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const hasFailedItems = items.some(i => i.status === IndexingStatus.FAILED);
  const selectedCount = selectedIds.size;
  const isAllSelected = items.length > 0 && selectedCount === items.length;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden mb-8">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 bg-gray-800 min-h-[64px] flex justify-between items-center">
          {selectedCount > 0 ? (
            // Batch Actions Header
            <div className="flex items-center justify-between w-full animate-in fade-in duration-200">
               <div className="flex items-center gap-3">
                 <button 
                    onClick={() => setSelectedIds(new Set())} 
                    className="p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
                 >
                    <X className="w-4 h-4" />
                 </button>
                 <span className="text-sm font-medium text-white">{selectedCount} selected</span>
               </div>
               <div className="flex items-center gap-2">
                 {onAnalyzeBatch && (
                   <button 
                     onClick={() => executeBatchAction(onAnalyzeBatch)}
                     className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-900/30 text-purple-300 hover:bg-purple-900/50 border border-purple-800 rounded-lg text-xs font-medium transition-colors"
                   >
                     <Zap className="w-3.5 h-3.5" /> Analyze
                   </button>
                 )}
                 {onSubmitBatch && (
                   <button 
                     onClick={() => executeBatchAction(onSubmitBatch)}
                     className="flex items-center gap-1.5 px-3 py-1.5 bg-google-blue/20 text-blue-300 hover:bg-google-blue/30 border border-blue-800 rounded-lg text-xs font-medium transition-colors"
                   >
                     <Send className="w-3.5 h-3.5" /> Submit
                   </button>
                 )}
                 {onDeleteBatch && (
                   <button 
                     onClick={() => executeBatchAction(onDeleteBatch)}
                     className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-900/50 rounded-lg text-xs font-medium transition-colors"
                   >
                     <Trash2 className="w-3.5 h-3.5" /> Delete
                   </button>
                 )}
               </div>
            </div>
          ) : (
            // Default Header
            <>
              <h3 className="font-medium text-gray-200 flex items-center gap-2">
                <SearchCheck className="w-4 h-4 text-google-blue" />
                URL Management
              </h3>
              <div className="flex items-center gap-4">
                {hasFailedItems && onClearFailed && (
                  <button 
                    onClick={onClearFailed}
                    className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-red-900/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 border border-red-900/50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear Failed
                  </button>
                )}
                <span className="text-xs text-gray-500">{items.length} URLs in queue</span>
              </div>
            </>
          )}
        </div>

        {/* Input Area (Tabbed) */}
        <div className="bg-gray-900/50 border-b border-gray-700">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setInputMode('paste')}
              className={`px-4 py-3 text-sm font-medium flex items-center gap-2 transition-colors ${
                inputMode === 'paste' ? 'text-google-blue border-b-2 border-google-blue bg-gray-800/50' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <List className="w-4 h-4" />
              Quick Paste
            </button>
            <button
              onClick={() => setInputMode('scan')}
              className={`px-4 py-3 text-sm font-medium flex items-center gap-2 transition-colors ${
                inputMode === 'scan' ? 'text-google-blue border-b-2 border-google-blue bg-gray-800/50' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <FileSearch className="w-4 h-4" />
              Sitemap Scanner
            </button>
          </div>

          <div className="p-4">
            {inputMode === 'paste' ? (
              // Paste Mode
              <>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Paste your URLs here (one per line)... https://example.com/page-1"
                  className="w-full h-32 bg-gray-800 text-gray-100 p-3 rounded-lg border border-gray-700 focus:ring-2 focus:ring-google-blue focus:border-transparent outline-none resize-none font-mono text-sm"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleAdd}
                    disabled={!input.trim()}
                    className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Add URLs to Queue
                  </button>
                </div>
              </>
            ) : (
              // Scan Mode
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                    <input 
                      type="text" 
                      value={scanUrl}
                      onChange={(e) => setScanUrl(e.target.value)}
                      placeholder="Enter Sitemap URL (e.g., https://site.com/sitemap.xml)"
                      className="w-full bg-gray-800 text-gray-100 pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:ring-2 focus:ring-google-blue outline-none text-sm"
                    />
                  </div>
                  <button 
                    onClick={handleFetchSitemap}
                    disabled={isFetching || !scanUrl}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium whitespace-nowrap disabled:opacity-50"
                  >
                    {isFetching ? 'Fetching...' : 'Fetch'}
                  </button>
                </div>
                
                {scanStatus && (
                   <p className={`text-xs ${scanStatus.includes('Could not') ? 'text-yellow-400' : 'text-green-400'}`}>
                     {scanStatus}
                   </p>
                )}

                <div className="relative">
                   <div className="absolute top-2 right-2 flex gap-1 z-10">
                      <span className="text-[10px] text-gray-500 bg-gray-900/80 px-2 py-1 rounded uppercase">Raw XML / Source</span>
                   </div>
                   <textarea
                    value={scanContent}
                    onChange={(e) => setScanContent(e.target.value)}
                    placeholder="Paste Sitemap XML or Page Source Code here if fetching fails..."
                    className="w-full h-32 bg-gray-800 text-gray-100 p-3 rounded-lg border border-gray-700 focus:ring-2 focus:ring-google-blue outline-none resize-none font-mono text-xs"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-between items-end">
                  <div className="w-full sm:w-auto flex-1 space-y-1">
                     <label className="text-xs text-gray-400 flex items-center gap-1">
                       <Filter className="w-3 h-3" /> Filter Keywords (comma separated)
                     </label>
                     <div className="flex gap-2">
                       <input 
                          type="text" 
                          value={scanFilter}
                          onChange={(e) => setScanFilter(e.target.value)}
                          placeholder="e.g. product, blog, item"
                          className="flex-1 bg-gray-800 text-gray-100 px-3 py-1.5 rounded-lg border border-gray-700 text-sm focus:ring-1 focus:ring-google-blue outline-none"
                       />
                       <div className="flex gap-1">
                          <button 
                            onClick={() => setScanFilter('product,item,shop,collection')}
                            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-[10px] uppercase font-medium"
                          >
                            Products
                          </button>
                          <button 
                             onClick={() => setScanFilter('blog,article,news,post')}
                             className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-[10px] uppercase font-medium"
                          >
                            Articles
                          </button>
                       </div>
                     </div>
                  </div>
                  <button
                    onClick={handleScanExtract}
                    disabled={!scanContent.trim()}
                    className="w-full sm:w-auto bg-google-blue hover:bg-blue-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
                  >
                    Scan & Extract URLs
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* List Content */}
        <div className="max-h-[500px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No URLs added yet.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-800 text-gray-400 sticky top-0 z-10">
                <tr>
                  <th className="p-4 w-12 text-center">
                    <input 
                        type="checkbox" 
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-google-blue focus:ring-google-blue focus:ring-offset-gray-900 cursor-pointer"
                    />
                  </th>
                  <th className="p-4 font-medium">URL</th>
                  <th className="p-4 font-medium w-32">Status</th>
                  <th className="p-4 font-medium w-32">Quality</th>
                  <th className="p-4 font-medium w-16 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {items.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    return (
                        <tr key={item.id} className={`hover:bg-gray-700/30 transition-colors group ${isSelected ? 'bg-blue-900/10' : ''}`}>
                            <td className="p-4 text-center">
                                <input 
                                    type="checkbox" 
                                    checked={isSelected}
                                    onChange={() => handleSelect(item.id)}
                                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-google-blue focus:ring-google-blue focus:ring-offset-gray-900 cursor-pointer"
                                />
                            </td>
                            <td className="p-4">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-200 font-mono truncate max-w-md" title={item.url}>
                                        {item.url}
                                    </span>
                                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white">
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                                {item.analysis && (
                                    <p className="text-xs text-gray-400 mt-1 flex items-start gap-1">
                                        <Activity className="w-3 h-3 mt-0.5 shrink-0" />
                                        {item.analysis}
                                    </p>
                                )}
                            </div>
                            </td>
                            <td className={`p-4 font-medium ${getStatusColor(item.status)}`}>
                            {item.status.replace('_', ' ')}
                            </td>
                            <td className="p-4">
                            {getQualityBadge(item.qualityLabel)}
                            </td>
                            <td className="p-4 text-right">
                            <button
                                onClick={() => onDelete(item.id)}
                                className="text-gray-500 hover:text-red-400 transition-colors p-1"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            </td>
                        </tr>
                    );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default UrlList;