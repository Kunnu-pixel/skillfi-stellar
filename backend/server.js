require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { SorobanRpc } = require('stellar-sdk');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ==========================================
// Persistent Flat-File JSON Database
// ==========================================
const DB_FILE = path.join(__dirname, 'db.json');
let DB = {
  profiles: {},  // earnerAddress -> { name, bio, skills, college }
  isas: [],      // array of { id, earner, fundingTarget, incomeShare, duration, cap, status, txHash }
  repayments: [],// array of { isaId, amount, payer, txHash, timestamp }
  feedback: [],  // array of { address, role, usability, clarity, comments }
  proofs: []     // array of { isaId, income, docUrl, verified, timestamp }
};

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      DB = JSON.parse(data);
      console.log(`[DB] Database loaded successfully from ${DB_FILE}`);
    } else {
      saveDB();
    }
  } catch (err) {
    console.error(`[DB Error] Failed to load database:`, err.message);
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(DB, null, 2), 'utf8');
  } catch (err) {
    console.error(`[DB Error] Failed to save database:`, err.message);
  }
}

// Load database initially
loadDB();

// ==========================================
// Indexer Daemon Skeleton (Soroban Event Stream)
// ==========================================
const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const server = new SorobanRpc.Server(SOROBAN_RPC_URL);

async function startIndexer() {
  console.log(`[Indexer] Launching event listener polling on: ${SOROBAN_RPC_URL}`);
  let lastCheckedLedger = 0;

  setInterval(async () => {
    try {
      const health = await server.getHealth();
      const latestLedger = health.latestLedger;

      if (latestLedger <= lastCheckedLedger) return;
      if (lastCheckedLedger === 0) lastCheckedLedger = latestLedger - 10;

      // Query events
      const response = await server.getEvents({
        startLedger: lastCheckedLedger,
        filters: [
          {
            type: "contract",
            topics: [["*"]]
          }
        ],
        limit: 50
      });

      if (response.events && response.events.length > 0) {
        for (const event of response.events) {
          console.log(`[Indexer] Event parsed: ${event.id}`);
          processEvent(event);
        }
      }

      lastCheckedLedger = latestLedger;
    } catch (err) {
      // Quiet errors to prevent console flooding during testnet rate limits
    }
  }, 12000); // Polling interval
}

function processEvent(event) {
  // Parsing events and syncing with state
}

startIndexer();

// ==========================================
// Express API Endpoints
// ==========================================

// Global Telemetry Aggregation
app.get('/api/stats', (req, res) => {
  const totalFunded = DB.isas
    .filter(i => i.status === 'Funded')
    .reduce((sum, current) => sum + Number(current.fundingTarget), 0);

  const totalRepaid = DB.repayments
    .reduce((sum, current) => sum + Number(current.amount), 0);

  res.json({
    totalFunded,
    totalRepaid,
    activeIsas: DB.isas.length,
    repaymentCount: DB.repayments.length,
    usersActive: Object.keys(DB.profiles).length + DB.feedback.length
  });
});

// Profile Management
app.post('/api/profiles', (req, res) => {
  const { address, name, bio, skills, college } = req.body;
  if (!address) return res.status(400).json({ error: 'Missing wallet address' });

  DB.profiles[address] = { name, bio, skills, college, updatedAt: new Date() };
  saveDB();
  console.log(`[API] Saved profile metadata for: ${address}`);
  res.json({ success: true, profile: DB.profiles[address] });
});

app.get('/api/profiles/:address', (req, res) => {
  const profile = DB.profiles[req.params.address];
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(profile);
});

// Create ISA
app.post('/api/isas', (req, res) => {
  const { id, earner, fundingTarget, incomeShare, duration, cap, txHash, metadata } = req.body;
  
  const newIsa = {
    id,
    earner,
    fundingTarget: Number(fundingTarget),
    raised: 0,
    incomeShare: Number(incomeShare),
    duration: Number(duration),
    cap: Number(cap),
    txHash,
    status: 'Funding',
    metadata: metadata || {},
    createdAt: new Date()
  };

  DB.isas.push(newIsa);
  saveDB();
  console.log(`[API] Stored ISA #${id} proposed by ${earner}`);
  res.json({ success: true, isa: newIsa });
});

app.get('/api/isas', (req, res) => {
  res.json(DB.isas);
});

// Submit Investment
app.post('/api/invest', (req, res) => {
  const { isaId, amount, investor } = req.body;
  
  const isa = DB.isas.find(i => Number(i.id) === Number(isaId));
  if (!isa) return res.status(404).json({ error: 'ISA not found' });

  isa.raised = (isa.raised || 0) + Number(amount);
  if (isa.raised >= isa.fundingTarget) {
    isa.status = 'Funded';
  }

  saveDB();
  console.log(`[API] Investor ${investor} funded $${amount} to ISA #${isaId}`);
  res.json({ success: true, isa });
});

// Submit Repayment
app.post('/api/repayments', (req, res) => {
  const { isaId, amount, payer, txHash } = req.body;
  
  const payment = {
    isaId,
    amount: Number(amount),
    payer,
    txHash,
    timestamp: new Date()
  };

  DB.repayments.push(payment);
  saveDB();
  console.log(`[API] Repayment of $${amount} logged for ISA #${isaId}`);
  res.json({ success: true, payment });
});

// Upload proof
app.post('/api/proofs', (req, res) => {
  const { isaId, income, docUrl } = req.body;
  
  const proof = {
    isaId,
    income: Number(income),
    docUrl,
    verified: true, // Auto-approve for MVP testing simulation
    timestamp: new Date()
  };

  DB.proofs.push(proof);
  saveDB();
  res.json({ success: true, proof });
});

// Collect User Feedback
app.post('/api/feedback', (req, res) => {
  const { address, role, usability, comments } = req.body;
  
  const item = {
    address,
    role: role || "Tester",
    usability: Number(usability),
    comments,
    submittedAt: new Date()
  };

  DB.feedback.push(item);
  saveDB();
  console.log(`[API] Feedback logged from: ${address}`);
  res.json({ success: true, feedback: item });
});

app.get('/api/feedback', (req, res) => {
  res.json(DB.feedback);
});

app.listen(PORT, () => {
  console.log(`[Server] SkillFi API running on http://localhost:${PORT}`);
});
