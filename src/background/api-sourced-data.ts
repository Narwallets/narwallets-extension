import { JsonPerfDataAndExtras, NarwalletsMetrics } from "../types/backend-data-types.js";

// export let nearDollarPrice: number = 0;
// export async function fetchNearDollarPrice() {
//   try {
//     nearDollarPrice = await getQuote("NEAR")
//     document.querySelector("#usd-price-link")?.dispatchEvent(
//       new CustomEvent("usdPriceReady", {
//         detail: "Dollar price",
//       })
//     );
//   } catch (ex) {
//     console.log(ex);
//   }
// }


// local cache
let narwalletsMetrics: NarwalletsMetrics | undefined;
const FETCH_INTERVAL_MS = 10 * 1000 * 60; // 10 minutes in milliseconds
const RETRY_INTERVAL_MS = 10 * 1000; // 10 seconds in milliseconds
let lastFetched = new Date().getTime() - FETCH_INTERVAL_MS;

// local cache
let narwalletsPerfData: JsonPerfDataAndExtras | undefined;

export async function getNarwalletsDataFromApi()
  : Promise<{
    metrics: NarwalletsMetrics | undefined,
    perfData: JsonPerfDataAndExtras | undefined
  }> {
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
      if (narwalletsMetrics) {
        // take mpdao price from ref -- avoid another fetch
        narwalletsMetrics.mpDaoUsdtOnEthMain = narwalletsMetrics.ref_meta_price_usd
        // const response = await fetch("https://eth-metapool.narwallets.com/votes/metrics_json")
        // const dataBuyBackBot = await response.json()
        // if (dataBuyBackBot) narwalletsMetrics.mpDaoUsdtOnEthMain = dataBuyBackBot.mpDaoUsdtOnEthMain

        // get validator list also
        const response = await fetch("https://validators.narwallets.com/perf_json")
        narwalletsPerfData = await response.json()

      }
    } catch (ex) {
      console.log(ex);
    }
  }
  return { metrics: narwalletsMetrics, perfData: narwalletsPerfData }
}


