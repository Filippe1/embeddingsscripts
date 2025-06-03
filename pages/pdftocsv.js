import fs from "fs";
import path from "path";
import pdf from "pdf-parse";
import { createObjectCsvWriter } from "csv-writer";
import axios from "axios";

// Configuration
const pdfFolder = "./pdfx";
const outputCsv = "output.csv";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_EMBEDDING_URL = "https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=" + GEMINI_API_KEY;

// Function to extract text from a PDF file
async function extractTextFromPdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  return data.text;
}

// Function to get embedding using Gemini API
async function getEmbedding(text) {
  const response = await axios.post(
    GEMINI_EMBEDDING_URL,
    {
      "content": {
        "parts": [{ "text": text }]
      }
    },
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  return response.data.embedding.values; // Adjust depending on actual API response
}

// Main function
async function processPdfFiles() {
  const pdfFiles = fs.readdirSync(pdfFolder).filter(file => path.extname(file).toLowerCase() === ".pdf");

  const csvWriter = createObjectCsvWriter({
    path: outputCsv,
    header: [
      { id: "filename", title: "Filename" },
      { id: "content", title: "Content" },
      { id: "embedding", title: "Embedding" }
    ]
  });

  const records = [];

  for (const file of pdfFiles) {
    const filePath = path.join(pdfFolder, file);
    console.log(`Processing: ${file}`);

    try {
      // 1️⃣ Extract text
      const text = await extractTextFromPdf(filePath);

      // 2️⃣ Get embedding
      const embedding = await getEmbedding(text);

      // 3️⃣ Save record
      records.push({
        filename: file,
        content: text.replace(/\n/g, " "), // flatten newlines
        embedding: JSON.stringify(embedding) // store embedding as JSON string
      });
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }

  // 4️⃣ Write to CSV
  await csvWriter.writeRecords(records);
  console.log("CSV file created:", outputCsv);
}

processPdfFiles();
