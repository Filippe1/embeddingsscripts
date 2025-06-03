// pages/api/upload.js
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { stringify } from 'csv-stringify/sync';

// Rate limiting configuration
const RATE_LIMIT_DELAY = 1000; // 1 second delay between requests
const MAX_REQUESTS_PER_MINUTE = 60; // Google's typical rate limit

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method '${req.method}' not allowed.` });
  }

  try {
    // 1️⃣ Get the list of PDFs in the /pdfs folder
    const pdfFolder = path.join(process.cwd(), "pdfx");
    const files = fs.readdirSync(pdfFolder).filter(file => file.endsWith(".pdf"));

    if (files.length === 0) {
      return res.status(400).json({ error: "No PDF files found in /pdfs." });
    }

    // 2️⃣ Initialize Gemini embeddings
    const embeddings = new GoogleGenerativeAIEmbeddings({
      modelName: "embedding-001",
      apiKey: process.env.YOUR_GEMINI_API_KEY,
    });

    const results = [];
    let requestCount = 0;
    const startTime = Date.now();

    // 3️⃣ Process each PDF
    for (const file of files) {
      const filePath = path.join(pdfFolder, file);
      const pdfBuffer = fs.readFileSync(filePath);

      const data = await pdfParse(pdfBuffer);
      const text = data.text;

      // Chunk the text
      const chunkSize = 1000; // Your desired chunk size
      const overlapSize = 150; // Number of characters to overlap
      const chunks = [];
let start = 0;

while (start < text.length) {
  const end = Math.min(start + chunkSize, text.length);
  chunks.push(text.substring(start, end));
  
  // Move the start position forward by chunkSize minus overlap
  start += (chunkSize - overlapSize);
  
  // Ensure we don't get stuck in an infinite loop with very small texts
  if (start === end) break;
}
      

      // Embed each chunk with rate limiting
      const embeddedChunks = [];
      for (let idx = 0; idx < chunks.length; idx++) {
        const chunk = chunks[idx];
        
        // Rate limiting logic
        requestCount++;
        if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
          const elapsedTime = Date.now() - startTime;
          if (elapsedTime < 60000) {
            const remainingTime = 60000 - elapsedTime;
            console.log(`Rate limit approaching. Waiting for ${remainingTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, remainingTime));
            requestCount = 0;
          }
        } else {
          // Small delay between each request to stay under rate limit
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        }

        const vector = await embeddings.embedQuery(chunk);
        embeddedChunks.push({
          id: idx,
          text: chunk,
          embedding: vector,
          metadata: {
            fileName: file,
            chunkIndex: idx,
            length: chunk.length,
          },
        });
      }

      // Save results for this PDF
      results.push({
        fileName: file,
        totalChunks: chunks.length,
        embeddedChunks,
      });
    }

    // Prepare CSV data
    const csvData = [];
    // Add header row
    csvData.push([
      'metadata',
      'content',
      'embedding'
    ]);

    // Add data rows
    results.forEach(fileResult => {
      fileResult.embeddedChunks.forEach(chunk => {
        csvData.push([
          chunk.metadata.fileName,
          chunk.text,
          JSON.stringify(chunk.embedding)
        ]);
      });
    });

    // Convert to CSV string
    const csvString = stringify(csvData);

    // Save CSV to file
    const csvFilePath = path.join(process.cwd(), 'output', 'test.csv');
    fs.mkdirSync(path.dirname(csvFilePath), { recursive: true });
    fs.writeFileSync(csvFilePath, csvString);

    // 4️⃣ Return the JSON response with CSV download link
    res.status(200).json({
      status: "success",
      processedFiles: results.length,
      totalChunks: results.reduce((sum, file) => sum + file.totalChunks, 0),
      csvDownloadPath: '/output/embeddings.csv',
      data: results,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process PDF files." });
  }
}


// 🚀 Remove request body size limit
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb' // adjust as needed
    }
  }
};