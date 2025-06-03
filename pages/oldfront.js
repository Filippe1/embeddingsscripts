import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState(null);
  const [output, setOutput] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setOutput(data);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">PDF Parser and Embedding</h1>
      <form onSubmit={handleSubmit} className="my-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files[0])}
          className="border p-2"
        />
        <button type="submit" className="ml-2 bg-blue-500 text-white p-2">
          Upload
        </button>
      </form>

      {output && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">Chunks and Vectors:</h2>
          <pre className="bg-gray-100 p-2 overflow-x-auto">
            {JSON.stringify(output, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
