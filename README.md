# 🧪 NEXUS: ISO 27001 Command Center

![UI Showcase](https://img.shields.io/badge/UI-Cyberpunk_Glassmorphism-00e5ff?style=flat-square)
![Stack](https://img.shields.io/badge/Stack-React_%7C_Node.js_%7C_Neo4j-blueviolet?style=flat-square)
![AI](https://img.shields.io/badge/AI_Engine-Google_Gemini-orange?style=flat-square)

NEXUS is an AI-powered compliance auditing tool that automates the mapping of corporate security policies to the ISO 27001:2022 framework. By leveraging Large Language Models and Graph Database technology, NEXUS transforms static policy documents into dynamic, visual, and actionable security intelligence.

## ✨ Core Features

- **Data Ingestion Engine:** Accepts raw security documents (PDF, DOCX, TXT) and processes them through an AI pipeline.
- **Dynamic AI Discovery (Neural Topology):** Uses LLMs to read document text, extract security protocols, and dynamically map them to specific ISO 27001 controls in a Neo4j graph database. Visualized in real-time using a 2D force-directed graph.
- **Targeted Audit (Security Scan):** Automatically cross-references the dynamically discovered controls against a strict company baseline (5 critical controls), instantly flagging vulnerabilities and missing policies.
- **System Purge Protocol:** Instantly wipes the Neo4j database to reset the testing environment for clean gap-analysis demonstrations.

## 🏗️ Architecture & Logic

This application demonstrates the critical difference between **Dynamic Discovery** and a **Targeted Compliance Audit**:

1. **Document-Level Topology:** The AI dynamically maps *every* ISO control it can find in a specific document. This provides human auditors with a clean, isolated view of a single document's "blast radius" without overwhelming them with an Enterprise-Level spiderweb of nodes.
2. **The Audit Engine:** While the AI may discover dozens of controls, the internal Security Scan strictly audits the database against mandatory baseline policies, successfully filtering out noise to deliver a precise vulnerability report.

## 🛠️ Tech Stack

- **Frontend:** React (Vite), Tailwind CSS, ForceGraph2D
- **Backend:** Node.js, Express
- **Database:** Neo4j (Graph Database)
- **AI Engine:** Google Gemini API
- **Storage:** Supabase

---

## 🚀 Local Deployment Guide

To achieve zero-latency AI processing for live demonstrations, this application is configured to run fully locally.

### 1. Prerequisites
- [Node.js](https://nodejs.org/) installed
- A local or AuraDB [Neo4j](https://neo4j.com/) instance
- A Google Gemini API Key
- A Supabase Project (for document storage)

### 2. Environment Variables
Create a `.env` file in the `backend` directory:
```env
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
NEO4J_URI=neo4j+s://your-database-id.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password
GEMINI_API_KEY=your_gemini_api_key
