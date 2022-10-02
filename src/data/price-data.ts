
export let nearDollarPrice: number = 0;
export async function fetchNearDollarPrice() {
  try {
    let result = await fetch("https://api.diadata.org/v1/quotation/NEAR");
    let response = await result.json();
    nearDollarPrice = response.Price;

    document.querySelector("#usd-price-link")?.dispatchEvent(
      new CustomEvent("usdPriceReady", {
        detail: "Dollar price",
      })
    );
  } catch (ex) {
    console.log(ex);
  }
}

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
  operator_balance_near: number;
  ref_meta_price: number;
  ref_meta_price_usd: number;
  meta_token_supply: number;
  ref_meta_st_near_apr: number;
  ref_wnear_st_near_stable_apr: number;
  aurora_st_near_price: number;
  validator_seat_price: number;
  validator_next_seat_price: number;
}

export let narwalletsMetrics: NarwalletsMetrics | undefined;
const FETCH_INTERVAL_MS = 10 * 1000 * 60; // 10 minutes in milliseconds
const RETRY_INTERVAL_MS = 10 * 1000; // 10 seconds in milliseconds
let lastFetched = new Date().getTime() - FETCH_INTERVAL_MS;
export async function getNarwalletsMetrics() {
  const elapsed = new Date().getTime() - lastFetched
  if (elapsed >= FETCH_INTERVAL_MS || (!narwalletsMetrics && elapsed >= RETRY_INTERVAL_MS)) {
    try {
      let data = await fetch("https://validators.narwallets.com/metrics_json")
      narwalletsMetrics = await data.json()
      lastFetched = new Date().getTime()
      // const metapool = activeNetworkInfo.liquidStakingContract;
      // let data = await askBackgroundViewMethod(
      //   metapool,
      //   "get_contract_state",
      //   {});
      // stNEARPrice = yton(data.st_near_price)
    } catch (ex) {
      console.log(ex);
    }
  }
}


