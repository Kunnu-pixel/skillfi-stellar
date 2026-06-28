require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const Sentry = require('@sentry/node');
const { SorobanRpc } = require('stellar-sdk');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// NOTE: proof uploads are stored locally under uploadsDir for MVP/testing.
// Frontend expects POST /api/upload returning { url }.
const multer = require('multer');
const { randomUUID } = require('crypto');
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (_req, file, cb) {
    const safeExt = (file.originalname.split('.').pop() || 'bin').toLowerCase();
    cb(null, `${Date.now()}-${randomUUID()}.${safeExt}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

app.use('/uploads', express.static(uploadsDir));


if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 1.0 });
}

app.use(cors());
app.use(express.json());

function mapIsa(row) {
  const raised = db.getInvestmentsByIsa.all(row.id).reduce((sum, current) => sum + Number(current.amount), 0);
  return {
    id: Number(row.id),
    earner: row.earner,
    fundingTarget: Number(row.funding_target),
    raised,
    incomeShare: Number(row.income_share),
    duration: Number(row.duration),
    cap: Number(row.cap),
    txHash: row.tx_hash,
    status: row.status,
    metadata: {
      name: row.metadata_name,
      bio: row.metadata_bio,
      college: row.metadata_college,
      skills: row.metadata_skills,
    },
    createdAt: row.created_at,
  };
}

function mapFeedback(row) {
  return {
    id: Number(row.id),
    address: row.address,
    role: row.role,
    usability: Number(row.usability),
    clarity: Number(row.clarity),
    comments: row.comments,
    submittedAt: row.submitted_at,
  };
}

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

      const response = await server.getEvents({
        startLedger: lastCheckedLedger,
        filters: [{ type: 'contract', topics: [['*']] }],
        limit: 50,
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
  }, 12000);
}

function processEvent(event) {
  // NOTE: This project currently uses only a lightweight DB mirror.
  // processEvent must be implemented to sync on-chain events to SQLite.
  //
  // Event format from stellar-sdk: { id, pagingToken?, source, type?, transactionHash?, ... }
  // With the current stub, the API remains write-only from REST.
  //
  // Implementers should map:
  // - isa_registry::create_isa → publish isa_reg → insert/update isas
  // - funding_pool::invest → publish invested/pool_fund → update investments + status
  // - repayment_distributor::distribute_repayment → publish repaid → update repayments
  // - repayment_distributor::submit_income_proof → publish proof_sub → insert proofs
  //
  // For now, intentionally no-op to avoid breaking existing behavior.
}


startIndexer();

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'skillfi-backend' });
});

app.get('/api/stats', (req, res) => {
  const stats = db.getStats.get();
  res.json({
    totalFunded: Number(stats.total_funded || 0),
    totalRepaid: Number(stats.total_repaid || 0),
    activeIsas: Number(stats.active_isas || 0),
    repaymentCount: Number(stats.repayment_count || 0),
    usersActive: Number(stats.users_active || 0),
  });
});

app.post('/api/profiles', (req, res) => {
  const { address, name, bio, skills, college } = req.body;
  if (!address) return res.status(400).json({ error: 'Missing wallet address' });

  db.upsertProfile.run({ address, name, bio, skills, college });
  const profile = db.getProfile.get(address);
  console.log(`[API] Saved profile metadata for: ${address}`);
  res.json({ success: true, profile });
});

app.get('/api/profiles/:address', (req, res) => {
  const profile = db.getProfile.get(req.params.address);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(profile);
});

app.post('/api/isas', (req, res) => {
  const { earner, fundingTarget, incomeShare, duration, cap, txHash, metadata } = req.body;

  const result = db.insertIsa.run({
    earner,
    funding_target: Number(fundingTarget),
    income_share: Number(incomeShare),
    duration: Number(duration),
    cap: Number(cap),
    tx_hash: txHash,
    status: 'Funding',
    metadata_name: metadata?.name || null,
    metadata_bio: metadata?.bio || null,
    metadata_college: metadata?.college || null,
    metadata_skills: metadata?.skills || null,
  });

  const isa = db.getIsaById.get(Number(result.lastInsertRowid));
  console.log(`[API] Stored ISA #${isa.id} proposed by ${earner}`);
  res.json({ success: true, isa: mapIsa(isa) });
});

app.get('/api/isas', (req, res) => {
  const rows = db.getAllIsas.all();
  res.json(rows.map(mapIsa));
});

app.post('/api/invest', (req, res) => {
  const { isaId, amount, investor } = req.body;

  const isa = db.getIsaById.get(Number(isaId));
  if (!isa) return res.status(404).json({ error: 'ISA not found' });

  const previousRaised = db.getInvestmentsByIsa.all(Number(isaId)).reduce((sum, current) => sum + Number(current.amount), 0);
  const raised = previousRaised + Number(amount);

  db.insertInvestment.run({ isa_id: Number(isaId), investor, amount: Number(amount), tx_hash: null });
  db.updateIsaStatus.run(raised >= Number(isa.funding_target) ? 'Funded' : 'Funding', Number(isaId));

  const refreshed = db.getIsaById.get(Number(isaId));
  console.log(`[API] Investor ${investor} funded $${amount} to ISA #${isaId}`);
  res.json({ success: true, isa: mapIsa(refreshed) });
});

app.post('/api/repayments', (req, res) => {
  const { isaId, amount, payer, proofUrl, txHash } = req.body;

  const payment = db.insertRepayment.run({
    isa_id: Number(isaId),
    amount: Number(amount),
    payer,
    proof_url: proofUrl || null,
    tx_hash: txHash,
  });

  res.json({
    success: true,
    payment: {
      id: payment.lastInsertRowid,
      isaId,
      amount: Number(amount),
      payer,
      proofUrl: proofUrl || null,
      txHash,
    },
  });
});


app.post('/api/upload', upload.single('proof'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Missing file field: proof' });
    // Frontend expects: { url }
    // Return an absolute URL so it works regardless of frontend base path.
    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ success: true, url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});


app.post('/api/proofs', (req, res) => {
  const { isaId, income, docUrl } = req.body;

  const proof = db.insertProof.run({ isa_id: Number(isaId), income: Number(income), doc_url: docUrl });
  res.json({ success: true, proof: { id: proof.lastInsertRowid, isaId, income: Number(income), docUrl } });
});


app.post('/api/feedback', (req, res) => {
  const { address, role, usability, comments } = req.body;

  const result = db.insertFeedback.run({ address, role: role || 'Tester', usability: Number(usability || 0), clarity: 0, comments });
  console.log(`[API] Feedback logged from: ${address}`);
  res.json({ success: true, feedback: { id: result.lastInsertRowid, address, role: role || 'Tester', usability: Number(usability || 0), comments } });
});

app.get('/api/feedback', (req, res) => {
  res.json(db.getAllFeedback.all().map(mapFeedback));
});

app.listen(PORT, () => {
  console.log(`[Server] SkillFi API running on http://localhost:${PORT}`);
});
