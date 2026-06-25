#![cfg(test)]

use soroban_sdk::{
    testutils::{Address as _},
    token, Address, Env, Vec,
};

// Import client types from dev-dependencies
use isa_registry::{ISARegistryClient, ISARegistry};
use funding_pool::{FundingPoolClient, FundingPool};
use crate::{RepaymentDistributor, RepaymentDistributorClient};

struct TestEnv {
    env: Env,
    admin: Address,
    earner: Address,
    investor_1: Address,
    investor_2: Address,
    token_id: Address,
    token_client: token::StellarAssetClient,
    registry_id: Address,
    registry_client: ISARegistryClient,
}

impl TestEnv {
    fn setup() -> Self {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let earner = Address::generate(&env);
        let investor_1 = Address::generate(&env);
        let investor_2 = Address::generate(&env);

        // Deploy SAC Mock USDC Token
        let token_id = env.register_stellar_asset_contract(admin.clone());
        let token_client = token::StellarAssetClient::new(&env, &token_id);

        // Mint starting balances to investors
        token_client.mint(&investor_1, &10000i128);
        token_client.mint(&investor_2, &10000i128);

        // Deploy and initialize ISA Registry
        let registry_id = env.register_contract(None, ISARegistry);
        let registry_client = ISARegistryClient::new(&env, &registry_id);
        registry_client.initialize(&admin);

        TestEnv {
            env,
            admin,
            earner,
            investor_1,
            investor_2,
            token_id,
            token_client,
            registry_id,
            registry_client,
        }
    }
}

#[test]
fn test_successful_isa_funding_and_repayment() {
    let setup = TestEnv::setup();
    let env = setup.env;

    // 1. Propose an ISA (1,000 USDC target, 10% income share, 12 months, 1.5x cap = 1500 limit)
    let isa_id = setup.registry_client.create_isa(
        &setup.earner,
        &1000i128,
        &1000u32, // 1000 bp = 10%
        &12u32,
        &15000u32, // 15000 bp = 1.5x
    );
    assert_eq!(isa_id, 1);

    // 2. Deploy and initialize Funding Pool for this ISA
    let pool_id = env.register_contract(None, FundingPool);
    let pool_client = FundingPoolClient::new(&env, &pool_id);
    pool_client.initialize(&setup.token_id, &1000i128, &setup.earner, &isa_id);

    // 3. Investors fund the pool
    // Investor 1 deposits 600 USDC (60% share)
    pool_client.invest(&setup.investor_1, &600i128);
    // Investor 2 deposits 400 USDC (40% share)
    pool_client.invest(&setup.investor_2, &400i128);

    assert_eq!(pool_client.is_funded(), true);
    assert_eq!(pool_client.get_share(&setup.investor_1), 600i128);
    assert_eq!(pool_client.get_share(&setup.investor_2), 400i128);

    // Earner withdraws funding capital
    pool_client.withdraw();
    let usdc_client = token::Client::new(&env, &setup.token_id);
    assert_eq!(usdc_client.balance(&setup.earner), 1000i128);

    // 4. Deploy and initialize Repayment Distributor
    let distributor_id = env.register_contract(None, RepaymentDistributor);
    let distributor_client = RepaymentDistributorClient::new(&env, &distributor_id);
    distributor_client.initialize(
        &setup.token_id,
        &setup.admin,       // Verifier admin
        &pool_id,          // Funding Pool source
        &1500i128,         // Repayment Cap (1.5x of 1000)
        &setup.earner,
    );

    // 5. Earner earns $3000, owes 10% = $300. Payout split:
    // Investor 1 (60%): $180
    // Investor 2 (40%): $120
    setup.token_client.mint(&setup.earner, &1000i128); // Give earner money to pay
    
    let mut investors = Vec::new(&env);
    investors.push_back(setup.investor_1.clone());
    investors.push_back(setup.investor_2.clone());

    let repaid_amount = distributor_client.distribute_repayment(
        &setup.earner,
        &300i128,
        &investors,
    );

    assert_eq!(repaid_amount, 300i128);
    
    // Check investor balances (10000 - deposit + payout)
    // Investor 1: 10000 - 600 + 180 = 9580
    // Investor 2: 10000 - 400 + 120 = 9720
    assert_eq!(usdc_client.balance(&setup.investor_1), 9580i128);
    assert_eq!(usdc_client.balance(&setup.investor_2), 9720i128);
}

#[test]
fn test_edge_case_over_repayment_cap() {
    let setup = TestEnv::setup();
    let env = setup.env;

    let isa_id = setup.registry_client.create_isa(&setup.earner, &1000i128, &1000u32, &12u32, &15000u32);
    let pool_id = env.register_contract(None, FundingPool);
    let pool_client = FundingPoolClient::new(&env, &pool_id);
    pool_client.initialize(&setup.token_id, &1000i128, &setup.earner, &isa_id);
    pool_client.invest(&setup.investor_1, &1000i128);
    pool_client.withdraw();

    let distributor_id = env.register_contract(None, RepaymentDistributor);
    let distributor_client = RepaymentDistributorClient::new(&env, &distributor_id);
    distributor_client.initialize(
        &setup.token_id,
        &setup.admin,
        &pool_id,
        &1500i128, // Repayment Cap: 1500 USDC
        &setup.earner,
    );

    setup.token_client.mint(&setup.earner, &2000i128);

    let mut investors = Vec::new(&env);
    investors.push_back(setup.investor_1.clone());

    // Pay $1000 first (within cap)
    distributor_client.distribute_repayment(&setup.earner, &1000i128, &investors);
    assert_eq!(distributor_client.get_total_repaid(), 1000i128);

    // Pay another $800. Since cap is 1500, only $500 should be accepted.
    // The distributor should return $300 change or only capture $500.
    let captured = distributor_client.distribute_repayment(&setup.earner, &800i128, &investors);
    assert_eq!(captured, 500i128);
    assert_eq!(distributor_client.get_total_repaid(), 1500i128);
}
