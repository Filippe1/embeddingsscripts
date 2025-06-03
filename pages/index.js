// pages/index.js
import { useState } from 'react';

export default function UploadPage() {
  const [status, setStatus] = useState('Idle');
  const [progress, setProgress] = useState(null);

  const handleUpload = async () => {
    setStatus('Uploading...');
    setProgress(null);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('Upload complete');
        setProgress(`added ${data.totalChunks} of ${data.totalChunks} chunks to the rows in csv.`);
      } else {
        setStatus('Error');
        setProgress(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error(error);
      setStatus('Error');
      setProgress('An error occurred');
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">embed PDFs in folder /pdfs and convert to csv files in output folder</h1>
      <button
        onClick={handleUpload}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Start embedding
      </button>
      <div className="mt-4">
        <p>Status: {status}</p>
        {progress && <p>{progress}</p>}
      </div>
    </div>
  );
}
