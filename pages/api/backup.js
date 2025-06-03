// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
// pages/api/upload.js
// pages/api/upload.js
// pages/api/upload.js
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

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

    // 3️⃣ Process each PDF
    for (const file of files) {
      const filePath = path.join(pdfFolder, file);
      const pdfBuffer = fs.readFileSync(filePath);

      const data = await pdfParse(pdfBuffer);
      const text = data.text;

      // Chunk the text
      const chunkSize = 1000;
      const chunks = [];
      for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.substring(i, i + chunkSize));
      }

      // Embed each chunk
      const embeddedChunks = await Promise.all(
        chunks.map(async (chunk, idx) => {
          const vector = await embeddings.embedQuery(chunk);
          return {
            id: idx,
            text: chunk,
            embedding: vector,
            metadata: {
              fileName: file,
              chunkIndex: idx,
              length: chunk.length,
            },
          };
        })
      );

      // Save results for this PDF
      results.push({
        fileName: file,
        totalChunks: chunks.length,
        embeddedChunks,
      });
    }

    // 4️⃣ Return the JSON response
    res.status(200).json({
      status: "success",
      processedFiles: results.length,
      data: results,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process PDF files." });
  }
}
