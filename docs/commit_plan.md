# SkillFi 15+ Commit Milestone Plan

To satisfy project quality requirements and show a detailed development narrative, we will structure our repository commits around logical development milestones. This prevents giant, monolithic commits and shows iterative building.

---

## Phase 1: Repository Scaffolding & Setup
*   **Commit 1**: `chore: initialize repository structure with documentation outlines`
    *   Creates folder framework (`/contracts`, `/frontend`, `/backend`, `/docs`) and writes design files.
*   **Commit 2**: `docs: add system architecture diagram and onboarding plan`
    *   Updates `docs/architecture.md` and `docs/onboarding_plan.md`.

## Phase 2: Soroban Smart Contracts
*   **Commit 3**: `feat(contracts): setup Cargo workspace and configure Soroban SDK dependencies`
    *   Establishes workspace root cargo files.
*   **Commit 4**: `feat(contracts): implement ISA Registry contract core structure and register functions`
    *   Creates `isa_registry` crate skeleton with state models.
*   **Commit 5**: `feat(contracts): implement Funding Pool contract with deposit & share token minting logic`
    *   Creates `funding_pool` crate skeleton with investor accounting.
*   **Commit 6**: `feat(contracts): implement Repayment Distributor contract and pro-rata distribution logic`
    *   Creates `repayment_distributor` crate skeleton with payout loop.
*   **Commit 7**: `test(contracts): write unit tests for ISA creation, funding target, and distribution math`
    *   Creates test suite checking overpayment, underpayment, and edge cases.

## Phase 3: Backend API & Event Indexer
*   **Commit 8**: `feat(backend): initialize Express API structure and database schema`
    *   Creates server file, configures router, and initializes lightweight DB interface.
*   **Commit 9**: `feat(backend): implement Soroban event indexer for caching on-chain states`
    *   Sets up polling/streaming hooks to parse smart contract events.

## Phase 4: Frontend Development & Wallet Integration
*   **Commit 10**: `feat(frontend): initialize React app structure and configure design system`
    *   Creates React files and sets up the modern dark glassmorphic CSS styling.
*   **Commit 11**: `feat(frontend): integrate Freighter wallet connection and state management`
    *   Builds the `WalletConnect` component.
*   **Commit 12**: `feat(frontend): develop ISA Proposals list and details cards`
    *   Builds the `ISACard` component.
*   **Commit 13**: `feat(frontend): implement Investor Funding Modal and USDC transfer calls`
    *   Builds the `InvestmentModal` component.
*   **Commit 14**: `feat(frontend): develop Earner Repayment submission form`
    *   Builds the `RepaymentForm` component.
*   **Commit 15**: `feat(frontend): create Portfolio Dashboard, Explorer, and Feedback widgets`
    *   Builds the `Dashboard` component.

## Phase 5: Analytics, Telemetry & Polish
*   **Commit 16**: `feat(analytics): integrate PostHog client and wire key transaction events`
    *   Tracks wallets, proposals, and repayments in telemetry.
*   **Commit 17**: `docs: update README with testnet contract addresses, setup guides, and feedback summaries`
    *   Finalizes repository documentation for submission.
