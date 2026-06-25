#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol, log};

// Data keys for contract storage
#[contracttype]
#[derive(Clone)]
enum DataKey {
    IsaCount,
    Isa(u64),
    Admin,
}

// Terms defining a single Income-Share Agreement
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ISATerms {
    pub id: u64,
    pub earner: Address,
    pub funding_target: i128,
    pub income_share_bp: u32,       // Basis points (e.g., 500 = 5%)
    pub duration_months: u32,       // Repayment term length
    pub cap_multiplier_bp: u32,     // Maximum repayment limit (e.g., 15000 = 1.5x of target)
    pub active: bool,
    pub funded: bool,
}

#[contract]
pub struct ISARegistry;

#[contractimpl]
impl ISARegistry {
    /// Initialize the contract, setting the admin role.
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::IsaCount, &0u64);
    }

    /// Submit a new Income Share Agreement proposal.
    pub fn create_isa(
        env: Env,
        earner: Address,
        funding_target: i128,
        income_share_bp: u32,
        duration_months: u32,
        cap_multiplier_bp: u32,
    ) -> u64 {
        // Authenticate the earner
        earner.require_auth();

        if funding_target <= 0 {
            panic!("Funding target must be positive");
        }
        if income_share_bp == 0 || income_share_bp > 10000 {
            panic!("Income share must be between 1 and 10000 basis points");
        }
        if duration_months == 0 {
            panic!("Duration must be at least 1 month");
        }
        if cap_multiplier_bp < 10000 {
            panic!("Repayment cap must be at least 1.0x (10000 bp)");
        }

        // Get and increment ISA counter
        let mut count: u64 = env.storage().instance().get(&DataKey::IsaCount).unwrap_or(0);
        count += 1;

        let terms = ISATerms {
            id: count,
            earner: earner.clone(),
            funding_target,
            income_share_bp,
            duration_months,
            cap_multiplier_bp,
            active: true,
            funded: false,
        };

        // Save terms to storage
        env.storage().persistent().set(&DataKey::Isa(count), &terms);
        env.storage().instance().set(&DataKey::IsaCount, &count);

        // Emit registry event
        env.events().publish(
            (symbol_short!("isa_reg"), count),
            (earner, funding_target, income_share_bp),
        );

        log!(&env, "ISA proposed with ID: {}", count);

        count
    }

    /// Retrieve terms of an ISA by ID.
    pub fn get_isa(env: Env, id: u64) -> ISATerms {
        env.storage()
            .persistent()
            .get(&DataKey::Isa(id))
            .unwrap_or_else(|| panic!("ISA proposal not found"))
    }

    /// Update funded status of an ISA. (Called by Funding Pool contract or admin)
    pub fn mark_funded(env: Env, caller: Address, id: u64) {
        // Authenticate admin or authorized funding pool
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        caller.require_auth();
        if caller != admin {
            // In production, we would verify if the caller is the deployed funding pool
            panic!("Unauthorized caller");
        }

        let mut terms = Self::get_isa(env.clone(), id);
        terms.funded = true;
        env.storage().persistent().set(&DataKey::Isa(id), &terms);

        env.events().publish(
            (symbol_short!("isa_fund"), id),
            Symbol::new(&env, "funded"),
        );
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Events};
    use soroban_sdk::{vec, Env, IntoVal};

    #[test]
    fn test_create_isa() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let earner = Address::generate(&env);

        let contract_id = env.register_contract(None, ISARegistry);
        let client = ISARegistryClient::new(&env, &contract_id);

        client.initialize(&admin);

        let id = client.create_isa(&earner, &1000i128, &500u32, &24u32, &15000u32);
        assert_eq!(id, 1);

        let isa = client.get_isa(&1);
        assert_eq!(isa.id, 1);
        assert_eq!(isa.earner, earner);
        assert_eq!(isa.funding_target, 1000i128);
        assert_eq!(isa.income_share_bp, 500u32);
        assert_eq!(isa.duration_months, 24u32);
        assert_eq!(isa.cap_multiplier_bp, 15000u32);
        assert_eq!(isa.funded, false);

        // Check events
        let events = env.events().all();
        let last_event = events.last().unwrap();
        assert_eq!(
            last_event,
            (
                contract_id.clone(),
                (symbol_short!("isa_reg"), 1u64).into_val(&env),
                (earner.clone(), 1000i128, 500u32).into_val(&env)
            )
        );
    }
}
