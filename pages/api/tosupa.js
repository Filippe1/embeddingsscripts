import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.YOUR_SUPABASE_URL;
const supabaseKey = process.env.YOUR_SUPABASE_KEY; // Use Service Role key for insert permissions
const supabase = createClient(supabaseUrl, supabaseKey);




export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    const outputDir = path.join(process.cwd(), 'output');
    const files = fs.readdirSync(outputDir).filter(file => file.endsWith('.csv'));
  
    let totalRows = 0;
    let insertedRows = 0;
  
    for (const file of files) {
      const filePath = path.join(outputDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
  
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true
      });
  
      totalRows += records.length;
  
      for (const record of records) {
        // Convert embedding to array of floats
        let embeddingArray = record.embedding;
        if (typeof embeddingArray === 'string') {
          // Assuming it's stored as a stringified array, e.g. "[0.1, 0.2, ...]"
          embeddingArray = JSON.parse(record.embedding);
        }
      
        // Convert metadata to JSON object or null if invalid
        let metadataObj = record.metadata;
        if (typeof metadataObj === 'string') {
          try {
            metadataObj = JSON.parse(record.metadata);
          } catch (error) {
            console.warn('Invalid JSON metadata, setting as null:', record.metadata);
            metadataObj = null;
          }
        }
      
        const { error } = await supabase.from('documents').insert({
          content: record.content,
          embedding: embeddingArray,
          metadata: metadataObj
        });
      
        if (error) {
          console.error('Insert error:', error);
          // Optionally handle errors (e.g. skip or stop)
        } else {
          insertedRows++;
        }
      }
      
    }
  
    res.status(200).json({
      message: 'Upload completed',
      totalRows,
      insertedRows
    });
  }