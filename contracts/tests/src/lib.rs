#![cfg(test)]

use soroban_sdk::{
    testutils::Address as _,
    token, Address, Env, Vec,
};

use isa_registry::{ISARegistry, ISARegistryClient};
use funding_pool::{FundingPool, FundingPoolClient};
use repayment_distributor::{RepaymentDistributor, RepaymentDistributorClient};

// ── Shared test environment ───────────────────────────────────────────────

struct TestSetup {
    env: Env,
    admin: Address,
    earner: Address,
    investor_1: Address,
    investor_2: Address,
    token_id: Address,
    token_sac: token::StellarAssetClient,
    token_client: token::Client,
    registry_client: ISARegistryClient,
}

impl TestSetup {
    fn new() -> Self {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let earner = Address::generate(&env);
        let investor_1 = Address::generate(&env);
        let investor_2 = Address::generate(&env);

        // Deploy a mock SAC-wrapped USDC token
        let token_id = env.register_stellar_asset_contract(admin.clone());
        let token_sac = token::StellarAssetClient::new(&env, &token_id);
        let token_client = token::Client::new(&env, &token_id);

        // Fund investors
        token_sac.mint(&investor_1, &10_000i128);
        token_sac.mint(&investor_2, &10_000i128);

        // Deploy and initialise ISA Registry
        let registry_id = env.register_contract(None, ISARegistry);
        let registry_client = ISARegistryClient::new(&env, &registry_id);
        registry_client.initialize(&admin);

        TestSetup {
            env,
            admin,
            earner,
            investor_1,
            investor_2,
            token_id,
            token_sac,
            token_client,
            registry_client,
        }
    }

    /// Deploy a Funding Pool for a given ISA target.
    /// Returns (client, pool_address) — the address is captured before the
    /// client's borrow would make it unavailable.
    fn deploy_pool(&self, target: i128, isa_id: u64) -> (FundingPoolClient, Address) {
        let pool_id = self.env.register_contract(None, FundingPool);
        let addr = pool_id.clone();
        let client = FundingPoolClient::new(&self.env, &pool_id);
        client.initialize(&self.token_id, &target, &self.earner, &isa_id);
        (client, addr)
    }

    /// Deploy a Repayment Distributor linked to an existing pool address.
    fn deploy_distributor(&self, pool_addr: &Address, cap: i128) -> RepaymentDistributorClient {
        let dist_id = self.env.register_contract(None, RepaymentDistributor);
        let client = RepaymentDistributorClient::new(&self.env, &dist_id);
        client.initialize(
            &self.token_id,
            &self.admin,
            pool_addr,
            &cap,
            &self.earner,
        );
        client
    }
}

// ── Test 1: Full happy-path — create ISA → fund → withdraw → repay ───────

#[test]
fn test_full_isa_lifecycle() {
    let s = TestSetup::new();
    let env = &s.env;

    // 1. Create ISA: 1,000 USDC, 10% income share, 12 months, 1.5x cap (= 1,500 max)
    let isa_id = s.registry_client.create_isa(
        &s.earner,
        &1_000i128,
        &1_000u32,  // 1000 bp = 10%
        &12u32,
        &15_000u32, // 15000 bp = 1.5x
    );
    assert_eq!(isa_id, 1);

    let isa = s.registry_client.get_isa(&1);
    assert_eq!(isa.earner, s.earner);
    assert!(!isa.funded);

    // 2. Set up Funding Pool
    let (pool, pool_addr) = s.deploy_pool(1_000i128, isa_id);

    // Investor 1 deposits 600 USDC (60%), Investor 2 deposits 400 USDC (40%)
    pool.invest(&s.investor_1, &600i128);
    pool.invest(&s.investor_2, &400i128);

    assert!(pool.is_funded());
    assert_eq!(pool.get_total_raised(), 1_000i128);
    assert_eq!(pool.get_share(&s.investor_1), 600i128);
    assert_eq!(pool.get_share(&s.investor_2), 400i128);

    // 3. Earner withdraws capital
    pool.withdraw();
    assert_eq!(s.token_client.balance(&s.earner), 1_000i128);

    // 4. Deploy Repayment Distributor (cap = 1,500)
    let distributor = s.deploy_distributor(&pool_addr, 1_500i128);

    // 5. Earner earns $3,000/mo → owes 10% = $300
    //    Investor 1 (60%): $180  |  Investor 2 (40%): $120
    s.token_sac.mint(&s.earner, &500i128);

    let mut investors = Vec::new(env);
    investors.push_back(s.investor_1.clone());
    investors.push_back(s.investor_2.clone());

    let captured = distributor.distribute_repayment(&s.earner, &300i128, &investors);
    assert_eq!(captured, 300i128);

    // Investor 1: 10,000 − 600 (invested) + 180 (payout) = 9,580
    // Investor 2: 10,000 − 400 (invested) + 120 (payout) = 9,720
    assert_eq!(s.token_client.balance(&s.investor_1), 9_580i128);
    assert_eq!(s.token_client.balance(&s.investor_2), 9_720i128);

    assert_eq!(distributor.get_total_repaid(), 300i128);
    assert!(!distributor.is_settled());
}

// ── Test 2: Repayment cap enforcement ────────────────────────────────────

#[test]
fn test_repayment_cap_enforcement() {
    let s = TestSetup::new();
    let env = &s.env;

    let isa_id = s.registry_client.create_isa(
        &s.earner, &1_000i128, &1_000u32, &12u32, &15_000u32,
    );
    let (pool, pool_addr) = s.deploy_pool(1_000i128, isa_id);
    pool.invest(&s.investor_1, &1_000i128);
    pool.withdraw();

    let distributor = s.deploy_distributor(&pool_addr, 1_500i128);
    s.token_sac.mint(&s.earner, &2_000i128);

    let mut investors = Vec::new(env);
    investors.push_back(s.investor_1.clone());

    // First repayment: $1,000 (within cap of $1,500)
    let first = distributor.distribute_repayment(&s.earner, &1_000i128, &investors);
    assert_eq!(first, 1_000i128);
    assert_eq!(distributor.get_total_repaid(), 1_000i128);
    assert!(!distributor.is_settled());

    // Second repayment: $800, but only $500 remains before cap
    let second = distributor.distribute_repayment(&s.earner, &800i128, &investors);
    assert_eq!(second, 500i128);
    assert_eq!(distributor.get_total_repaid(), 1_500i128);
    assert!(distributor.is_settled());
}

// ── Test 3: Zero repayment rejected ──────────────────────────────────────

#[test]
#[should_panic(expected = "Repayment amount must be positive")]
fn test_zero_repayment_rejected() {
    let s = TestSetup::new();
    let env = &s.env;

    let isa_id = s.registry_client.create_isa(
        &s.earner, &1_000i128, &500u32, &12u32, &15_000u32,
    );
    let (pool, pool_addr) = s.deploy_pool(1_000i128, isa_id);
    pool.invest(&s.investor_1, &1_000i128);
    pool.withdraw();

    let distributor = s.deploy_distributor(&pool_addr, 1_500i128);
    s.token_sac.mint(&s.earner, &100i128);

    let mut investors = Vec::new(env);
    investors.push_back(s.investor_1.clone());

    // Should panic
    distributor.distribute_repayment(&s.earner, &0i128, &investors);
}

// ── Test 4: Pool caps at target (over-investment) ─────────────────────────

#[test]
fn test_pool_caps_at_target() {
    let s = TestSetup::new();

    let isa_id = s.registry_client.create_isa(
        &s.earner, &1_000i128, &500u32, &24u32, &15_000u32,
    );
    let (pool, _) = s.deploy_pool(1_000i128, isa_id);

    // Attempt to invest $1,200 into a $1,000-target pool — excess is silently clipped
    pool.invest(&s.investor_1, &1_200i128);

    assert_eq!(pool.get_total_raised(), 1_000i128);
    assert_eq!(pool.get_share(&s.investor_1), 1_000i128);
    assert!(pool.is_funded());

    // Investor was charged exactly $1,000, not $1,200
    assert_eq!(s.token_client.balance(&s.investor_1), 9_000i128);
}

// ── Test 5: Double-withdraw blocked ──────────────────────────────────────

#[test]
#[should_panic(expected = "Funds already withdrawn")]
fn test_double_withdraw_rejected() {
    let s = TestSetup::new();

    let isa_id = s.registry_client.create_isa(
        &s.earner, &500i128, &500u32, &12u32, &15_000u32,
    );
    let (pool, _) = s.deploy_pool(500i128, isa_id);
    pool.invest(&s.investor_1, &500i128);
    pool.withdraw();
    pool.withdraw(); // Should panic
}

// ── Test 6: Early-payoff — distribute after cap reached panics ───────────

#[test]
#[should_panic(expected = "Repayment cap already reached")]
fn test_repayment_after_cap_panics() {
    let s = TestSetup::new();
    let env = &s.env;

    let isa_id = s.registry_client.create_isa(
        &s.earner, &500i128, &500u32, &12u32, &15_000u32,
    );
    let (pool, pool_addr) = s.deploy_pool(500i128, isa_id);
    pool.invest(&s.investor_1, &500i128);
    pool.withdraw();

    // Cap = 500 * 1.5 = 750
    let distributor = s.deploy_distributor(&pool_addr, 750i128);
    s.token_sac.mint(&s.earner, &2_000i128);

    let mut investors = Vec::new(env);
    investors.push_back(s.investor_1.clone());

    // First payment settles the ISA exactly
    distributor.distribute_repayment(&s.earner, &750i128, &investors);
    assert!(distributor.is_settled());

    // Second payment should panic — ISA fully settled
    distributor.distribute_repayment(&s.earner, &100i128, &investors);
}

// ── Test 7: ISA registry — invalid income share rejected ─────────────────

#[test]
#[should_panic(expected = "Income share must be between 1 and 10000 basis points")]
fn test_invalid_income_share_rejected() {
    let s = TestSetup::new();
    s.registry_client.create_isa(&s.earner, &1_000i128, &0u32, &12u32, &15_000u32);
}

// ── Test 8: ISA registry — cap below 1.0x rejected ───────────────────────

#[test]
#[should_panic(expected = "Repayment cap must be at least 1.0x")]
fn test_invalid_cap_rejected() {
    let s = TestSetup::new();
    s.registry_client.create_isa(&s.earner, &1_000i128, &500u32, &12u32, &5_000u32);
}

// ── Test 9: Multiple ISAs share same registry ─────────────────────────────

#[test]
fn test_multiple_isas_in_registry() {
    let s = TestSetup::new();
    let earner_2 = Address::generate(&s.env);

    let id1 = s.registry_client.create_isa(&s.earner, &1_000i128, &500u32, &12u32, &15_000u32);
    let id2 = s.registry_client.create_isa(&earner_2, &2_000i128, &700u32, &24u32, &20_000u32);

    assert_eq!(id1, 1);
    assert_eq!(id2, 2);

    let isa1 = s.registry_client.get_isa(&1);
    let isa2 = s.registry_client.get_isa(&2);

    assert_eq!(isa1.earner, s.earner);
    assert_eq!(isa1.funding_target, 1_000i128);
    assert_eq!(isa2.earner, earner_2);
    assert_eq!(isa2.funding_target, 2_000i128);
    assert_ne!(isa1.id, isa2.id);
}

// ── Test 10: Withdraw before fully funded panics ──────────────────────────

#[test]
#[should_panic(expected = "Not fully funded yet")]
fn test_withdraw_before_funded_panics() {
    let s = TestSetup::new();

    let isa_id = s.registry_client.create_isa(
        &s.earner, &1_000i128, &500u32, &12u32, &15_000u32,
    );
    let (pool, _) = s.deploy_pool(1_000i128, isa_id);

    // Only partially funded — earner tries to withdraw early
    pool.invest(&s.investor_1, &400i128);
    pool.withdraw(); // Should panic
}
