require('dotenv').config();
const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');
const { createClient } = require('@supabase/supabase-js');
const pdfParse = require('pdf-parse');
const { GoogleGenAI } = require('@google/genai');

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Initialize Express Server
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Initialize Neo4j Graph Database Connection
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

// Test the Neo4j Connection on Startup
async function verifyDatabase() {
  const session = driver.session();
  try {
    await session.run('RETURN 1');
    console.log('✅ Successfully connected to Neo4j Graph Database');
  } catch (error) {
    console.error('❌ Failed to connect to Neo4j:', error.message);
  } finally {
    await session.close();
  }
}
verifyDatabase();

// --- API ROUTES ---

// Health Check Route
app.get('/health', (req, res) => {
  res.json({ status: 'Backend is running and healthy' });
});

// Fetch Graph Data Route
app.get('/api/graph-data', async (req, res) => {
  const session = driver.session();
  try {
    // 1. Get all nodes from the database
    const nodesResult = await session.run('MATCH (n) RETURN n.id AS id, n.name AS name, n.group AS group');
    const dbNodes = nodesResult.records.map(record => ({
      id: record.get('id'),
      name: record.get('name') || record.get('id'), // Fallback if name is missing
      group: Number(record.get('group')) || 1
    }));

    // 2. Get all relationships (the arrows)
    const linksResult = await session.run('MATCH (s)-[r]->(t) RETURN s.id AS source, t.id AS target');
    const dbLinks = linksResult.records.map(record => ({
      source: record.get('source'),
      target: record.get('target')
    }));

    res.json({ nodes: dbNodes, links: dbLinks });
  } catch (error) {
    console.error('❌ Error fetching graph data:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// --- PURGE DATABASE ROUTE ---
app.delete('/api/purge', async (req, res) => {
  const session = driver.session();
  try {
    // This Cypher query deletes ALL nodes and ALL relationships
    await session.run('MATCH (n) DETACH DELETE n');
    res.json({ message: 'System Purged.' });
  } catch (error) {
    console.error('❌ Error purging database:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// The AI Processing Route (We will build the logic for this next!)
// The AI Processing Route
// The AI Processing Route
app.post('/api/process-policy', async (req, res) => {
  const { fileName } = req.body;
  
  if (!fileName) {
    return res.status(400).json({ error: 'No file name provided' });
  }

  console.log(`\n--- Starting processing for: ${fileName} ---`);

  try {
    // 1. Download PDF from Supabase
    console.log('📥 1. Downloading from Supabase...');
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('policies')
      .download(fileName);
      
    if (downloadError) throw downloadError;

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Extract Text
    console.log('📄 2. Extracting text from file...');
    let extractedText = '';

    // Bulletproof extraction: Handles both true PDFs and plain text files pretending to be PDFs
    if (fileName.endsWith('.txt')) {
      extractedText = buffer.toString('utf-8');
    } else {
      try {
        // Handle the Node.js import quirk
        const parseFunction = typeof pdfParse === 'function' ? pdfParse : pdfParse.default;
        const pdfResult = await parseFunction(buffer);
        extractedText = pdfResult.text;
      } catch (parseError) {
        console.log('⚠️ Could not read as a standard PDF, falling back to raw text reading...');
        extractedText = buffer.toString('utf-8');
      }
    }

    // 3. Send to Gemini AI for mapping
    console.log('🧠 3. Sending to Gemini AI for ISO mapping...');
    const prompt = `
      You are a strict Cybersecurity Compliance Auditor.
      Analyze the following company policy text against the ISO 27001:2022 standard.
      Identify which ISO 27001 controls this policy satisfies.
      
      Return ONLY a valid JSON array of objects. Do not write any markdown, explanations, or extra text.
      Each object must have exactly these three keys:
      - "policyName": "${fileName}"
      - "controlId": The ISO control ID formatted exactly like "ISO_5_1" or "ISO_8_1"
      - "label": "SATISFIES"

      Policy Text to analyze:
      ${extractedText.substring(0, 10000)}
    `;

    let response;
    let retries = 3;
    
    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        break; // If successful, break out of the loop
      } catch (apiError) {
        if (apiError.status === 503 && retries > 1) {
          console.log(`⏳ Server busy. Retrying in 3 seconds... (${retries - 1} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
          retries--;
        } else {
          throw apiError; // If it's a different error, or we are out of retries, crash normally
        }
      }
    }

    let aiText = response.text.trim();
    if (aiText.startsWith('```json')) {
        aiText = aiText.split('```json')[1].split('```')[0].trim();
    }
    
    const mappings = JSON.parse(aiText);
    console.log(`✨ AI found ${mappings.length} standard mappings!`);

    // 4. Save to Neo4j
    console.log('🕸️ 4. Saving relationships to Neo4j Graph Database...');
    const session = driver.session();
    try {
      const cypherQuery = `
        UNWIND $mappings AS mapping
        MERGE (p:Policy {id: mapping.policyName, name: mapping.policyName, group: 2})
        MERGE (c:ISOControl {id: mapping.controlId, group: 1})
        MERGE (p)-[:SATISFIES]->(c)
      `;
      await session.run(cypherQuery, { mappings });
    } finally {
      await session.close();
    }

    console.log('✅ Processing Complete!\n');
    res.json({ message: 'Successfully mapped policy to ISO standards!', mappings });

  } catch (error) {
    console.error('❌ Error during processing:', error);
    res.status(500).json({ error: error.message });
  }
});
// Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});