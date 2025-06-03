import { createClient } from '@supabase/supabase-js';
import pdf from 'pdf-parse';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize clients
const supabase = createClient(process.env.YOUR_SUPABASE_URL, process.env.YOUR_SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(process.env.YOUR_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "embedding-001" });

// Configuration
const BATCH_SIZE = 5; // Process files in batches to avoid rate limits
const PDF_DIRECTORY = './pdfs'; // Directory containing your 250 PDF files
const EMBEDDING_MODEL_DIMENSION = 768; // Gemini embedding-001 uses 768 dimensions

async function generateEmbedding(text) {
  try {
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

async function processPdfFile(filePath) {
  try {
    // Read PDF file
    const dataBuffer = await fs.promises.readFile(filePath);
    
    // Extract text from PDF
    const { text } = await pdf(dataBuffer);
    if (!text) throw new Error('No text extracted from PDF');
    
    // Generate embedding
    const embedding = await generateEmbedding(text);
    if (!embedding) throw new Error('Failed to generate embedding');
    
    // Prepare metadata
    const metadata = {
      filename: path.basename(filePath),
      processed_at: new Date().toISOString(),
      pages: text.split('\f').length // Count pages
    };
    
    return {
      content: text,
      embedding,
      metadata
    };
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return null;
  }
}

async function uploadToSupabase(documents) {
  const validDocuments = documents.filter(doc => doc !== null);
  
  if (validDocuments.length === 0) return;
  
  const { error } = await supabase
    .from('documents')
    .insert(validDocuments);
    
  if (error) {
    console.error('Error uploading to Supabase:', error);
    return false;
  }
  return true;
}

async function processAllPdfs() {
  try {
    // Get list of PDF files
    const files = await fs.promises.readdir(PDF_DIRECTORY);
    const pdfFiles = files.filter(file => file.endsWith('.pdf'));
    
    console.log(`Found ${pdfFiles.length} PDF files to process`);
    
    // Process files in batches
    for (let i = 0; i < pdfFiles.length; i += BATCH_SIZE) {
      const batch = pdfFiles.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${i/BATCH_SIZE + 1} of ${Math.ceil(pdfFiles.length/BATCH_SIZE)}`);
      
      const batchPromises = batch.map(file => 
        processPdfFile(path.join(PDF_DIRECTORY, file))
      );
      
      const batchResults = await Promise.all(batchPromises);
      const success = await uploadToSupabase(batchResults);
      
      if (!success) {
        console.log('Pausing due to upload error...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait before retry
      }
      
      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('All PDFs processed and uploaded successfully!');
  } catch (error) {
    console.error('Error in processing pipeline:', error);
  }
}

// Start the process
processAllPdfs();