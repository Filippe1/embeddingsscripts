import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { stringify } from 'csv-stringify/sync';

const RATE_LIMIT_DELAY = 1000;
const MAX_REQUESTS_PER_MINUTE = 60;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method '${req.method}' not allowed.` });
  }

  try {
    const pdfFolder = path.join(process.cwd(), "pdfs");
    const files = fs.readdirSync(pdfFolder).filter(file => file.endsWith(".pdf"));

    if (files.length === 0) {
      return res.status(400).json({ error: "No PDF files found in /pdfs." });
    }

    const embeddings = new GoogleGenerativeAIEmbeddings({
      modelName: "embedding-001",
      apiKey: process.env.YOUR_GEMINI_API_KEY,
    });

    const results = [];
    let requestCount = 0;
    const startTime = Date.now();

    for (const file of files) {
      const filePath = path.join(pdfFolder, file);
      const pdfBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(pdfBuffer);
      let text = data.text;

      // 🚀 Remove redundant/repetitive sentences
      const sentences = text.split(/(?<=[.!?])\s+/); // Split by sentence end
      const seen = new Set();
      const uniqueSentences = sentences.filter(sentence => {
        const trimmed = sentence.trim();
        if (trimmed.length < 10) return false; // Skip very short sentences
        if (seen.has(trimmed)) return false;
        seen.add(trimmed);
        return true;
      });
      text = uniqueSentences.join(' ');

      // Chunk the cleaned text
      const chunkSize = 1000;
      const overlapSize = 150;
      const chunks = [];
      let start = 0;

      while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.substring(start, end));
        start += (chunkSize - overlapSize);
        if (start === end) break;
      }

      const embeddedChunks = [];
      for (let idx = 0; idx < chunks.length; idx++) {
        const chunk = chunks[idx];
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

      results.push({
        fileName: file,
        totalChunks: chunks.length,
        embeddedChunks,
      });
    }

    // Prepare CSV data
    const csvData = [];
    csvData.push(['metadata', 'content', 'embedding']);
    results.forEach(fileResult => {
      fileResult.embeddedChunks.forEach(chunk => {
        csvData.push([
          chunk.metadata.fileName,
          chunk.text,
          JSON.stringify(chunk.embedding)
        ]);
      });
    });
    const csvString = stringify(csvData);
    const csvFilePath = path.join(process.cwd(), 'output', 'test.csv');
    fs.mkdirSync(path.dirname(csvFilePath), { recursive: true });
    fs.writeFileSync(csvFilePath, csvString);

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

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb'
    }
  }
};
