type U128String = string;

//struct returned from get_account_info
export type GetAccountInfoResult = {
    account_id: string;
    /// The available balance that can be withdrawn
    available: U128String,
    /// The amount of stNEAR owned (the shares owned)
    st_near: U128String,
    /// The amount of NEAR owner (st_near * stNEAR_price)
    valued_st_near: U128String,
    /// The amount of rewards (rewards = total_staked - stnear_amount) and (total_owned = stnear + rewards)
    unstaked: U128String,
    /// The epoch height when the unstaked was requested
    /// The fund will be locked for NUM_EPOCHS_TO_UNLOCK epochs
    /// unlock epoch = unstaked_requested_epoch_height + NUM_EPOCHS_TO_UNLOCK 
    unstaked_requested_epoch_height: string; //U64,
    unstake_full_epochs_wait_left: number; //u16,
    ///if env::epoch_height()>=account.unstaked_requested_epoch_height+NUM_EPOCHS_TO_UNLOCK
    can_withdraw: boolean,
    /// total amount the user holds in this contract: account.available + account.staked + current_rewards + account.unstaked
    total: U128String,

    //-- STATISTICAL DATA --
    // User's statistical data
    // These fields works as a car's "trip meter". The user can reset them to zero.
    /// trip_start: (timestamp in nanoseconds) this field is set at account creation, so it will start metering rewards
    trip_start: string, //U64,
    /// How much stnear the user had at "trip_start". 
    trip_start_stnear: U128String,
    /// how much the user staked since trip start. always incremented
    trip_accum_stakes: U128String,
    /// how much the user unstaked since trip start. always incremented
    trip_accum_unstakes: U128String,
    /// to compute trip_rewards we start from current_stnear, undo unstakes, undo stakes and finally subtract trip_start_stnear
    /// trip_rewards = current_stnear + trip_accum_unstakes - trip_accum_stakes - trip_start_stnear;
    /// trip_rewards = current_stnear + trip_accum_unstakes - trip_accum_stakes - trip_start_stnear;
    trip_rewards: U128String,

    ///NS liquidity pool shares, if the user is a liquidity provider
    nslp_shares: U128String,
    nslp_share_value: U128String,
    nslp_share_bp: number, //basis points u16,

    meta: U128String,
}

//JSON compatible struct returned from get_contract_state
export type MetaPoolContractState = {

    /// This amount increments with deposits and decrements with for_staking
    /// increments with complete_unstake and decrements with user withdrawals from the contract
    /// withdrawals from the pools can include rewards
    /// since staking is delayed and in batches it only eventually matches env::balance()
    total_available: U128String,

    /// The total amount of tokens selected for staking by the users 
    /// not necessarily what's actually staked since staking can be done in batches
    total_for_staking: U128String,

    /// we remember how much we sent to the pools, so it's easy to compute staking rewards
    /// total_actually_staked: Amount actually sent to the staking pools and staked - NOT including rewards
    /// During distribute(), If !staking_paused && total_for_staking<total_actually_staked, then the difference gets staked in 100kN batches
    total_actually_staked: U128String,

    // how many "shares" were minted. Every time someone "stakes" he "buys pool shares" with the staked amount
    // the share price is computed so if he "sells" the shares on that moment he recovers the same near amount
    // staking produces rewards, so share_price = total_for_staking/total_shares
    // when someone "unstakes" she "burns" X shares at current price to recoup Y near
    total_stake_shares: U128String,
    st_near_price: U128String,

    /// The total amount of tokens actually unstaked (the tokens are in the staking pools)
    /// During distribute(), If !staking_paused && total_for_unstaking<total_actually_unstaked, then the difference gets unstaked in 100kN batches
    total_unstaked_and_waiting: U128String,

    /// The total amount of tokens actually unstaked AND retrieved from the pools (the tokens are here)
    /// During distribute(), If sp.pending_withdrawal && sp.epoch_for_withdraw == env::epoch_height then all funds are retrieved from the sp
    /// When the funds are actually withdraw by the users, total_actually_unstaked is decremented
    total_actually_unstaked_and_retrieved: U128String,

    /// total meta minted
    total_meta: U128String,

    /// the staking pools will add rewards to the staked amount on each epoch
    /// here we store the accumulated amount only for stats purposes. This amount can only grow
    accumulated_staked_rewards: U128String,

    nslp_liquidity: U128String,
    nslp_stnear_balance: U128String,
    nslp_target: U128String,
    /// Current discount for immediate unstake (sell stNEAR)
    nslp_current_discount_basis_points: number,
    nslp_min_discount_basis_points: number,
    nslp_max_discount_basis_points: number,

    accounts_count: string,//U64,

    //count of pools to diversify in
    staking_pools_count: number, //u16, 

    min_deposit_amount: string, //u128
}

export type VLoanInfo = {
    //total requested 
    amount_requested: U128String,
    //staking pool owner
    staking_pool_owner_id: string,
    //staking pool beneficiary
    staking_pool_account_id: string,
    //more information 
    information_url: string,
    //committed fee
    //The validator commits to have their fee at x%, x amount of epochs
    //100 => 1% , 250=>2.5%, etc. -- max: 10000=>100%
    committed_fee: number, //u16,
    committed_fee_duration: number,// u16,

    //status: set by requester: draft, active / set by owner: rejected, accepted, implemented
    status_text: string,
    status: number, // u8,
    //set by owner. if status=accepted how much will be taken from the user account as fee to move to status=implemented
    loan_fee: U128String,

    //EpochHeight where the request was activated status=active
    activated_epoch_height: string // u64 EpochHeight 
}

export type StakingPoolJSONInfo = {
    inx: number,
    account_id: string,
    weight_basis_points: number,
    staked: string,//u128
    unstaked: string,//u128
    unstaked_requested_epoch_height: string, //U64String, 
    //EpochHeight where we asked the sp what were our staking rewards
    last_asked_rewards_epoch_height: string, //U64String,
}

export type RemoveLiquidityResult = {
    near: U128String,
    st_near: U128String
}

export type LiquidUnstakeResult = {
    near: U128String,
    fee: U128String,
    meta: U128String,
}
