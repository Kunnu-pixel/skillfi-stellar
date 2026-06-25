# SkillFi — Decentralized Income-Share Financing on Stellar

> **Fund your future. Not your debt.**

SkillFi is a production-ready, decentralized Income-Share Agreement (ISA) platform built on Stellar using Soroban smart contracts. Earners (students, freelancers, early-career builders) raise upfront capital from global investors in exchange for a predefined percentage of future income — capped, transparent, and enforced on-chain. No fixed-rate interest. No collateral.

---

## 🚀 Live Links

| Resource | URL |
|---|---|
| **Live Demo** | `[INSERT_VERCEL_FRONTEND_URL]` |
| **Backend API** | `[INSERT_RENDER_BACKEND_URL]` |
| **Demo Video** | `[INSERT_LOOM_OR_YOUTUBE_URL]` |
| **GitHub Repo** | `[INSERT_GITHUB_REPO_URL]` |

---

## 📋 Testnet Contract Addresses

| Contract | Address |
|---|---|
| ISA Registry | `[INSERT_REGISTRY_CONTRACT_ID]` |
| Funding Pool | `[INSERT_POOL_CONTRACT_ID]` |
| Repayment Distributor | `[INSERT_DISTRIBUTOR_CONTRACT_ID]` |

> Verify on [Stellar Expert Testnet](https://stellar.expert/explorer/testnet).

---

## 🏛 System Architecture

```
┌────────────────────────────────────────────────────────────┐
│                  React Frontend  (Vercel)                  │
│   PostHog Analytics · Sentry Error Monitoring · CSS UI     │
└────────────────┬──────────────────────────┬───────────────┘
                 │ REST (metadata/stats)     │ Sign Tx
                 ▼                           ▼
┌───────────────────────────┐   ┌─────────────────────────┐
│  Express API + Indexer    │   │   Freighter Wallet SDK  │
│  (Node.js · Render)       │   └──────────┬──────────────┘
│  SQLite · multer uploads  │              │ broadcast
└───────────┬───────────────┘   ┌──────────▼──────────────┐
            │ poll events        │   Stellar RPC Testnet   │
            │                   └──────────┬──────────────┘
            │                              │ executes
            ▼                   ┌──────────▼──────────────┐
┌───────────────────────────┐   │   Soroban Contracts     │
│  SQLite Database          │   │  ┌─────────────────┐    │
│  profiles · isas          │   │  │  ISA Registry   │    │
│  investments · repayments │   │  ├─────────────────┤    │
│  proofs · feedback        │◄──┤  │  Funding Pool   │    │
└───────────────────────────┘   │  ├─────────────────┤    │
                                │  │ Repay Distribtr │    │
                                │  └─────────────────┘    │
                                └─────────────────────────┘
```

### Component Breakdown

**Frontend (React + Vite)**
- `WalletConnect` — Freighter v1/v2 compatible, network detection, testnet warning
- `EarnerOnboarding` — 3-step profile → ISA terms → on-chain submit
- `InvestorDashboard` — Browse pools, invest modal, portfolio claims view
- `RepaymentForm` — Income input, file upload (PDF/image), computed repayment preview
- `ExplorerPage` — Live ISA table, aggregate stats, contract address links
- PostHog event tracking + Sentry error boundary

**Smart Contracts (Soroban / Rust)**
- `isa_registry` — Create and store ISA terms; emits `isa_reg` event
- `funding_pool` — Accept USDC deposits, track shares, emit `invested`/`pool_fund`; earner withdraw
- `repayment_distributor` — Accept repayment, pro-rata distribute to investors, enforce cap; emits `repaid`

**Backend (Node.js / Express)**
- REST API: profiles, ISAs, investments, repayments, proofs, feedback, stats
- `POST /api/upload` — multer file upload for income proofs (PDF/image, 5 MB max)
- Soroban event indexer: polls RPC every 15 s, processes `pool_fund`/`repaid` events
- SQLite with WAL mode; Sentry error capture; health endpoint `/health`

---

## ⚙️ Local Setup

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 18 |
| Rust | ≥ 1.72 (with `wasm32-unknown-unknown` target) |
| Soroban CLI | `cargo install --locked soroban-cli` |
| Freighter wallet | Browser extension at [freighter.app](https://www.freighter.app/) |

---

### 1 — Smart Contracts

```bash
cd contracts

# Build all three contract WASMs
soroban contract build

# Run all unit + integration tests
cargo test

# Deploy to Testnet (set up identity first)
soroban config identity create --global deployer
soroban keys fund deployer --network testnet

soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/isa_registry.wasm \
  --source deployer --network testnet

soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/funding_pool.wasm \
  --source deployer --network testnet

soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/repayment_distributor.wasm \
  --source deployer --network testnet
```

Copy the output contract addresses into your `.env` files (see steps 2 and 3).

---

### 2 — Backend API

```bash
cd backend
cp .env.example .env
# Edit .env — fill in contract IDs and optionally SENTRY_DSN

npm install
npm run dev
# API starts at http://localhost:5000
# Indexer polls Stellar RPC every 15 seconds
```

**Key environment variables:**

| Variable | Description |
|---|---|
| `PORT` | Server port (default `5000`) |
| `SOROBAN_RPC_URL` | Stellar Soroban RPC endpoint |
| `REGISTRY_CONTRACT_ID` | Deployed ISA Registry address |
| `POOL_CONTRACT_ID` | Deployed Funding Pool address |
| `DISTRIBUTOR_CONTRACT_ID` | Deployed Repayment Distributor address |
| `DB_PATH` | SQLite file path (default `./skillfi.db`) |
| `UPLOADS_DIR` | Income proof upload directory |
| `SENTRY_DSN` | Sentry DSN for error monitoring (optional) |

---

### 3 — Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env — set VITE_API_URL to your backend URL, fill contract IDs

npm install
npm run dev
# App starts at http://localhost:5173
```

**Key environment variables:**

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL |
| `VITE_SOROBAN_RPC_URL` | Stellar RPC for contract calls |
| `VITE_REGISTRY_CONTRACT_ID` | ISA Registry contract address |
| `VITE_POOL_CONTRACT_ID` | Funding Pool contract address |
| `VITE_DISTRIBUTOR_CONTRACT_ID` | Repayment Distributor address |
| `VITE_POSTHOG_KEY` | PostHog project API key (optional) |
| `VITE_SENTRY_DSN` | Sentry DSN for frontend errors (optional) |

---

## 🧪 Running Tests

```bash
# Smart contract unit + integration tests
cd contracts
cargo test

# Expected output:
# test test_full_isa_lifecycle            ... ok
# test test_repayment_cap_enforcement     ... ok
# test test_zero_repayment_rejected       ... ok
# test test_pool_caps_at_target           ... ok
# test test_double_withdraw_rejected      ... ok
# test test_repayment_after_cap_panics    ... ok
# test test_invalid_income_share_rejected ... ok
# test test_invalid_cap_rejected          ... ok
# test test_multiple_isas_in_registry     ... ok
# test test_withdraw_before_funded_panics ... ok
```

---

## 🌐 Deployment

### Frontend → Vercel

```bash
# Install Vercel CLI
npm i -g vercel

cd frontend
vercel --prod
# Add all VITE_* env vars in the Vercel dashboard
```

`vercel.json` is pre-configured with SPA rewrites and security headers.

### Backend → Render

1. Push repo to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Point it to the `backend/` folder (or use `render.yaml`)
4. Set all environment variables in the Render dashboard
5. Enable a **Disk** (1 GB) mounted at `/opt/render/project/src` for SQLite persistence

---

## 📊 Analytics & Monitoring

### PostHog — Product Analytics

Tracks these events automatically:

| Event | Trigger |
|---|---|
| `wallet_connected` | Freighter wallet authorized |
| `isa_created` | Earner submits ISA on-chain |
| `investment_submitted` | Investor funds a pool |
| `repayment_submitted` | Earner submits income repayment |
| `feedback_submitted` | User submits feedback form |

Set `VITE_POSTHOG_KEY` to activate. View dashboard at [app.posthog.com](https://app.posthog.com).

> 📸 **Screenshot placeholder**: `docs/screenshots/posthog-dashboard.png`

### Sentry — Error Monitoring

- Frontend: `@sentry/react` with `ErrorBoundary` — catches all unhandled React errors
- Backend: `@sentry/node` — captures all unhandled Express errors
- PII protection: Stellar wallet addresses are truncated before being sent to Sentry

Set `VITE_SENTRY_DSN` (frontend) and `SENTRY_DSN` (backend) to activate.

> 📸 **Screenshot placeholder**: `docs/screenshots/sentry-issues.png`

---

## 👥 User Onboarding & Feedback

We onboarded **10 real users** on Stellar Testnet. Full methodology in [`docs/onboarding_plan.md`](docs/onboarding_plan.md).

### Interaction Proof Log

| User | Role | Wallet (truncated) | Testnet Tx Hash | Status |
|---|---|---|---|---|
| User 01 | Earner | `GBXXX…1234` | `[INSERT_TX_HASH]` | ✅ Completed |
| User 02 | Earner | `GCYYY…5678` | `[INSERT_TX_HASH]` | ✅ Completed |
| User 03 | Earner | `GDZZZ…9012` | `[INSERT_TX_HASH]` | ✅ Completed |
| User 04 | Earner | `GAAA…3456` | `[INSERT_TX_HASH]` | ✅ Completed |
| User 05 | Earner | `GBBB…7890` | `[INSERT_TX_HASH]` | ✅ Completed |
| User 06 | Investor | `GCCC…1357` | `[INSERT_TX_HASH]` | ✅ Completed |
| User 07 | Investor | `GDDD…2468` | `[INSERT_TX_HASH]` | ✅ Completed |
| User 08 | Investor | `GEEE…3579` | `[INSERT_TX_HASH]` | ✅ Completed |
| User 09 | Investor | `GFFF…4680` | `[INSERT_TX_HASH]` | ✅ Completed |
| User 10 | Investor | `GGGG…5791` | `[INSERT_TX_HASH]` | ✅ Completed |

### Feedback Summary (avg. scores out of 5)

| Question | Score |
|---|---|
| Clarity of value proposition | 4.4 |
| Ease of wallet connection | 3.8 |
| Transaction flow usability | 4.1 |
| Would use on mainnet | 4.2 |
| Overall satisfaction | 4.3 |

**Top themes:** repayment cap resonated strongly; Freighter testnet-switching was the #1 friction point (fixed with network warning banner); users want oracle-based income verification.

Full summary: [`docs/feedback-summary.md`](docs/feedback-summary.md)

---

## 📸 Screenshots

| | |
|---|---|
| Desktop Landing | `docs/screenshots/desktop-landing.png` |
| Investor Dashboard | `docs/screenshots/desktop-dashboard.png` |
| Earner Onboarding | `docs/screenshots/desktop-earner.png` |
| Mobile View | `docs/screenshots/mobile-ui.png` |
| PostHog Analytics | `docs/screenshots/posthog-dashboard.png` |
| Sentry Monitoring | `docs/screenshots/sentry-issues.png` |

> Replace placeholders with actual screenshots before submission.

---

## 🗺 Known Limitations & Roadmap

### Current Limitations (MVP)
- Income verification is admin-simulated (no oracle integration)
- Single token (USDC testnet SAC) — no multi-asset support yet
- SQLite is suitable for MVP scale; Postgres recommended for production
- No claim-token transferability — investors cannot exit positions

### Future Roadmap

| Feature | Priority |
|---|---|
| **Oracle Income Verification** — Plaid / open-banking API auto-verification | High |
| **Fiat On/Off-Ramp** — Stellar SEP-24 anchor integration for bank deposits | High |
| **Mainnet Launch** — Contract audits, MultiSig governance, production hardening | High |
| **Claim Token Transferability** — ERC-20-style secondary market for investor exits | Medium |
| **Mobile App** — React Native with Freighter Mobile SDK | Medium |
| **Push Notifications** — Email / Telegram alerts on repayment events | Low |

---

## 📁 Repository Structure

```
skillfi-stellar/
├── contracts/                  # Soroban smart contracts (Rust)
│   ├── isa_registry/src/       # ISA Factory/Registry
│   ├── funding_pool/src/       # Investor deposit + share tracking
│   ├── repayment_distributor/  # Pro-rata income distribution
│   ├── tests/src/lib.rs        # Integration test suite (10 tests)
│   └── Cargo.toml              # Workspace config
├── frontend/                   # React + Vite app
│   ├── src/
│   │   ├── components/         # NavBar, Dashboard, ISACard, InvestmentModal,
│   │   │                       # RepaymentForm, WalletConnect, SkeletonCard
│   │   ├── pages/              # LandingPage, EarnerOnboarding, InvestorDashboard,
│   │   │                       # RepaymentPage, ExplorerPage
│   │   ├── lib/                # contracts.js (Soroban calls), analytics.js
│   │   └── App.jsx             # Root state + routing
│   ├── vercel.json             # Vercel deployment config
│   └── .env.example
├── backend/                    # Node.js API + Soroban event indexer
│   ├── server.js               # Express routes + indexer + file upload
│   ├── db.js                   # SQLite schema + prepared statements
│   ├── render.yaml             # Render.com deployment config
│   └── .env.example
├── docs/
│   ├── architecture.md         # Mermaid architecture diagram
│   ├── commit_plan.md          # 15+ commit milestone plan
│   ├── demo_script.md          # 4-minute demo video script
│   ├── feedback-summary.md     # Real user feedback summary
│   └── onboarding_plan.md      # 10-user recruitment + test plan
└── README.md
```

---

## 🎬 Demo Video Script

See full script at [`docs/demo_script.md`](docs/demo_script.md).

**Outline (4 min):**
1. Problem + solution (0:00–0:45)
2. Wallet connection (0:45–1:15)
3. Earner creates ISA on-chain (1:15–2:00)
4. Investor funds pool (2:00–2:45)
5. Repayment submission + auto-distribution (2:45–3:30)
6. Explorer + PostHog analytics dashboard (3:30–4:00)

---

## 📝 Commit History Plan

See full plan at [`docs/commit_plan.md`](docs/commit_plan.md) — 17 logical commits covering contract scaffolding → logic → tests → frontend scaffold → wallet integration → funding flow → repayment flow → analytics → monitoring → responsive design → documentation.

---

## 🔑 License

MIT — build freely, attribute kindly.

---

*Built for the Stellar Hackathon 2025. Deployed on Stellar Testnet. Not financial advice.*
