// pages/index.js
import { useState } from "react";

export default function Home() {
  const [files, setFiles] = useState([]);
  const [output, setOutput] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files).filter(file => file.name.endsWith('.pdf')));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) return;

    setIsProcessing(true);
    setProgress({ processed: 0, total: files.length });

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
      });

      const data = await res.json();
      setOutput(data);
      
      // Update progress as files are processed
      setProgress(prev => ({ ...prev, processed: data.processedFiles }));
    } catch (error) {
      console.error("Error:", error);
      setOutput({ error: "Failed to process files" });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadCSV = () => {
    if (!output?.csvDownloadPath) return;
    window.open(output.csvDownloadPath, '_blank');
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">PDF Parser and Embedding Generator</h1>
      
      <form onSubmit={handleSubmit} className="mb-8 p-4 border rounded-lg bg-gray-50">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select PDF files (multiple allowed)
          </label>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
            multiple
          />
        </div>
        
        <button
          type="submit"
          disabled={isProcessing}
          className={`px-4 py-2 rounded-md text-white font-medium
            ${isProcessing  
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isProcessing ? 'Processing...' : 'Process PDFs'}
        </button>
        
        {isProcessing && (
          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-1">
              Processing {progress.processed} of {progress.total} files...
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${(progress.processed / progress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </form>

      {output && (
        <div className="mt-6 border rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-4 py-3 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Processing Results</h2>
            {output.csvDownloadPath && (
              <button
                onClick={downloadCSV}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Download CSV
              </button>
            )}
          </div>
          
          <div className="p-4">
            {output.error ? (
              <div className="text-red-600">{output.error}</div>
            ) : (
              <>
                <div className="mb-4 grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h3 className="font-medium text-blue-800">Files Processed</h3>
                    <p className="text-2xl">{output.processedFiles}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h3 className="font-medium text-green-800">Total Chunks</h3>
                    <p className="text-2xl">{output.totalChunks}</p>
                  </div>
                </div>

                <details className="mt-4 border rounded-lg overflow-hidden">
                  <summary className="bg-gray-100 px-4 py-2 cursor-pointer font-medium">
                    View Raw Data
                  </summary>
                  <pre className="bg-gray-50 p-4 max-h-96 overflow-auto text-sm">
                    {JSON.stringify(output.data, null, 2)}
                  </pre>
                </details>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}