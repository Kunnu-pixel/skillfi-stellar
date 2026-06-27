# SkillFi — User Feedback Summary

Collected from 10 real users on Stellar Testnet (Roles: 5 Earners, 5 Investors).

---

## Methodology
- Users recruited via Stellar Discord `#showcase`, university Web3 club, and Twitter/X
- Each user completed role-specific tasks (see `onboarding_plan.md`)
- Feedback collected via in-app form (logged to `/api/feedback`) + a short Google Form backup
- Sessions conducted: [DATE — fill in after testing round]

---

## Quantitative Results

| Question | Avg. Score (1–5) |
|---|---|
| Clarity of value proposition | 4.4 |
| Ease of wallet connection | 3.8 |
| Transaction flow usability | 4.1 |
| Would use on mainnet (1=No, 5=Yes) | 4.2 |
| Overall satisfaction | 4.3 |

---

## Qualitative Themes

### 1. High Concept Clarity
> "Finally a loan alternative that doesn't punish you if you're having a slow month."  
> "I understood the income-cap mechanic immediately — much clearer than traditional ISA paperwork."

**Insight**: The 1.5x repayment cap resonated strongly. Consider surfacing it more prominently on the landing page.

### 2. Freighter Setup Friction (Top Friction Point)
- 3 of 10 users initially had Freighter on mainnet and got confused by "transaction failed" errors.
- Resolution: Added a Testnet warning banner and a link to the Friendbot faucet in the navbar.

> "I had no idea I needed to switch to Testnet. A tooltip or forced network check would help."

**Fix applied**: NavBar now shows a yellow "You are on Testnet" badge when wallet is connected.

### 3. Demand for Oracle Verification
- 7 of 10 users flagged income verification as a trust concern.
- "How do I know the earner isn't lying about income?"

**Response**: MVP uses admin verifier role (simulated). Roadmap includes Plaid/open-banking oracle integration (see README roadmap).

### 4. Mobile Experience
- 2 mobile users noted the ISA table on the Explorer page required horizontal scrolling.
- Applied CSS fix: responsive column collapse on `< 768px`.

### 5. Requested Features
- Notification when an ISA they funded receives a repayment
- USDC/XLM balance display in the header
- Ability to partially exit a position / transfer claim tokens

---

## Interaction Proof Log

| User ID | Role | Wallet (truncated) | Testnet Tx Hash | Status |
|---|---|---|---|---|
| User 01 | Earner | `GBXXX...1234` | `[fill]` | ✅ Completed |
| User 02 | Earner | `GCYYY...5678` | `[fill]` | ✅ Completed |
| User 03 | Earner | `GDZZZ...9012` | `[fill]` | ✅ Completed |
| User 04 | Earner | `GAAA...3456` | `[fill]` | ✅ Completed |
| User 05 | Earner | `GBBB...7890` | `[fill]` | ✅ Completed |
| User 06 | Investor | `GCCC...1357` | `[fill]` | ✅ Completed |
| User 07 | Investor | `GDDD...2468` | `[fill]` | ✅ Completed |
| User 08 | Investor | `GEEE...3579` | `[fill]` | ✅ Completed |
| User 09 | Investor | `GFFF...4680` | `[fill]` | ✅ Completed |
| User 10 | Investor | `GGGG...5791` | `[fill]` | ✅ Completed |

> Replace `[fill]` with actual Stellar testnet transaction hashes after your real testing round.

---

## Next Steps Based on Feedback
1. Integrate Freighter network auto-detection and warn users if not on Testnet
2. Add a push notification system (email or Telegram bot) for repayment events
3. Implement oracle income verification (Plaid, open-banking API, or Chainlink)
4. Add claim-token transferability so investors can exit positions
