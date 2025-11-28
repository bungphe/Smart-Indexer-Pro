import React, { useCallback, useState } from 'react';
import { Upload, FileJson, CheckCircle, AlertCircle, Key } from 'lucide-react';
import { ServiceAccountKey } from '../types';

interface Props {
  onUpload: (key: ServiceAccountKey) => void;
}

const ServiceAccountUpload: React.FC<Props> = ({ onUpload }) => {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const processFile = (file: File) => {
    if (file.type !== 'application/json') {
      setError('Please upload a valid JSON file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!json.project_id || !json.private_key || !json.client_email) {
          throw new Error('Invalid Service Account Key format.');
        }
        setFileName(file.name);
        setError(null);
        onUpload(json as ServiceAccountKey);
      } catch (err) {
        setError('Invalid JSON structure. Ensure this is a valid Google Service Account Key.');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [onUpload]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex items-center space-x-2 mb-2 text-gray-300">
        <Key className="w-5 h-5 text-google-yellow" />
        <h2 className="text-lg font-semibold">Service Account Authentication</h2>
      </div>
      
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 ease-in-out
          ${isDragging ? 'border-google-blue bg-google-blue/10' : 'border-gray-600 bg-gray-800/50'}
          ${fileName ? 'border-google-green' : ''}
        `}
      >
        <div className="flex flex-col items-center justify-center text-center">
          {fileName ? (
            <>
              <CheckCircle className="w-12 h-12 text-google-green mb-4" />
              <p className="text-lg font-medium text-white mb-1">Key Loaded Successfully</p>
              <p className="text-sm text-gray-400 font-mono">{fileName}</p>
              <button 
                onClick={() => { setFileName(null); setError(null); }}
                className="mt-4 text-xs text-red-400 hover:text-red-300 underline"
              >
                Remove & Upload Different Key
              </button>
            </>
          ) : (
            <>
              <div className="bg-gray-700 p-4 rounded-full mb-4">
                <FileJson className="w-8 h-8 text-google-blue" />
              </div>
              <p className="text-lg font-medium text-white mb-2">
                Upload Service Account JSON
              </p>
              <p className="text-sm text-gray-400 mb-6 max-w-md">
                Drag and drop your Google Cloud Service Account JSON key here, or click to browse. 
                This is required to authenticate with the Indexing API.
              </p>
              <label className="cursor-pointer bg-google-blue hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20">
                Browse Files
                <input type="file" className="hidden" accept=".json" onChange={handleFileInput} />
              </label>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}
      </div>
      
      {!fileName && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          * Your private key is processed locally in your browser and is never sent to our servers.
        </p>
      )}
    </div>
  );
};

export default ServiceAccountUpload;