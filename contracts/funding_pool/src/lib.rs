#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, token, Address, Env, Symbol};

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Token,          // The USDC/XLM token address
    Target,         // Target funding amount
    Earner,         // Target earner address
    IsaId,          // Associated ISA ID
    TotalRaised,    // Accumulator of contributions
    Investor(Address), // Contribution map key
    Funded,         // If the target has been reached
    Withdrawn,      // If earner has claimed the capital
}

#[contract]
pub struct FundingPool;

#[contractimpl]
impl FundingPool {
    /// Initialize the funding pool parameters.
    pub fn initialize(
        env: Env,
        token: Address,
        target: i128,
        earner: Address,
        isa_id: u64,
    ) {
        if env.storage().instance().has(&DataKey::Token) {
            panic!("Already initialized");
        }
        if target <= 0 {
            panic!("Target must be positive");
        }
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Target, &target);
        env.storage().instance().set(&DataKey::Earner, &earner);
        env.storage().instance().set(&DataKey::IsaId, &isa_id);
        env.storage().instance().set(&DataKey::TotalRaised, &0i128);
        env.storage().instance().set(&DataKey::Funded, &false);
        env.storage().instance().set(&DataKey::Withdrawn, &false);
    }

    /// Invest a specified amount of tokens.
    pub fn invest(env: Env, investor: Address, amount: i128) {
        investor.require_auth();

        if amount <= 0 {
            panic!("Investment must be positive");
        }

        let funded: bool = env.storage().instance().get(&DataKey::Funded).unwrap_or(false);
        if funded {
            panic!("ISA already fully funded");
        }

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let target: i128 = env.storage().instance().get(&DataKey::Target).unwrap();
        let mut total_raised: i128 = env.storage().instance().get(&DataKey::TotalRaised).unwrap();

        // Ensure we don't exceed target
        let mut actual_amount = amount;
        if total_raised + amount > target {
            actual_amount = target - total_raised;
        }

        if actual_amount <= 0 {
            panic!("Funding limit reached");
        }

        // Pull tokens from investor to this contract
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&investor, &env.current_contract_address(), &actual_amount);

        // Record investment details
        let key = DataKey::Investor(investor.clone());
        let current_investment: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        env.storage().persistent().set(&key, &(current_investment + actual_amount));

        total_raised += actual_amount;
        env.storage().instance().set(&DataKey::TotalRaised, &total_raised);

        // Check if fully funded
        if total_raised >= target {
            env.storage().instance().set(&DataKey::Funded, &true);
            env.events().publish(
                (symbol_short!("pool_fund"), env.storage().instance().get::<_, u64>(&DataKey::IsaId).unwrap()),
                Symbol::new(&env, "fully_funded"),
            );
        }

        // Emit investment event
        env.events().publish(
            (symbol_short!("invested"), investor),
            actual_amount,
        );
    }

    /// Earner withdraws the accumulated funds once fully funded.
    pub fn withdraw(env: Env) {
        let earner: Address = env.storage().instance().get(&DataKey::Earner).unwrap();
        earner.require_auth();

        let funded: bool = env.storage().instance().get(&DataKey::Funded).unwrap_or(false);
        if !funded {
            panic!("Not fully funded yet");
        }

        let withdrawn: bool = env.storage().instance().get(&DataKey::Withdrawn).unwrap_or(false);
        if withdrawn {
            panic!("Funds already withdrawn");
        }

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let total_raised: i128 = env.storage().instance().get(&DataKey::TotalRaised).unwrap();

        env.storage().instance().set(&DataKey::Withdrawn, &true);

        // Transfer funds to earner
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&env.current_contract_address(), &earner, &total_raised);

        env.events().publish(
            (symbol_short!("withdraw"), earner),
            total_raised,
        );
    }

    /// Retrieve share of a specific investor.
    pub fn get_share(env: Env, investor: Address) -> i128 {
        env.storage().persistent().get(&DataKey::Investor(investor)).unwrap_or(0)
    }

    /// Retrieve total raised amount.
    pub fn get_total_raised(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalRaised).unwrap_or(0)
    }

    /// Check if pool has been fully funded.
    pub fn is_funded(env: Env) -> bool {
        env.storage().instance().get(&DataKey::Funded).unwrap_or(false)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Events};
    use soroban_sdk::{token, Env, IntoVal};

    #[test]
    fn test_funding_flow() {
        let env = Env::default();
        env.mock_all_auths();

        let token_admin = Address::generate(&env);
        let earner = Address::generate(&env);
        let investor = Address::generate(&env);

        // Register mock token (SAC USDC)
        let token_id = env.register_stellar_asset_contract(token_admin);
        let token_client = token::StellarAssetClient::new(&env, &token_id);
        token_client.mint(&investor, &2000i128);

        // Register funding pool contract
        let pool_id = env.register_contract(None, FundingPool);
        let pool_client = FundingPoolClient::new(&env, &pool_id);

        pool_client.initialize(&token_id, &1000i128, &earner, &1u64);

        // Test investment
        pool_client.invest(&investor, &400i128);
        assert_eq!(pool_client.get_share(&investor), 400i128);
        assert_eq!(pool_client.get_total_raised(), 400i128);
        assert_eq!(pool_client.is_funded(), false);

        // Test investment that hits cap
        pool_client.invest(&investor, &800i128);
        assert_eq!(pool_client.get_share(&investor), 1000i128); // Capped at 1000
        assert_eq!(pool_client.get_total_raised(), 1000i128);
        assert_eq!(pool_client.is_funded(), true);

        // Test earner withdraw
        pool_client.withdraw();
        let token_actual_client = token::Client::new(&env, &token_id);
        assert_eq!(token_actual_client.balance(&earner), 1000i128);
    }
}
