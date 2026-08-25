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
    // Deletes ALL nodes and ALL relationships
    await session.run('MATCH (n) DETACH DELETE n');
    res.json({ message: 'System Purged.' });
  } catch (error) {
    console.error('❌ Error purging database:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// --- AI PROCESSING ROUTE ---
app.post('/api/process-policy', async (req, res) => {
  const { fileName } = req.body;
  
  if (!fileName) {
    return res.status(400).json({ error: 'No file name provided' });
  }

  console.log(`\n--- Starting processing for: ${fileName} ---`);

  try {
    // 1. Download File from Supabase
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

    if (fileName.endsWith('.txt')) {
      extractedText = buffer.toString('utf-8');
    } else {
      try {
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
You are a strict ISO 27001:2022 Cybersecurity Auditor. 
Your ONLY job is to analyze the following document text and map it to the ISO 27001 controls it satisfies.

DOCUMENT TEXT:
"""
${extractedText} 
"""

CRITICAL INSTRUCTIONS:
1. You must output ONLY a valid, raw JSON object. 
2. Do NOT include markdown formatting (like \`\`\`json). 
3. Do NOT include any conversational text, greetings, or explanations.
4. You MUST ONLY use valid ISO 27001:2022 control IDs. Section 5 ends at 5.37, Section 6 ends at 6.8, Section 7 ends at 7.14, and Section 8 ends at 8.34. NEVER invent a control ID that falls outside these ranges.
5. If the document references legacy ISO 27001:2013 controls (e.g., A.5 through A.18), translate and map them to their modern ISO 27001:2022 equivalent (e.g., ISO_5_1 through ISO_8_34).
6. Target IDs in the "links" array MUST use the format "ISO_X_Y" (e.g., "ISO_5_1", "ISO_8_2").
7. The JSON must perfectly match this exact schema:


{
  "nodes": [
    { "id": "${fileName}", "name": "${fileName}", "group": 2 }
  ],
  "links": [
    { "source": "${fileName}", "target": "ISO_5_1" },
    { "source": "${fileName}", "target": "ISO_8_2" }
  ]
}

Analyze the text and populate the "links" array with every valid ISO control you find. If you find none, return an empty links array.
`;

    let response;
    let retries = 3;
    
    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        break; 
      } catch (apiError) {
        if (apiError.status === 503 && retries > 1) {
          console.log(`⏳ Server busy. Retrying in 3 seconds... (${retries - 1} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          retries--;
        } else {
          throw apiError; 
        }
      }
    }

    let aiText = response.text.trim();
    if (aiText.startsWith('```json')) {
      aiText = aiText.split('```json')[1].split('```')[0].trim();
    } else if (aiText.startsWith('```')) {
      aiText = aiText.split('```')[1].split('```')[0].trim();
    }
    
    // Parse the JSON structure
    const parsedData = JSON.parse(aiText);
    let rawLinks = parsedData.links || [];

    // Helper to sanitize control IDs (e.g., "ISO_A.5.1" or "5.1" -> "ISO_5_1")
    const sanitizeId = (id) => {
      if (!id) return '';
      const numbers = id.match(/\d+/g);
      return numbers ? `ISO_${numbers.join('_')}` : id;
    };

    // Clean links before writing to Neo4j
    const links = rawLinks.map(link => ({
      source: link.source || fileName,
      target: sanitizeId(link.target)
    }));

    console.log(`✨ AI found ${links.length} standard mappings!`);

    // 4. Save to Neo4j
    console.log('🕸️ 4. Saving relationships to Neo4j Graph Database...');
    const session = driver.session();
    try {
      const cypherQuery = `
        UNWIND $links AS link
        MERGE (p:Policy {id: link.source, name: link.source, group: 2})
        MERGE (c:ISOControl {id: link.target, group: 1})
        MERGE (p)-[:SATISFIES]->(c)
      `;
      await session.run(cypherQuery, { links });
    } finally {
      await session.close();
    }

    console.log('✅ Processing Complete!\n');
    res.json({ message: 'Successfully mapped policy to ISO standards!', mappings: links });

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