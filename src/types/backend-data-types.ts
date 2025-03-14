export type NarwalletsMetrics = {
  env_epoch_height: number;
  prev_epoch_duration_ms: number;
  contract_account_balance: number;
  total_available: number; total_for_staking: number;
  tvl: number;
  total_actually_staked: number;
  epoch_stake_orders: number;
  epoch_unstake_orders: number;
  total_unstake_claims: number;
  total_stake_shares: number;
  total_unstaked_and_waiting: number;
  reserve_for_unstake_claims: number;
  total_meta: number;
  st_near_price: number;
  st_near_price_usd: number;
  st_near_30_day_apy: number;
  nslp_liquidity: number;
  nslp_stnear_balance: number;
  nslp_target: number;
  nslp_share_price: number;
  nslp_total_shares: number;
  lp_3_day_apy: number;
  lp_7_day_apy: number;
  lp_15_day_apy: number;
  lp_30_day_apy: number;
  nslp_current_discount: number;
  nslp_min_discount: number;
  nslp_max_discount: number;
  accounts_count: number;
  staking_pools_count: number;
  staked_pools_count: number;
  min_deposit_amount: number;

  near_usd_price: number;
  eth_usd_price: number;

  operator_balance_near: number;
  ref_meta_price: number;
  ref_meta_price_usd: number;
  meta_token_supply: number;
  ref_meta_st_near_apr: number;
  ref_wnear_st_near_stable_apr: number;
  aurora_st_near_price: number;
  validator_seat_price: number;
  validator_next_seat_price: number;

  // de https://eth-metapool.narwallets.com/votes/metrics
  mpDaoUsdtOnEthMain: number;
}

// ---------------
export type PoolEpochInfo = {
  epoch: number;
  apy: number;
  oldBalance: string;
  newBalance: string;
  rewards: string;
  fee: number | undefined;
}

export type PoolInfo = {
  name: string;
  slashed: boolean;
  stake: string,
  uptime: number,
  fee: number,
  // ourStake?: bigint,
  // currentPct?: number;
  points: number;
  bp: number;
  apy?: number; // avg last 5 epochs
  lastApy?: number;
}
export type JsonPerfData = {
  apy: number;
  avgApy: number;
  oldBalance: string;
  totalRewards: string;
  totalUnstaked: string;
  data: Record<string, PoolEpochInfo[]>;
  lastPerformanceCalculation: PoolInfo[];
  ncore: any; // CSpell:words ncore

};
type EpochRewardsInfo = {
  epoch: number;
  oldBalance: string; // includes unstaked
  newBalance: string; // includes unstaked
  rewards: string;
  unstaked: string;
  apy: number;
  fee: number;
  totalStake: string; // total staked in the validator
  monitoredBalance: string; // if it has stake from the dao or the operator
}
type asArrayItem = { name: string; data: EpochRewardsInfo[] }
export type JsonPerfDataAndExtras = {
  perfData: JsonPerfData;
  olderReadEpoch: number;
  asArray: asArrayItem[];
}
