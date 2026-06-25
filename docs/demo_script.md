# SkillFi: Demo Video Script & Outline

This guide outlines a 3-6 minute pitch and product walkthrough for the SkillFi platform, optimized for hackathons or grant review processes.

---

## Video Metadata
*   **Target Duration**: 4 minutes (240 seconds)
*   **Format**: Screen capture (with picture-in-picture webcam) + voiceover
*   **Key Themes**: Financial inclusion, transparent yielding, frictionless Stellar rails.

---

## Chronological Walkthrough

### Part 1: The Problem & Solution (0:00 - 0:45)
*   **Visuals**: Title slide / Pitch Deck showing "The Education & Freelance Debt Trap" vs "SkillFi's Income Share Solution".
*   **Narration**: 
    > "Traditional student and freelance loans force young professionals into high, fixed-interest debt traps. If their income drops, they default. Investors, on the other hand, struggle to gain direct exposure to human capital. 
    > 
    > Meet SkillFi: a decentralized Income-Share Agreement platform built on Stellar. SkillFi allows earners to raise funding in exchange for a percentage of their future income, fully tracked and distributed on-chain using Soroban contracts."

### Part 2: Wallet Connection & Dashboard (0:45 - 1:15)
*   **Visuals**: Screen switches to the deployed frontend web app. Click the glowing **Connect Wallet** button in the header. Freighter wallet pops up, user enters password, and the dashboard transitions into a logged-in state.
*   **Narration**:
    > "Here is our landing page and main app interface. We are integrating Freighter wallet for seamless, non-custodial user onboarding. We authorize the connection, and immediately, the dashboard loads the user's active assets and role views."

### Part 3: Earner Flow - Creating an ISA (1:15 - 2:00)
*   **Visuals**: Click on **Create ISA Proposal**. Fill in the fields: *Goal (e.g. 1,000 USDC)*, *Income Share (5%)*, *Duration (12 Months)*, *Cap (1.5x)*. Click **Propose**. Freighter pops up, signing a transaction to the `isa_registry` contract. The UI shows a loading spinner, then a success checkmark, and a new ISA card appears under "Open Fundings".
*   **Narration**:
    > "As an Earner, I can propose an ISA with tailored parameters. When I submit, it interacts directly with our Soroban ISA Registry contract. Freighter registers the signature, and in seconds, our proposal is created on the Stellar testnet, ready for global investors."

### Part 4: Investor Flow - Funding & Claims (2:00 - 2:45)
*   **Visuals**: Switch view to the **Investor Dashboard**. Scroll to the newly created ISA. Click **Invest**. Input *500 USDC*. Click **Confirm Investment**. Sign transaction in Freighter. Show the progress bar incrementing, and the claim share balance updating in the "My Portfolio" list.
*   **Narration**:
    > "Investors can browse active requests and pool assets to support earners. By depositing USDC, they mint proportional claim tokens representing their share of that Earner's future repayments. The transaction is transparent, secure, and fast."

### Part 5: Repayment & Distribution (2:45 - 3:30)
*   **Visuals**: Log back in as the Earner. Go to **Submit Repayment**. Input monthly income *($2,000)*. The contract calculates the payment *($100)*. Click **Pay Repayment**. Sign with Freighter. Show the backend console or blockchain explorer showing the funds automatically routed to the investor's balance.
*   **Narration**:
    > "When the Earner makes a repayment, they submit the proof. The Repayment Distributor contract calculates the pro-rata distribution and executes the transfers to claim token holders. No manual split, no middleman fees, everything is fully automated on-chain."

### Part 6: Explorer, Analytics & Outro (3:30 - 4:00)
*   **Visuals**: Show the **Transparency Explorer** (list of total stats). Toggle to the PostHog or Google Analytics dashboard showing wallet connections and transactions.
*   **Narration**:
    > "Lastly, we have our transparency explorer showing total value locked and active repayment statistics. We've monitored user metrics via PostHog to validate and optimize user onboarding. 
    > SkillFi is redefining human capital financing. Thank you."
