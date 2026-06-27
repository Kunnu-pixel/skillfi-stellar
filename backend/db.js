/**
 * db.js — SQLite database layer (Node.js built-in node:sqlite)
 * All writes are synchronous for simplicity; suitable for MVP / hackathon scale.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'skillfi.db');
const db = new DatabaseSync(DB_PATH);

// ── Enable WAL mode for better concurrent read performance ─────────────────
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ── Schema migrations ──────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    address     TEXT PRIMARY KEY,
    name        TEXT,
    bio         TEXT,
    skills      TEXT,
    college     TEXT,
    updated_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS isas (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    earner          TEXT NOT NULL,
    funding_target  REAL NOT NULL,
    income_share    REAL NOT NULL,
    duration        INTEGER NOT NULL,
    cap             REAL NOT NULL,
    tx_hash         TEXT,
    status          TEXT DEFAULT 'Funding',
    metadata_name   TEXT,
    metadata_bio    TEXT,
    metadata_college TEXT,
    metadata_skills TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS investments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    isa_id      INTEGER NOT NULL,
    investor    TEXT NOT NULL,
    amount      REAL NOT NULL,
    tx_hash     TEXT,
    created_at  TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (isa_id) REFERENCES isas(id)
  );

  CREATE TABLE IF NOT EXISTS repayments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    isa_id      INTEGER NOT NULL,
    amount      REAL NOT NULL,
    payer       TEXT NOT NULL,
    proof_url   TEXT,
    tx_hash     TEXT,
    created_at  TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (isa_id) REFERENCES isas(id)
  );

  CREATE TABLE IF NOT EXISTS proofs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    isa_id      INTEGER NOT NULL,
    income      REAL,
    doc_url     TEXT,
    verified    INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    address     TEXT,
    role        TEXT,
    usability   INTEGER,
    clarity     INTEGER,
    comments    TEXT,
    submitted_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS indexer_state (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
`);

// ── Prepared statements ────────────────────────────────────────────────────
module.exports = {
  db,

  // Profiles
  upsertProfile: db.prepare(`
    INSERT INTO profiles (address, name, bio, skills, college, updated_at)
    VALUES (@address, @name, @bio, @skills, @college, datetime('now'))
    ON CONFLICT(address) DO UPDATE SET
      name = excluded.name, bio = excluded.bio,
      skills = excluded.skills, college = excluded.college,
      updated_at = excluded.updated_at
  `),
  getProfile: db.prepare('SELECT * FROM profiles WHERE address = ?'),

  // ISAs
  insertIsa: db.prepare(`
    INSERT INTO isas (earner, funding_target, income_share, duration, cap, tx_hash, status,
      metadata_name, metadata_bio, metadata_college, metadata_skills)
    VALUES (@earner, @funding_target, @income_share, @duration, @cap, @tx_hash, @status,
      @metadata_name, @metadata_bio, @metadata_college, @metadata_skills)
  `),
  getAllIsas: db.prepare('SELECT * FROM isas ORDER BY created_at DESC'),
  getIsaById: db.prepare('SELECT * FROM isas WHERE id = ?'),
  updateIsaStatus: db.prepare('UPDATE isas SET status = ? WHERE id = ?'),

  // Investments
  insertInvestment: db.prepare(`
    INSERT INTO investments (isa_id, investor, amount, tx_hash) VALUES (@isa_id, @investor, @amount, @tx_hash)
  `),
  getInvestmentsByIsa: db.prepare('SELECT * FROM investments WHERE isa_id = ?'),
  getInvestorsByIsa: db.prepare('SELECT investor as address, SUM(amount) as total FROM investments WHERE isa_id = ? GROUP BY investor'),
  getPortfolioByInvestor: db.prepare('SELECT i.*, isa.earner, isa.income_share FROM investments i JOIN isas isa ON i.isa_id = isa.id WHERE i.investor = ?'),

  // Repayments
  insertRepayment: db.prepare(`
    INSERT INTO repayments (isa_id, amount, payer, proof_url, tx_hash) VALUES (@isa_id, @amount, @payer, @proof_url, @tx_hash)
  `),
  getRepaymentsByIsa: db.prepare('SELECT * FROM repayments WHERE isa_id = ?'),

  // Proofs
  insertProof: db.prepare(`
    INSERT INTO proofs (isa_id, income, doc_url) VALUES (@isa_id, @income, @doc_url)
  `),

  // Feedback
  insertFeedback: db.prepare(`
    INSERT INTO feedback (address, role, usability, clarity, comments) VALUES (@address, @role, @usability, @clarity, @comments)
  `),
  getAllFeedback: db.prepare('SELECT * FROM feedback ORDER BY submitted_at DESC'),

  // Aggregate stats
  getStats: db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM isas) AS active_isas,
      (SELECT COALESCE(SUM(funding_target), 0) FROM isas WHERE status = 'Funded') AS total_funded,
      (SELECT COALESCE(SUM(amount), 0) FROM repayments) AS total_repaid,
      (SELECT COUNT(*) FROM repayments) AS repayment_count,
      (SELECT COUNT(DISTINCT address) FROM profiles) + (SELECT COUNT(DISTINCT investor) FROM investments) AS users_active
  `),

  // Indexer state
  getIndexerState: db.prepare('SELECT value FROM indexer_state WHERE key = ?'),
  setIndexerState: db.prepare(`
    INSERT INTO indexer_state (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `),
};
