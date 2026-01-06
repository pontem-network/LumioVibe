module staking::staking {
    use std::signer;

    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_INSUFFICIENT_BALANCE: u64 = 3;
    const E_NO_STAKE: u64 = 4;
    const E_POOL_NOT_INITIALIZED: u64 = 5;
    const E_POOL_ALREADY_INITIALIZED: u64 = 6;
    const E_ZERO_AMOUNT: u64 = 7;
    const E_NO_REWARDS: u64 = 8;

    const REWARD_RATE_PERCENT: u64 = 10;

    struct StakingPool has key {
        total_staked: u64,
        reward_pool: u64,
        is_active: bool,
    }

    struct UserStake has key {
        staked_amount: u64,
        rewards_earned: u64,
    }

    public entry fun initialize_pool(account: &signer, initial_rewards: u64) {
        let addr = signer::address_of(account);
        assert!(!exists<StakingPool>(addr), E_POOL_ALREADY_INITIALIZED);

        move_to(account, StakingPool {
            total_staked: 0,
            reward_pool: initial_rewards,
            is_active: true,
        });

        move_to(account, UserStake {
            staked_amount: 0,
            rewards_earned: 0,
        });
    }

    public entry fun stake(
        account: &signer,
        pool_address: address,
        amount: u64
    ) acquires StakingPool, UserStake {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(exists<StakingPool>(pool_address), E_POOL_NOT_INITIALIZED);

        let addr = signer::address_of(account);

        if (!exists<UserStake>(addr)) {
            move_to(account, UserStake {
                staked_amount: 0,
                rewards_earned: 0,
            });
        };

        let pool = borrow_global_mut<StakingPool>(pool_address);
        pool.total_staked = pool.total_staked + amount;

        let user_stake = borrow_global_mut<UserStake>(addr);
        user_stake.staked_amount = user_stake.staked_amount + amount;

        let reward = (amount * REWARD_RATE_PERCENT) / 100;
        if (pool.reward_pool >= reward) {
            user_stake.rewards_earned = user_stake.rewards_earned + reward;
            pool.reward_pool = pool.reward_pool - reward;
        };
    }

    public entry fun unstake(
        account: &signer,
        pool_address: address,
        amount: u64
    ) acquires StakingPool, UserStake {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(exists<StakingPool>(pool_address), E_POOL_NOT_INITIALIZED);

        let addr = signer::address_of(account);
        assert!(exists<UserStake>(addr), E_NO_STAKE);

        let user_stake = borrow_global_mut<UserStake>(addr);
        assert!(user_stake.staked_amount >= amount, E_INSUFFICIENT_BALANCE);

        user_stake.staked_amount = user_stake.staked_amount - amount;

        let pool = borrow_global_mut<StakingPool>(pool_address);
        pool.total_staked = pool.total_staked - amount;
    }

    public entry fun claim_rewards(account: &signer) acquires UserStake {
        let addr = signer::address_of(account);
        assert!(exists<UserStake>(addr), E_NO_STAKE);

        let user_stake = borrow_global_mut<UserStake>(addr);
        assert!(user_stake.rewards_earned > 0, E_NO_REWARDS);

        user_stake.rewards_earned = 0;
    }

    public entry fun add_rewards(
        account: &signer,
        amount: u64
    ) acquires StakingPool {
        let addr = signer::address_of(account);
        assert!(exists<StakingPool>(addr), E_POOL_NOT_INITIALIZED);

        let pool = borrow_global_mut<StakingPool>(addr);
        pool.reward_pool = pool.reward_pool + amount;
    }

    #[view]
    public fun get_pool_info(pool_address: address): (u64, u64, bool) acquires StakingPool {
        assert!(exists<StakingPool>(pool_address), E_POOL_NOT_INITIALIZED);
        let pool = borrow_global<StakingPool>(pool_address);
        (pool.total_staked, pool.reward_pool, pool.is_active)
    }

    #[view]
    public fun get_user_stake(user_address: address): (u64, u64) acquires UserStake {
        if (!exists<UserStake>(user_address)) {
            return (0, 0)
        };
        let stake = borrow_global<UserStake>(user_address);
        (stake.staked_amount, stake.rewards_earned)
    }

    #[view]
    public fun get_staked_amount(user_address: address): u64 acquires UserStake {
        if (!exists<UserStake>(user_address)) {
            return 0
        };
        borrow_global<UserStake>(user_address).staked_amount
    }

    #[view]
    public fun get_pending_rewards(user_address: address): u64 acquires UserStake {
        if (!exists<UserStake>(user_address)) {
            return 0
        };
        borrow_global<UserStake>(user_address).rewards_earned
    }

    #[view]
    public fun pool_exists(pool_address: address): bool {
        exists<StakingPool>(pool_address)
    }

    #[view]
    public fun user_stake_exists(user_address: address): bool {
        exists<UserStake>(user_address)
    }
}
