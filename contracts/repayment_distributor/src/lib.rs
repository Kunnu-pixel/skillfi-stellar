#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, token, Address, Env, Vec};

// Define the client interface using contractclient to avoid pre-compilation WASM file dependency.
#[soroban_sdk::contractclient(name = "FundingPoolClient")]
pub trait FundingPoolInterface {
    fn get_share(&self, investor: Address) -> i128;
    fn get_total_raised(&self) -> i128;
    fn is_funded(&self) -> bool;
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Token,
    Verifier,
    Pool,
    RepaymentCap,
    TotalRepaid,
    Earner,
}

#[contract]
pub struct RepaymentDistributor;

#[contractimpl]
impl RepaymentDistributor {
    /// Initialize the repayment distributor.
    pub fn initialize(
        env: Env,
        token: Address,
        verifier: Address,
        pool: Address,
        repayment_cap: i128,
        earner: Address,
    ) {
        if env.storage().instance().has(&DataKey::Token) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Verifier, &verifier);
        env.storage().instance().set(&DataKey::Pool, &pool);
        env.storage().instance().set(&DataKey::RepaymentCap, &repayment_cap);
        env.storage().instance().set(&DataKey::TotalRepaid, &0i128);
        env.storage().instance().set(&DataKey::Earner, &earner);
    }

    /// Submit proof of monthly income (simulated off-chain storage hook).
    pub fn submit_income_proof(
        env: Env,
        earner: Address,
        income: i128,
        proof_hash: soroban_sdk::Symbol,
    ) {
        earner.require_auth();
        let registered_earner: Address = env.storage().instance().get(&DataKey::Earner).unwrap();
        if earner != registered_earner {
            panic!("Only the designated earner can submit proof");
        }

        env.events().publish(
            (symbol_short!("proof_sub"), earner),
            (income, proof_hash),
        );
    }

    /// Receive verified payment from earner and distribute pro-rata to investors.
    /// Payer transfers amount of token. The contract reads shares from the pool and pays out.
    pub fn distribute_repayment(
        env: Env,
        payer: Address,
        amount: i128,
        investors: Vec<Address>,
    ) -> i128 {
        payer.require_auth();

        if amount <= 0 {
            panic!("Repayment amount must be positive");
        }

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let pool_addr: Address = env.storage().instance().get(&DataKey::Pool).unwrap();
        let repayment_cap: i128 = env.storage().instance().get(&DataKey::RepaymentCap).unwrap();
        let mut total_repaid: i128 = env.storage().instance().get(&DataKey::TotalRepaid).unwrap();

        // Enforce repayment cap
        let mut actual_repayment = amount;
        if total_repaid + amount > repayment_cap {
            actual_repayment = repayment_cap - total_repaid;
        }

        if actual_repayment <= 0 {
            panic!("Repayment cap already reached");
        }

        // Pull tokens from payer
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&payer, &env.current_contract_address(), &actual_repayment);

        // Fetch pool metrics using our trait-defined client
        let pool_client = FundingPoolClient::new(&env, &pool_addr);
        let total_raised = pool_client.get_total_raised();

        if total_raised == 0 {
            panic!("Invalid pool state");
        }

        // Distribute to each provided investor address
        let mut distributed_sum = 0i128;
        for investor in investors.iter() {
            let share = pool_client.get_share(&investor);
            if share > 0 {
                // formula: payout = actual_repayment * share / total_raised
                let payout = (actual_repayment * share) / total_raised;
                if payout > 0 {
                    token_client.transfer(&env.current_contract_address(), &investor, &payout);
                    distributed_sum += payout;
                }
            }
        }

        total_repaid += actual_repayment;
        env.storage().instance().set(&DataKey::TotalRepaid, &total_repaid);

        // Emit distribution stats
        env.events().publish(
            (symbol_short!("repaid"), payer),
            (actual_repayment, distributed_sum),
        );

        // Return unused balance if any (e.g. difference due to cap or rounding)
        let change = actual_repayment - distributed_sum;
        if change > 0 {
            token_client.transfer(&env.current_contract_address(), &payer, &change);
        }

        actual_repayment
    }

    pub fn get_total_repaid(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalRepaid).unwrap_or(0)
    }
}
